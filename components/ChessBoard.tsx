"use client";

import type { CSSProperties } from "react";
import { Chessboard } from "react-chessboard";

type ChessBoardProps = {
  position: string;
  boardOrientation: "white" | "black";
  onPieceDrop: (sourceSquare: string, targetSquare: string) => boolean;
  squareStyles: Record<string, CSSProperties>;
};

export default function ChessBoard({
  position,
  boardOrientation,
  onPieceDrop,
  squareStyles,
}: ChessBoardProps) {
  return (
    <div className="mx-auto w-full max-w-[620px] overflow-hidden rounded-xl border border-slate-700 bg-slate-800 p-2 shadow-2xl shadow-black/30">
      <Chessboard
        position={position}
        boardOrientation={boardOrientation}
        onPieceDrop={onPieceDrop}
        customSquareStyles={squareStyles}
      />
    </div>
  );
}