import { NextResponse } from "next/server";
import { Chess } from "chess.js";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type DrawAction =
  | "OFFER"
  | "ACCEPT"
  | "DECLINE";

type OnlineDrawBody = {
  gameId?: string;
  action?: DrawAction;
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
      (await request.json()) as OnlineDrawBody;

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
        { error: "Invalid draw action" },
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
            result: true,
            endReason: true,
            fen: true,
            pgn: true,
            whitePlayerId: true,
            blackPlayerId: true,
            whiteTimeMs: true,
            blackTimeMs: true,
            clockStartedAt: true,
            drawOfferBy: true,
            drawOfferedAt: true,
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

        const playerDrawColor = isWhitePlayer
          ? ("WHITE" as const)
          : ("BLACK" as const);

        const opponentDrawColor = isWhitePlayer
          ? ("BLACK" as const)
          : ("WHITE" as const);

        const chess = new Chess();

        try {
          if (game.pgn.trim()) {
            chess.loadPgn(game.pgn);
          } else {
            chess.load(game.fen);
          }
        } catch (error) {
          console.error(
            "ONLINE DRAW LOAD GAME ERROR:",
            error,
          );

          return {
            error: "Stored game position is invalid",
            status: 500,
          } as const;
        }

        const now = new Date();
        const activeColor = chess.turn();

        const activePlayerId =
          activeColor === "w"
            ? game.whitePlayerId
            : game.blackPlayerId;

        if (
          action === "OFFER" &&
          activePlayerId !== currentUser.id
        ) {
          return {
            error:
              "You can only offer a draw on your turn",
            status: 409,
          } as const;
        }

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
            (activeColor === "w"
              ? elapsedMs
              : 0),
        );

        const updatedBlackTimeMs = Math.max(
          0,
          game.blackTimeMs -
            (activeColor === "b"
              ? elapsedMs
              : 0),
        );

        const hasWhiteTimedOut =
          activeColor === "w" &&
          updatedWhiteTimeMs <= 0;

        const hasBlackTimedOut =
          activeColor === "b" &&
          updatedBlackTimeMs <= 0;

        if (
          hasWhiteTimedOut ||
          hasBlackTimedOut
        ) {
          const timeoutResult =
            hasWhiteTimedOut
              ? ("BLACK_WIN" as const)
              : ("WHITE_WIN" as const);

          await tx.game.updateMany({
            where: {
              id: game.id,
              status: "IN_PROGRESS",
            },
            data: {
              status: "FINISHED",
              result: timeoutResult,
              endReason: "TIMEOUT",
              whiteTimeMs: Math.round(
                updatedWhiteTimeMs,
              ),
              blackTimeMs: Math.round(
                updatedBlackTimeMs,
              ),
              clockStartedAt: null,
              drawOfferBy: null,
              drawOfferedAt: null,
              endedAt: now,
            },
          });

          const timeoutGame =
            await tx.game.findUnique({
              where: {
                id: game.id,
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
                drawOfferBy: true,
                drawOfferedAt: true,

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
            game: timeoutGame,
          } as const;
        }

        if (action === "OFFER") {
          if (game.drawOfferBy) {
            return {
              error:
                game.drawOfferBy ===
                playerDrawColor
                  ? "You already offered a draw"
                  : "Your opponent already offered a draw",
              status: 409,
            } as const;
          }

          const updateResult =
            await tx.game.updateMany({
              where: {
                id: game.id,
                status: "IN_PROGRESS",
                drawOfferBy: null,
              },
              data: {
                drawOfferBy: playerDrawColor,
                drawOfferedAt: now,
                whiteTimeMs: Math.round(
                  updatedWhiteTimeMs,
                ),
                blackTimeMs: Math.round(
                  updatedBlackTimeMs,
                ),
                clockStartedAt: now,
              },
            });

          if (updateResult.count !== 1) {
            return {
              error:
                "Draw offer state changed",
              status: 409,
            } as const;
          }
        }

        if (action === "ACCEPT") {
          if (
            game.drawOfferBy !==
            opponentDrawColor
          ) {
            return {
              error:
                "There is no draw offer to accept",
              status: 409,
            } as const;
          }

          const updateResult =
            await tx.game.updateMany({
              where: {
                id: game.id,
                status: "IN_PROGRESS",
                drawOfferBy:
                  opponentDrawColor,
              },
              data: {
                status: "FINISHED",
                result: "DRAW",
                endReason: "DRAW",
                whiteTimeMs: Math.round(
                  updatedWhiteTimeMs,
                ),
                blackTimeMs: Math.round(
                  updatedBlackTimeMs,
                ),
                clockStartedAt: null,
                drawOfferBy: null,
                drawOfferedAt: null,
                endedAt: now,
              },
            });

          if (updateResult.count !== 1) {
            return {
              error:
                "Draw offer state changed",
              status: 409,
            } as const;
          }
        }

        if (action === "DECLINE") {
          if (
            game.drawOfferBy !==
            opponentDrawColor
          ) {
            return {
              error:
                "There is no draw offer to decline",
              status: 409,
            } as const;
          }

          const updateResult =
            await tx.game.updateMany({
              where: {
                id: game.id,
                status: "IN_PROGRESS",
                drawOfferBy:
                  opponentDrawColor,
              },
              data: {
                drawOfferBy: null,
                drawOfferedAt: null,
                whiteTimeMs: Math.round(
                  updatedWhiteTimeMs,
                ),
                blackTimeMs: Math.round(
                  updatedBlackTimeMs,
                ),
                clockStartedAt: now,
              },
            });

          if (updateResult.count !== 1) {
            return {
              error:
                "Draw offer state changed",
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
              status: true,
              result: true,
              endReason: true,
              fen: true,
              pgn: true,
              whiteTimeMs: true,
              blackTimeMs: true,
              clockStartedAt: true,
              drawOfferBy: true,
              drawOfferedAt: true,

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
      "ONLINE DRAW POST ERROR:",
      error,
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}