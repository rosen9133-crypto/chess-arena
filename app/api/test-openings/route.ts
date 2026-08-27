import { NextResponse } from "next/server";

import { loadOpenings } from "@/lib/openings/loadOpenings";
import { findOpening } from "@/lib/openings/parser";

export async function GET() {
  const openings = loadOpenings();

  const testPgn =
    "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6";

  const match = findOpening(testPgn, openings);

  return NextResponse.json({
    totalOpenings: openings.length,
    testPgn,
    match,
  });
}