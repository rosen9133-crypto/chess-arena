type MoveHistoryProps = {
  history: string[];
};

export function MoveHistory({ history }: MoveHistoryProps) {
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
        📜 История на ходовете
      </h2>

      {rows.length === 0 ? (
        <p className="text-slate-400">
          Все още няма направени ходове.
        </p>
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
                className="grid grid-cols-[45px_1fr_1fr] items-center border-t border-slate-700 px-3 py-2 hover:bg-slate-700/40"
              >
                <div className="font-bold text-yellow-400">
                  {row.move}.
                </div>

                <div className="font-medium text-white">
                  {row.white}
                </div>

                <div className="font-medium text-white">
                  {row.black}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}