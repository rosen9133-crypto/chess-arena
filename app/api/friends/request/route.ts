import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type SendFriendRequestBody = {
  addresseeId?: string;
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

  let body: SendFriendRequestBody;

  try {
    body = (await request.json()) as SendFriendRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const addresseeId = body.addresseeId?.trim();

  if (!addresseeId) {
    return NextResponse.json(
      { error: "Missing addresseeId." },
      { status: 400 },
    );
  }

  if (addresseeId === currentUser.id) {
    return NextResponse.json(
      { error: "You cannot send a friend request to yourself." },
      { status: 400 },
    );
  }

  const addressee = await prisma.user.findUnique({
    where: { id: addresseeId },
    select: {
      id: true,
      username: true,
    },
  });

  if (!addressee) {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  const existingBlock = await prisma.userBlock.findFirst({
    where: {
      OR: [
        {
          blockerId: currentUser.id,
          blockedId: addresseeId,
        },
        {
          blockerId: addresseeId,
          blockedId: currentUser.id,
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (existingBlock) {
    return NextResponse.json(
      { error: "Friend request cannot be sent between blocked players." },
      { status: 403 },
    );
  }

  const existingFriendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        {
          requesterId: currentUser.id,
          addresseeId,
        },
        {
          requesterId: addresseeId,
          addresseeId: currentUser.id,
        },
      ],
    },
    select: {
      id: true,
      status: true,
      requesterId: true,
      addresseeId: true,
    },
  });

  if (existingFriendship) {
    if (existingFriendship.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "You are already friends." },
        { status: 409 },
      );
    }

    if (existingFriendship.requesterId === currentUser.id) {
      return NextResponse.json(
        { error: "Friend request already sent." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          "This player has already sent you a friend request. Accept or decline it from your requests.",
      },
      { status: 409 },
    );
  }

  const friendship = await prisma.friendship.create({
    data: {
      requesterId: currentUser.id,
      addresseeId,
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
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
      message: "Friend request sent.",
      friendship,
    },
    { status: 201 },
  );
}
