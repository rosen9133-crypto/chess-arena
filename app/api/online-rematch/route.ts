import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RematchAction =
  | "OFFER"
  | "ACCEPT"
  | "DECLINE";

type OnlineRematchBody = {
  gameId?: string;
  action?: RematchAction;
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

    const body =
      (await request.json()) as OnlineRematchBody;

    const { gameId, action } = body;

    if (!gameId) {
      return NextResponse.json(
        { error: "Game ID is required" },
        { status: 400 },
      );
    }

    if (
      action !== "OFFER" &&
      action !== "ACCEPT" &&
      action !== "DECLINE"
    ) {
      return NextResponse.json(
        { error: "Invalid rematch action" },
        { status: 400 },
      );
    }

    const currentUser =
      await prisma.user.findUnique({
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

    const transactionResult =
      await prisma.$transaction(async (tx) => {
        const game = await tx.game.findUnique({
          where: {
            id: gameId,
          },
          select: {
            id: true,
            status: true,
            whitePlayerId: true,
            blackPlayerId: true,
            timeControl: true,
            rated: true,
            initialTimeSeconds: true,
            incrementSeconds: true,
            rematchOfferBy: true,
            rematchOfferedAt: true,
            rematchGameId: true,
          },
        });

        if (!game) {
          return {
            error: "Game not found",
            status: 404,
          } as const;
        }

        if (game.status !== "FINISHED") {
          return {
            error:
              "A rematch can only be requested after the game is finished",
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

        const playerRematchColor = isWhitePlayer
          ? ("WHITE" as const)
          : ("BLACK" as const);

        const opponentRematchColor = isWhitePlayer
          ? ("BLACK" as const)
          : ("WHITE" as const);

        if (game.rematchGameId) {
          const existingRematch =
            await tx.game.findUnique({
              where: {
                id: game.rematchGameId,
              },
              select: {
                id: true,
              },
            });

          return {
            success: true,
            rematchGame: existingRematch,
          } as const;
        }

        if (action === "OFFER") {
          if (game.rematchOfferBy) {
            return {
              error:
                game.rematchOfferBy ===
                playerRematchColor
                  ? "You already requested a rematch"
                  : "Your opponent already requested a rematch",
              status: 409,
            } as const;
          }

          const updateResult =
            await tx.game.updateMany({
              where: {
                id: game.id,
                status: "FINISHED",
                rematchOfferBy: null,
                rematchGameId: null,
              },
              data: {
                rematchOfferBy:
                  playerRematchColor,
                rematchOfferedAt: new Date(),
              },
            });

          if (updateResult.count !== 1) {
            return {
              error:
                "Rematch state changed",
              status: 409,
            } as const;
          }
        }

        if (action === "ACCEPT") {
          if (
            game.rematchOfferBy !==
            opponentRematchColor
          ) {
            return {
              error:
                "There is no rematch request to accept",
              status: 409,
            } as const;
          }

          const claimResult =
            await tx.game.updateMany({
              where: {
                id: game.id,
                status: "FINISHED",
                rematchOfferBy:
                  opponentRematchColor,
                rematchGameId: null,
              },
              data: {
                rematchOfferBy: null,
                rematchOfferedAt: null,
              },
            });

          if (claimResult.count !== 1) {
            return {
              error:
                "Rematch state changed",
              status: 409,
            } as const;
          }

          const initialTimeMs =
            game.initialTimeSeconds * 1000;

          const rematchGame =
            await tx.game.create({
              data: {
                whitePlayerId:
                  game.blackPlayerId,
                blackPlayerId:
                  game.whitePlayerId,
                timeControl:
                  game.timeControl,
                rated: game.rated,
                initialTimeSeconds:
                  game.initialTimeSeconds,
                incrementSeconds:
                  game.incrementSeconds,
                whiteTimeMs: initialTimeMs,
                blackTimeMs: initialTimeMs,
                clockStartedAt: new Date(),
              },
              select: {
                id: true,
              },
            });

          await tx.game.update({
            where: {
              id: game.id,
            },
            data: {
              rematchGameId:
                rematchGame.id,
            },
          });

          return {
            success: true,
            rematchGame,
          } as const;
        }

        if (action === "DECLINE") {
          if (
            game.rematchOfferBy !==
            opponentRematchColor
          ) {
            return {
              error:
                "There is no rematch request to decline",
              status: 409,
            } as const;
          }

          const updateResult =
            await tx.game.updateMany({
              where: {
                id: game.id,
                status: "FINISHED",
                rematchOfferBy:
                  opponentRematchColor,
                rematchGameId: null,
              },
              data: {
                rematchOfferBy: null,
                rematchOfferedAt: null,
              },
            });

          if (updateResult.count !== 1) {
            return {
              error:
                "Rematch state changed",
              status: 409,
            } as const;
          }
        }

        const updatedGame =
          await tx.game.findUnique({
            where: {
              id: game.id,
            },
            select: {
              id: true,
              rematchOfferBy: true,
              rematchOfferedAt: true,
              rematchGameId: true,
            },
          });

        return {
          success: true,
          game: updatedGame,
        } as const;
      });

    if ("error" in transactionResult) {
      return NextResponse.json(
        {
          error: transactionResult.error,
        },
        {
          status: transactionResult.status,
        },
      );
    }

    return NextResponse.json(
      transactionResult,
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "ONLINE REMATCH POST ERROR:",
      error,
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}