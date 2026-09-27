import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 },
      );
    }

    const incomingGameChallenge =
      await prisma.gameChallenge.findFirst({
        where: {
          challengedId: user.id,
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          timeControl: true,
          initialTimeSeconds: true,
          incrementSeconds: true,
          rated: true,
          createdAt: true,
          challenger: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              bulletRating: true,
              blitzRating: true,
              rapidRating: true,
            },
          },
        },
      });

    return NextResponse.json({
      gameChallenge: incomingGameChallenge,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return NextResponse.json(
      { error: "Unable to load notifications." },
      { status: 500 },
    );
  }
}