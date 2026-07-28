import type { CSSProperties } from "react";
import { Chess, type Square } from "chess.js";

export function getLastMoveSquareStyles(game: Chess) {
  const history = game.history({
    verbose: true,
  });

  const lastMove = history.at(-1);

  if (!lastMove) {
    return {};
  }

  const highlightedSquareStyle: CSSProperties = {
    background:
      "radial-gradient(circle, rgba(250, 204, 21, 0.72) 0%, rgba(234, 179, 8, 0.48) 100%)",

    boxShadow:
      "inset 0 0 0 4px rgba(253, 224, 71, 0.62)",
  };

  return {
    [lastMove.from as Square]:
      highlightedSquareStyle,

    [lastMove.to as Square]:
      highlightedSquareStyle,
  };
}

export function getCheckSquareStyles(game: Chess) {
  if (!game.isCheck()) {
    return {};
  }

  const board = game.board();

  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 8; column++) {
      const piece = board[row][column];

      if (
        piece &&
        piece.type === "k" &&
        piece.color === game.turn()
      ) {
        const file = String.fromCharCode(
          97 + column,
        );

        const rank = String(8 - row);

        const kingSquare =
          `${file}${rank}` as Square;

        const checkedKingStyle: CSSProperties = {
          background:
            "radial-gradient(circle, rgba(239, 68, 68, 0.95) 0%, rgba(185, 28, 28, 0.9) 55%, rgba(127, 29, 29, 0.95) 100%)",

          boxShadow:
            "inset 0 0 0 4px rgba(254, 202, 202, 0.65), inset 0 0 24px rgba(127, 29, 29, 0.9)",
        };

        return {
          [kingSquare]:
            checkedKingStyle,
        };
      }
    }
  }

  return {};
}