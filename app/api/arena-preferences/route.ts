import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RomanBoardStyle = "classic" | "roman";
type RomanArenaEffects = "off" | "low" | "high";
type ArenaId =
  | "classic"
  | "roman-colosseum"
  | "frozen-kingdom"
  | "cosmic-arena"
  | "inferno-arena"
  | "dragon-temple"
  | "desert-oasis";

type UpdateArenaPreferencesBody = {
  activeArena?: ArenaId;
  romanBoardStyle?: RomanBoardStyle;
  romanArenaEffects?: RomanArenaEffects;
};

const VALID_ARENAS: ArenaId[] = [
  "classic",
  "roman-colosseum",
  "frozen-kingdom",
  "cosmic-arena",
  "inferno-arena",
  "dragon-temple",
  "desert-oasis",
];
const VALID_BOARD_STYLES: RomanBoardStyle[] = ["classic", "roman"];
const VALID_ARENA_EFFECTS: RomanArenaEffects[] = ["off", "low", "high"];

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    select: {
      activeArena: true,
      romanBoardStyle: true,
      romanArenaEffects: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    activeArena: user.activeArena,
    romanBoardStyle: user.romanBoardStyle,
    romanArenaEffects: user.romanArenaEffects,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: UpdateArenaPreferencesBody;

  try {
    body = (await request.json()) as UpdateArenaPreferencesBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { activeArena, romanBoardStyle, romanArenaEffects } = body;

  if (
    activeArena === undefined &&
    romanBoardStyle === undefined &&
    romanArenaEffects === undefined
  ) {
    return NextResponse.json(
      { error: "No preferences provided" },
      { status: 400 }
    );
  }

  if (activeArena !== undefined && !VALID_ARENAS.includes(activeArena)) {
    return NextResponse.json(
      { error: "Invalid arena" },
      { status: 400 }
    );
  }

  if (
    romanBoardStyle !== undefined &&
    !VALID_BOARD_STYLES.includes(romanBoardStyle)
  ) {
    return NextResponse.json(
      { error: "Invalid board style" },
      { status: 400 }
    );
  }

  if (
    romanArenaEffects !== undefined &&
    !VALID_ARENA_EFFECTS.includes(romanArenaEffects)
  ) {
    return NextResponse.json(
      { error: "Invalid arena effects level" },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: {
      email: session.user.email,
    },
    data: {
      ...(activeArena !== undefined ? { activeArena } : {}),
      ...(romanBoardStyle !== undefined
        ? { romanBoardStyle }
        : {}),
      ...(romanArenaEffects !== undefined
        ? { romanArenaEffects }
        : {}),
    },
    select: {
      activeArena: true,
      romanBoardStyle: true,
      romanArenaEffects: true,
    },
  });

  return NextResponse.json({
    activeArena: user.activeArena,
    romanBoardStyle: user.romanBoardStyle,
    romanArenaEffects: user.romanArenaEffects,
  });
}