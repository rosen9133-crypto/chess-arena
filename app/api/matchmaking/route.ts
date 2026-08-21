import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type MatchmakingBody = {
  timeControl?: "BULLET" | "BLITZ" | "RAPID";
  initialTimeSeconds?: number;
  incrementSeconds?: number;
  rated?: boolean;
};

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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

    const queueEntry = await prisma.matchmakingQueue.findUnique({
      where: {
        userId: currentUser.id,
      },
      select: {
        id: true,
        timeControl: true,
        initialTimeSeconds: true,
        incrementSeconds: true,
        rated: true,
        createdAt: true,
      },
    });

    if (queueEntry) {
      return NextResponse.json(
        {
          success: true,
          status: "SEARCHING",
          queueEntry,
        },
        { status: 200 }
      );
    }

    const game = await prisma.game.findFirst({
      where: {
        OR: [
          {
            whitePlayerId: currentUser.id,
          },
          {
            blackPlayerId: currentUser.id,
          },
        ],
        status: "IN_PROGRESS",
      },
      orderBy: {
        startedAt: "desc",
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

    if (game) {
      return NextResponse.json(
        {
          success: true,
          status: "MATCHED",
          game,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        status: "IDLE",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("MATCHMAKING GET ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as MatchmakingBody;

    const {
      timeControl,
      initialTimeSeconds,
      incrementSeconds = 0,
      rated = true,
    } = body;

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

    if (typeof rated !== "boolean") {
      return NextResponse.json(
        { error: "Invalid rated value" },
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

    const existingOpponent = await prisma.matchmakingQueue.findFirst({
      where: {
        userId: {
          not: currentUser.id,
        },
        timeControl,
        initialTimeSeconds,
        incrementSeconds,
        rated,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (existingOpponent) {
      const currentUserIsWhite = Math.random() < 0.5;

      const whitePlayerId = currentUserIsWhite
        ? currentUser.id
        : existingOpponent.userId;

      const blackPlayerId = currentUserIsWhite
        ? existingOpponent.userId
        : currentUser.id;

      const initialTimeMs = initialTimeSeconds * 1000;

      const game = await prisma.$transaction(async (tx) => {
        await tx.matchmakingQueue.deleteMany({
          where: {
            userId: {
              in: [currentUser.id, existingOpponent.userId],
            },
          },
        });

        return tx.game.create({
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
      });

      return NextResponse.json(
        {
          success: true,
          status: "MATCHED",
          game,
        },
        { status: 201 }
      );
    }

    const queueEntry = await prisma.matchmakingQueue.upsert({
      where: {
        userId: currentUser.id,
      },
      update: {
        timeControl,
        initialTimeSeconds,
        incrementSeconds,
        rated,
        createdAt: new Date(),
      },
      create: {
        userId: currentUser.id,
        timeControl,
        initialTimeSeconds,
        incrementSeconds,
        rated,
      },
      select: {
        id: true,
        timeControl: true,
        initialTimeSeconds: true,
        incrementSeconds: true,
        rated: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        status: "SEARCHING",
        queueEntry,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("MATCHMAKING POST ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "Current user not found" },
        { status: 404 }
      );
    }

    await prisma.matchmakingQueue.deleteMany({
      where: {
        userId: currentUser.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        status: "CANCELLED",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("MATCHMAKING DELETE ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}