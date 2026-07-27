import { Chess } from "chess.js";

export type GameResult = {
  title: string;
  subtitle: string;
} | null;

export function getGameResult(game: Chess): GameResult {
  if (!game.isGameOver()) {
    return null;
  }

  if (game.isCheckmate()) {
    const winner = game.turn() === "w" ? "Black" : "White";

    return {
      title: "🏆 Checkmate!",
      subtitle: `${winner} wins!`,
    };
  }

  if (game.isStalemate()) {
    return {
      title: "🤝 Draw",
      subtitle: "Stalemate",
    };
  }

  if (game.isThreefoldRepetition()) {
    return {
      title: "🤝 Draw",
      subtitle: "Threefold repetition",
    };
  }

  if (game.isInsufficientMaterial()) {
    return {
      title: "🤝 Draw",
      subtitle: "Insufficient material",
    };
  }

  if (game.isDrawByFiftyMoves()) {
    return {
      title: "🤝 Draw",
      subtitle: "50-move rule",
    };
  }

  return {
    title: "🤝 Draw",
    subtitle: "Draw",
  };
}