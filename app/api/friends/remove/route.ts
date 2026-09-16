import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RemoveFriendBody = {
  friendshipId?: string;
};

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!currentUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  let body: RemoveFriendBody;

  try {
    body = (await request.json()) as RemoveFriendBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const friendshipId = body.friendshipId?.trim();

  if (!friendshipId) {
    return NextResponse.json(
      { error: "Missing friendshipId." },
      { status: 400 },
    );
  }

  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
    select: {
      id: true,
      requesterId: true,
      addresseeId: true,
      status: true,
    },
  });

  if (!friendship) {
    return NextResponse.json(
      { error: "Friendship not found." },
      { status: 404 },
    );
  }

  const isFriendshipMember =
    friendship.requesterId === currentUser.id ||
    friendship.addresseeId === currentUser.id;

  if (!isFriendshipMember) {
    return NextResponse.json(
      { error: "You cannot remove this friendship." },
      { status: 403 },
    );
  }

  if (friendship.status !== "ACCEPTED") {
    return NextResponse.json(
      { error: "This friendship is not active." },
      { status: 409 },
    );
  }

  await prisma.friendship.delete({
    where: { id: friendship.id },
  });

  return NextResponse.json(
    {
      message: "Friend removed.",
    },
    { status: 200 },
  );
}
