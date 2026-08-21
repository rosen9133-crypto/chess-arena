import { NextResponse } from "next/server";
import { Chess } from "chess.js";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type OnlineResignBody = {
  gameId?: string;
};

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as OnlineResignBody;
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json(
        { error: "Game ID is required" },
        { status: 400 },
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
        { status: 404 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const game = await tx.game.findUnique({
        where: {
          id: gameId,
        },
        select: {
          id: true,
          status: true,
          fen: true,
          pgn: true,
          whitePlayerId: true,
          blackPlayerId: true,
          whiteTimeMs: true,
          blackTimeMs: true,
          clockStartedAt: true,
        },
      });

      if (!game) {
        return {
          error: "Game not found",
          status: 404,
        } as const;
      }

      if (game.status !== "IN_PROGRESS") {
        return {
          error: "Game is not in progress",
          status: 409,
        } as const;
      }

      const isWhitePlayer =
        game.whitePlayerId === currentUser.id;

      const isBlackPlayer =
        game.blackPlayerId === currentUser.id;

      if (!isWhitePlayer && !isBlackPlayer) {
        return {
          error: "Forbidden",
          status: 403,
        } as const;
      }

      const chess = new Chess();

      try {
        if (game.pgn.trim()) {
          chess.loadPgn(game.pgn);
        } else {
          chess.load(game.fen);
        }
      } catch (error) {
        console.error(
          "ONLINE RESIGN LOAD GAME ERROR:",
          error,
        );

        return {
          error: "Stored game position is invalid",
          status: 500,
        } as const;
      }

      const now = new Date();
      const activeColor = chess.turn();

      const elapsedMs = game.clockStartedAt
        ? Math.max(
            0,
            now.getTime() -
              game.clockStartedAt.getTime(),
          )
        : 0;

      const updatedWhiteTimeMs = Math.max(
        0,
        game.whiteTimeMs -
          (activeColor === "w" ? elapsedMs : 0),
      );

      const updatedBlackTimeMs = Math.max(
        0,
        game.blackTimeMs -
          (activeColor === "b" ? elapsedMs : 0),
      );

      const gameResult = isWhitePlayer
        ? ("BLACK_WIN" as const)
        : ("WHITE_WIN" as const);

      const updatedGame = await tx.game.update({
        where: {
          id: game.id,
          status: "IN_PROGRESS",
        },
        data: {
          status: "FINISHED",
          result: gameResult,
          endReason: "RESIGNATION",
          whiteTimeMs: Math.round(updatedWhiteTimeMs),
          blackTimeMs: Math.round(updatedBlackTimeMs),
          clockStartedAt: null,
          endedAt: now,
        },
        select: {
          id: true,
          status: true,
          result: true,
          endReason: true,
          fen: true,
          pgn: true,
          whiteTimeMs: true,
          blackTimeMs: true,
          clockStartedAt: true,

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

      return {
        success: true,
        game: updatedGame,
      } as const;
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(
      result,
      { status: 200 },
    );
  } catch (error) {
    console.error("ONLINE RESIGN POST ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}