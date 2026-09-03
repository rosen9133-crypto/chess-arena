import type {
  OpeningEntry,
  OpeningMatch,
} from "./types";

function normalizePgnMoves(pgn: string): string[] {
  return pgn
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\$\d+/g, " ")
    .replace(/\d+\.(?:\.\.)?/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .filter(
      (token) =>
        token !== "1-0" &&
        token !== "0-1" &&
        token !== "1/2-1/2" &&
        token !== "½-½" &&
        token !== "*",
    );
}

function movesMatch(
  gameMoves: string[],
  openingMoves: string[],
): boolean {
  if (openingMoves.length > gameMoves.length) {
    return false;
  }

  for (let index = 0; index < openingMoves.length; index += 1) {
    if (gameMoves[index] !== openingMoves[index]) {
      return false;
    }
  }

  return true;
}

export function findOpening(
  gamePgn: string,
  openings: OpeningEntry[],
): OpeningMatch | null {
  const gameMoves = normalizePgnMoves(gamePgn);

  if (gameMoves.length === 0) {
    return null;
  }

  let bestMatch: OpeningMatch | null = null;

  for (const opening of openings) {
    const openingMoves = normalizePgnMoves(opening.pgn);

    if (
      openingMoves.length === 0 ||
      !movesMatch(gameMoves, openingMoves)
    ) {
      continue;
    }

    if (
      !bestMatch ||
      openingMoves.length > bestMatch.matchedMoves
    ) {
      bestMatch = {
        eco: opening.eco,
        name: opening.name,
        pgn: opening.pgn,
        matchedMoves: openingMoves.length,
      };
    }
  }

  return bestMatch;
}