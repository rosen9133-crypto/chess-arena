import { useEffect, useState } from "react";

type OnlineGameResult =
  | "WHITE_WIN"
  | "BLACK_WIN"
  | "DRAW";

type ChessColor = "w" | "b";

type OnlineGameOverDialogProps = {
  isOpen: boolean;
  result: OnlineGameResult | null;
  playerColor: ChessColor;
  reason: string;
  isRated?: boolean;
  isRatingLoading?: boolean;
  rating?: {
    oldRating: number | null;
    newRating: number | null;
    ratingChange: number | null;
  } | null;
  ratingError?: string | null;
  onClose: () => void;
};

export default function OnlineGameOverDialog({
  isOpen,
  result,
  playerColor,
  reason,
  isRated = false,
  isRatingLoading = false,
  rating = null,
  ratingError = null,
  onClose,
}: OnlineGameOverDialogProps) {
  const [animatedRating, setAnimatedRating] = useState<number | null>(null);
  const [ratingAnimationComplete, setRatingAnimationComplete] =
    useState(false);

  const oldRating =
    rating?.oldRating !== null &&
    rating?.oldRating !== undefined
      ? Math.round(rating.oldRating)
      : null;

  const newRating =
    rating?.newRating !== null &&
    rating?.newRating !== undefined
      ? Math.round(rating.newRating)
      : null;

  const ratingChange =
    rating?.ratingChange !== null &&
    rating?.ratingChange !== undefined
      ? Math.round(rating.ratingChange)
      : null;

  useEffect(() => {
    if (
      !isOpen ||
      !isRated ||
      oldRating === null ||
      newRating === null
    ) {
      setAnimatedRating(null);
      setRatingAnimationComplete(false);
      return;
    }

    setAnimatedRating(oldRating);
    setRatingAnimationComplete(false);

    if (oldRating === newRating) {
      setRatingAnimationComplete(true);
      return;
    }

    const duration = 850;
    const startTime = performance.now();
    let animationFrameId = 0;

    const animate = (currentTime: number) => {
      const progress = Math.min(
        (currentTime - startTime) / duration,
        1,
      );
      const easedProgress =
        1 - Math.pow(1 - progress, 3);

      setAnimatedRating(
        Math.round(
          oldRating +
            (newRating - oldRating) * easedProgress,
        ),
      );

      if (progress < 1) {
        animationFrameId =
          requestAnimationFrame(animate);
      } else {
        setAnimatedRating(newRating);
        setRatingAnimationComplete(true);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isOpen, isRated, oldRating, newRating]);

  if (!isOpen || !result) {
    return null;
  }

  const isDraw = result === "DRAW";

  const playerWon =
    (result === "WHITE_WIN" && playerColor === "w") ||
    (result === "BLACK_WIN" && playerColor === "b");

  const title =
    result === "DRAW"
      ? "Draw"
      : playerWon
        ? "You Win"
        : "You Lose";

  const score =
    result === "WHITE_WIN"
      ? "1 – 0"
      : result === "BLACK_WIN"
        ? "0 – 1"
        : "½ – ½";

  const resultIcon = isDraw
    ? "/icons/results/draw.png"
    : playerWon
      ? "/icons/results/win.png"
      : "/icons/results/lose.png";

  const resultIconAlt = isDraw
    ? "Draw"
    : playerWon
      ? "Victory"
      : "Defeat";

  const formattedRatingChange =
    ratingChange !== null
      ? ratingChange > 0
        ? `+${ratingChange}`
        : `${ratingChange}`
      : null;

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
            <div className="mb-4 flex h-24 items-center justify-center">
              <img
                src={resultIcon}
                alt={resultIconAlt}
                className="h-24 w-24 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.12)]"
              />
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
              Game Over
            </p>

            <h2
              className={`mt-3 text-3xl font-extrabold ${
                isDraw
                  ? "text-sky-400"
                  : playerWon
                    ? "text-yellow-400"
                    : "text-slate-200"
              }`}
            >
              {title}
            </h2>

            <p className="mt-3 text-lg font-semibold text-slate-300">
              {reason}
            </p>

            <div
              className={`mx-auto mt-6 flex max-w-[240px] items-center justify-center rounded-2xl px-6 py-4 ${
                isDraw
                  ? "border border-sky-400/30 bg-sky-400/10"
                  : "border border-yellow-400/30 bg-yellow-400/10"
              }`}
            >
              <span
                className={`text-4xl font-black tracking-wider ${
                  isDraw ? "text-sky-300" : "text-yellow-300"
                }`}
              >
                {score}
              </span>
            </div>

            {isRated && (
              <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/60 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                  Rating
                </p>

                {isRatingLoading && !rating && (
                  <p className="mt-3 font-semibold text-slate-300">
                    Updating rating…
                  </p>
                )}

                {rating &&
                  oldRating !== null &&
                  newRating !== null && (
                    <div className="mt-3 flex items-center justify-center gap-3">
                      <span className="text-xl font-bold text-slate-400">
                        {oldRating}
                      </span>

                      <span className="text-slate-600">→</span>

                      <span className="text-2xl font-black text-white tabular-nums">
                        {animatedRating ?? oldRating}
                      </span>

                      {formattedRatingChange &&
                        ratingAnimationComplete && (
                          <span
                            className={`rounded-lg px-2.5 py-1 text-sm font-black ${
                              ratingChange !== null && ratingChange > 0
                                ? "bg-emerald-400/15 text-emerald-400"
                                : ratingChange !== null && ratingChange < 0
                                  ? "bg-rose-400/15 text-rose-400"
                                  : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {formattedRatingChange}
                          </span>
                        )}
                    </div>
                  )}

                {ratingError && !rating && (
                  <p className="mt-3 text-sm font-semibold text-rose-400">
                    Rating update is temporarily unavailable.
                  </p>
                )}
              </div>
            )}
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