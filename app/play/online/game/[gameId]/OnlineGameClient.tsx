"use client";

import { useState } from "react";
import { Chessboard } from "react-chessboard";

import OnlineGameOverDialog from "@/components/OnlineGameOverDialog";
import PromotionDialog from "@/components/PromotionDialog";
import { useOnlineChessGame } from "@/hooks/useOnlineChessGame";

type ChessColor = "w" | "b";

type OnlineGameClientProps = {
  gameId: string;
  playerColor: ChessColor;
  whitePlayer: {
    id: string;
    username: string;
  };
  blackPlayer: {
    id: string;
    username: string;
  };
};

function formatClockTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);

  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(
    safeSeconds % 60,
  );

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

type PlayerClockProps = {
  username: string;
  color: ChessColor;
  time: number;
  active: boolean;
  label: string;
};

function PlayerClock({
  username,
  color,
  time,
  active,
  label,
}: PlayerClockProps) {
  const isCritical = time <= 10;
  const isLow = time < 60;

  const timeColorClass = isCritical
    ? "text-red-400"
    : isLow
      ? "text-yellow-400"
      : "text-white";

  return (
    <div
      className={`rounded-xl border px-4 py-3 transition-all ${
        active
          ? "border-emerald-400/70 bg-emerald-400/10 shadow-lg shadow-emerald-950/20"
          : "border-slate-700 bg-slate-900"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {label}
          </p>

          <p className="mt-1 font-bold text-white">
            {color === "w" ? "⚪" : "⚫"}{" "}
            {username}
          </p>
        </div>

        <div className="text-right">
          {active && (
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
              ● LIVE
            </p>
          )}

          <p
            className={`font-mono text-3xl font-black tabular-nums sm:text-4xl ${timeColorClass}`}
          >
            {formatClockTime(time)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OnlineGameClient({
  gameId,
  playerColor,
  whitePlayer,
  blackPlayer,
}: OnlineGameClientProps) {
  const {
    displayGame,
    history,
    isGameOver,
    status,
    result,
    isPlayerTurn,
    boardOrientation,
    squareStyles,
    shouldShowPromotionDialog,
    promotionColor,

    whiteTime,
    blackTime,
    activeClock,
    isClockRunning,

    onDrop,
    handlePromotionSelect,
    handleFlipBoard,
  } = useOnlineChessGame({
    gameId,
    playerColor,
  });

  const currentPlayer =
    playerColor === "w"
      ? whitePlayer
      : blackPlayer;

  const opponent =
    playerColor === "w"
      ? blackPlayer
      : whitePlayer;

  const currentPlayerTime =
    playerColor === "w"
      ? whiteTime
      : blackTime;

  const opponentTime =
    playerColor === "w"
      ? blackTime
      : whiteTime;

  const opponentColor: ChessColor =
    playerColor === "w" ? "b" : "w";

  const isCurrentPlayerClockActive =
    isClockRunning &&
    activeClock === playerColor;

  const isOpponentClockActive =
    isClockRunning &&
    activeClock === opponentColor;

  const [isGameOverDialogClosed, setIsGameOverDialogClosed] =
    useState(false);

  const authoritativeResult =
    result === "WHITE_WIN" ||
    result === "BLACK_WIN" ||
    result === "DRAW"
      ? result
      : null;

  const gameOverReason = displayGame.isCheckmate()
    ? "Checkmate"
    : authoritativeResult === "DRAW"
      ? "Draw"
      : "Game finished";

  const finishedResultLabel =
    authoritativeResult === "WHITE_WIN"
      ? "White Wins"
      : authoritativeResult === "BLACK_WIN"
        ? "Black Wins"
        : authoritativeResult === "DRAW"
          ? "Draw"
          : "Finished";

  const turnLabel = isGameOver
    ? "Game finished"
    : displayGame.turn() === "w"
      ? "White to move"
      : "Black to move";

  return (
    <>
      <PromotionDialog
        isOpen={shouldShowPromotionDialog}
        color={promotionColor}
        onSelect={handlePromotionSelect}
      />

      <OnlineGameOverDialog
        isOpen={
          status === "FINISHED" &&
          isGameOver &&
          !isGameOverDialogClosed
        }
        result={authoritativeResult}
        reason={gameOverReason}
        onClose={() => setIsGameOverDialogClosed(true)}
      />

      <section className="mt-8">
        <div className="mx-auto w-full max-w-[620px]">
          <PlayerClock
            username={opponent.username}
            color={opponentColor}
            time={opponentTime}
            active={isOpponentClockActive}
            label="Opponent"
          />

          <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Opponent
              </p>

              <p className="mt-1 font-bold text-white">
                {opponentColor === "w"
                  ? "⚪"
                  : "⚫"}{" "}
                {opponent.username}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Game
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-300">
                {gameId.slice(0, 12)}...
              </p>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 p-2 shadow-2xl shadow-black/30">
            <Chessboard
              position={displayGame.fen()}
              onPieceDrop={onDrop}
              boardOrientation={boardOrientation}
              customSquareStyles={squareStyles}
            />
          </div>

          <PlayerClock
            username={currentPlayer.username}
            color={playerColor}
            time={currentPlayerTime}
            active={isCurrentPlayerClockActive}
            label="You"
          />

          <div className="mt-3 grid grid-cols-3 items-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                You
              </p>

              <p className="mt-1 font-bold text-white">
                {playerColor === "w"
                  ? "⚪"
                  : "⚫"}{" "}
                {currentPlayer.username}
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-slate-500">
                {turnLabel}
              </p>

              <p
                className={`mt-1 font-extrabold ${
                  isPlayerTurn
                    ? "text-emerald-400"
                    : "text-yellow-400"
                }`}
              >
                {isGameOver
                  ? finishedResultLabel
                  : isPlayerTurn
                    ? "Your turn"
                    : "Opponent's turn"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Moves
              </p>

              <p className="mt-1 font-bold text-white">
                {history.length}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFlipBoard}
            className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 font-bold text-slate-200 transition hover:border-slate-600 hover:bg-slate-700"
          >
            🔄 Flip Board
          </button>

          <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-center text-sm font-semibold text-emerald-200">
            ● Online game synchronized
          </div>
        </div>
      </section>
    </>
  );
}