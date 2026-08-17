import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { calculateGlicko2Rating, type MatchResult } from "@/lib/glicko2";
import { prisma } from "@/lib/prisma";

type TimeControl = "bullet" | "blitz" | "rapid";
type GameResult = "win" | "loss" | "draw";

type RequestBody = {
  opponentId?: string;
  result?: GameResult;
  timeControl?: TimeControl;
};

function getScore(result: GameResult): MatchResult {
  if (result === "win") {
    return 1;
  }

  if (result === "draw") {
    return 0.5;
  }

  return 0;
}

function getOpponentScore(result: GameResult): MatchResult {
  if (result === "win") {
    return 0;
  }

  if (result === "draw") {
    return 0.5;
  }

  return 1;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: RequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { opponentId, result, timeControl } = body;

  if (!opponentId) {
    return NextResponse.json(
      { error: "Opponent ID is required" },
      { status: 400 },
    );
  }

  if (
    result !== "win" &&
    result !== "loss" &&
    result !== "draw"
  ) {
    return NextResponse.json(
      { error: "Invalid game result" },
      { status: 400 },
    );
  }

  if (
    timeControl !== "bullet" &&
    timeControl !== "blitz" &&
    timeControl !== "rapid"
  ) {
    return NextResponse.json(
      { error: "Invalid time control" },
      { status: 400 },
    );
  }

  const player = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
  });

  if (!player) {
    return NextResponse.json(
      { error: "Player not found" },
      { status: 404 },
    );
  }

  if (player.id === opponentId) {
    return NextResponse.json(
      { error: "You cannot play a rated game against yourself" },
      { status: 400 },
    );
  }

  const opponent = await prisma.user.findUnique({
    where: {
      id: opponentId,
    },
  });

  if (!opponent) {
    return NextResponse.json(
      { error: "Opponent not found" },
      { status: 404 },
    );
  }

  const playerScore = getScore(result);
  const opponentScore = getOpponentScore(result);

  let playerRating: number;
  let playerRatingDeviation: number;
  let playerVolatility: number;

  let opponentRating: number;
  let opponentRatingDeviation: number;
  let opponentVolatility: number;

  if (timeControl === "bullet") {
    playerRating = player.bulletRating;
    playerRatingDeviation = player.bulletRatingDeviation;
    playerVolatility = player.bulletVolatility;

    opponentRating = opponent.bulletRating;
    opponentRatingDeviation = opponent.bulletRatingDeviation;
    opponentVolatility = opponent.bulletVolatility;
  } else if (timeControl === "blitz") {
    playerRating = player.blitzRating;
    playerRatingDeviation = player.blitzRatingDeviation;
    playerVolatility = player.blitzVolatility;

    opponentRating = opponent.blitzRating;
    opponentRatingDeviation = opponent.blitzRatingDeviation;
    opponentVolatility = opponent.blitzVolatility;
  } else {
    playerRating = player.rapidRating;
    playerRatingDeviation = player.rapidRatingDeviation;
    playerVolatility = player.rapidVolatility;

    opponentRating = opponent.rapidRating;
    opponentRatingDeviation = opponent.rapidRatingDeviation;
    opponentVolatility = opponent.rapidVolatility;
  }

  const newPlayerRating = calculateGlicko2Rating(
    {
      rating: playerRating,
      ratingDeviation: playerRatingDeviation,
      volatility: playerVolatility,
    },
    [
      {
        opponent: {
          rating: opponentRating,
          ratingDeviation: opponentRatingDeviation,
          volatility: opponentVolatility,
        },
        score: playerScore,
      },
    ],
  );

  const newOpponentRating = calculateGlicko2Rating(
    {
      rating: opponentRating,
      ratingDeviation: opponentRatingDeviation,
      volatility: opponentVolatility,
    },
    [
      {
        opponent: {
          rating: playerRating,
          ratingDeviation: playerRatingDeviation,
          volatility: playerVolatility,
        },
        score: opponentScore,
      },
    ],
  );

  const playerStats =
    result === "win"
      ? {
          wins: {
            increment: 1,
          },
        }
      : result === "loss"
        ? {
            losses: {
              increment: 1,
            },
          }
        : {
            draws: {
              increment: 1,
            },
          };

  const opponentStats =
    result === "win"
      ? {
          losses: {
            increment: 1,
          },
        }
      : result === "loss"
        ? {
            wins: {
              increment: 1,
            },
          }
        : {
            draws: {
              increment: 1,
            },
          };

  let playerRatingData;
  let opponentRatingData;

  if (timeControl === "bullet") {
    playerRatingData = {
      bulletRating: newPlayerRating.rating,
      bulletRatingDeviation: newPlayerRating.ratingDeviation,
      bulletVolatility: newPlayerRating.volatility,
    };

    opponentRatingData = {
      bulletRating: newOpponentRating.rating,
      bulletRatingDeviation: newOpponentRating.ratingDeviation,
      bulletVolatility: newOpponentRating.volatility,
    };
  } else if (timeControl === "blitz") {
    playerRatingData = {
      blitzRating: newPlayerRating.rating,
      blitzRatingDeviation: newPlayerRating.ratingDeviation,
      blitzVolatility: newPlayerRating.volatility,
    };

    opponentRatingData = {
      blitzRating: newOpponentRating.rating,
      blitzRatingDeviation: newOpponentRating.ratingDeviation,
      blitzVolatility: newOpponentRating.volatility,
    };
  } else {
    playerRatingData = {
      rapidRating: newPlayerRating.rating,
      rapidRatingDeviation: newPlayerRating.ratingDeviation,
      rapidVolatility: newPlayerRating.volatility,
    };

    opponentRatingData = {
      rapidRating: newOpponentRating.rating,
      rapidRatingDeviation: newOpponentRating.ratingDeviation,
      rapidVolatility: newOpponentRating.volatility,
    };
  }

  const [updatedPlayer, updatedOpponent] = await prisma.$transaction([
    prisma.user.update({
      where: {
        id: player.id,
      },
      data: {
        ...playerRatingData,
        ...playerStats,
      },
    }),

    prisma.user.update({
      where: {
        id: opponent.id,
      },
      data: {
        ...opponentRatingData,
        ...opponentStats,
      },
    }),
  ]);

  const ratingChange =
    newPlayerRating.rating - playerRating;

  return NextResponse.json({
    success: true,
    timeControl,
    result,
    player: {
      id: updatedPlayer.id,
      username: updatedPlayer.username,
      oldRating: playerRating,
      newRating: newPlayerRating.rating,
      ratingChange,
      ratingDeviation: newPlayerRating.ratingDeviation,
      volatility: newPlayerRating.volatility,
    },
    opponent: {
      id: updatedOpponent.id,
      username: updatedOpponent.username,
      oldRating: opponentRating,
      newRating: newOpponentRating.rating,
      ratingChange:
        newOpponentRating.rating - opponentRating,
      ratingDeviation:
        newOpponentRating.ratingDeviation,
      volatility: newOpponentRating.volatility,
    },
  });
}