import { Chess } from "chess.js";
import type { PieceType } from "@/types/chess";
import {
  whitePieceSymbols,
  blackPieceSymbols,
  pieceOrder,
} from "./chessConstants";

export function getCapturedPieces(game: Chess) {
  const whiteCaptures: PieceType[] = [];
  const blackCaptures: PieceType[] = [];

  const verboseHistory = game.history({
    verbose: true,
  });

  verboseHistory.forEach((move) => {
    if (!move.captured) {
      return;
    }

    const capturedPiece = move.captured as PieceType;

    if (move.color === "w") {
      whiteCaptures.push(capturedPiece);
    } else {
      blackCaptures.push(capturedPiece);
    }
  });

  whiteCaptures.sort(
    (firstPiece, secondPiece) =>
      pieceOrder[firstPiece] -
      pieceOrder[secondPiece],
  );

  blackCaptures.sort(
    (firstPiece, secondPiece) =>
      pieceOrder[firstPiece] -
      pieceOrder[secondPiece],
  );

  return {
    whiteCaptured: whiteCaptures.map(
      (piece) => blackPieceSymbols[piece],
    ),

    blackCaptured: blackCaptures.map(
      (piece) => whitePieceSymbols[piece],
    ),
  };
}