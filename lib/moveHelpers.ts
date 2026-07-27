import { Chess } from "chess.js";
import type { ChessMove } from "@/types/chess";

export function makeMove(
  game: Chess,
  move: ChessMove,
): boolean {
  const result = game.move(move);

  return result !== null;
}