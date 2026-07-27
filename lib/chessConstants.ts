import { PieceType } from "@/types/chess";

export const whitePieceSymbols: Record<PieceType, string> = {
  p: "♙",
  n: "♘",
  b: "♗",
  r: "♖",
  q: "♕",
};

export const blackPieceSymbols: Record<PieceType, string> = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
};

export const pieceOrder: Record<PieceType, number> = {
  p: 1,
  n: 2,
  b: 3,
  r: 4,
  q: 5,
};