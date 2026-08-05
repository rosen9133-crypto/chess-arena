"use client";

import { Chessboard } from "react-chessboard";

import CapturedPieces from "@/components/CapturedPieces";
import ChessClock from "@/components/ChessClock";
import TimeControlSelector from "@/components/TimeControlSelector";
import GameControls from "@/components/GameControls";
import GameInfo from "@/components/GameInfo";
import GameOverDialog from "@/components/GameOverDialog";
import { MoveHistory } from "@/components/MoveHistory";
import PromotionDialog from "@/components/PromotionDialog";
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
selectedTimeControlId,
setSelectedTimeControlId,
    whiteTime,
    blackTime,
    activeClock,
    isClockRunning,
    setBoardOrientation,
    onDrop,
    handlePromotionSelect,
    handleNewGame,
    handleUndo,
    handleFlipBoard,
    handleCloseGameOverDialog,
    handleOpenGameOverDialog,
    handleAnalysis,
    handleShare,
    getTurnLabel,
  } = useChessGame();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <PromotionDialog
        isOpen={shouldShowPromotionDialog}
        color={promotionColor}
        onSelect={handlePromotionSelect}
      />

      <GameOverDialog
        isOpen={shouldShowGameOverDialog}
        title={gameOverDetails.title}
        subtitle={gameOverDetails.subtitle}
        score={gameOverDetails.score}
        result={gameOverDetails.result}
        onClose={handleCloseGameOverDialog}
        onNewGame={handleNewGame}
        onAnalysis={handleAnalysis}
        onShare={handleShare}
      />

      <div className="mx-auto max-w-[1450px]">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-yellow-400 sm:text-5xl">
            ♟️ Chess Arena
          </h1>

          <p className="mt-3 text-slate-400">
            Play, improve your skills and conquer the arena.
          </p>
        </header>

        <div className="grid items-start gap-8 xl:grid-cols-[288px_minmax(0,620px)_288px] xl:justify-center">
          <aside className="sticky top-6 self-start flex w-full flex-col gap-6">
            <MoveHistory
              history={history}
              currentMoveIndex={currentMoveIndex}
              result={
                isGameOver
                  ? gameOverDetails.score
                  : undefined
              }
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
                  White player
                </p>

                <p className="mt-1 font-semibold text-white">
                  ⚪ Rosen
                </p>
              </div>

              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  {getTurnLabel()}
                </p>

                <p className="mt-1 font-bold text-yellow-400">
                  {moveLabel}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  Black player
                </p>

                <p className="mt-1 font-semibold text-white">
                  ⚫ Opponent
                </p>
              </div>
            </div>

            {isGameOver &&
              isGameOverDialogClosed && (
                <button
                  type="button"
                  onClick={handleOpenGameOverDialog}
                  className="mx-auto mt-4 block rounded-lg border border-yellow-400/60 bg-yellow-400/10 px-5 py-2.5 font-semibold text-yellow-300 transition hover:bg-yellow-400/20"
                >
                  View game result
                </button>
              )}
          </section>

          <aside className="sticky top-6 self-start flex w-full flex-col gap-6">
            <ChessClock
              whiteTime={whiteTime}
              blackTime={blackTime}
              activeClock={activeClock}
              isClockRunning={isClockRunning}
            />
<TimeControlSelector
  controls={timeControls}
  selectedControlId={selectedTimeControlId}
  onSelect={setSelectedTimeControlId}
/>
            <GameInfo game={displayGame} />

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