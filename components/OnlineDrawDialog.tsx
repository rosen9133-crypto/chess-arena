type OnlineDrawDialogMode =
  | "CONFIRM_OFFER"
  | "RESPOND_TO_OFFER";

type OnlineDrawDialogProps = {
  isOpen: boolean;
  mode: OnlineDrawDialogMode;
  opponentUsername: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onDismiss?: () => void;
};

export default function OnlineDrawDialog({
  isOpen,
  mode,
  opponentUsername,
  isSubmitting,
  onCancel,
  onConfirm,
  onDismiss,
}: OnlineDrawDialogProps) {
  if (!isOpen) {
    return null;
  }

  const isIncomingOffer =
    mode === "RESPOND_TO_OFFER";

  const title = isIncomingOffer
    ? "Draw Offered"
    : "Offer a Draw?";

  const description = isIncomingOffer
    ? `${opponentUsername} has offered a draw. Do you want to accept it?`
    : "Your opponent can accept or decline. The game will continue until the offer is accepted.";

  const cancelLabel = isIncomingOffer
    ? "Decline"
    : "Cancel";

  const confirmLabel = isIncomingOffer
    ? "Accept Draw"
    : "Send Offer";

  const submittingLabel = isIncomingOffer
    ? "Accepting..."
    : "Sending...";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="online-draw-dialog-title"
        aria-describedby="online-draw-dialog-description"
        className="relative w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-black/50 sm:p-8"
      >
        {isIncomingOffer && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            disabled={isSubmitting}
            aria-label="Close draw offer"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-xl font-bold text-slate-300 transition hover:border-slate-500 hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            ×
          </button>
        )}

        <div className="text-center">
          <div className="text-5xl">🤝</div>

          <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-sky-300">
            Online Game
          </p>

          <h2
            id="online-draw-dialog-title"
            className="mt-2 text-2xl font-extrabold text-white"
          >
            {title}
          </h2>

          <p
            id="online-draw-dialog-description"
            className="mt-3 leading-6 text-slate-300"
          >
            {description}
          </p>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 font-semibold text-white transition hover:border-slate-500 hover:bg-slate-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="rounded-xl border border-sky-300/30 bg-sky-500 px-4 py-3 font-bold text-white transition hover:bg-sky-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? submittingLabel
              : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}