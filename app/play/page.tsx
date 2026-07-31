"use client";

import {
  useEffect,
  useState,
} from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";

import CapturedPieces from "@/components/CapturedPieces";
import GameControls from "@/components/GameControls";
import GameInfo from "@/components/GameInfo";
import GameOverDialog from "@/components/GameOverDialog";
import { MoveHistory } from "@/components/MoveHistory";
import PromotionDialog from "@/components/PromotionDialog";
import { getCapturedPieces } from "@/lib/gameUtils";
import {
  getCheckSquareStyles,
  getLastMoveSquareStyles,
} from "@/lib/boardStyles";
import { getGameResult } from "@/lib/gameResult";
import { createGameWithHistory } from "../../lib/history";
import {
  playSound,
  preloadSounds,
} from "@/lib/sounds/soundManager";
import type {
  BoardOrientation,
  ChessMove,
  GameOverDetails,
  PendingPromotion,
  PromotionPiece,
} from "@/types/chess";

export default function PlayPage() {
  const [game, setGame] = useState(() => new Chess());

  useEffect(() => {
    preloadSounds();
  }, []);

  const [boardOrientation, setBoardOrientation] =
    useState<BoardOrientation>("white");

  const [pendingPromotion, setPendingPromotion] =
    useState<PendingPromotion | null>(null);

  const [
    isGameOverDialogClosed,
    setIsGameOverDialogClosed,
  ] = useState(false);


  function makeMove(move: ChessMove) {
    const gameCopy = createGameWithHistory(game);

    try {
      const result = gameCopy.move(move);

      setGame(gameCopy);
      setIsGameOverDialogClosed(false);

      if (gameCopy.isCheckmate()) {
  playSound("win");
      } else if (gameCopy.isGameOver()) {
        playSound("draw");
      } else if (gameCopy.isCheck()) {
        playSound("check");
      } else if (result.promotion) {
        playSound("promote");
      } else if (
        result.flags.includes("k") ||
        result.flags.includes("q")
      ) {
        playSound("castle");
      } else if (result.captured) {
        playSound("capture");
      } else {
        playSound("move");
      }

      return result;
    } catch {
      return null;
    }
  }

  function isPromotionMove(
    sourceSquare: string,
    targetSquare: string,
  ) {
    const piece = game.get(
      sourceSquare as Square,
    );

    if (!piece || piece.type !== "p") {
      return false;
    }

    const legalMoves = game.moves({
      square: sourceSquare as Square,
      verbose: true,
    });

    return legalMoves.some(
      (move) =>
        move.to === targetSquare &&
        Boolean(move.promotion),
    );
  }

  function onDrop(
    sourceSquare: string,
    targetSquare: string,
  ) {
    if (
      game.isGameOver() ||
      pendingPromotion
    ) {
      return false;
    }

    if (
      isPromotionMove(
        sourceSquare,
        targetSquare,
      )
    ) {
      const pawn = game.get(
        sourceSquare as Square,
      );

      if (!pawn || pawn.type !== "p") {
        return false;
      }

      setPendingPromotion({
        from: sourceSquare,
        to: targetSquare,
        color: pawn.color,
      });

      return false;
    }

    return (
      makeMove({
        from: sourceSquare,
        to: targetSquare,
      }) !== null
    );
  }

  function handlePromotionSelect(
    piece: PromotionPiece,
  ) {
    if (!pendingPromotion) {
      return;
    }

    makeMove({
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion: piece,
    });

    setPendingPromotion(null);
  }

  function handleNewGame() {
    setGame(new Chess());
    setBoardOrientation("white");
    setPendingPromotion(null);
    setIsGameOverDialogClosed(false);
  }

  function handleUndo() {
    setPendingPromotion(null);

    const currentHistory = game.history({
      verbose: true,
    });

    if (currentHistory.length === 0) {
      return;
    }

    const gameWithoutLastMove =
  createGameWithHistory(
    game,
    currentHistory.length - 1,
  );

    setGame(gameWithoutLastMove);
    setIsGameOverDialogClosed(false);
  }

  function handleFlipBoard() {
    setBoardOrientation(
      (currentOrientation) =>
        currentOrientation === "white"
          ? "black"
          : "white",
    );
  }

  function handleCloseGameOverDialog() {
    setIsGameOverDialogClosed(true);
  }

  function handleAnalysis() {
    window.alert(
      "Game analysis will be available soon.",
    );
  }

  async function handleShare() {
    const pgn = game.pgn();

    const shareText = [
      "Chess Arena",
      "",
      pgn || "Finished chess game",
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Chess Arena Game",
          text: shareText,
        });

        return;
      }

      await navigator.clipboard.writeText(
        shareText,
      );

      window.alert(
        "The game was copied to your clipboard.",
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      window.alert(
        "The game could not be shared.",
      );
    }
  }



  function getTurnLabel() {
    if (game.isGameOver()) {
      return "Finished";
    }

    return game.turn() === "w"
      ? "White to move"
      : "Black to move";
  }

  const canUndo =
    game.history().length > 0 &&
    !game.isGameOver();

  const hasGameStarted =
    game.history().length > 0;

  const {
    whiteCaptured,
    blackCaptured,
  } = getCapturedPieces(game);

  const squareStyles = {
    ...getLastMoveSquareStyles(game),
    ...getCheckSquareStyles(game),
  };

  const gameOverDetails =
  getGameResult(game);

  const shouldShowGameOverDialog =
    gameOverDetails.isOpen &&
    !isGameOverDialogClosed;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <PromotionDialog
        isOpen={
          pendingPromotion !== null &&
          !game.isGameOver()
        }
        color={
          pendingPromotion?.color ??
          game.turn()
        }
        onSelect={handlePromotionSelect}
      />

      <GameOverDialog
        isOpen={shouldShowGameOverDialog}
        title={gameOverDetails.title}
        subtitle={gameOverDetails.subtitle}
        score={gameOverDetails.score}
        result={gameOverDetails.result}
        onClose={
          handleCloseGameOverDialog
        }
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
            Play, improve your skills and
            conquer the arena.
          </p>
        </header>

        <div className="grid items-start gap-8 xl:grid-cols-[288px_minmax(0,620px)_288px] xl:justify-center">
          <aside className="flex w-full flex-col gap-6">
            <MoveHistory
              history={game.history()}
              result={
                game.isGameOver()
                  ? gameOverDetails.score
                  : undefined
              }
            />

            <GameControls
              canUndo={canUndo}
              hasGameStarted={hasGameStarted}
              boardOrientation={
                boardOrientation
              }
              onNewGame={handleNewGame}
              onUndo={handleUndo}
              onFlipBoard={
                handleFlipBoard
              }
              onBoardOrientationChange={
                setBoardOrientation
              }
            />
          </aside>

          <section className="w-full">
            <div className="mx-auto w-full max-w-[620px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 p-2 shadow-2xl shadow-black/30">
              <Chessboard
                position={game.fen()}
                onPieceDrop={onDrop}
                boardOrientation={
                  boardOrientation
                }
                customSquareStyles={
                  squareStyles
                }
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
                  {game.isGameOver()
                    ? gameOverDetails.score
                    : `Move ${game.moveNumber()}`}
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

            {game.isGameOver() &&
              isGameOverDialogClosed && (
                <button
                  type="button"
                  onClick={() =>
                    setIsGameOverDialogClosed(
                      false,
                    )
                  }
                  className="mx-auto mt-4 block rounded-lg border border-yellow-400/60 bg-yellow-400/10 px-5 py-2.5 font-semibold text-yellow-300 transition hover:bg-yellow-400/20"
                >
                  View game result
                </button>
              )}
          </section>

          <aside className="flex w-full flex-col gap-6">
            <GameInfo game={game} />

            <CapturedPieces
              whiteCaptured={
                whiteCaptured
              }
              blackCaptured={
                blackCaptured
              }
            />
          </aside>
        </div>
      </div>
    </main>
  );
}