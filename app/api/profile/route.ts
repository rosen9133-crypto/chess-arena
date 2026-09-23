import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type UpdateProfileBody = {
  displayName?: unknown;
  bio?: unknown;
  countryCode?: unknown;
};

function cleanOptionalString(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: UpdateProfileBody;

  try {
    body = (await request.json()) as UpdateProfileBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const displayName = cleanOptionalString(body.displayName);
  const bio = cleanOptionalString(body.bio);
  const rawCountryCode = cleanOptionalString(body.countryCode);
  const countryCode = rawCountryCode?.toUpperCase() ?? null;

  if (displayName && displayName.length > 40) {
    return NextResponse.json(
      { error: "Display name must be 40 characters or fewer." },
      { status: 400 },
    );
  }

  if (bio && bio.length > 160) {
    return NextResponse.json(
      { error: "Bio must be 160 characters or fewer." },
      { status: 400 },
    );
  }

  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    return NextResponse.json(
      { error: "Country code must contain exactly 2 letters." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      displayName,
      bio,
      countryCode,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      countryCode: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json({
    success: true,
    user: updatedUser,
  });
}
