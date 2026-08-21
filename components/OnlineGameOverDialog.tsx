type OnlineGameResult =
  | "WHITE_WIN"
  | "BLACK_WIN"
  | "DRAW";

type OnlineGameOverDialogProps = {
  isOpen: boolean;
  result: OnlineGameResult | null;
  reason: string;
  onClose: () => void;
};

export default function OnlineGameOverDialog({
  isOpen,
  result,
  reason,
  onClose,
}: OnlineGameOverDialogProps) {
  if (!isOpen || !result) {
    return null;
  }

  const isDraw = result === "DRAW";

  const title =
    result === "WHITE_WIN"
      ? "White Wins"
      : result === "BLACK_WIN"
        ? "Black Wins"
        : "Draw";

  const score =
    result === "WHITE_WIN"
      ? "1 – 0"
      : result === "BLACK_WIN"
        ? "0 – 1"
        : "½ – ½";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close game result"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-lg text-slate-400 transition hover:border-slate-500 hover:bg-slate-700 hover:text-white active:scale-[0.96]"
        >
          ✕
        </button>

        <div className="px-6 pb-8 pt-10 sm:px-8">
          <div className="text-center">
            <div className="mb-4 text-6xl">
              {isDraw ? "🤝" : "🏆"}
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
              Game Over
            </p>

            <h2
              className={`mt-3 text-3xl font-extrabold ${
                isDraw
                  ? "text-slate-200"
                  : "text-yellow-400"
              }`}
            >
              {title}
            </h2>

            <p className="mt-3 text-lg font-semibold text-slate-300">
              {reason}
            </p>

            <div className="mx-auto mt-6 flex max-w-[240px] items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-6 py-4">
              <span className="text-4xl font-black tracking-wider text-yellow-300">
                {score}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-8 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3.5 font-semibold text-white transition hover:border-slate-500 hover:bg-slate-700 active:scale-[0.98]"
          >
            View Final Position
          </button>
        </div>
      </div>
    </div>
  );
}