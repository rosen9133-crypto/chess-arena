import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type GameResult = "win" | "loss" | "draw";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: { result?: GameResult };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { result } = body;

  if (
    result !== "win" &&
    result !== "loss" &&
    result !== "draw"
  ) {
    return NextResponse.json(
      { error: "Invalid game result" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data:
      result === "win"
        ? {
            computerWins: {
              increment: 1,
            },
          }
        : result === "loss"
          ? {
              computerLosses: {
                increment: 1,
              },
            }
          : {
              computerDraws: {
                increment: 1,
              },
            },
    select: {
      computerWins: true,
      computerLosses: true,
      computerDraws: true,
    },
  });

  return NextResponse.json({
    success: true,
    stats: updatedUser,
  });
}