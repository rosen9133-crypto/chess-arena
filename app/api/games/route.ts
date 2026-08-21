import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type CreateGameBody = {
  opponentId?: string;
  timeControl?: "BULLET" | "BLITZ" | "RAPID";
  initialTimeSeconds?: number;
  incrementSeconds?: number;
  rated?: boolean;
  color?: "white" | "black" | "random";
};

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as CreateGameBody;

    const {
      opponentId,
      timeControl,
      initialTimeSeconds,
      incrementSeconds = 0,
      rated = true,
      color = "random",
    } = body;

    if (!opponentId) {
      return NextResponse.json(
        { error: "Opponent is required" },
        { status: 400 }
      );
    }

    if (
      !timeControl ||
      !["BULLET", "BLITZ", "RAPID"].includes(timeControl)
    ) {
      return NextResponse.json(
        { error: "Invalid time control" },
        { status: 400 }
      );
    }

    if (
      typeof initialTimeSeconds !== "number" ||
      !Number.isInteger(initialTimeSeconds) ||
      initialTimeSeconds <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid initial time" },
        { status: 400 }
      );
    }

    if (
      typeof incrementSeconds !== "number" ||
      !Number.isInteger(incrementSeconds) ||
      incrementSeconds < 0
    ) {
      return NextResponse.json(
        { error: "Invalid increment" },
        { status: 400 }
      );
    }

    if (!["white", "black", "random"].includes(color)) {
      return NextResponse.json(
        { error: "Invalid color" },
        { status: 400 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
        username: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "Current user not found" },
        { status: 404 }
      );
    }

    if (currentUser.id === opponentId) {
      return NextResponse.json(
        { error: "You cannot play against yourself" },
        { status: 400 }
      );
    }

    const opponent = await prisma.user.findUnique({
      where: {
        id: opponentId,
      },
      select: {
        id: true,
        username: true,
      },
    });

    if (!opponent) {
      return NextResponse.json(
        { error: "Opponent not found" },
        { status: 404 }
      );
    }

    let currentUserIsWhite: boolean;

    if (color === "white") {
      currentUserIsWhite = true;
    } else if (color === "black") {
      currentUserIsWhite = false;
    } else {
      currentUserIsWhite = Math.random() < 0.5;
    }

    const whitePlayerId = currentUserIsWhite
      ? currentUser.id
      : opponent.id;

    const blackPlayerId = currentUserIsWhite
      ? opponent.id
      : currentUser.id;

    const initialTimeMs = initialTimeSeconds * 1000;

    const game = await prisma.game.create({
      data: {
        whitePlayerId,
        blackPlayerId,
        timeControl,
        rated,
        initialTimeSeconds,
        incrementSeconds,

        whiteTimeMs: initialTimeMs,
        blackTimeMs: initialTimeMs,
        clockStartedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        result: true,
        timeControl: true,
        rated: true,
        initialTimeSeconds: true,
        incrementSeconds: true,

        whiteTimeMs: true,
        blackTimeMs: true,
        clockStartedAt: true,

        startedAt: true,
        endedAt: true,

        whitePlayer: {
          select: {
            id: true,
            username: true,
          },
        },

        blackPlayer: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        game,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE GAME ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}