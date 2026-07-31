import { Chess } from "chess.js";

export function createGameWithHistory(
  game: Chess,
  movesToKeep?: number,
) {
  const newGame = new Chess();

  const completeHistory = game.history({
    verbose: true,
  });

  const historyToReplay =
    typeof movesToKeep === "number"
      ? completeHistory.slice(0, movesToKeep)
      : completeHistory;

  historyToReplay.forEach((move) => {
    newGame.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });
  });

  return newGame;
}