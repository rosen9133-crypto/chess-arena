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
      return "bg-green-500 text-slate-950 shadow-[0_0_12px_rgba(34,197,94,0.18)]";
    }

    if (isLastRealMove) {
      return "bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.16)]";
    }

    return "text-stone-100 hover:bg-amber-300/10 hover:text-amber-100";
  }

  const navigationButtonClass =
    "rounded-lg border border-amber-200/15 bg-black/35 px-2 py-1 text-sm font-bold text-stone-100 shadow-inner transition hover:border-amber-400/55 hover:bg-amber-300/10 hover:text-amber-300 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-amber-200/15 disabled:hover:bg-black/35 disabled:hover:text-stone-100";

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-amber-300/25 bg-[linear-gradient(180deg,rgba(12,10,8,0.88),rgba(5,7,10,0.92))] p-3 text-white shadow-[0_16px_38px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(251,191,36,0.06)]">
      <h2 className="mb-2 text-lg font-bold tracking-wide text-amber-400">
        📜 Move History
      </h2>

      <div className="mb-2 grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={onFirstMove}
          disabled={isAtFirstMove}
          aria-label="Go to starting position"
          title="Starting position"
          className={navigationButtonClass}
        >
          ⏮️
        </button>

        <button
          type="button"
          onClick={onPreviousMove}
          disabled={isAtFirstMove}
          aria-label="Go to previous move"
          title="Previous move"
          className={navigationButtonClass}
        >
          ◀️
        </button>

        <button
          type="button"
          onClick={onNextMove}
          disabled={isAtLastMove}
          aria-label="Go to next move"
          title="Next move"
          className={navigationButtonClass}
        >
          ▶️
        </button>

        <button
          type="button"
          onClick={onLastMove}
          disabled={isAtLastMove}
          aria-label="Go to latest move"
          title="Latest move"
          className={navigationButtonClass}
        >
          ⏭️
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-amber-200/15 bg-black/30 shadow-inner">
          <button
            type="button"
            onClick={onFirstMove}
            className="flex w-full flex-1 items-start bg-transparent px-3 py-3 text-left text-sm font-medium text-stone-300 transition hover:bg-amber-300/10 hover:text-amber-100"
          >
            Starting Position
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-amber-200/15 bg-black/25 shadow-inner">
          <div className="grid shrink-0 grid-cols-[38px_1fr_1fr] border-b border-amber-200/15 bg-black/40 px-2 py-1 text-xs font-bold text-amber-400">
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
                className="grid grid-cols-[38px_1fr_1fr] border-t border-amber-100/10 px-2 py-0.5 first:border-t-0"
              >
                <div className="flex items-center text-sm font-bold text-amber-400">
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
          </div>

          {result && (
            <div className="shrink-0 border-t border-amber-200/15 bg-black/40 px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-widest text-stone-400">
                Result
              </p>

              <p className="mt-1 text-xl font-extrabold text-amber-400">
                {result}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-1 flex shrink-0 items-center justify-between text-xs text-stone-400">
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