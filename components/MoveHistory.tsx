"use client";

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
    <div className="w-full rounded-xl border border-slate-700 bg-slate-800 p-5 text-white shadow-lg lg:w-72">
      <h2 className="mb-5 text-2xl font-bold text-yellow-400">
        📜 Move History
      </h2>

      <div className="mb-4 grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={onFirstMove}
          disabled={isAtFirstMove}
          aria-label="Go to starting position"
          title="Starting position"
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 font-bold text-white transition hover:border-yellow-400 hover:text-yellow-400 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-600 disabled:hover:text-white"
        >
          ⏮️
        </button>

        <button
          type="button"
          onClick={onPreviousMove}
          disabled={isAtFirstMove}
          aria-label="Go to previous move"
          title="Previous move"
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 font-bold text-white transition hover:border-yellow-400 hover:text-yellow-400 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-600 disabled:hover:text-white"
        >
          ◀️
        </button>

        <button
          type="button"
          onClick={onNextMove}
          disabled={isAtLastMove}
          aria-label="Go to next move"
          title="Next move"
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 font-bold text-white transition hover:border-yellow-400 hover:text-yellow-400 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-600 disabled:hover:text-white"
        >
          ▶️
        </button>

        <button
          type="button"
          onClick={onLastMove}
          disabled={isAtLastMove}
          aria-label="Go to latest move"
          title="Latest move"
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 font-bold text-white transition hover:border-yellow-400 hover:text-yellow-400 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-600 disabled:hover:text-white"
        >
          ⏭️
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-5">
          <p className="text-center text-slate-400">
            No moves have been played yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-700">
          <div className="grid grid-cols-[45px_1fr_1fr] bg-slate-900 px-3 py-2 text-sm font-bold text-yellow-400">
            <div>#</div>
            <div>⚪ White</div>
            <div>⚫ Black</div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {rows.map((row) => (
              <div
                key={row.move}
                className="grid grid-cols-[45px_1fr_1fr] border-t border-slate-700 px-3 py-2"
              >
                <div className="flex items-center font-bold text-yellow-400">
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
                      className={`w-full rounded-md px-2 py-1 text-left font-medium transition active:scale-[0.98] ${getMoveButtonClass(
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
                      className={`w-full rounded-md px-2 py-1 text-left font-medium transition active:scale-[0.98] ${getMoveButtonClass(
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
              <div className="border-t border-slate-700 bg-slate-900 px-3 py-4 text-center">
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Result
                </p>

                <p className="mt-2 text-2xl font-extrabold text-yellow-400">
                  {result}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
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