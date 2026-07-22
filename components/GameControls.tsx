type GameControlsProps = {
  canUndo: boolean;
  isFlipped: boolean;
  onNewGame: () => void;
  onUndo: () => void;
  onFlipBoard: () => void;
};

export default function GameControls({
  canUndo,
  isFlipped,
  onNewGame,
  onUndo,
  onFlipBoard,
}: GameControlsProps) {
  return (
    <div className="w-full rounded-xl border border-slate-700 bg-slate-800 p-5 text-white shadow-lg lg:w-72">
      <h2 className="mb-5 text-2xl font-bold text-yellow-400">
        ⚙️ Контроли
      </h2>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onNewGame}
          className="w-full rounded-lg bg-yellow-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-yellow-300 active:scale-[0.98]"
        >
          🔄 Нова игра
        </button>

        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="w-full rounded-lg bg-slate-700 px-4 py-3 font-semibold text-white transition hover:bg-slate-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-700"
        >
          ↩️ Върни ход
        </button>

        <button
          type="button"
          onClick={onFlipBoard}
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 font-semibold text-white transition hover:border-yellow-400 hover:text-yellow-400 active:scale-[0.98]"
        >
          🔃 Обърни дъската
        </button>
      </div>

      <div className="mt-5 rounded-lg bg-slate-900 p-3 text-center">
        <p className="text-sm text-slate-400">
          Изглед на дъската
        </p>

        <p className="mt-1 font-semibold text-white">
          {isFlipped ? "⚫ Черните отдолу" : "⚪ Белите отдолу"}
        </p>
      </div>
    </div>
  );
}