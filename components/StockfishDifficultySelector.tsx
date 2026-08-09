"use client";

import type { StockfishDifficultyId } from "@/lib/stockfish/difficulty";

type Difficulty = {
  id: StockfishDifficultyId;
  label: string;
  elo: number;
};

type StockfishDifficultySelectorProps = {
  difficulties: readonly Difficulty[];
  selectedDifficultyId: StockfishDifficultyId;
  selectedElo: number;
  disabled?: boolean;
  onSelect: (difficultyId: StockfishDifficultyId) => void;
};

export default function StockfishDifficultySelector({
  difficulties,
  selectedDifficultyId,
  selectedElo,
  disabled = false,
  onSelect,
}: StockfishDifficultySelectorProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Computer strength
        </p>

        <div className="mt-1 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">
            Stockfish Level
          </h2>

          <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2.5 py-1 text-xs font-bold text-yellow-300">
            {selectedElo} Elo
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {difficulties.map((difficulty) => {
          const isSelected =
            difficulty.id === selectedDifficultyId;

          return (
            <button
              key={difficulty.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(difficulty.id)}
              className={[
                "rounded-xl border px-3 py-2.5 text-left transition",
                isSelected
                  ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
                  : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500 hover:bg-slate-800",
                disabled
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer",
              ].join(" ")}
            >
              <span className="block text-sm font-semibold">
                {difficulty.label}
              </span>

              <span className="mt-0.5 block text-xs text-slate-500">
                {difficulty.elo} Elo
              </span>
            </button>
          );
        })}
      </div>

      {disabled && (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Start a new game to change the computer level.
        </p>
      )}
    </section>
  );
}