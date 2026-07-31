"use client";

import {
  useEffect,
  useState,
} from "react";
import { Chess, type Square } from "chess.js";

import {
  getCheckSquareStyles,
  getLastMoveSquareStyles,
} from "@/lib/boardStyles";
import { getGameResult } from "@/lib/gameResult";
import { getCapturedPieces } from "@/lib/gameUtils";
import { createGameWithHistory } from "@/lib/history";
import {
  playSound,
  preloadSounds,
} from "@/lib/sounds/soundManager";
import type {
  BoardOrientation,
  ChessMove,
  PendingPromotion,
  PromotionPiece,
} from "@/types/chess";

export function useChessGame() {
  const [game, setGame] = useState(
    () => new Chess(),
  );

  const [
    boardOrientation,
    setBoardOrientation,
  ] = useState<BoardOrientation>("white");

  const [
    pendingPromotion,
    setPendingPromotion,
  ] = useState<PendingPromotion | null>(
    null,
  );

  const [
    isGameOverDialogClosed,
    setIsGameOverDialogClosed,
  ] = useState(false);

  useEffect(() => {
    preloadSounds();
  }, []);

  function makeMove(move: ChessMove) {
    const gameCopy =
      createGameWithHistory(game);

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

  function handleOpenGameOverDialog() {
    setIsGameOverDialogClosed(false);
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

  const history = game.history();

  const isGameOver = game.isGameOver();

  const canUndo =
    history.length > 0 && !isGameOver;

  const hasGameStarted =
    history.length > 0;

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

  const shouldShowPromotionDialog =
    pendingPromotion !== null &&
    !isGameOver;

  const promotionColor =
    pendingPromotion?.color ?? game.turn();

  const moveLabel = isGameOver
    ? gameOverDetails.score
    : `Move ${game.moveNumber()}`;

  return {
    game,
    history,
    isGameOver,
    boardOrientation,
    pendingPromotion,
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
  };
}