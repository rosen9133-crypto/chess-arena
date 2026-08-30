"use client";

import {
  useEffect,
  useRef,
} from "react";

type MoveHistoryProps = {
  history: string[];
  currentMoveIndex: number;
  result?: string;
  onMoveSelect: (index: number) => void;
  onFirstMove: () => void;
  onPreviousMove: () => void;
  onNextMove: () => void;
  onLastMove: () => void;
};

export function MoveHistory({
  history,
  currentMoveIndex,
  result,
  onMoveSelect,
  onFirstMove,
  onPreviousMove,
  onNextMove,
  onLastMove,
}: MoveHistoryProps) {
  const scrollContainerRef =
    useRef<HTMLDivElement | null>(null);

  const rows = [];

  for (let i = 0; i < history.length; i += 2) {
    rows.push({
      move: i / 2 + 1,
      white: history[i] ?? "",
      black: history[i + 1] ?? "",
      whiteIndex: i + 1,
      blackIndex: i + 2,
    });
  }

  const isAtFirstMove =
    currentMoveIndex === 0;

  const isAtLastMove =
    currentMoveIndex === history.length;

  useEffect(() => {
    if (
      !isAtLastMove ||
      !scrollContainerRef.current
    ) {
      return;
    }

    scrollContainerRef.current.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [history.length, isAtLastMove]);

  function getMoveButtonClass(
    moveIndex: number,
  ) {
    const isActive =
      currentMoveIndex === moveIndex;

    const isLastRealMove =
      moveIndex === history.length;

    if (isActive) {
      return "bg-green-500 text-slate-950";
    }

    if (isLastRealMove) {
      return "bg-yellow-400 text-slate-950";
    }

    return "text-white hover:bg-slate-700";
  }

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-800 p-3 text-white shadow-lg lg:min-h-0 lg:flex-1">
      <h2 className="mb-2 text-lg font-bold text-yellow-400">
        📜 Move History
      </h2>

      <div className="mb-2 grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={onFirstMove}
          disabled={isAtFirstMove}
          aria-label="Go to starting position"
          title="Starting position"
          className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-sm font-bold text-white transition hover:border-yellow-400 hover:text-yellow-400 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-600 disabled:hover:text-white"
        >
          ⏮️
        </button>

        <button
          type="button"
          onClick={onPreviousMove}
          disabled={isAtFirstMove}
          aria-label="Go to previous move"
          title="Previous move"
          className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-sm font-bold text-white transition hover:border-yellow-400 hover:text-yellow-400 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-600 disabled:hover:text-white"
        >
          ◀️
        </button>

        <button
          type="button"
          onClick={onNextMove}
          disabled={isAtLastMove}
          aria-label="Go to next move"
          title="Next move"
          className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-sm font-bold text-white transition hover:border-yellow-400 hover:text-yellow-400 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-600 disabled:hover:text-white"
        >
          ▶️
        </button>

        <button
          type="button"
          onClick={onLastMove}
          disabled={isAtLastMove}
          aria-label="Go to latest move"
          title="Latest move"
          className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-sm font-bold text-white transition hover:border-yellow-400 hover:text-yellow-400 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-600 disabled:hover:text-white"
        >
          ⏭️
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="overflow-hidden rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={onFirstMove}
            className="w-full bg-slate-900 px-3 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-slate-700"
          >
            Starting Position
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-700">
          <div className="grid shrink-0 grid-cols-[38px_1fr_1fr] bg-slate-900 px-2 py-1 text-xs font-bold text-yellow-400">
            <div>#</div>
            <div>⚪ White</div>
            <div>⚫ Black</div>
          </div>

          <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 overflow-y-auto scroll-smooth"
          >
            {rows.map((row) => (
              <div
                key={row.move}
                className="grid grid-cols-[38px_1fr_1fr] border-t border-slate-700 px-2 py-0.5"
              >
                <div className="flex items-center text-sm font-bold text-yellow-400">
                  {row.move}.
                </div>

                <div className="pr-1">
                  {row.white && (
                    <button
                      type="button"
                      onClick={() =>
                        onMoveSelect(
                          row.whiteIndex,
                        )
                      }
                      className={`w-full rounded-md px-2 py-0 text-left text-sm font-medium transition active:scale-[0.98] ${getMoveButtonClass(
                        row.whiteIndex,
                      )}`}
                    >
                      {row.white}
                    </button>
                  )}
                </div>

                <div className="pl-1">
                  {row.black && (
                    <button
                      type="button"
                      onClick={() =>
                        onMoveSelect(
                          row.blackIndex,
                        )
                      }
                      className={`w-full rounded-md px-2 py-0 text-left text-sm font-medium transition active:scale-[0.98] ${getMoveButtonClass(
                        row.blackIndex,
                      )}`}
                    >
                      {row.black}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {result && (
              <div className="border-t border-slate-700 bg-slate-900 px-3 py-2 text-center">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">
                  Result
                </p>

                <p className="mt-1 text-xl font-extrabold text-yellow-400">
                  {result}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-1 flex shrink-0 items-center justify-between text-xs text-slate-400">
        <span>
          Viewing: {currentMoveIndex}/
          {history.length}
        </span>

        {!isAtLastMove && (
          <span className="font-semibold text-green-400">
            Previous position
          </span>
        )}
      </div>
    </div>
  );
}