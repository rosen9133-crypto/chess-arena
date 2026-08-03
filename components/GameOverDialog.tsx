type GameResult =
  | "white-win"
  | "black-win"
  | "draw"
  | null;

type GameOverDialogProps = {
  isOpen: boolean;
  title: string;
  subtitle: string;
  score: string;
  result: GameResult;
  onClose: () => void;
  onNewGame: () => void;
  onAnalysis: () => void;
  onShare: () => void;
};

export default function GameOverDialog({
  isOpen,
  title,
  subtitle,
  score,
  result,
  onClose,
  onNewGame,
  onAnalysis,
  onShare,
}: GameOverDialogProps) {
  if (!isOpen) {
    return null;
  }

  const icon =
    result === "white-win"
      ? "🏆"
      : result === "black-win"
        ? "♚"
        : "🤝";

  const accentColor =
    result === "draw"
      ? "text-slate-200"
      : "text-yellow-400";

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

        <div className="px-6 pb-7 pt-10 sm:px-8">
          <div className="text-center">
            <div className="mb-4 text-6xl">
              {icon}
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
              Game Over
            </p>

            <h2
              className={`mt-3 text-3xl font-extrabold ${accentColor}`}
            >
              {title}
            </h2>

            <div className="mx-auto mt-5 flex max-w-[240px] items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-6 py-4">
              <span className="text-4xl font-black tracking-wider text-yellow-300">
                {score}
              </span>
            </div>

            <p className="mt-5 leading-6 text-slate-300">
              {subtitle}
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            <button
              type="button"
              onClick={onNewGame}
              className="rounded-xl bg-yellow-400 px-4 py-3.5 font-bold text-slate-950 transition hover:bg-yellow-300 active:scale-[0.98]"
            >
              🔄 Rematch
            </button>

            <button
              type="button"
              onClick={onAnalysis}
              className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3.5 font-semibold text-white transition hover:border-slate-500 hover:bg-slate-700 active:scale-[0.98]"
            >
              📊 Analysis
            </button>

            <button
              type="button"
              onClick={onShare}
              className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3.5 font-semibold text-white transition hover:border-slate-500 hover:bg-slate-700 active:scale-[0.98]"
            >
              📤 Share Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}