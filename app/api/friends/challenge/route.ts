import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type SendGameChallengeBody = {
  challengedId?: string;
  timeControl?: "BULLET" | "BLITZ" | "RAPID";
  initialTimeSeconds?: number;
  incrementSeconds?: number;
  rated?: boolean;
};

const ALLOWED_TIME_CONTROLS = new Set(["BULLET", "BLITZ", "RAPID"]);

const ALLOWED_CLOCKS = new Set([
  "BULLET:60:0",
  "BLITZ:180:0",
  "BLITZ:180:2",
  "BLITZ:300:0",
  "RAPID:600:0",
  "RAPID:900:10",
]);

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!currentUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  let body: SendGameChallengeBody;

  try {
    body = (await request.json()) as SendGameChallengeBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const challengedId = body.challengedId?.trim();
  const timeControl = body.timeControl;
  const initialTimeSeconds = body.initialTimeSeconds;
  const incrementSeconds = body.incrementSeconds;
  const rated = body.rated;

  if (!challengedId) {
    return NextResponse.json(
      { error: "Missing challengedId." },
      { status: 400 },
    );
  }

  if (challengedId === currentUser.id) {
    return NextResponse.json(
      { error: "You cannot challenge yourself." },
      { status: 400 },
    );
  }

  if (
    !timeControl ||
    !ALLOWED_TIME_CONTROLS.has(timeControl) ||
    typeof initialTimeSeconds !== "number" ||
    !Number.isInteger(initialTimeSeconds) ||
    typeof incrementSeconds !== "number" ||
    !Number.isInteger(incrementSeconds) ||
    typeof rated !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Invalid challenge settings." },
      { status: 400 },
    );
  }

  const clockKey = `${timeControl}:${initialTimeSeconds}:${incrementSeconds}`;

  if (!ALLOWED_CLOCKS.has(clockKey)) {
    return NextResponse.json(
      { error: "Unsupported time control." },
      { status: 400 },
    );
  }

  const challengedUser = await prisma.user.findUnique({
    where: { id: challengedId },
    select: {
      id: true,
      username: true,
    },
  });

  if (!challengedUser) {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        {
          requesterId: currentUser.id,
          addresseeId: challengedId,
        },
        {
          requesterId: challengedId,
          addresseeId: currentUser.id,
        },
      ],
    },
    select: { id: true },
  });

  if (!friendship) {
    return NextResponse.json(
      { error: "You can only challenge a friend." },
      { status: 403 },
    );
  }

  const block = await prisma.userBlock.findFirst({
    where: {
      OR: [
        {
          blockerId: currentUser.id,
          blockedId: challengedId,
        },
        {
          blockerId: challengedId,
          blockedId: currentUser.id,
        },
      ],
    },
    select: { id: true },
  });

  if (block) {
    return NextResponse.json(
      { error: "Challenge is not available for this player." },
      { status: 403 },
    );
  }

  const existingChallenge = await prisma.gameChallenge.findFirst({
    where: {
      status: "PENDING",
      OR: [
        {
          challengerId: currentUser.id,
          challengedId,
        },
        {
          challengerId: challengedId,
          challengedId: currentUser.id,
        },
      ],
    },
    select: { id: true },
  });

  if (existingChallenge) {
    return NextResponse.json(
      { error: "There is already a pending challenge between these players." },
      { status: 409 },
    );
  }

  const challenge = await prisma.gameChallenge.create({
    data: {
      challengerId: currentUser.id,
      challengedId,
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
      status: true,
      createdAt: true,
      challenged: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  return NextResponse.json(
    {
      message: "Challenge sent.",
      challenge,
    },
    { status: 201 },
  );
}
