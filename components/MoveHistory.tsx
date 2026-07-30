"use client";

type MoveHistoryProps = {
  history: string[];
  result?: string;
};

export function MoveHistory({
  history,
  result,
}: MoveHistoryProps) {
  const rows = [];

  for (let i = 0; i < history.length; i += 2) {
    rows.push({
      move: i / 2 + 1,
      white: history[i] ?? "",
      black: history[i + 1] ?? "",
    });
  }

  return (
    <div className="w-full rounded-xl border border-slate-700 bg-slate-800 p-5 text-white shadow-lg lg:w-72">
      <h2 className="mb-5 text-2xl font-bold text-yellow-400">
        📜 Move History
      </h2>

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
                <div className="font-bold text-yellow-400">
                  {row.move}.
                </div>

                <div>{row.white}</div>

                <div>{row.black}</div>
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
    </div>
  );
}