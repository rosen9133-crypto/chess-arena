"use client";

import { useState } from "react";

type BoardOrientation = "white" | "black";

type GameControlsProps = {
  canUndo: boolean;
  hasGameStarted: boolean;
  boardOrientation: BoardOrientation;
  onNewGame: () => void;
  onUndo: () => void;
  onFlipBoard: () => void;
  onBoardOrientationChange: (
    orientation: BoardOrientation,
  ) => void;
};

export default function GameControls({
  canUndo,
  hasGameStarted,
  boardOrientation,
  onNewGame,
  onUndo,
  onFlipBoard,
  onBoardOrientationChange,
}: GameControlsProps) {
  const [isConfirmOpen, setIsConfirmOpen] =
    useState(false);

  function handleNewGameClick() {
    if (hasGameStarted) {
      setIsConfirmOpen(true);
      return;
    }

    onNewGame();
  }

  function handleConfirmNewGame() {
    setIsConfirmOpen(false);
    onNewGame();
  }

  function handleCancelNewGame() {
    setIsConfirmOpen(false);
  }

  return (
    <>
      <div className="w-full rounded-xl border border-slate-700 bg-slate-800 p-5 text-white shadow-lg lg:w-72">
        <h2 className="mb-5 text-2xl font-bold text-yellow-400">
          ⚙️ Game Controls
        </h2>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleNewGameClick}
            className="w-full rounded-lg bg-yellow-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-yellow-300 active:scale-[0.98]"
          >
            🆕 New Game
          </button>

          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="w-full rounded-lg bg-slate-700 px-4 py-3 font-semibold text-white transition hover:bg-slate-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-700"
          >
            ↩️ Undo Move
          </button>

          <button
            type="button"
            onClick={onFlipBoard}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 font-semibold text-white transition hover:border-yellow-400 hover:text-yellow-400 active:scale-[0.98]"
          >
            🔃 Flip Board
          </button>
        </div>

        <fieldset className="mt-5 rounded-lg border border-slate-700 bg-slate-900 p-4">
          <legend className="px-2 text-sm font-semibold text-slate-300">
            Board Orientation
          </legend>

          <div className="mt-1 space-y-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-800">
              <input
                type="radio"
                name="board-orientation"
                value="white"
                checked={
                  boardOrientation === "white"
                }
                onChange={() =>
                  onBoardOrientationChange(
                    "white",
                  )
                }
                className="h-4 w-4 accent-yellow-400"
              />

              <span className="font-medium text-white">
                ⚪ White at the bottom
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-800">
              <input
                type="radio"
                name="board-orientation"
                value="black"
                checked={
                  boardOrientation === "black"
                }
                onChange={() =>
                  onBoardOrientationChange(
                    "black",
                  )
                }
                className="h-4 w-4 accent-yellow-400"
              />

              <span className="font-medium text-white">
                ⚫ Black at the bottom
              </span>
            </label>
          </div>
        </fieldset>
      </div>

      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={handleCancelNewGame}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-game-title"
            aria-describedby="new-game-description"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl shadow-black/50"
          >
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-400/15 text-2xl">
                🆕
              </div>

              <div>
                <h3
                  id="new-game-title"
                  className="text-2xl font-bold text-yellow-400"
                >
                  Start a new game?
                </h3>

                <p
                  id="new-game-description"
                  className="mt-2 text-slate-300"
                >
                  Your current game will be lost.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancelNewGame}
                className="rounded-lg border border-slate-600 bg-slate-800 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-700 active:scale-[0.98]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmNewGame}
                className="rounded-lg bg-yellow-400 px-5 py-2.5 font-bold text-slate-950 transition hover:bg-yellow-300 active:scale-[0.98]"
              >
                Start New Game
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}