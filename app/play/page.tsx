"use client";

import { Chessboard } from "react-chessboard";

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
    isClockRunning,
    setBoardOrientation,
    onDrop,
    handlePromotionSelect,
    handleStartGame,
    handleRematch,
    handleNewGame,
    handleResign,
    handleUndo,
    handleFlipBoard,
    handleCloseGameOverDialog,
    handleOpenGameOverDialog,
    handleAnalysis,
    handleShare,
    getTurnLabel,
  } = useChessGame();

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
              boardOrientation={boardOrientation}
              onNewGame={handleNewGame}
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
                boardOrientation={boardOrientation}
                customSquareStyles={squareStyles}
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