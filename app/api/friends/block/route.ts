import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type BlockUserBody = {
  userId?: string;
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

  let body: BlockUserBody;

  try {
    body = (await request.json()) as BlockUserBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const userId = body.userId?.trim();

  if (!userId) {
    return NextResponse.json(
      { error: "Missing userId." },
      { status: 400 },
    );
  }

  if (userId === currentUser.id) {
    return NextResponse.json(
      { error: "You cannot block yourself." },
      { status: 400 },
    );
  }

  const userToBlock = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
    },
  });

  if (!userToBlock) {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  const existingBlock = await prisma.userBlock.findUnique({
    where: {
      blockerId_blockedId: {
        blockerId: currentUser.id,
        blockedId: userId,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingBlock) {
    return NextResponse.json(
      { error: "Player is already blocked." },
      { status: 409 },
    );
  }

  const block = await prisma.$transaction(async (tx) => {
    await tx.friendship.deleteMany({
      where: {
        OR: [
          {
            requesterId: currentUser.id,
            addresseeId: userId,
          },
          {
            requesterId: userId,
            addresseeId: currentUser.id,
          },
        ],
      },
    });

    return tx.userBlock.create({
      data: {
        blockerId: currentUser.id,
        blockedId: userId,
      },
      select: {
        id: true,
        createdAt: true,
        blocked: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  });

  return NextResponse.json(
    {
      message: "Player blocked.",
      block,
    },
    { status: 201 },
  );
}
