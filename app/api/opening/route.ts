import { NextRequest, NextResponse } from "next/server";

import { loadOpenings } from "@/lib/openings/loadOpenings";
import { findOpening } from "@/lib/openings/parser";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      pgn?: unknown;
    };

    if (typeof body.pgn !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "PGN is required.",
        },
        {
          status: 400,
        },
      );
    }

    const pgn = body.pgn.trim();

    if (!pgn) {
      return NextResponse.json({
        success: true,
        opening: null,
      });
    }

    const openings = loadOpenings();
    const opening = findOpening(pgn, openings);

    return NextResponse.json({
      success: true,
      opening,
    });
  } catch (error) {
    console.error("OPENING RECOGNITION ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Could not recognize the opening.",
      },
      {
        status: 500,
      },
    );
  }
}