import { NextResponse } from "next/server";
import { Chess, type Square } from "chess.js";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type OnlineMoveBody = {
  gameId?: string;
  from?: string;
  to?: string;
  promotion?: "q" | "r" | "b" | "n";
};

function isValidSquare(value: string): value is Square {
  return /^[a-h][1-8]$/.test(value);
}

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId");

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
        username: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "Current user not found" },
        { status: 404 },
      );
    }

    const game = await prisma.game.findUnique({
      where: {
        id: gameId,
      },
      select: {
        id: true,
        status: true,
        result: true,
        fen: true,
        pgn: true,
        whitePlayerId: true,
        blackPlayerId: true,
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

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 },
      );
    }

    const isPlayer =
      game.whitePlayerId === currentUser.id ||
      game.blackPlayerId === currentUser.id;

    if (!isPlayer) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    const chess = new Chess();

    try {
      if (game.pgn.trim()) {
        chess.loadPgn(game.pgn);
      } else {
        chess.load(game.fen);
      }
    } catch (error) {
      console.error("ONLINE MOVE GET LOAD GAME ERROR:", error);

      return NextResponse.json(
        { error: "Stored game position is invalid" },
        { status: 500 },
      );
    }

    const responseNow = new Date();
    const activeColor =
      game.status === "IN_PROGRESS" ? chess.turn() : null;

    const elapsedMs =
      activeColor && game.clockStartedAt
        ? Math.max(
            0,
            responseNow.getTime() -
              game.clockStartedAt.getTime(),
          )
        : 0;

    const currentWhiteTimeMs = Math.max(
      0,
      game.whiteTimeMs -
        (activeColor === "w" ? elapsedMs : 0),
    );

    const currentBlackTimeMs = Math.max(
      0,
      game.blackTimeMs -
        (activeColor === "b" ? elapsedMs : 0),
    );

    return NextResponse.json(
      {
        success: true,
        game: {
          id: game.id,
          status: game.status,
          result: game.result,
          fen: game.fen,
          pgn: game.pgn,
          timeControl: game.timeControl,
          rated: game.rated,
          initialTimeSeconds: game.initialTimeSeconds,
          incrementSeconds: game.incrementSeconds,
          whiteTimeMs: Math.round(currentWhiteTimeMs),
          blackTimeMs: Math.round(currentBlackTimeMs),
          clockStartedAt:
            activeColor && game.clockStartedAt
              ? responseNow
              : game.clockStartedAt,
          startedAt: game.startedAt,
          endedAt: game.endedAt,
          whitePlayer: game.whitePlayer,
          blackPlayer: game.blackPlayer,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("ONLINE MOVE GET ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as OnlineMoveBody;

    const {
      gameId,
      from,
      to,
      promotion,
    } = body;

    if (!gameId) {
      return NextResponse.json(
        { error: "Game ID is required" },
        { status: 400 },
      );
    }

    if (
      typeof from !== "string" ||
      !isValidSquare(from)
    ) {
      return NextResponse.json(
        { error: "Invalid source square" },
        { status: 400 },
      );
    }

    if (
      typeof to !== "string" ||
      !isValidSquare(to)
    ) {
      return NextResponse.json(
        { error: "Invalid target square" },
        { status: 400 },
      );
    }

    if (
      promotion !== undefined &&
      !["q", "r", "b", "n"].includes(promotion)
    ) {
      return NextResponse.json(
        { error: "Invalid promotion piece" },
        { status: 400 },
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
          result: true,
          fen: true,
          pgn: true,
          whitePlayerId: true,
          blackPlayerId: true,
          incrementSeconds: true,
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
          "ONLINE MOVE LOAD GAME ERROR:",
          error,
        );

        return {
          error: "Stored game position is invalid",
          status: 500,
        } as const;
      }

      const movingColor = chess.turn();

      const expectedPlayerId =
        movingColor === "w"
          ? game.whitePlayerId
          : game.blackPlayerId;

      if (expectedPlayerId !== currentUser.id) {
        return {
          error: "It is not your turn",
          status: 409,
        } as const;
      }

      const movingPiece = chess.get(from);

      if (!movingPiece) {
        return {
          error: "No piece on source square",
          status: 400,
        } as const;
      }

      const expectedColor =
        isWhitePlayer ? "w" : "b";

      if (movingPiece.color !== expectedColor) {
        return {
          error: "You cannot move that piece",
          status: 403,
        } as const;
      }

      const now = new Date();

      const elapsedMs = game.clockStartedAt
        ? Math.max(
            0,
            now.getTime() -
              game.clockStartedAt.getTime(),
          )
        : 0;

      const currentPlayerTimeMs =
        movingColor === "w"
          ? game.whiteTimeMs
          : game.blackTimeMs;

      const remainingBeforeIncrement =
        currentPlayerTimeMs - elapsedMs;

      if (remainingBeforeIncrement <= 0) {
        return {
          error: "Your time has expired",
          status: 409,
        } as const;
      }

      let move;

      try {
        move = chess.move({
          from,
          to,
          ...(promotion
            ? { promotion }
            : {}),
        });
      } catch {
        return {
          error: "Illegal move",
          status: 400,
        } as const;
      }

      if (!move) {
        return {
          error: "Illegal move",
          status: 400,
        } as const;
      }

      const incrementMs =
        game.incrementSeconds * 1000;

      const updatedWhiteTimeMs =
        movingColor === "w"
          ? remainingBeforeIncrement + incrementMs
          : game.whiteTimeMs;

      const updatedBlackTimeMs =
        movingColor === "b"
          ? remainingBeforeIncrement + incrementMs
          : game.blackTimeMs;

      const isCheckmate = chess.isCheckmate();
      const isDraw =
        !isCheckmate && chess.isGameOver();

      const finished = isCheckmate || isDraw;

      const gameResult =
        isCheckmate
          ? movingColor === "w"
            ? ("WHITE_WIN" as const)
            : ("BLACK_WIN" as const)
          : isDraw
            ? ("DRAW" as const)
            : null;

      const updatedGame = await tx.game.update({
        where: {
          id: game.id,
          status: "IN_PROGRESS",
        },
        data: {
          fen: chess.fen(),
          pgn: chess.pgn(),
          whiteTimeMs: Math.max(
            0,
            Math.round(updatedWhiteTimeMs),
          ),
          blackTimeMs: Math.max(
            0,
            Math.round(updatedBlackTimeMs),
          ),
          status: finished ? "FINISHED" : "IN_PROGRESS",
          result: gameResult,
          endedAt: finished ? now : null,
          clockStartedAt: finished ? null : now,
        },
        select: {
          id: true,
          status: true,
          result: true,
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
        move: {
          from: move.from,
          to: move.to,
          san: move.san,
          color: move.color,
          piece: move.piece,
          captured: move.captured ?? null,
          promotion: move.promotion ?? null,
        },
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
    console.error("ONLINE MOVE POST ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}