import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type UnblockUserBody = {
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

  let body: UnblockUserBody;

  try {
    body = (await request.json()) as UnblockUserBody;
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
      { error: "You cannot unblock yourself." },
      { status: 400 },
    );
  }

  const userToUnblock = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
    },
  });

  if (!userToUnblock) {
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

  if (!existingBlock) {
    return NextResponse.json(
      { error: "Player is not blocked." },
      { status: 404 },
    );
  }

  await prisma.userBlock.delete({
    where: {
      id: existingBlock.id,
    },
  });

  return NextResponse.json({
    message: "Player unblocked.",
    user: userToUnblock,
  });
}
