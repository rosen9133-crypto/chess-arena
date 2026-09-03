"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import type { Square } from "chess.js";

import ChessPiece from "@/components/ChessPiece";
import GameOverDialog from "@/components/GameOverDialog";
import { MoveHistory } from "@/components/MoveHistory";
import SoundControl from "@/components/SoundControl";
import { useChessGame } from "@/hooks/useChessGame";

type OpeningMatch = {
  eco: string;
  name: string;
  pgn: string;
  matchedMoves: number;
};

type CompactPlayerBarProps = {
  name: string;
  subtitle: string;
  time: number;
  active: boolean;
  isUntimed: boolean;
  capturedPieces: string[];
  materialAdvantage: number;
};

const pieceValues: Record<string, number> = {
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

function getMaterialValue(pieces: string[]) {
  return pieces.reduce(
    (total, piece) => total + (pieceValues[piece] ?? 0),
    0,
  );
}

const capturedPieceOrder: Record<string, number> = {
  "♙": 0,
  "♟": 0,
  "♘": 1,
  "♞": 1,
  "♗": 2,
  "♝": 2,
  "♖": 3,
  "♜": 3,
  "♕": 4,
  "♛": 4,
};

function sortCapturedPieces(pieces: string[]) {
  return [...pieces].sort(
    (a, b) =>
      (capturedPieceOrder[a] ?? 99) -
      (capturedPieceOrder[b] ?? 99),
  );
}

function formatCompactClock(seconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function CompactPlayerBar({
  name,
  subtitle,
  time,
  active,
  isUntimed,
  capturedPieces,
  materialAdvantage,
}: CompactPlayerBarProps) {
  const displayedSeconds = Math.max(0, Math.ceil(time));
  const isCritical = !isUntimed && displayedSeconds <= 10;
  const isLow = !isUntimed && displayedSeconds < 60;

  const timeColorClass = isCritical
    ? "text-red-400"
    : isLow
      ? "text-yellow-400"
      : "text-white";

  return (
    <div
      className={`w-full rounded-xl border px-3 py-1.5 transition-all ${
        active
          ? "border-emerald-400/70 bg-emerald-400/10 shadow-lg shadow-emerald-950/20"
          : "border-slate-700 bg-slate-950/85"
      }`}
    >
      <div className="grid min-w-0 grid-cols-[minmax(max-content,0.9fr)_minmax(0,1.35fr)_auto] items-center gap-x-4">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              active
                ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                : "bg-slate-600"
            }`}
          />

          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase leading-none tracking-[0.2em] text-slate-500">
              {subtitle}
            </p>

            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-[15px] font-black leading-tight text-white">
                {name}
              </p>

              {active && (
                <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                  ● LIVE
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-center overflow-hidden px-2">
          <div className="flex shrink-0 items-center gap-0.5">
            {capturedPieces.map((piece, index) => (
              <ChessPiece
                key={`${piece}-${index}`}
                piece={piece}
                size={16}
              />
            ))}

            {materialAdvantage > 0 && (
              <span className="ml-1 shrink-0 text-xs font-black text-yellow-300">
                +{materialAdvantage}
              </span>
            )}
          </div>
        </div>

        <p
          className={`justify-self-end whitespace-nowrap pr-1 font-mono text-[22px] font-black leading-none tabular-nums sm:text-[26px] ${timeColorClass}`}
        >
          {isUntimed ? "∞" : formatCompactClock(time)}
        </p>
      </div>
    </div>
  );
}
export default function PlayPage() {
  const {
    game,
    displayGame,
    history,
    currentMoveIndex,
    goToMove,
    goToFirstMove,
    goToPreviousMove,
    goToNextMove,
    goToLastMove,
    isGameOver,
    boardOrientation,
    isGameOverDialogClosed,
    canUndo,
    hasGameStarted,
    whiteCaptured,
    blackCaptured,
    squareStyles,
    gameOverDetails,
    shouldShowGameOverDialog,
    moveLabel,
    timeControl,
    timeControls,
    isUntimedGame,
    stockfishDifficulty,
    stockfishDifficulties,
    playerColorChoice,
    playerColor,
    setPlayerColorChoice,
    selectedStockfishDifficultyId,
    setSelectedStockfishDifficultyId,
    selectedTimeControlId,
    setSelectedTimeControlId,
    whiteTime,
    blackTime,
    activeClock,
    isEvaluatingDrawOffer,
    drawOfferMessage,
    isComputerDrawOfferOpen,
    canOfferDraw,
    isClockRunning,
    setBoardOrientation,
    onDrop,
    handlePromotionSelect,
    handleStartGame,
    handleRematch,
    handleNewGame,
    handleOfferDraw,
    handleAcceptComputerDrawOffer,
    handleDeclineComputerDrawOffer,
    handleResign,
    handleUndo,
    handleFlipBoard,
    handleCloseGameOverDialog,
    handleOpenGameOverDialog,
    handleAnalysis,
    handleShare,
    getTurnLabel,
  } = useChessGame();

  const [selectedSquare, setSelectedSquare] =
    useState<Square | null>(null);
  const [clickPromotionMove, setClickPromotionMove] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] =
    useState(false);
  const [isResignConfirmOpen, setIsResignConfirmOpen] =
    useState(false);
  const [opening, setOpening] = useState<OpeningMatch | null>(null);
  const boardAreaRef = useRef<HTMLElement | null>(null);
  const opponentBarRef = useRef<HTMLDivElement | null>(null);
  const boardFrameRef = useRef<HTMLDivElement | null>(null);
  const playerBarRef = useRef<HTMLDivElement | null>(null);
  const [adaptiveBoardSize, setAdaptiveBoardSize] = useState<number | null>(null);

  const currentGamePgn = game.pgn();

  useEffect(() => {
    if (!hasGameStarted || !currentGamePgn.trim()) {
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
            pgn: currentGamePgn,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          success?: boolean;
          opening?: OpeningMatch | null;
        };

        if (data.success) {
          setOpening(data.opening ?? null);
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error("OPENING RECOGNITION ERROR:", error);
      }
    }

    void recognizeOpening();

    return () => {
      controller.abort();
    };
  }, [currentGamePgn, hasGameStarted]);

  const isPlayerTurn =
    hasGameStarted &&
    !isGameOver &&
    game.turn() === playerColor;

  const legalMoveSquares = useMemo(() => {
    if (!selectedSquare || !isPlayerTurn) {
      return [];
    }

    return displayGame.moves({
      square: selectedSquare,
      verbose: true,
    });
  }, [displayGame, isPlayerTurn, selectedSquare]);

  const clickMoveSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    if (selectedSquare) {
      styles[selectedSquare] = {
        boxShadow:
          "inset 0 0 0 4px rgba(250, 204, 21, 0.95)",
        backgroundColor:
          "rgba(250, 204, 21, 0.28)",
      };
    }

    for (const move of legalMoveSquares) {
      const targetPiece = displayGame.get(move.to as Square);

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
  }, [displayGame, legalMoveSquares, selectedSquare]);

  const boardSquareStyles = useMemo(
    () => ({
      ...squareStyles,
      ...clickMoveSquareStyles,
    }),
    [clickMoveSquareStyles, squareStyles],
  );

  function handleBoardPromotionSelect(
    piece?: string,
    promoteFromSquare?: string,
    promoteToSquare?: string,
  ) {
    if (!piece) {
      setClickPromotionMove(null);
      return false;
    }

    const promotionPiece = piece.slice(-1).toLowerCase();

    if (
      promotionPiece !== "q" &&
      promotionPiece !== "r" &&
      promotionPiece !== "b" &&
      promotionPiece !== "n"
    ) {
      return false;
    }

    const promotionFromSquare =
      promoteFromSquare ?? clickPromotionMove?.from;
    const promotionToSquare =
      promoteToSquare ?? clickPromotionMove?.to;

    if (!promotionFromSquare || !promotionToSquare) {
      return false;
    }

    const promotionSucceeded = handlePromotionSelect(
      promotionPiece,
      promotionFromSquare,
      promotionToSquare,
    );

    if (promotionSucceeded) {
      setSelectedSquare(null);
      setClickPromotionMove(null);
    }

    return promotionSucceeded;
  }

  function handleSquareClick(square: string) {
    if (!isPlayerTurn) {
      setSelectedSquare(null);
      return;
    }

    const clickedSquare = square as Square;
    const clickedPiece = displayGame.get(clickedSquare);

    if (selectedSquare === clickedSquare) {
      setSelectedSquare(null);
      return;
    }

    if (selectedSquare) {
      const isLegalTarget = legalMoveSquares.some(
        (move) => move.to === clickedSquare,
      );

      if (isLegalTarget) {
        const selectedPiece = displayGame.get(selectedSquare);
        const isClickPromotion =
          selectedPiece?.type === "p" &&
          ((selectedPiece.color === "w" && clickedSquare[1] === "8") ||
            (selectedPiece.color === "b" && clickedSquare[1] === "1"));

        if (isClickPromotion) {
          setClickPromotionMove({
            from: selectedSquare,
            to: clickedSquare,
          });
          return;
        }

        onDrop(selectedSquare, clickedSquare);
        setSelectedSquare(null);
        return;
      }
    }

    if (clickedPiece && clickedPiece.color === playerColor) {
      setSelectedSquare(clickedSquare);
      return;
    }

    setSelectedSquare(null);
  }

  const opponentColor = playerColor === "w" ? "b" : "w";

  const playerTime =
    playerColor === "w" ? whiteTime : blackTime;
  const opponentTime =
    opponentColor === "w" ? whiteTime : blackTime;

  const isPlayerClockActive =
    isClockRunning && activeClock === playerColor;
  const isOpponentClockActive =
    isClockRunning && activeClock === opponentColor;

  const whiteCapturedMaterial = getMaterialValue(whiteCaptured);
  const blackCapturedMaterial = getMaterialValue(blackCaptured);
  const whiteMaterialAdvantage = Math.max(
    whiteCapturedMaterial - blackCapturedMaterial,
    0,
  );
  const blackMaterialAdvantage = Math.max(
    blackCapturedMaterial - whiteCapturedMaterial,
    0,
  );

  const playerCapturedPieces = sortCapturedPieces(
    playerColor === "w" ? whiteCaptured : blackCaptured,
  );
  const opponentCapturedPieces = sortCapturedPieces(
    opponentColor === "w" ? whiteCaptured : blackCaptured,
  );
  const playerMaterialAdvantage =
    playerColor === "w" ? whiteMaterialAdvantage : blackMaterialAdvantage;
  const opponentMaterialAdvantage =
    opponentColor === "w" ? whiteMaterialAdvantage : blackMaterialAdvantage;


  useEffect(() => {
    const boardArea = boardAreaRef.current;
    const opponentBar = opponentBarRef.current;
    const boardFrame = boardFrameRef.current;
    const playerBar = playerBarRef.current;

    if (!boardArea || !opponentBar || !boardFrame || !playerBar) {
      return;
    }

    const updateBoardSize = () => {
      const areaRect = boardArea.getBoundingClientRect();
      const viewportHeight = document.documentElement.clientHeight;
      const availableWidth = boardArea.clientWidth;
      const availableHeight = Math.max(0, viewportHeight - areaRect.top);

      const opponentBarHeight = opponentBar.getBoundingClientRect().height;
      const playerBarHeight = playerBar.getBoundingClientRect().height;

      const boardFrameStyle = window.getComputedStyle(boardFrame);
      const playerBarStyle = window.getComputedStyle(playerBar);

      const measuredVerticalSpacing =
        Number.parseFloat(boardFrameStyle.marginTop || "0") +
        Number.parseFloat(boardFrameStyle.marginBottom || "0") +
        Number.parseFloat(playerBarStyle.marginTop || "0") +
        Number.parseFloat(playerBarStyle.marginBottom || "0");

      const nextBoardSize = Math.max(
        0,
        Math.floor(
          Math.min(
            availableWidth,
            availableHeight -
              opponentBarHeight -
              playerBarHeight -
              measuredVerticalSpacing,
          ),
        ),
      );

      setAdaptiveBoardSize((currentSize) =>
        currentSize === nextBoardSize ? currentSize : nextBoardSize,
      );
    };

    updateBoardSize();

    const resizeObserver = new ResizeObserver(updateBoardSize);
    resizeObserver.observe(boardArea);
    resizeObserver.observe(opponentBar);
    resizeObserver.observe(boardFrame);
    resizeObserver.observe(playerBar);
    window.addEventListener("resize", updateBoardSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateBoardSize);
    };
  }, [
    opponentCapturedPieces.length,
    playerCapturedPieces.length,
  ]);

  const playerColorLabel =
    playerColor === "w" ? "White player" : "Black player";
  const playerIcon = playerColor === "w" ? "⚪" : "⚫";
  const opponentColorLabel =
    opponentColor === "w" ? "White player" : "Black player";
  const opponentIcon = opponentColor === "w" ? "⚪" : "⚫";

  const playerWon =
    gameOverDetails.result ===
    (playerColor === "w" ? "white-win" : "black-win");

  const opponentWon =
    gameOverDetails.result ===
    (opponentColor === "w" ? "white-win" : "black-win");

  const arenaScore =
    !isGameOver
      ? null
      : gameOverDetails.result === "white-win"
        ? "1–0"
        : gameOverDetails.result === "black-win"
          ? "0–1"
          : gameOverDetails.result === "draw"
            ? "½–½"
            : gameOverDetails.score;

  const selectedTimeControl = timeControls.find(
    (control) => control.id === selectedTimeControlId,
  );

  const selectedColorLabel =
    playerColorChoice === "white"
      ? "White"
      : playerColorChoice === "black"
        ? "Black"
        : "Random";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-2 text-white sm:px-6">
      {isResignConfirmOpen && hasGameStarted && !isGameOver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsResignConfirmOpen(false);
            }
          }}
        >
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
                onClick={() => setIsResignConfirmOpen(false)}
                className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 font-semibold text-white transition hover:border-slate-500 hover:bg-slate-700 active:scale-[0.98]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsResignConfirmOpen(false);
                  handleResign();
                }}
                className="rounded-xl bg-red-500 px-4 py-3 font-bold text-white transition hover:bg-red-400 active:scale-[0.98]"
              >
                Resign
              </button>
            </div>
          </div>
        </div>
      )}

      {isComputerDrawOfferOpen && !isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50">
            <div className="h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

            <div className="px-6 pb-7 pt-8 sm:px-8">
              <div className="text-center">
                <div className="mb-4 text-6xl">🤝</div>

                <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
                  Draw Offer
                </p>

                <h2 className="mt-3 text-3xl font-extrabold text-white">
                  Computer offers a draw
                </h2>

                <p className="mt-4 leading-6 text-slate-300">
                  Stockfish thinks the position is balanced and is offering a draw.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleDeclineComputerDrawOffer}
                  className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3.5 font-semibold text-white transition hover:border-slate-500 hover:bg-slate-700 active:scale-[0.98]"
                >
                  Decline
                </button>

                <button
                  type="button"
                  onClick={handleAcceptComputerDrawOffer}
                  className="rounded-xl bg-emerald-400 px-4 py-3.5 font-bold text-slate-950 transition hover:bg-emerald-300 active:scale-[0.98]"
                >
                  Accept Draw
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <GameOverDialog
        isOpen={shouldShowGameOverDialog}
        title={
          gameOverDetails.result === "draw"
            ? gameOverDetails.title
            : gameOverDetails.result ===
              (playerColor === "w" ? "white-win" : "black-win")
            ? "Victory"
            : "Defeat"
        }
        subtitle={gameOverDetails.subtitle}
        score={gameOverDetails.score}
        result={gameOverDetails.result}
        onClose={handleCloseGameOverDialog}
        onRematch={handleRematch}
        onNewGame={handleNewGame}
        onAnalysis={handleAnalysis}
        onShare={handleShare}
      />

      {isSettingsOpen && !hasGameStarted && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsSettingsOpen(false);
          }}
        >
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl shadow-black/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-yellow-400">
                  Chess Arena
                </p>
                <h2 className="mt-1 text-xl font-black text-white">Game Settings</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-lg font-bold text-slate-300 hover:text-white"
                aria-label="Close game settings"
              >
                ×
              </button>
            </div>
            <div className="mt-4 grid gap-3">
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Your Color
      </p>
      <div className="grid grid-cols-3 gap-2">
        {(["white", "black", "random"] as const).map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setPlayerColorChoice(color)}
            className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
              playerColorChoice === color
                ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
                : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500"
            }`}
          >
            {color === "white"
              ? "⚪ White"
              : color === "black"
                ? "⚫ Black"
                : "🎲 Random"}
          </button>
        ))}
      </div>
    </div>

    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Stockfish Level
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stockfishDifficulties.map((difficulty) => (
          <button
            key={difficulty.id}
            type="button"
            onClick={() =>
              setSelectedStockfishDifficultyId(difficulty.id)
            }
            className={`rounded-xl border px-2 py-2 text-left transition ${
              selectedStockfishDifficultyId === difficulty.id
                ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
                : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500"
            }`}
          >
            <span className="block text-xs font-bold">
              {difficulty.label}
            </span>
            <span className="block text-[10px] text-slate-500">
              {difficulty.elo} Elo
            </span>
          </button>
        ))}
      </div>
    </div>

    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Time Control
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {timeControls.map((control) => (
          <button
            key={control.id}
            type="button"
            onClick={() => setSelectedTimeControlId(control.id)}
            className={`rounded-xl border px-2 py-2 text-center transition ${
              selectedTimeControlId === control.id
                ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
                : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500"
            }`}
          >
            <span className="block text-xs font-bold">
              {control.label}
            </span>
            <span className="block text-[10px] text-slate-500">
              {control.id === "no-time"
                ? "Unlimited"
                : `${control.initialMinutes}+${control.incrementSeconds}`}
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="mt-4 w-full rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-yellow-300"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1450px]">
        <div className="relative grid items-start gap-4 xl:min-h-[calc(100dvh-1rem)] xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] xl:justify-center">
          <div className="pointer-events-none absolute left-0 top-3 hidden xl:block">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-400">
              Chess Arena
            </p>
          </div>

          <section ref={boardAreaRef} className="w-full">
            <div
              className="mx-auto w-full"
              style={
                adaptiveBoardSize
                  ? { width: `${adaptiveBoardSize}px` }
                  : undefined
              }
            >
              <div ref={opponentBarRef}>
                <CompactPlayerBar
                  name={`Stockfish (${stockfishDifficulty.elo}) 🏆`}
                  subtitle="Opponent"
                time={opponentTime}
                active={isOpponentClockActive}
                isUntimed={isUntimedGame}
                  capturedPieces={opponentCapturedPieces}
                  materialAdvantage={opponentMaterialAdvantage}
                />
              </div>

              <div
                ref={boardFrameRef}
                className="mt-1.5 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 p-1.5 shadow-2xl shadow-black/30"
              >
              <Chessboard
                position={displayGame.fen()}
                onPieceDrop={onDrop}
                onPromotionPieceSelect={handleBoardPromotionSelect}
                promotionDialogVariant="default"
                showPromotionDialog={clickPromotionMove !== null}
                promotionToSquare={clickPromotionMove?.to ?? null}
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

              <div ref={playerBarRef} className="mt-1.5">
                <CompactPlayerBar
                  name="Rosen"
                  subtitle="You"
                  time={playerTime}
                  active={isPlayerClockActive}
                  isUntimed={isUntimedGame}
                  capturedPieces={playerCapturedPieces}
                  materialAdvantage={playerMaterialAdvantage}
                />
              </div>
            </div>

            {isGameOver && isGameOverDialogClosed && (
              <button
                type="button"
                onClick={handleOpenGameOverDialog}
                className="mx-auto mt-4 block rounded-lg border border-yellow-400/60 bg-yellow-400/10 px-5 py-2.5 font-semibold text-yellow-300 transition hover:bg-yellow-400/20"
              >
                View game result
              </button>
            )}

          </section>

          <aside className="flex w-full flex-col xl:sticky xl:top-2 xl:h-[calc(100dvh-1rem)] xl:min-h-0">
            <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/55 p-3 shadow-2xl shadow-black/20 backdrop-blur-sm">
              <div className="flex min-h-[52px] items-center rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2">
                <div className="w-full">
                  <SoundControl />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm" aria-hidden="true">♟</span>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-400">
                    Opening
                  </p>
                  {opening && (
                    <span className="ml-auto shrink-0 rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[9px] font-black text-slate-400">
                      {opening.eco}
                    </span>
                  )}
                </div>

                <p
                  className={`mt-1 truncate text-xs font-bold ${
                    opening ? "text-slate-200" : "text-slate-500"
                  }`}
                  title={opening?.name}
                >
                  {opening?.name ??
                    (hasGameStarted
                      ? "Opening not recognized yet"
                      : "Starts after the first moves")}
                </p>
              </div>

              {!hasGameStarted && (
                <div className="w-full rounded-xl border border-slate-800 bg-slate-950/55 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-400">
                        Game Settings
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-200">
                        {stockfishDifficulty.label} · {stockfishDifficulty.elo} Elo
                        <span className="mx-1.5 text-slate-600">|</span>
                        {selectedTimeControl?.label ?? "Time"}
                        <span className="mx-1.5 text-slate-600">|</span>
                        {selectedColorLabel}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(true)}
                      className="shrink-0 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-yellow-400/60 hover:text-yellow-300"
                    >
                      ⚙ Change
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartGame}
                    className="mt-3 w-full rounded-xl bg-yellow-400 px-5 py-3 text-base font-extrabold tracking-wide text-slate-950 shadow-lg shadow-yellow-400/10 transition hover:bg-yellow-300 active:scale-[0.99]"
                  >
                    ▶ PLAY
                  </button>
                </div>
              )}

            <MoveHistory
              history={history}
              currentMoveIndex={currentMoveIndex}
              result={isGameOver ? gameOverDetails.score : undefined}
              onMoveSelect={goToMove}
              onFirstMove={goToFirstMove}
              onPreviousMove={goToPreviousMove}
              onNextMove={goToNextMove}
              onLastMove={goToLastMove}
            />

            {hasGameStarted && !isGameOver && (
              <div className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 p-3 shadow-xl shadow-black/20">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                  Game Controls
                </p>

                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={handleOfferDraw}
                    disabled={!canOfferDraw || isEvaluatingDrawOffer}
                    className="flex min-h-12 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-2 py-2.5 text-center text-xs font-bold text-slate-100 transition hover:border-sky-400/60 hover:bg-slate-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isEvaluatingDrawOffer ? "Thinking..." : "½ Draw"}
                  </button>

                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className="flex min-h-12 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-2 py-2.5 text-center text-xs font-bold text-slate-100 transition hover:border-sky-400/60 hover:bg-slate-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ↩ Undo
                  </button>

                  <button
                    type="button"
                    onClick={handleFlipBoard}
                    className="flex min-h-12 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-2 py-2.5 text-center text-xs font-bold text-slate-100 transition hover:border-yellow-400/50 hover:bg-slate-700 active:scale-[0.98]"
                  >
                    🔄 Flip
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsResignConfirmOpen(true)}
                    className="flex min-h-12 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-2 py-2.5 text-center text-xs font-bold text-slate-100 transition hover:border-red-400/60 hover:bg-slate-700 active:scale-[0.98]"
                  >
                    🏳 Resign
                  </button>
                </div>

                {drawOfferMessage && (
                  <p className="mt-3 text-center text-xs font-semibold text-slate-300">
                    {drawOfferMessage}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleNewGame}
                  className="mt-2.5 w-full rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2.5 text-sm font-black text-yellow-300 transition hover:border-yellow-400/70 hover:bg-yellow-400/20 active:scale-[0.98]"
                >
                  New Game
                </button>
              </div>
            )}

            {hasGameStarted && isGameOver && (
              <div className="w-full rounded-2xl border border-yellow-400/25 bg-slate-900/90 p-3 shadow-xl shadow-black/20">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-400">
                      Game Finished
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-400">
                      {gameOverDetails.subtitle}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1 font-mono text-sm font-black text-white">
                    {arenaScore ?? gameOverDetails.score}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={handleAnalysis}
                    className="flex min-h-11 items-center justify-center rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-2 py-2 text-center text-xs font-black text-yellow-300 transition hover:border-yellow-400/70 hover:bg-yellow-400/20 active:scale-[0.98]"
                  >
                    ♟ Review
                  </button>

                  <button
                    type="button"
                    onClick={handleRematch}
                    className="flex min-h-11 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-2 py-2 text-center text-xs font-bold text-slate-100 transition hover:border-emerald-400/60 hover:bg-slate-700 active:scale-[0.98]"
                  >
                    ↻ Rematch
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex min-h-11 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-2 py-2 text-center text-xs font-bold text-slate-100 transition hover:border-sky-400/60 hover:bg-slate-700 active:scale-[0.98]"
                  >
                    ↗ Share
                  </button>

                  <button
                    type="button"
                    onClick={handleFlipBoard}
                    className="flex min-h-11 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-2 py-2 text-center text-xs font-bold text-slate-100 transition hover:border-yellow-400/50 hover:bg-slate-700 active:scale-[0.98]"
                  >
                    🔄 Flip
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleNewGame}
                  className="mt-2.5 w-full rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-yellow-300 active:scale-[0.98]"
                >
                  New Game
                </button>
              </div>
            )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}