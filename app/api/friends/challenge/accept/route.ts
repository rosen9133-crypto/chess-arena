import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type AcceptGameChallengeBody = {
  challengeId?: string;
};

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 },
      );
    }

    let body: AcceptGameChallengeBody;

    try {
      body = (await request.json()) as AcceptGameChallengeBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const challengeId = body.challengeId?.trim();

    if (!challengeId) {
      return NextResponse.json(
        { error: "Challenge ID is required." },
        { status: 400 },
      );
    }

    const challenge = await prisma.gameChallenge.findFirst({
      where: {
        id: challengeId,
        challengedId: currentUser.id,
        status: "PENDING",
      },
      select: {
        id: true,
        challengerId: true,
        challengedId: true,
        timeControl: true,
        initialTimeSeconds: true,
        incrementSeconds: true,
        rated: true,
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Pending challenge not found." },
        { status: 404 },
      );
    }

    const friendship = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          {
            requesterId: challenge.challengerId,
            addresseeId: challenge.challengedId,
          },
          {
            requesterId: challenge.challengedId,
            addresseeId: challenge.challengerId,
          },
        ],
      },
      select: { id: true },
    });

    if (!friendship) {
      return NextResponse.json(
        { error: "This challenge is no longer available." },
        { status: 403 },
      );
    }

    const block = await prisma.userBlock.findFirst({
      where: {
        OR: [
          {
            blockerId: challenge.challengerId,
            blockedId: challenge.challengedId,
          },
          {
            blockerId: challenge.challengedId,
            blockedId: challenge.challengerId,
          },
        ],
      },
      select: { id: true },
    });

    if (block) {
      return NextResponse.json(
        { error: "This challenge is no longer available." },
        { status: 403 },
      );
    }

    const lastGameBetweenPlayers = await prisma.game.findFirst({
      where: {
        OR: [
          {
            whitePlayerId: challenge.challengerId,
            blackPlayerId: challenge.challengedId,
          },
          {
            whitePlayerId: challenge.challengedId,
            blackPlayerId: challenge.challengerId,
          },
        ],
      },
      orderBy: {
        startedAt: "desc",
      },
      select: {
        whitePlayerId: true,
        blackPlayerId: true,
      },
    });

    let whitePlayerId: string;
    let blackPlayerId: string;

    if (lastGameBetweenPlayers) {
      whitePlayerId = lastGameBetweenPlayers.blackPlayerId;
      blackPlayerId = lastGameBetweenPlayers.whitePlayerId;
    } else {
      const currentUserIsWhite = Math.random() < 0.5;

      whitePlayerId = currentUserIsWhite
        ? challenge.challengedId
        : challenge.challengerId;

      blackPlayerId = currentUserIsWhite
        ? challenge.challengerId
        : challenge.challengedId;
    }

    const initialTimeMs = challenge.initialTimeSeconds * 1000;

    const result = await prisma.$transaction(async (tx) => {
      const accepted = await tx.gameChallenge.updateMany({
        where: {
          id: challenge.id,
          challengedId: currentUser.id,
          status: "PENDING",
        },
        data: {
          status: "ACCEPTED",
        },
      });

      if (accepted.count !== 1) {
        throw new Error("CHALLENGE_NOT_PENDING");
      }

      await tx.matchmakingQueue.deleteMany({
        where: {
          userId: {
            in: [challenge.challengerId, challenge.challengedId],
          },
        },
      });

      const game = await tx.game.create({
        data: {
          whitePlayerId,
          blackPlayerId,
          timeControl: challenge.timeControl,
          rated: challenge.rated,
          initialTimeSeconds: challenge.initialTimeSeconds,
          incrementSeconds: challenge.incrementSeconds,
          whiteTimeMs: initialTimeMs,
          blackTimeMs: initialTimeMs,
          clockStartedAt: null,
        },
        select: {
          id: true,
          status: true,
          timeControl: true,
          rated: true,
          initialTimeSeconds: true,
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

      return game;
    });

    return NextResponse.json(
      {
        message: "Challenge accepted.",
        game: result,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "CHALLENGE_NOT_PENDING"
    ) {
      return NextResponse.json(
        { error: "This challenge is no longer pending." },
        { status: 409 },
      );
    }

    console.error("Accept game challenge error:", error);

    return NextResponse.json(
      { error: "Unable to accept challenge." },
      { status: 500 },
    );
  }
}
