"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Chessboard } from "react-chessboard";
import type { Square } from "chess.js";

import ChessPiece from "@/components/ChessPiece";
import { MoveHistory } from "@/components/MoveHistory";
import OnlineDrawDialog from "@/components/OnlineDrawDialog";
import OnlineGameOverDialog from "@/components/OnlineGameOverDialog";
import OnlineResignDialog from "@/components/OnlineResignDialog";
import PromotionDialog from "@/components/PromotionDialog";
import SoundControl from "@/components/SoundControl";
import { useOnlineChessGame } from "@/hooks/useOnlineChessGame";

type ChessColor = "w" | "b";

type OpeningInfo = {
  eco: string;
  name: string;
  pgn: string;
  matchedMoves: number;
};

type OpeningApiResponse = {
  success: boolean;
  opening: OpeningInfo | null;
  error?: string;
};

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
    rating: number;
  };
  blackPlayer: {
    id: string;
    username: string;
    rating: number;
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

function getDisplayedClockSeconds(seconds: number) {
  return Math.max(0, Math.ceil(seconds));
}

function formatClockTime(seconds: number) {
  const totalSeconds = getDisplayedClockSeconds(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

type PlayerClockProps = {
  username: string;
  rating: number;
  color: ChessColor;
  time: number;
  active: boolean;
  label: string;
  capturedPieces: string[];
  materialAdvantage: number;
};

function PlayerClock({
  username,
  rating,
  color,
  time,
  active,
  label,
  capturedPieces,
  materialAdvantage,
}: PlayerClockProps) {
  const displayedSeconds = getDisplayedClockSeconds(time);
  const isCritical = displayedSeconds <= 10;
  const isLow = displayedSeconds < 60;

  const timeColorClass = isCritical
    ? "text-red-400"
    : isLow
      ? "text-yellow-400"
      : "text-white";

  return (
    <div
      className={`rounded-xl border px-3 py-1.5 transition-all ${
        active
          ? "border-emerald-400/70 bg-emerald-400/10 shadow-lg shadow-emerald-950/20"
          : "border-slate-700 bg-slate-950/85"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {label}
          </p>

          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                active
                  ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                  : "bg-slate-600"
              }`}
            />
            <div className="h-4 w-0 shrink-0" aria-hidden="true" />
            <p className="truncate text-[15px] font-black leading-tight text-white">
              {username}
            </p>
            <span className="shrink-0 text-xs font-bold text-yellow-300">
              ({rating}) 🏆
            </span>

            {capturedPieces.length > 0 && (
              <div className="flex min-w-0 items-center gap-0.5">
                {capturedPieces.map((piece, index) => (
                  <span key={`${piece}-${index}`} className="shrink-0">
                    <ChessPiece piece={piece} size={20} />
                  </span>
                ))}
                {materialAdvantage > 0 && (
                  <span className="ml-1 shrink-0 text-xs font-black text-yellow-300">
                    +{materialAdvantage}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          {active && (
            <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">
              ● LIVE
            </p>
          )}
          <p className={`font-mono text-[22px] font-black leading-none tabular-nums sm:text-[26px] ${timeColorClass}`}>
            {formatClockTime(time)}
          </p>
        </div>
      </div>
    </div>
  );
}

const capturedPieceValues: Record<string, number> = {
  "♙": 1,
  "♟": 1,
  "♘": 3,
  "♞": 3,
  "♗": 3,
  "♝": 3,
  "♖": 5,
  "♜": 5,
  "♕": 9,
  "♛": 9,
};

function getCapturedMaterialValue(pieces: string[]) {
  return pieces.reduce(
    (total, piece) =>
      total + (capturedPieceValues[piece] ?? 0),
    0,
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
    currentMoveIndex,
    whiteCaptured,
    blackCaptured,
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
    isProcessingRating,
    isRatedGame,
    ratingResult,
    ratingError,
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
    goToMove,
    goToFirstMove,
    goToPreviousMove,
    goToNextMove,
    goToLastMove,
  } = useOnlineChessGame({
    gameId,
    playerColor,
  });

  const whiteCapturedMaterial =
    getCapturedMaterialValue(whiteCaptured);
  const blackCapturedMaterial =
    getCapturedMaterialValue(blackCaptured);

  const whiteMaterialAdvantage = Math.max(
    whiteCapturedMaterial - blackCapturedMaterial,
    0,
  );
  const blackMaterialAdvantage = Math.max(
    blackCapturedMaterial - whiteCapturedMaterial,
    0,
  );

  const router = useRouter();

  const boardAreaRef = useRef<HTMLDivElement | null>(null);
  const rightGameAreaRef = useRef<HTMLDivElement | null>(null);
  const [rightGameAreaHeight, setRightGameAreaHeight] = useState<number | null>(null);

  useEffect(() => {
    const boardArea = boardAreaRef.current;
    const rightGameArea = rightGameAreaRef.current;

    if (!boardArea || !rightGameArea) {
      return;
    }

    const updateRightGameAreaHeight = () => {
      const boardRect = boardArea.getBoundingClientRect();
      const rightGameAreaRect = rightGameArea.getBoundingClientRect();

      setRightGameAreaHeight(
        Math.max(0, boardRect.bottom - rightGameAreaRect.top),
      );
    };

    updateRightGameAreaHeight();

    const resizeObserver = new ResizeObserver(updateRightGameAreaHeight);
    resizeObserver.observe(boardArea);
    resizeObserver.observe(rightGameArea);

    window.addEventListener("resize", updateRightGameAreaHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateRightGameAreaHeight);
    };
  }, []);

  const currentPlayer =
    playerColor === "w"
      ? whitePlayer
      : blackPlayer;

  const opponent =
    playerColor === "w"
      ? blackPlayer
      : whitePlayer;

  const displayedWhiteRating =
    ratingResult?.whitePlayer.newRating !== null &&
    ratingResult?.whitePlayer.newRating !== undefined
      ? Math.round(ratingResult.whitePlayer.newRating)
      : whitePlayer.rating;

  const displayedBlackRating =
    ratingResult?.blackPlayer.newRating !== null &&
    ratingResult?.blackPlayer.newRating !== undefined
      ? Math.round(ratingResult.blackPlayer.newRating)
      : blackPlayer.rating;

  const currentPlayerDisplayedRating =
    playerColor === "w"
      ? displayedWhiteRating
      : displayedBlackRating;

  const opponentDisplayedRating =
    playerColor === "w"
      ? displayedBlackRating
      : displayedWhiteRating;

  const currentPlayerRating = ratingResult
    ? playerColor === "w"
      ? ratingResult.whitePlayer
      : ratingResult.blackPlayer
    : null;

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

  const [isGameOverDialogReady, setIsGameOverDialogReady] =
    useState(false);

  useEffect(() => {
    if (status !== "FINISHED" || !isGameOver) {
      setIsGameOverDialogReady(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsGameOverDialogReady(true);
    }, 1300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isGameOver, status]);

  const [isResignDialogOpen, setIsResignDialogOpen] =
    useState(false);

  const [isDrawDialogOpen, setIsDrawDialogOpen] =
    useState(false);

  const [isRematchDialogOpen, setIsRematchDialogOpen] =
    useState(false);

  const [dismissedDrawOfferAt, setDismissedDrawOfferAt] =
    useState<string | null>(null);

  const [opening, setOpening] =
    useState<OpeningInfo | null>(null);

  const [selectedSquare, setSelectedSquare] =
    useState<Square | null>(null);

  const legalMoveSquares = useMemo(() => {
    if (
      !selectedSquare ||
      !isPlayerTurn ||
      isGameOver
    ) {
      return [];
    }

    return displayGame.moves({
      square: selectedSquare,
      verbose: true,
    });
  }, [
    displayGame,
    isGameOver,
    isPlayerTurn,
    selectedSquare,
  ]);

  const clickMoveSquareStyles = useMemo(() => {
    const styles: Record<
      string,
      React.CSSProperties
    > = {};

    if (selectedSquare) {
      styles[selectedSquare] = {
        boxShadow:
          "inset 0 0 0 4px rgba(250, 204, 21, 0.95)",
        backgroundColor:
          "rgba(250, 204, 21, 0.28)",
      };
    }

    for (const move of legalMoveSquares) {
      const targetPiece = displayGame.get(
        move.to as Square,
      );

      styles[move.to] = targetPiece
        ? {
            background:
              "radial-gradient(circle, transparent 0 48%, rgba(250, 204, 21, 0.95) 50% 54%, transparent 56%)",
          }
        : {
            background:
              "radial-gradient(circle, rgba(37, 99, 235, 0.85) 0 18%, transparent 20%)",
          };
    }

    return styles;
  }, [
    displayGame,
    legalMoveSquares,
    selectedSquare,
  ]);

  const boardSquareStyles = useMemo(
    () => ({
      ...squareStyles,
      ...clickMoveSquareStyles,
    }),
    [clickMoveSquareStyles, squareStyles],
  );

  function handleSquareClick(square: string) {
    if (!isPlayerTurn || isGameOver) {
      setSelectedSquare(null);
      return;
    }

    const clickedSquare = square as Square;
    const clickedPiece =
      displayGame.get(clickedSquare);

    if (selectedSquare === clickedSquare) {
      setSelectedSquare(null);
      return;
    }

    if (selectedSquare) {
      const isLegalTarget =
        legalMoveSquares.some(
          (move) => move.to === clickedSquare,
        );

      if (isLegalTarget) {
        onDrop(selectedSquare, clickedSquare);
        setSelectedSquare(null);
        return;
      }
    }

    if (
      clickedPiece &&
      clickedPiece.color === playerColor
    ) {
      setSelectedSquare(clickedSquare);
      return;
    }

    setSelectedSquare(null);
  }

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

  const openingMoves = history.join(" ");

  useEffect(() => {
    if (!openingMoves) {
      setOpening(null);
      return;
    }

    const controller = new AbortController();

    async function recognizeOpening() {
      try {
        const response = await fetch("/api/opening", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pgn: openingMoves,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data =
          (await response.json()) as OpeningApiResponse;

        if (data.success) {
          setOpening(data.opening);
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "OPENING RECOGNITION REQUEST ERROR:",
          error,
        );
      }
    }

    void recognizeOpening();

    return () => {
      controller.abort();
    };
  }, [openingMoves]);

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

  const moveHistoryResult =
    authoritativeResult === "WHITE_WIN"
      ? "1-0"
      : authoritativeResult === "BLACK_WIN"
        ? "0-1"
        : authoritativeResult === "DRAW"
          ? "½-½"
          : undefined;


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
          isGameOverDialogReady &&
          !isGameOverDialogClosed
        }
        result={authoritativeResult}
        playerColor={playerColor}
        reason={gameOverReason}
        isRated={isRatedGame || rated}
        isRatingLoading={isProcessingRating}
        rating={
          currentPlayerRating
            ? {
                oldRating: currentPlayerRating.oldRating,
                newRating: currentPlayerRating.newRating,
                ratingChange: currentPlayerRating.ratingChange,
              }
            : null
        }
        ratingError={ratingError}
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

      <section className="mt-2">
        <div className="mx-auto grid w-full max-w-[min(96vw,1500px)] items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,34vw)] xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <div className="mx-auto w-full min-w-0 lg:w-[min(100%,calc(100dvh-118px))]">
          <PlayerClock
            username={opponent.username}
            rating={opponentDisplayedRating}
            color={opponentColor}
            time={opponentTime}
            active={isOpponentClockActive}
            label="Opponent"
            capturedPieces={
              opponentColor === "w"
                ? whiteCaptured
                : blackCaptured
            }
            materialAdvantage={
              opponentColor === "w"
                ? whiteMaterialAdvantage
                : blackMaterialAdvantage
            }
          />

          <div
            ref={boardAreaRef}
            className="mt-1.5 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 p-1.5 shadow-2xl shadow-black/30"
          >
            <Chessboard
              position={displayGame.fen()}
              onPieceDrop={onDrop}
              onSquareClick={handleSquareClick}
              boardOrientation={boardOrientation}
              customLightSquareStyle={{
                backgroundColor: "#E8EDF2",
              }}
              customDarkSquareStyle={{
                backgroundColor: "#4F6F8F",
              }}
              customSquareStyles={boardSquareStyles}
            />
          </div>

          <div className="mt-1.5">
            <PlayerClock
              username={currentPlayer.username}
              rating={currentPlayerDisplayedRating}
              color={playerColor}
            time={currentPlayerTime}
            active={isCurrentPlayerClockActive}
              label="You"
              capturedPieces={
                playerColor === "w"
                  ? whiteCaptured
                  : blackCaptured
              }
              materialAdvantage={
                playerColor === "w"
                  ? whiteMaterialAdvantage
                  : blackMaterialAdvantage
              }
            />
          </div>

          </div>

          <aside className="flex w-full min-w-0 flex-col items-center gap-3 lg:items-stretch lg:pr-1">
            <div className="w-full lg:mb-[-1px]">
              <SoundControl />
            </div>

            <div
              ref={rightGameAreaRef}
              className="flex w-full min-h-0 flex-col gap-3"
              style={
                rightGameAreaHeight !== null
                  ? { height: `${rightGameAreaHeight}px` }
                  : undefined
              }
            >
            {opening && (
              <div className="w-full rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-yellow-400">
                  Opening
                </p>

                <p className="mt-1 text-sm font-black text-white">
                  {opening.eco} · {opening.name}
                </p>
              </div>
            )}

            <MoveHistory
              history={history}
              currentMoveIndex={currentMoveIndex}
              result={undefined}
              onMoveSelect={goToMove}
              onFirstMove={goToFirstMove}
              onPreviousMove={goToPreviousMove}
              onNextMove={goToNextMove}
              onLastMove={goToLastMove}
            />

            {!isGameOver && (
              <div className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 p-3 shadow-xl shadow-black/20">
                <div className="grid grid-cols-4 gap-2">
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
                    className="flex min-h-12 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-2 py-2.5 text-center text-xs font-bold text-slate-100 transition hover:border-sky-400/60 hover:bg-slate-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {hasOutgoingDrawOffer
                      ? "🤝 Offer Sent"
                      : hasIncomingDrawOffer
                        ? "🤝 Draw Offered"
                        : "½ Offer Draw"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsResignDialogOpen(true)}
                    disabled={
                      isResigning ||
                      isProcessingDraw
                    }
                    className="flex min-h-12 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-2 py-2.5 text-center text-xs font-bold text-slate-100 transition hover:border-red-400/60 hover:bg-slate-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    🏳️ Resign
                  </button>

                  <button
                    type="button"
                    onClick={handleFlipBoard}
                    className="flex min-h-12 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-2 py-2.5 text-center text-xs font-bold text-slate-100 transition hover:border-yellow-400/50 hover:bg-slate-700 active:scale-[0.98]"
                  >
                    🔄 Flip Board
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      router.push("/dashboard");
                      router.refresh();
                    }}
                    className="flex min-h-12 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-2 py-2.5 text-center text-xs font-bold text-slate-100 transition hover:border-slate-400 hover:bg-slate-700 active:scale-[0.98]"
                  >
                    🏠 Dashboard
                  </button>
                </div>

                {hasOutgoingDrawOffer && (
                  <div className="mt-3 rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-center text-xs font-semibold text-sky-200">
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
              <div className="w-full rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-2.5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-yellow-400">
                    Post-Game Actions
                  </p>

                  {moveHistoryResult && (
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Result
                      </span>
                      <span className="text-sm font-black text-yellow-300">
                        {moveHistoryResult}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsRematchDialogOpen(true)}
                  disabled={
                    hasOutgoingRematchOffer ||
                    isProcessingRematch ||
                    rematchGameId !== null
                  }
                  className="w-full rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-300 transition hover:border-yellow-400/70 hover:bg-yellow-400/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
                  <div className="mt-3 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-center text-xs font-semibold text-yellow-200">
                    Rematch offer sent — waiting for your opponent.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    router.push("/dashboard");
                    router.refresh();
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 active:scale-[0.98]"
                >
                  🏠 Back to Dashboard
                </button>

                <button
                  type="button"
                  onClick={handleFlipBoard}
                  className="mt-1.5 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 active:scale-[0.98]"
                >
                  🔄 Flip Board
                </button>
              </div>
            )}
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}