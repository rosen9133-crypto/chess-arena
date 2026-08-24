"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Chessboard } from "react-chessboard";

import OnlineDrawDialog from "@/components/OnlineDrawDialog";
import OnlineGameOverDialog from "@/components/OnlineGameOverDialog";
import OnlineResignDialog from "@/components/OnlineResignDialog";
import PromotionDialog from "@/components/PromotionDialog";
import { useOnlineChessGame } from "@/hooks/useOnlineChessGame";

type ChessColor = "w" | "b";

type OnlineGameClientProps = {
  gameId: string;
  playerColor: ChessColor;
  timeControlLabel: string;
  category: string;
  rated: boolean;
  initialStatus: string;
  whitePlayer: {
    id: string;
    username: string;
  };
  blackPlayer: {
    id: string;
    username: string;
  };
};

type GameInfoRowProps = {
  label: string;
  value: string;
  highlight?: boolean;
};

function GameInfoRow({
  label,
  value,
  highlight = false,
}: GameInfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-800 py-3 last:border-b-0">
      <span className="text-slate-400">
        {label}
      </span>

      <strong
        className={`text-right [overflow-wrap:anywhere] ${
          highlight
            ? "text-yellow-400"
            : "text-slate-50"
        }`}
      >
        {value}
      </strong>
    </div>
  );
}

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
  timeControlLabel,
  category,
  rated,
  initialStatus,
  whitePlayer,
  blackPlayer,
}: OnlineGameClientProps) {
  const {
    displayGame,
    history,
    isGameOver,
    status,
    result,
    endReason,
    drawOfferBy,
    drawOfferedAt,
    rematchOfferBy,
    rematchGameId,
    isPlayerTurn,
    isResigning,
    isProcessingDraw,
    isProcessingRematch,
    boardOrientation,
    squareStyles,
    shouldShowPromotionDialog,
    promotionColor,

    whiteTime,
    blackTime,
    activeClock,
    isClockRunning,

    onDrop,
    resignGame,
    offerDraw,
    acceptDraw,
    declineDraw,
    offerRematch,
    acceptRematch,
    declineRematch,
    handlePromotionSelect,
    handleFlipBoard,
  } = useOnlineChessGame({
    gameId,
    playerColor,
  });

  const router = useRouter();

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

  const currentUserColor =
    playerColor === "w" ? "White" : "Black";

  const liveStatus =
    status ?? initialStatus;

  const isCurrentPlayerClockActive =
    isClockRunning &&
    activeClock === playerColor;

  const isOpponentClockActive =
    isClockRunning &&
    activeClock === opponentColor;

  const [isGameOverDialogClosed, setIsGameOverDialogClosed] =
    useState(false);

  const [isResignDialogOpen, setIsResignDialogOpen] =
    useState(false);

  const [isDrawDialogOpen, setIsDrawDialogOpen] =
    useState(false);

  const [isRematchDialogOpen, setIsRematchDialogOpen] =
    useState(false);

  const [dismissedDrawOfferAt, setDismissedDrawOfferAt] =
    useState<string | null>(null);

  const playerDrawColor =
    playerColor === "w" ? "WHITE" : "BLACK";

  const hasOutgoingDrawOffer =
    drawOfferBy === playerDrawColor;

  const hasIncomingDrawOffer =
    drawOfferBy !== null &&
    drawOfferBy !== playerDrawColor;

  const isIncomingDrawOfferDismissed =
    hasIncomingDrawOffer &&
    drawOfferedAt !== null &&
    dismissedDrawOfferAt === drawOfferedAt;

  const shouldShowIncomingDrawDialog =
    hasIncomingDrawOffer &&
    !isIncomingDrawOfferDismissed;

  const playerRematchColor =
    playerColor === "w" ? "WHITE" : "BLACK";

  const hasOutgoingRematchOffer =
    rematchOfferBy === playerRematchColor;

  const hasIncomingRematchOffer =
    rematchOfferBy !== null &&
    rematchOfferBy !== playerRematchColor;

  const shouldShowRematchDialog =
    isGameOverDialogClosed &&
    (isRematchDialogOpen || hasIncomingRematchOffer);

  useEffect(() => {
    if (rematchGameId) {
      router.push(`/play/online/game/${rematchGameId}`);
    }
  }, [rematchGameId, router]);

  const authoritativeResult =
    result === "WHITE_WIN" ||
    result === "BLACK_WIN" ||
    result === "DRAW"
      ? result
      : null;

  const gameOverReason =
    endReason === "CHECKMATE"
      ? "Checkmate"
      : endReason === "DRAW"
        ? "Draw"
        : endReason === "RESIGNATION"
          ? "Resignation"
          : endReason === "TIMEOUT"
            ? "Time out"
            : "Game finished";

  async function handleResignConfirm() {
    const resigned = await resignGame();

    if (resigned) {
      setIsResignDialogOpen(false);
    }
  }

  async function handleDrawOfferConfirm() {
    const offered = await offerDraw();

    if (offered) {
      setIsDrawDialogOpen(false);
    }
  }

  async function handleDrawAccept() {
    await acceptDraw();
  }

  async function handleDrawDecline() {
    await declineDraw();
  }

  async function handleRematchOffer() {
    const offered = await offerRematch();

    if (offered) {
      setIsRematchDialogOpen(false);
    }
  }

  async function handleRematchAccept() {
    await acceptRematch();
  }

  async function handleRematchDecline() {
    const declined = await declineRematch();

    if (declined) {
      setIsRematchDialogOpen(false);
    }
  }

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

      <OnlineResignDialog
        isOpen={isResignDialogOpen}
        isSubmitting={isResigning}
        onCancel={() => setIsResignDialogOpen(false)}
        onConfirm={() => {
          void handleResignConfirm();
        }}
      />

      <OnlineDrawDialog
        isOpen={
          !isGameOver &&
          (isDrawDialogOpen ||
            shouldShowIncomingDrawDialog)
        }
        mode={
          shouldShowIncomingDrawDialog
            ? "RESPOND_TO_OFFER"
            : "CONFIRM_OFFER"
        }
        opponentUsername={opponent.username}
        isSubmitting={isProcessingDraw}
        onCancel={() => {
          if (hasIncomingDrawOffer) {
            void handleDrawDecline();
            return;
          }

          setIsDrawDialogOpen(false);
        }}
        onConfirm={() => {
          if (shouldShowIncomingDrawDialog) {
            void handleDrawAccept();
            return;
          }

          void handleDrawOfferConfirm();
        }}
        onDismiss={() => {
          if (drawOfferedAt) {
            setDismissedDrawOfferAt(drawOfferedAt);
          }
        }}
      />

      {shouldShowRematchDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-yellow-400/30 bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-center shadow-2xl shadow-black/60">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-3xl">
              ♟️
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.3em] text-yellow-400">
              Online Game
            </p>

            <h2 className="mt-2 text-3xl font-black text-white">
              {hasIncomingRematchOffer
                ? "Rematch Offered"
                : "Play Again?"}
            </h2>

            <p className="mt-3 text-slate-300">
              {hasIncomingRematchOffer
                ? `${opponent.username} wants a rematch. Colors will be switched.`
                : "Send a rematch offer. You will switch colors for the next game."}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (hasIncomingRematchOffer) {
                    void handleRematchDecline();
                    return;
                  }

                  setIsRematchDialogOpen(false);
                }}
                disabled={isProcessingRematch}
                className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {hasIncomingRematchOffer ? "Decline" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (hasIncomingRematchOffer) {
                    void handleRematchAccept();
                    return;
                  }

                  void handleRematchOffer();
                }}
                disabled={isProcessingRematch}
                className="rounded-xl bg-yellow-400 px-4 py-3 font-black text-slate-950 transition hover:bg-yellow-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessingRematch
                  ? "Please wait..."
                  : hasIncomingRematchOffer
                    ? "Accept Rematch"
                    : "Offer Rematch"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-slate-700/70 bg-slate-950/60 p-5">
        <GameInfoRow
          label="You are playing"
          value={currentUserColor}
          highlight
        />

        <GameInfoRow
          label="Time Control"
          value={timeControlLabel}
        />

        <GameInfoRow
          label="Category"
          value={category}
        />

        <GameInfoRow
          label="Mode"
          value={rated ? "Rated" : "Casual"}
        />

        <GameInfoRow
          label="Status"
          value={liveStatus.replaceAll("_", " ")}
        />

        <GameInfoRow
          label="Game ID"
          value={gameId}
        />
      </div>

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

          {!isGameOver && (
            <div className="mt-4">
              <p className="mb-2 text-center text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                Game Actions
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsDrawDialogOpen(true)}
                  title={
                    !isPlayerTurn
                      ? "You can offer a draw on your turn"
                      : undefined
                  }
                  disabled={
                    !isPlayerTurn ||
                    hasOutgoingDrawOffer ||
                    hasIncomingDrawOffer ||
                    isProcessingDraw ||
                    isResigning
                  }
                  className="rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 py-3 font-bold text-sky-200 transition hover:border-sky-400/70 hover:bg-sky-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {hasOutgoingDrawOffer
                    ? "🤝 Offer Sent"
                    : hasIncomingDrawOffer
                      ? "🤝 Draw Offered"
                    : "🤝 Offer Draw"}
                </button>

                <button
                  type="button"
                  onClick={() => setIsResignDialogOpen(true)}
                  disabled={
                    isResigning ||
                    isProcessingDraw
                  }
                  className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 font-bold text-red-300 transition hover:border-red-400/70 hover:bg-red-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  🏳️ Resign
                </button>
              </div>

              {hasOutgoingDrawOffer && (
                <div className="mt-3 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-center text-sm font-semibold text-sky-200">
                  Draw offer sent — waiting for your opponent.
                </div>
              )}

              {isIncomingDrawOfferDismissed && (
                <div className="mt-3 rounded-xl border border-sky-400/30 bg-sky-400/10 p-3">
                  <p className="text-center text-sm font-semibold text-sky-100">
                    {opponent.username} offered a draw.
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleDrawDecline();
                      }}
                      disabled={isProcessingDraw}
                      className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Decline
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void handleDrawAccept();
                      }}
                      disabled={isProcessingDraw}
                      className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-bold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Accept Draw
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isGameOver && (
            <div className="mt-4">
              <p className="mb-2 text-center text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                Post-Game Actions
              </p>

              <button
                type="button"
                onClick={() => setIsRematchDialogOpen(true)}
                disabled={
                  hasOutgoingRematchOffer ||
                  isProcessingRematch ||
                  rematchGameId !== null
                }
                className="w-full rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-5 py-3 font-black text-yellow-300 transition hover:border-yellow-400/70 hover:bg-yellow-400/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {rematchGameId
                  ? "♟️ Opening Rematch..."
                  : hasOutgoingRematchOffer
                    ? "♟️ Rematch Offer Sent"
                    : hasIncomingRematchOffer
                      ? "♟️ Rematch Offered"
                      : "♟️ Rematch"}
              </button>

              {hasOutgoingRematchOffer && (
                <div className="mt-3 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-center text-sm font-semibold text-yellow-200">
                  Rematch offer sent — waiting for your opponent.
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleFlipBoard}
            className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 font-bold text-slate-200 transition hover:border-slate-600 hover:bg-slate-700"
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