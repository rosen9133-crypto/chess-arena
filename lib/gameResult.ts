import { Chess } from "chess.js";
import type { GameOverDetails } from "@/types/chess";

export function getGameResult(
  game: Chess,
): GameOverDetails {
  if (!game.isGameOver()) {
    return {
      isOpen: false,
      title: "",
      subtitle: "",
      score: "",
      result: null,
    };
  }

  if (game.isCheckmate()) {
    const whiteWon = game.turn() === "b";

    return {
      isOpen: true,
      title: "Checkmate",
      subtitle: whiteWon
        ? "White wins the game."
        : "Black wins the game.",
      score: whiteWon ? "1–0" : "0–1",
      result: whiteWon
        ? "white-win"
        : "black-win",
    };
  }

  if (game.isStalemate()) {
    return {
      isOpen: true,
      title: "Stalemate",
      subtitle:
        "The player has no legal moves, but the king is not in check.",
      score: "½–½",
      result: "draw",
    };
  }

  if (game.isThreefoldRepetition()) {
    return {
      isOpen: true,
      title: "Draw",
      subtitle:
        "The position was repeated three times.",
      score: "½–½",
      result: "draw",
    };
  }

  if (game.isInsufficientMaterial()) {
    return {
      isOpen: true,
      title: "Draw",
      subtitle:
        "There is insufficient material to deliver checkmate.",
      score: "½–½",
      result: "draw",
    };
  }

  if (game.isDrawByFiftyMoves()) {
    return {
      isOpen: true,
      title: "Draw",
      subtitle: "50-move rule.",
      score: "½–½",
      result: "draw",
    };
  }

  return {
    isOpen: true,
    title: "Draw",
    subtitle: "The game ended in a draw.",
    score: "½–½",
    result: "draw",
  };
}