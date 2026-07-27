"use client";

type PromotionPiece = "q" | "r" | "b" | "n";

type PromotionDialogProps = {
  isOpen: boolean;
  color: "w" | "b";
  onSelect: (piece: PromotionPiece) => void;
};

const whitePieces = [
  { type: "q" as const, symbol: "♕", name: "Дама" },
  { type: "r" as const, symbol: "♖", name: "Топ" },
  { type: "b" as const, symbol: "♗", name: "Офицер" },
  { type: "n" as const, symbol: "♘", name: "Кон" },
];

const blackPieces = [
  { type: "q" as const, symbol: "♛", name: "Дама" },
  { type: "r" as const, symbol: "♜", name: "Топ" },
  { type: "b" as const, symbol: "♝", name: "Офицер" },
  { type: "n" as const, symbol: "♞", name: "Кон" },
];

export default function PromotionDialog({
  isOpen,
  color,
  onSelect,
}: PromotionDialogProps) {
  if (!isOpen) {
    return null;
  }

  const pieces = color === "w" ? whitePieces : blackPieces;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[420px] rounded-2xl border border-yellow-500 bg-slate-900 p-6 shadow-2xl">

        <h2 className="mb-2 text-center text-3xl font-bold text-yellow-400">
          👑 Промоция на пешка
        </h2>

        <p className="mb-6 text-center text-slate-300">
          Избери фигура
        </p>

        <div className="grid grid-cols-2 gap-4">

          {pieces.map((piece) => (
            <button
              key={piece.type}
              onClick={() => onSelect(piece.type)}
              className="
                flex
                flex-col
                items-center
                justify-center
                rounded-xl
                border
                border-slate-700
                bg-slate-800
                p-5
                transition-all
                duration-200
                hover:scale-105
                hover:border-yellow-400
                hover:bg-slate-700
              "
            >
              <span className="text-6xl">
                {piece.symbol}
              </span>

              <span className="mt-3 text-lg font-semibold text-white">
                {piece.name}
              </span>
            </button>
          ))}

        </div>
      </div>
    </div>
  );
}