import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { calculateGlicko2Rating, type MatchResult } from "@/lib/glicko2";
import { prisma } from "@/lib/prisma";

type RequestBody = {
  gameId?: string;
};

type RatingState = {
  rating: number;
  ratingDeviation: number;
  volatility: number;
};

function getScores(result: "WHITE_WIN" | "BLACK_WIN" | "DRAW") {
  if (result === "WHITE_WIN") {
    return {
      whiteScore: 1 as MatchResult,
      blackScore: 0 as MatchResult,
    };
  }

  if (result === "BLACK_WIN") {
    return {
      whiteScore: 0 as MatchResult,
      blackScore: 1 as MatchResult,
    };
  }

  return {
    whiteScore: 0.5 as MatchResult,
    blackScore: 0.5 as MatchResult,
  };
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const userEmail = session.user.email;

  let body: RequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const gameId = body.gameId?.trim();

  if (!gameId) {
    return NextResponse.json(
      { error: "Game ID is required" },
      { status: 400 },
    );
  }

  try {
    const response = await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { email: userEmail },
        select: { id: true },
      });

      if (!currentUser) {
        return {
          error: "Current user not found",
          status: 404,
        } as const;
      }

      const game = await tx.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          status: true,
          result: true,
          rated: true,
          timeControl: true,
          whitePlayerId: true,
          blackPlayerId: true,
          ratingProcessedAt: true,
          whiteRatingBefore: true,
          whiteRatingAfter: true,
          blackRatingBefore: true,
          blackRatingAfter: true,
          whitePlayer: {
            select: {
              id: true,
              username: true,
              bulletRating: true,
              bulletRatingDeviation: true,
              bulletVolatility: true,
              blitzRating: true,
              blitzRatingDeviation: true,
              blitzVolatility: true,
              rapidRating: true,
              rapidRatingDeviation: true,
              rapidVolatility: true,
            },
          },
          blackPlayer: {
            select: {
              id: true,
              username: true,
              bulletRating: true,
              bulletRatingDeviation: true,
              bulletVolatility: true,
              blitzRating: true,
              blitzRatingDeviation: true,
              blitzVolatility: true,
              rapidRating: true,
              rapidRatingDeviation: true,
              rapidVolatility: true,
            },
          },
        },
      });

      if (!game) {
        return { error: "Game not found", status: 404 } as const;
      }

      const isPlayer =
        game.whitePlayerId === currentUser.id ||
        game.blackPlayerId === currentUser.id;

      if (!isPlayer) {
        return { error: "Forbidden", status: 403 } as const;
      }

      if (game.status !== "FINISHED" || !game.result) {
        return {
          error: "Game is not finished",
          status: 409,
        } as const;
      }

      if (!game.rated) {
        return {
          error: "This game is not rated",
          status: 409,
        } as const;
      }

      if (game.ratingProcessedAt) {
        return {
          success: true,
          alreadyProcessed: true,
          gameId: game.id,
          timeControl: game.timeControl,
          result: game.result,
          whitePlayer: {
            id: game.whitePlayer.id,
            username: game.whitePlayer.username,
            oldRating: game.whiteRatingBefore,
            newRating: game.whiteRatingAfter,
            ratingChange:
              game.whiteRatingBefore !== null &&
              game.whiteRatingAfter !== null
                ? game.whiteRatingAfter - game.whiteRatingBefore
                : null,
          },
          blackPlayer: {
            id: game.blackPlayer.id,
            username: game.blackPlayer.username,
            oldRating: game.blackRatingBefore,
            newRating: game.blackRatingAfter,
            ratingChange:
              game.blackRatingBefore !== null &&
              game.blackRatingAfter !== null
                ? game.blackRatingAfter - game.blackRatingBefore
                : null,
          },
        } as const;
      }

      const processedAt = new Date();

      const claimedGame = await tx.game.updateMany({
        where: {
          id: game.id,
          status: "FINISHED",
          rated: true,
          ratingProcessedAt: null,
        },
        data: { ratingProcessedAt: processedAt },
      });

      if (claimedGame.count === 0) {
        const processedGame = await tx.game.findUnique({
          where: { id: game.id },
          select: {
            whiteRatingBefore: true,
            whiteRatingAfter: true,
            blackRatingBefore: true,
            blackRatingAfter: true,
          },
        });

        const whiteBefore =
          processedGame?.whiteRatingBefore ?? null;
        const whiteAfter =
          processedGame?.whiteRatingAfter ?? null;
        const blackBefore =
          processedGame?.blackRatingBefore ?? null;
        const blackAfter =
          processedGame?.blackRatingAfter ?? null;

        return {
          success: true,
          alreadyProcessed: true,
          gameId: game.id,
          timeControl: game.timeControl,
          result: game.result,
          whitePlayer: {
            id: game.whitePlayer.id,
            username: game.whitePlayer.username,
            oldRating: whiteBefore,
            newRating: whiteAfter,
            ratingChange:
              whiteBefore !== null && whiteAfter !== null
                ? whiteAfter - whiteBefore
                : null,
          },
          blackPlayer: {
            id: game.blackPlayer.id,
            username: game.blackPlayer.username,
            oldRating: blackBefore,
            newRating: blackAfter,
            ratingChange:
              blackBefore !== null && blackAfter !== null
                ? blackAfter - blackBefore
                : null,
          },
        } as const;
      }

      let whiteRatingState: RatingState;
      let blackRatingState: RatingState;

      if (game.timeControl === "BULLET") {
        whiteRatingState = {
          rating: game.whitePlayer.bulletRating,
          ratingDeviation: game.whitePlayer.bulletRatingDeviation,
          volatility: game.whitePlayer.bulletVolatility,
        };
        blackRatingState = {
          rating: game.blackPlayer.bulletRating,
          ratingDeviation: game.blackPlayer.bulletRatingDeviation,
          volatility: game.blackPlayer.bulletVolatility,
        };
      } else if (game.timeControl === "BLITZ") {
        whiteRatingState = {
          rating: game.whitePlayer.blitzRating,
          ratingDeviation: game.whitePlayer.blitzRatingDeviation,
          volatility: game.whitePlayer.blitzVolatility,
        };
        blackRatingState = {
          rating: game.blackPlayer.blitzRating,
          ratingDeviation: game.blackPlayer.blitzRatingDeviation,
          volatility: game.blackPlayer.blitzVolatility,
        };
      } else {
        whiteRatingState = {
          rating: game.whitePlayer.rapidRating,
          ratingDeviation: game.whitePlayer.rapidRatingDeviation,
          volatility: game.whitePlayer.rapidVolatility,
        };
        blackRatingState = {
          rating: game.blackPlayer.rapidRating,
          ratingDeviation: game.blackPlayer.rapidRatingDeviation,
          volatility: game.blackPlayer.rapidVolatility,
        };
      }

      const { whiteScore, blackScore } = getScores(game.result);

      const newWhiteRating = calculateGlicko2Rating(
        whiteRatingState,
        [
          {
            opponent: blackRatingState,
            score: whiteScore,
          },
        ],
      );

      const newBlackRating = calculateGlicko2Rating(
        blackRatingState,
        [
          {
            opponent: whiteRatingState,
            score: blackScore,
          },
        ],
      );

      const whiteStats =
        game.result === "WHITE_WIN"
          ? { wins: { increment: 1 } }
          : game.result === "BLACK_WIN"
            ? { losses: { increment: 1 } }
            : { draws: { increment: 1 } };

      const blackStats =
        game.result === "BLACK_WIN"
          ? { wins: { increment: 1 } }
          : game.result === "WHITE_WIN"
            ? { losses: { increment: 1 } }
            : { draws: { increment: 1 } };

      if (game.timeControl === "BULLET") {
        await tx.user.update({
          where: { id: game.whitePlayerId },
          data: {
            ...whiteStats,
            bulletRating: newWhiteRating.rating,
            bulletRatingDeviation: newWhiteRating.ratingDeviation,
            bulletVolatility: newWhiteRating.volatility,
          },
        });
        await tx.user.update({
          where: { id: game.blackPlayerId },
          data: {
            ...blackStats,
            bulletRating: newBlackRating.rating,
            bulletRatingDeviation: newBlackRating.ratingDeviation,
            bulletVolatility: newBlackRating.volatility,
          },
        });
      } else if (game.timeControl === "BLITZ") {
        await tx.user.update({
          where: { id: game.whitePlayerId },
          data: {
            ...whiteStats,
            blitzRating: newWhiteRating.rating,
            blitzRatingDeviation: newWhiteRating.ratingDeviation,
            blitzVolatility: newWhiteRating.volatility,
          },
        });
        await tx.user.update({
          where: { id: game.blackPlayerId },
          data: {
            ...blackStats,
            blitzRating: newBlackRating.rating,
            blitzRatingDeviation: newBlackRating.ratingDeviation,
            blitzVolatility: newBlackRating.volatility,
          },
        });
      } else {
        await tx.user.update({
          where: { id: game.whitePlayerId },
          data: {
            ...whiteStats,
            rapidRating: newWhiteRating.rating,
            rapidRatingDeviation: newWhiteRating.ratingDeviation,
            rapidVolatility: newWhiteRating.volatility,
          },
        });
        await tx.user.update({
          where: { id: game.blackPlayerId },
          data: {
            ...blackStats,
            rapidRating: newBlackRating.rating,
            rapidRatingDeviation: newBlackRating.ratingDeviation,
            rapidVolatility: newBlackRating.volatility,
          },
        });
      }

      await tx.game.update({
        where: { id: game.id },
        data: {
          ratingProcessedAt: processedAt,
          whiteRatingBefore: whiteRatingState.rating,
          whiteRatingAfter: newWhiteRating.rating,
          blackRatingBefore: blackRatingState.rating,
          blackRatingAfter: newBlackRating.rating,
        },
      });

      return {
        success: true,
        alreadyProcessed: false,
        gameId: game.id,
        timeControl: game.timeControl,
        result: game.result,
        whitePlayer: {
          id: game.whitePlayer.id,
          username: game.whitePlayer.username,
          oldRating: whiteRatingState.rating,
          newRating: newWhiteRating.rating,
          ratingChange: newWhiteRating.rating - whiteRatingState.rating,
        },
        blackPlayer: {
          id: game.blackPlayer.id,
          username: game.blackPlayer.username,
          oldRating: blackRatingState.rating,
          newRating: newBlackRating.rating,
          ratingChange: newBlackRating.rating - blackRatingState.rating,
        },
      } as const;
    });

    if ("error" in response) {
      return NextResponse.json(
        { error: response.error },
        { status: response.status },
      );
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("RATED GAME RESULT ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}