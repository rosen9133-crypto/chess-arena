import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type AcceptFriendRequestBody = {
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

  let body: AcceptFriendRequestBody;

  try {
    body = (await request.json()) as AcceptFriendRequestBody;
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
      { error: "Friend request not found." },
      { status: 404 },
    );
  }

  if (friendship.addresseeId !== currentUser.id) {
    return NextResponse.json(
      { error: "You cannot accept this friend request." },
      { status: 403 },
    );
  }

  if (friendship.status !== "PENDING") {
    return NextResponse.json(
      { error: "This friend request is no longer pending." },
      { status: 409 },
    );
  }

  const acceptedFriendship = await prisma.friendship.update({
    where: { id: friendship.id },
    data: { status: "ACCEPTED" },
    select: {
      id: true,
      status: true,
      updatedAt: true,
      requester: {
        select: {
          id: true,
          username: true,
        },
      },
      addressee: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  return NextResponse.json(
    {
      message: "Friend request accepted.",
      friendship: acceptedFriendship,
    },
    { status: 200 },
  );
}
