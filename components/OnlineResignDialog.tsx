type OnlineResignDialogProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function OnlineResignDialog({
  isOpen,
  isSubmitting,
  onCancel,
  onConfirm,
}: OnlineResignDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-black/50 sm:p-8">
        <div className="text-center">
          <div className="text-5xl">🏳️</div>

          <h2 className="mt-4 text-2xl font-extrabold text-white">
            Resign Game?
          </h2>

          <p className="mt-3 leading-6 text-slate-300">
            Your opponent will be declared the winner.
            Are you sure you want to resign?
          </p>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 font-semibold text-white transition hover:border-slate-500 hover:bg-slate-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="rounded-xl bg-red-500 px-4 py-3 font-bold text-white transition hover:bg-red-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Resigning..." : "Resign"}
          </button>
        </div>
      </div>
    </div>
  );
}