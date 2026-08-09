"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import { StockfishEngine } from "@/lib/stockfish/stockfishEngine";
import {
  DEFAULT_STOCKFISH_DIFFICULTY_ID,
  getStockfishDifficulty,
  STOCKFISH_DIFFICULTIES,
  type StockfishDifficultyId,
} from "@/lib/stockfish/difficulty";
import {
  playSound,
  preloadSounds,
  stopSound,
} from "@/lib/sounds/soundManager";
import type {
  BoardOrientation,
  ChessMove,
  PendingPromotion,
  PromotionPiece,
} from "@/types/chess";

export const TIME_CONTROLS = [
  {
    id: "1+0",
    label: "1+0",
    category: "Bullet",
    initialMinutes: 1,
    incrementSeconds: 0,
  },
  {
    id: "2+1",
    label: "2+1",
    category: "Bullet",
    initialMinutes: 2,
    incrementSeconds: 1,
  },
  {
    id: "3+2",
    label: "3+2",
    category: "Blitz",
    initialMinutes: 3,
    incrementSeconds: 2,
  },
  {
    id: "5+0",
    label: "5+0",
    category: "Blitz",
    initialMinutes: 5,
    incrementSeconds: 0,
  },
  {
    id: "10+0",
    label: "10+0",
    category: "Rapid",
    initialMinutes: 10,
    incrementSeconds: 0,
  },
  {
    id: "15+10",
    label: "15+10",
    category: "Rapid",
    initialMinutes: 15,
    incrementSeconds: 10,
  },
] as const;

const DEFAULT_TIME_CONTROL =
  TIME_CONTROLS[4];

function getInitialTimeSeconds(
  initialMinutes: number,
) {
  return initialMinutes * 60;
}

const CLOCK_UPDATE_INTERVAL_MS = 250;

type ChessColor = "w" | "b";

export function useChessGame() {
  const [game, setGame] = useState(
    () => new Chess(),
  );

  const [
  selectedTimeControlId,
  setSelectedTimeControlIdState,
] = useState<string>(DEFAULT_TIME_CONTROL.id);

  const selectedTimeControl =
    TIME_CONTROLS.find(
      (control) =>
        control.id === selectedTimeControlId,
    ) ?? DEFAULT_TIME_CONTROL;

  const setSelectedTimeControlId: Dispatch<
    SetStateAction<string>
  > = (value) => {
    if (game.history().length > 0) {
      return;
    }

    setSelectedTimeControlIdState(value);
  };
  const [
    currentMoveIndex,
    setCurrentMoveIndex,
  ] = useState(0);

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

  const [whiteTime, setWhiteTime] =
  useState(() =>
    getInitialTimeSeconds(
      selectedTimeControl.initialMinutes,
    ),
  );

const [blackTime, setBlackTime] =
  useState(() =>
    getInitialTimeSeconds(
      selectedTimeControl.initialMinutes,
    ),
  );

  const [activeClock, setActiveClock] =
    useState<ChessColor | null>(null);

  const [
    timedOutColor,
    setTimedOutColor,
  ] = useState<ChessColor | null>(null);

  const lastClockUpdateRef = useRef(
    Date.now(),
  );

  const clockWarningPlayedRef = useRef<
    Record<ChessColor, boolean>
  >({
    w: false,
    b: false,
  });

  const clockTickingColorRef = useRef<
    ChessColor | null
  >(null);

  const stockfishRef =
    useRef<StockfishEngine | null>(null);

  const stockfishThinkingRef =
    useRef(false);

  const [
    selectedStockfishDifficultyId,
    setSelectedStockfishDifficultyId,
  ] = useState<StockfishDifficultyId>(
    DEFAULT_STOCKFISH_DIFFICULTY_ID,
  );

  const selectedStockfishDifficulty =
    getStockfishDifficulty(
      selectedStockfishDifficultyId,
    );

  const latestGameRef = useRef(game);

  const stopClockTick = useCallback(() => {
    stopSound("clock-tick");
    clockTickingColorRef.current = null;
  }, []);

  useEffect(() => {
    latestGameRef.current = game;
  }, [game]);

  useEffect(() => {
    preloadSounds();

    return () => {
      stopSound("clock-tick");
    };
  }, []);

  useEffect(() => {
    const engine = new StockfishEngine();

    stockfishRef.current = engine;
    engine.start();

    engine.send("uci");
    engine.send(
      "setoption name UCI_LimitStrength value true",
    );
    engine.send(
      `setoption name UCI_Elo value ${selectedStockfishDifficulty.elo}`,
    );
    engine.send("isready");

    const unsubscribe = engine.subscribe(
      (message) => {
        if (!message.startsWith("bestmove ")) {
          return;
        }

        stockfishThinkingRef.current = false;

        const bestMove = message.split(" ")[1];

        if (
          !bestMove ||
          bestMove === "(none)"
        ) {
          return;
        }

        const currentGame = latestGameRef.current;

        if (
          currentGame.turn() !== "b" ||
          currentGame.isGameOver()
        ) {
          return;
        }

        const from = bestMove.slice(0, 2);
        const to = bestMove.slice(2, 4);
        const promotion =
          bestMove.length > 4
            ? (bestMove[4] as PromotionPiece)
            : undefined;

        const gameCopy =
          createGameWithHistory(currentGame);

        try {
          const result = gameCopy.move({
            from,
            to,
            ...(promotion
              ? { promotion }
              : {}),
          });

          stopClockTick();

          latestGameRef.current = gameCopy;
          setGame(gameCopy);
          setCurrentMoveIndex(
            gameCopy.history().length,
          );
          setIsGameOverDialogClosed(false);

          if (
            selectedTimeControl.incrementSeconds >
            0
          ) {
            setBlackTime((currentTime) =>
              currentTime +
              selectedTimeControl.incrementSeconds
            );
          }

          if (gameCopy.isGameOver()) {
            setActiveClock(null);
          } else {
            lastClockUpdateRef.current =
              Date.now();
            setActiveClock(gameCopy.turn());
          }

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
        } catch (error) {
          console.error(
            "Stockfish returned an invalid move:",
            bestMove,
            error,
          );
        }
      },
    );

    return () => {
      unsubscribe();
      engine.stop();

      if (stockfishRef.current === engine) {
        stockfishRef.current = null;
      }

      stockfishThinkingRef.current = false;
    };
  }, [
    selectedStockfishDifficulty.elo,
    selectedTimeControl.incrementSeconds,
    stopClockTick,
  ]);

  useEffect(() => {
    if (
      activeClock === null ||
      timedOutColor !== null ||
      game.isGameOver()
    ) {
      return;
    }

    lastClockUpdateRef.current = Date.now();

    const intervalId = window.setInterval(
      () => {
        const now = Date.now();
        const elapsedSeconds =
          (now - lastClockUpdateRef.current) /
          1000;

        lastClockUpdateRef.current = now;

        const updateActiveTime = (
          currentTime: number,
        ) => {
          const nextTime = Math.max(
            currentTime - elapsedSeconds,
            0,
          );

          if (nextTime === 0) {
            setTimedOutColor(activeClock);
            setActiveClock(null);
            setPendingPromotion(null);
            setIsGameOverDialogClosed(false);
          }

          return nextTime;
        };

        if (activeClock === "w") {
          setWhiteTime(updateActiveTime);
        } else {
          setBlackTime(updateActiveTime);
        }
      },
      CLOCK_UPDATE_INTERVAL_MS,
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeClock, game, timedOutColor]);

  useEffect(() => {
    if (
      activeClock === null ||
      timedOutColor !== null ||
      game.isGameOver()
    ) {
      stopClockTick();
      return;
    }

    const activeTime =
      activeClock === "w"
        ? whiteTime
        : blackTime;

    const displayedSeconds = Math.max(
      0,
      Math.ceil(activeTime),
    );

    if (
      displayedSeconds <= 59 &&
      !clockWarningPlayedRef.current[
        activeClock
      ]
    ) {
      clockWarningPlayedRef.current[
        activeClock
      ] = true;
      playSound("clock-warning");
    }

    if (
      displayedSeconds <= 10 &&
      displayedSeconds > 0
    ) {
      if (
        clockTickingColorRef.current !==
        activeClock
      ) {
        stopClockTick();
        playSound("clock-tick");
        clockTickingColorRef.current =
          activeClock;
      }

      return;
    }

    if (clockTickingColorRef.current !== null) {
      stopClockTick();
    }
  }, [
    activeClock,
    blackTime,
    game,
    timedOutColor,
    whiteTime,
    stopClockTick,
  ]);

  useEffect(() => {
    if (timedOutColor === null) {
      return;
    }

    stopClockTick();
    playSound("clock-timeout");
  }, [timedOutColor, stopClockTick]);

  useEffect(() => {
    if (game.history().length > 0) {
      return;
    }

    const initialTime = getInitialTimeSeconds(
      selectedTimeControl.initialMinutes,
    );

    setWhiteTime(initialTime);
    setBlackTime(initialTime);
  }, [game, selectedTimeControl.initialMinutes]);

  const history = game.history();

  const displayGame = useMemo(
    () =>
      createGameWithHistory(
        game,
        currentMoveIndex,
      ),
    [game, currentMoveIndex],
  );

  const isViewingLatestMove =
    currentMoveIndex === history.length;

  const chessGameOver = game.isGameOver();

  const isGameOver =
    chessGameOver || timedOutColor !== null;

  function addIncrement(color: ChessColor) {
  if (
    selectedTimeControl.incrementSeconds === 0
  ) {
    return;
  }

  if (color === "w") {
    setWhiteTime((currentTime) =>
      currentTime +
      selectedTimeControl.incrementSeconds
    );
  } else {
    setBlackTime((currentTime) =>
      currentTime +
      selectedTimeControl.incrementSeconds
    );
  }
}

  function makeMove(move: ChessMove) {
    if (timedOutColor !== null) {
      return null;
    }

    const gameCopy = isViewingLatestMove
      ? createGameWithHistory(game)
      : createGameWithHistory(
          game,
          currentMoveIndex,
        );

    const movingColor = gameCopy.turn();

    try {
      const result = gameCopy.move(move);

      stopClockTick();

      setGame(gameCopy);
      setCurrentMoveIndex(
        gameCopy.history().length,
      );
      setIsGameOverDialogClosed(false);

      addIncrement(movingColor);

      if (gameCopy.isGameOver()) {
        setActiveClock(null);
      } else {
        lastClockUpdateRef.current = Date.now();
        setActiveClock(gameCopy.turn());
      }

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

      latestGameRef.current = gameCopy;

      if (
        movingColor === "w" &&
        !gameCopy.isGameOver() &&
        stockfishRef.current
      ) {
        stockfishThinkingRef.current = true;
        stockfishRef.current.send(
          `position fen ${gameCopy.fen()}`,
        );
        const thinkTimeMsByDifficulty: Record<
          StockfishDifficultyId,
          number
        > = {
          beginner: 200,
          easy: 300,
          casual: 500,
          intermediate: 800,
          advanced: 1200,
          expert: 2000,
          master: 3000,
        };

        const thinkTimeMs =
          thinkTimeMsByDifficulty[
            selectedStockfishDifficultyId
          ];

        stockfishRef.current.send(
          `go movetime ${thinkTimeMs}`,
        );
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
    const piece = displayGame.get(
      sourceSquare as Square,
    );

    if (!piece || piece.type !== "p") {
      return false;
    }

    const legalMoves = displayGame.moves({
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
      displayGame.isGameOver() ||
      timedOutColor !== null ||
      pendingPromotion ||
      displayGame.turn() !== "w" ||
      stockfishThinkingRef.current
    ) {
      return false;
    }

    if (
      isPromotionMove(
        sourceSquare,
        targetSquare,
      )
    ) {
      const pawn = displayGame.get(
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
    stockfishThinkingRef.current = false;
    stockfishRef.current?.send("stop");
    stockfishRef.current?.send("ucinewgame");
    stockfishRef.current?.send("isready");

    stopClockTick();
    stopSound("clock-warning");
    stopSound("clock-timeout");
    clockWarningPlayedRef.current = {
      w: false,
      b: false,
    };

    setGame(new Chess());
    setCurrentMoveIndex(0);
    setBoardOrientation("white");
    setPendingPromotion(null);
    setIsGameOverDialogClosed(false);
    setWhiteTime(
  getInitialTimeSeconds(
    selectedTimeControl.initialMinutes,
  ),
);

setBlackTime(
  getInitialTimeSeconds(
    selectedTimeControl.initialMinutes,
  ),
);
    setActiveClock(null);
    setTimedOutColor(null);
    lastClockUpdateRef.current = Date.now();
  }

  function handleUndo() {
    setPendingPromotion(null);

    if (
      timedOutColor !== null ||
      currentMoveIndex === 0
    ) {
      return;
    }

    setCurrentMoveIndex(
      (currentIndex) =>
        Math.max(currentIndex - 1, 0),
    );
  }

  function handleFlipBoard() {
    setBoardOrientation(
      (currentOrientation) =>
        currentOrientation === "white"
          ? "black"
          : "white",
    );
  }

  function goToMove(index: number) {
    const safeIndex = Math.min(
      Math.max(index, 0),
      history.length,
    );

    setPendingPromotion(null);
    setCurrentMoveIndex(safeIndex);
  }

  function goToFirstMove() {
    goToMove(0);
  }

  function goToPreviousMove() {
    setPendingPromotion(null);

    setCurrentMoveIndex(
      (currentIndex) =>
        Math.max(currentIndex - 1, 0),
    );
  }

  function goToNextMove() {
    setPendingPromotion(null);

    setCurrentMoveIndex(
      (currentIndex) =>
        Math.min(
          currentIndex + 1,
          history.length,
        ),
    );
  }

  function goToLastMove() {
    goToMove(history.length);
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
    if (isGameOver) {
      return "Finished";
    }

    return displayGame.turn() === "w"
      ? "White to move"
      : "Black to move";
  }

  const canUndo =
    currentMoveIndex > 0 &&
    !isGameOver;

  const hasGameStarted =
    history.length > 0;

  const isClockRunning =
    activeClock !== null && !isGameOver;

  const {
    whiteCaptured,
    blackCaptured,
  } = getCapturedPieces(displayGame);

  const squareStyles = {
    ...getLastMoveSquareStyles(displayGame),
    ...getCheckSquareStyles(displayGame),
  };

  const standardGameOverDetails =
    getGameResult(game);

  const timeoutGameOverDetails =
    timedOutColor === "w"
      ? {
          isOpen: true,
          title: "Black wins on time",
          subtitle:
            "White ran out of time.",
          score: "0–1",
          result: "black-win" as const,
        }
      : timedOutColor === "b"
        ? {
            isOpen: true,
            title: "White wins on time",
            subtitle:
              "Black ran out of time.",
            score: "1–0",
            result: "white-win" as const,
          }
        : null;

  const gameOverDetails =
    timeoutGameOverDetails ??
    standardGameOverDetails;

  const shouldShowGameOverDialog =
    gameOverDetails.isOpen &&
    !isGameOverDialogClosed;

  const shouldShowPromotionDialog =
    pendingPromotion !== null &&
    !displayGame.isGameOver() &&
    timedOutColor === null;

  const promotionColor =
    pendingPromotion?.color ?? displayGame.turn();

  const moveLabel =
    isViewingLatestMove && isGameOver
      ? gameOverDetails.score
      : `Move ${displayGame.moveNumber()}`;

  return {
    game,
    displayGame,
    history,
    currentMoveIndex,
    isViewingLatestMove,
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
    timeControl: selectedTimeControl,
    timeControls: TIME_CONTROLS,
    stockfishDifficulty: selectedStockfishDifficulty,
    stockfishDifficulties: STOCKFISH_DIFFICULTIES,
    selectedStockfishDifficultyId,
    setSelectedStockfishDifficultyId,
    selectedTimeControlId,
    setSelectedTimeControlId,
    whiteTime,
    blackTime,
    activeClock,
    timedOutColor,
    isClockRunning,
    setBoardOrientation,
    onDrop,
    handlePromotionSelect,
    handleNewGame,
    handleUndo,
    handleFlipBoard,
    goToMove,
    goToFirstMove,
    goToPreviousMove,
    goToNextMove,
    goToLastMove,
    handleCloseGameOverDialog,
    handleOpenGameOverDialog,
    handleAnalysis,
    handleShare,
    getTurnLabel,
  };
}