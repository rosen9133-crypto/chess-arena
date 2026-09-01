"use client";

import { useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import type { Square } from "chess.js";

import CapturedPieces from "@/components/CapturedPieces";
import ChessClock from "@/components/ChessClock";
import TimeControlSelector from "@/components/TimeControlSelector";
import StockfishDifficultySelector from "@/components/StockfishDifficultySelector";
import PlayerColorSelector from "@/components/PlayerColorSelector";
import GameControls from "@/components/GameControls";
import GameInfo from "@/components/GameInfo";
import GameOverDialog from "@/components/GameOverDialog";
import { MoveHistory } from "@/components/MoveHistory";
import PromotionDialog from "@/components/PromotionDialog";
import SoundControl from "@/components/SoundControl";
import { useChessGame } from "@/hooks/useChessGame";

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
    shouldShowPromotionDialog,
    promotionColor,
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
      : gameOverDetails.result === "draw"
      ? "½–½"
      : opponentWon
      ? "1–0"
      : playerWon
      ? "0–1"
      : gameOverDetails.score;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <PromotionDialog
        isOpen={shouldShowPromotionDialog}
        color={promotionColor}
        onSelect={handlePromotionSelect}
      />

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

      <div className="mx-auto max-w-[1450px]">
        <header className="mb-10">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-yellow-400 sm:text-5xl">
              ♟️ Chess Arena
            </h1>

            <p className="mt-3 text-slate-400">
              Play, improve your skills and conquer the arena.
            </p>
          </div>

          <div className="mx-auto mt-5 w-full max-w-xs">
            <SoundControl />
          </div>
        </header>

        <div className="grid items-start gap-6 xl:grid-cols-[280px_minmax(0,620px)_300px] xl:justify-center">
          <aside className="flex w-full flex-col gap-5 xl:sticky xl:top-6">
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

            <GameControls
              canUndo={canUndo}
              hasGameStarted={hasGameStarted}
              isGameOver={isGameOver}
              canOfferDraw={canOfferDraw}
              isEvaluatingDrawOffer={isEvaluatingDrawOffer}
              drawOfferMessage={drawOfferMessage}
              boardOrientation={boardOrientation}
              onNewGame={handleNewGame}
              onOfferDraw={handleOfferDraw}
              onResign={handleResign}
              onUndo={handleUndo}
              onFlipBoard={handleFlipBoard}
              onBoardOrientationChange={setBoardOrientation}
            />
          </aside>

          <section className="w-full">
            <div className="mx-auto w-full max-w-[620px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 p-2 shadow-2xl shadow-black/30">
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

            <div className="mx-auto mt-4 grid w-full max-w-[620px] grid-cols-3 items-center rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-lg">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  {opponentColorLabel}
                </p>

                <p className="mt-1 font-semibold text-white">
                  {opponentIcon} Opponent
                </p>
              </div>

              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  {isGameOver
                    ? "Finished"
                    : hasGameStarted
                    ? getTurnLabel()
                    : "Ready to play"}
                </p>

                <p className="mt-1 font-bold text-yellow-400">
                  {isGameOver
                    ? arenaScore
                    : hasGameStarted
                    ? moveLabel
                    : "Set up your game"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  {playerColorLabel}
                </p>

                <p className="mt-1 font-semibold text-white">
                  {playerIcon} Rosen
                </p>
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

            <div className="mx-auto mt-6 grid w-full max-w-[620px] gap-5">
              <PlayerColorSelector
                selectedColor={playerColorChoice}
                onSelect={setPlayerColorChoice}
                disabled={hasGameStarted}
              />

              <StockfishDifficultySelector
                difficulties={stockfishDifficulties}
                selectedDifficultyId={selectedStockfishDifficultyId}
                selectedElo={stockfishDifficulty.elo}
                disabled={hasGameStarted}
                onSelect={setSelectedStockfishDifficultyId}
              />

              <button
                type="button"
                onClick={handleStartGame}
                disabled={hasGameStarted}
                className="w-full rounded-xl bg-yellow-400 px-6 py-4 text-lg font-extrabold tracking-wide text-slate-950 shadow-lg shadow-yellow-400/10 transition hover:bg-yellow-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-yellow-400"
              >
                ▶ PLAY
              </button>

              {!hasGameStarted && (
                <p className="-mt-2 text-center text-sm text-slate-400">
                  Choose your settings, then press PLAY.
                </p>
              )}
            </div>
          </section>

          <aside className="flex w-full flex-col gap-5 xl:sticky xl:top-6">
            <ChessClock
              whiteTime={whiteTime}
              blackTime={blackTime}
              activeClock={activeClock}
              isClockRunning={isClockRunning}
              playerColor={playerColor}
              isUntimed={isUntimedGame}
            />

            <TimeControlSelector
              controls={timeControls}
              selectedControlId={selectedTimeControlId}
              onSelect={setSelectedTimeControlId}
            />

            <GameInfo
              game={displayGame}
              hasGameStarted={hasGameStarted}
              isGameOver={isGameOver}
              finalScore={gameOverDetails.score}
              finalTitle={gameOverDetails.title}
            />

            <CapturedPieces
              whiteCaptured={whiteCaptured}
              blackCaptured={blackCaptured}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}