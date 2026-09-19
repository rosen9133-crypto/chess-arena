import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type DeclineGameChallengeBody = {
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

    const body = (await request.json()) as DeclineGameChallengeBody;
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
      select: { id: true },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Pending challenge not found." },
        { status: 404 },
      );
    }

    await prisma.gameChallenge.update({
      where: { id: challenge.id },
      data: { status: "DECLINED" },
    });

    return NextResponse.json(
      { message: "Challenge declined." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Decline game challenge error:", error);

    return NextResponse.json(
      { error: "Unable to decline challenge." },
      { status: 500 },
    );
  }
}
