"use client";

import {
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
import { getCapturedPieces } from "@/lib/gameUtils";
import { createGameWithHistory } from "@/lib/history";
import { supabase } from "@/lib/supabase";
import type {
  BoardOrientation,
  PendingPromotion,
  PromotionPiece,
} from "@/types/chess";

type ChessColor = "w" | "b";

type OnlineGameStatus = string;
type OnlineGameResult = string | null;

type UseOnlineChessGameOptions = {
  gameId: string;
  playerColor: ChessColor;
};

type OnlineGameResponse = {
  success?: boolean;
  error?: string;
  game?: {
    id: string;
    status: string;
    result: string | null;
    fen: string;
    pgn: string;
    whiteTimeMs: number;
    blackTimeMs: number;
    clockStartedAt: string | null;
  };
};

function createChessFromServerState(
  fen: string,
  pgn: string,
) {
  const chess = new Chess();

  if (pgn.trim()) {
    chess.loadPgn(pgn);
  } else {
    chess.load(fen);
  }

  return chess;
}

export function useOnlineChessGame({
  gameId,
  playerColor,
}: UseOnlineChessGameOptions) {
  const [game, setGame] = useState(
    () => new Chess(),
  );

  const [currentMoveIndex, setCurrentMoveIndex] =
    useState(0);

  const [pendingPromotion, setPendingPromotion] =
    useState<PendingPromotion | null>(null);

  const [boardOrientation, setBoardOrientation] =
    useState<BoardOrientation>(
      playerColor === "w" ? "white" : "black",
    );

  const [isSyncing, setIsSyncing] =
    useState(true);

  const [isSendingMove, setIsSendingMove] =
    useState(false);

  const [syncError, setSyncError] =
    useState<string | null>(null);

  const [whiteTimeMs, setWhiteTimeMs] =
    useState(0);

  const [blackTimeMs, setBlackTimeMs] =
    useState(0);

  const [clockStartedAt, setClockStartedAt] =
    useState<string | null>(null);

  const [clockNowMs, setClockNowMs] =
    useState(() => Date.now());

  const [serverActiveClock, setServerActiveClock] =
    useState<ChessColor | null>(null);

  const [status, setStatus] =
    useState<OnlineGameStatus | null>(null);

  const [result, setResult] =
    useState<OnlineGameResult>(null);

  const gameRef = useRef(game);
  const currentMoveIndexRef =
    useRef(currentMoveIndex);
  const isSendingMoveRef =
    useRef(false);
  const realtimeChannelRef =
    useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    currentMoveIndexRef.current =
      currentMoveIndex;
  }, [currentMoveIndex]);

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

  const isGameOver = status === "FINISHED";

  const activeClock: ChessColor | null =
    isGameOver ? null : serverActiveClock;

  const clockElapsedMs =
    clockStartedAt && activeClock
      ? Math.max(
          0,
          clockNowMs - new Date(clockStartedAt).getTime(),
        )
      : 0;

  const displayedWhiteTimeMs = Math.max(
    0,
    whiteTimeMs -
      (activeClock === "w" ? clockElapsedMs : 0),
  );

  const displayedBlackTimeMs = Math.max(
    0,
    blackTimeMs -
      (activeClock === "b" ? clockElapsedMs : 0),
  );

  const whiteTime = displayedWhiteTimeMs / 1000;
  const blackTime = displayedBlackTimeMs / 1000;

  const isClockRunning =
    !isGameOver &&
    clockStartedAt !== null &&
    displayedWhiteTimeMs > 0 &&
    displayedBlackTimeMs > 0;

  const isPlayerTurn =
    !isGameOver &&
    isViewingLatestMove &&
    !isSendingMove &&
    game.turn() === playerColor;

  const {
    whiteCaptured,
    blackCaptured,
  } = getCapturedPieces(displayGame);

  const squareStyles = {
    ...getLastMoveSquareStyles(displayGame),
    ...getCheckSquareStyles(displayGame),
  };

  const applyServerGame = useCallback(
    (
      serverFen: string,
      serverPgn: string,
    ) => {
      let serverGame: Chess;

      try {
        serverGame =
          createChessFromServerState(
            serverFen,
            serverPgn,
          );
      } catch (error) {
        console.error(
          "ONLINE GAME STATE LOAD ERROR:",
          error,
        );

        setSyncError(
          "Could not load the online game.",
        );

        return;
      }

      const currentGame = gameRef.current;

      const currentFen = currentGame.fen();
      const currentPgn = currentGame.pgn();

      if (
        currentFen === serverGame.fen() &&
        currentPgn === serverGame.pgn()
      ) {
        return;
      }

      const wasViewingLatestMove =
        currentMoveIndexRef.current ===
        currentGame.history().length;

      gameRef.current = serverGame;
      setGame(serverGame);

      if (wasViewingLatestMove) {
        const latestMoveIndex =
          serverGame.history().length;

        currentMoveIndexRef.current =
          latestMoveIndex;

        setCurrentMoveIndex(
          latestMoveIndex,
        );
      } else {
        const safeMoveIndex = Math.min(
          currentMoveIndexRef.current,
          serverGame.history().length,
        );

        currentMoveIndexRef.current =
          safeMoveIndex;

        setCurrentMoveIndex(
          safeMoveIndex,
        );
      }

      setPendingPromotion(null);
      setSyncError(null);
    },
    [],
  );

  useEffect(() => {
    if (!clockStartedAt || isGameOver) {
      return;
    }

    setClockNowMs(Date.now());

    const intervalId = window.setInterval(() => {
      setClockNowMs(Date.now());
    }, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [clockStartedAt, isGameOver]);

  const applyServerClock = useCallback(
    (
      serverWhiteTimeMs: number,
      serverBlackTimeMs: number,
      serverClockStartedAt: string | null,
      serverTurn: ChessColor,
    ) => {
      setWhiteTimeMs(serverWhiteTimeMs);
      setBlackTimeMs(serverBlackTimeMs);
      setClockStartedAt(serverClockStartedAt);
      setServerActiveClock(serverTurn);
      setClockNowMs(Date.now());
    },
    [],
  );

  const fetchGameState =
    useCallback(async () => {
      if (!gameId) {
        return;
      }

      try {
        const response = await fetch(
          `/api/online-move?gameId=${encodeURIComponent(
            gameId,
          )}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data =
          (await response.json()) as OnlineGameResponse;

        if (
          !response.ok ||
          !data.success ||
          !data.game
        ) {
          throw new Error(
            data.error ??
              "Could not load game.",
          );
        }

        applyServerGame(
          data.game.fen,
          data.game.pgn,
        );

        setStatus(data.game.status);
        setResult(data.game.result);

        const authoritativeGame =
          createChessFromServerState(
            data.game.fen,
            data.game.pgn,
          );

        applyServerClock(
          data.game.whiteTimeMs,
          data.game.blackTimeMs,
          data.game.clockStartedAt,
          authoritativeGame.turn(),
        );

        setSyncError(null);
      } catch (error) {
        console.error(
          "ONLINE GAME SYNC ERROR:",
          error,
        );

        setSyncError(
          "Connection to the game was interrupted.",
        );
      } finally {
        setIsSyncing(false);
      }
    }, [applyServerClock, applyServerGame, gameId]);

  useEffect(() => {
    void fetchGameState();

    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        "broadcast",
        { event: "game-updated" },
        () => {
          if (!isSendingMoveRef.current) {
            void fetchGameState();
          }
        },
      )
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("ONLINE REALTIME CHANNEL ERROR:", status, error);
        }
      });

    realtimeChannelRef.current = channel;

    // Slower safety fallback if Realtime is temporarily interrupted.
    const intervalId = window.setInterval(
      () => {
        if (!isSendingMoveRef.current) {
          void fetchGameState();
        }
      },
      5000,
    );

    return () => {
      window.clearInterval(intervalId);

      if (realtimeChannelRef.current === channel) {
        realtimeChannelRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [fetchGameState, gameId]);

  async function sendMove({
    from,
    to,
    promotion,
  }: {
    from: string;
    to: string;
    promotion?: PromotionPiece;
  }) {
    if (
      isSendingMoveRef.current ||
      isGameOver ||
      !isViewingLatestMove ||
      gameRef.current.turn() !==
        playerColor
    ) {
      return false;
    }

    isSendingMoveRef.current = true;
    setIsSendingMove(true);
    setSyncError(null);

    // Move immediately on this player's board while the server validates it.
    const gameBeforeMove = gameRef.current;
    const previousMoveIndex = currentMoveIndexRef.current;

    let optimisticGame: Chess;

    try {
      optimisticGame = createChessFromServerState(
        gameBeforeMove.fen(),
        gameBeforeMove.pgn(),
      );

      optimisticGame.move({
        from,
        to,
        ...(promotion ? { promotion } : {}),
      });
    } catch (error) {
      console.error("ONLINE OPTIMISTIC MOVE ERROR:", error);
      isSendingMoveRef.current = false;
      setIsSendingMove(false);
      return false;
    }

    gameRef.current = optimisticGame;
    setGame(optimisticGame);

    const optimisticMoveIndex = optimisticGame.history().length;
    currentMoveIndexRef.current = optimisticMoveIndex;
    setCurrentMoveIndex(optimisticMoveIndex);
    setPendingPromotion(null);

    try {
      const response = await fetch(
        "/api/online-move",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            gameId,
            from,
            to,
            ...(promotion
              ? { promotion }
              : {}),
          }),
        },
      );

      const data =
        (await response.json()) as OnlineGameResponse;

      if (
        !response.ok ||
        !data.success ||
        !data.game
      ) {
        throw new Error(
          data.error ??
            "The move could not be played.",
        );
      }

      let updatedGame: Chess;

      try {
        updatedGame =
          createChessFromServerState(
            data.game.fen,
            data.game.pgn,
          );
      } catch (error) {
        console.error(
          "ONLINE MOVE RESPONSE LOAD ERROR:",
          error,
        );

        throw new Error(
          "The updated position is invalid.",
        );
      }

      gameRef.current = updatedGame;
      setGame(updatedGame);

      setStatus(data.game.status);
      setResult(data.game.result);

      applyServerClock(
        data.game.whiteTimeMs,
        data.game.blackTimeMs,
        data.game.clockStartedAt,
        updatedGame.turn(),
      );

      const latestMoveIndex =
        updatedGame.history().length;

      currentMoveIndexRef.current =
        latestMoveIndex;

      setCurrentMoveIndex(
        latestMoveIndex,
      );

      setPendingPromotion(null);
      setSyncError(null);

      const realtimeChannel = realtimeChannelRef.current;

      if (realtimeChannel) {
        try {
          await realtimeChannel.send({
            type: "broadcast",
            event: "game-updated",
            payload: { gameId },
          });
        } catch (error) {
          console.error("ONLINE REALTIME BROADCAST ERROR:", error);
        }
      }

      return true;
    } catch (error) {
      console.error(
        "ONLINE MOVE ERROR:",
        error,
      );

      setSyncError(
        error instanceof Error
          ? error.message
          : "The move could not be played.",
      );

      // Roll back if the server rejects the move, then restore
      // the authoritative state from the server.
      gameRef.current = gameBeforeMove;
      setGame(gameBeforeMove);
      currentMoveIndexRef.current = previousMoveIndex;
      setCurrentMoveIndex(previousMoveIndex);

      await fetchGameState();

      return false;
    } finally {
      isSendingMoveRef.current = false;
      setIsSendingMove(false);
    }
  }

  function isPromotionMove(
    sourceSquare: string,
    targetSquare: string,
  ) {
    const currentGame =
      gameRef.current;

    const piece = currentGame.get(
      sourceSquare as Square,
    );

    if (
      !piece ||
      piece.type !== "p" ||
      piece.color !== playerColor
    ) {
      return false;
    }

    const legalMoves =
      currentGame.moves({
        square:
          sourceSquare as Square,
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
      isSendingMoveRef.current ||
      isGameOver ||
      pendingPromotion ||
      !isViewingLatestMove ||
      gameRef.current.turn() !==
        playerColor
    ) {
      return false;
    }

    const piece =
      gameRef.current.get(
        sourceSquare as Square,
      );

    if (
      !piece ||
      piece.color !== playerColor
    ) {
      return false;
    }

    if (
      isPromotionMove(
        sourceSquare,
        targetSquare,
      )
    ) {
      setPendingPromotion({
        from: sourceSquare,
        to: targetSquare,
        color: piece.color,
      });

      return false;
    }

    void sendMove({
      from: sourceSquare,
      to: targetSquare,
    });

    return true;
  }

  function handlePromotionSelect(
    piece: PromotionPiece,
  ) {
    if (!pendingPromotion) {
      return;
    }

    const promotionMove =
      pendingPromotion;

    setPendingPromotion(null);

    void sendMove({
      from: promotionMove.from,
      to: promotionMove.to,
      promotion: piece,
    });
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

    currentMoveIndexRef.current =
      safeIndex;

    setCurrentMoveIndex(
      safeIndex,
    );
  }

  function goToFirstMove() {
    goToMove(0);
  }

  function goToPreviousMove() {
    setPendingPromotion(null);

    setCurrentMoveIndex(
      (currentIndex) => {
        const nextIndex = Math.max(
          currentIndex - 1,
          0,
        );

        currentMoveIndexRef.current =
          nextIndex;

        return nextIndex;
      },
    );
  }

  function goToNextMove() {
    setPendingPromotion(null);

    setCurrentMoveIndex(
      (currentIndex) => {
        const nextIndex = Math.min(
          currentIndex + 1,
          history.length,
        );

        currentMoveIndexRef.current =
          nextIndex;

        return nextIndex;
      },
    );
  }

  function goToLastMove() {
    goToMove(history.length);
  }

  const shouldShowPromotionDialog =
    pendingPromotion !== null &&
    !displayGame.isGameOver();

  const promotionColor =
    pendingPromotion?.color ??
    displayGame.turn();

  return {
    game,
    displayGame,
    history,
    currentMoveIndex,
    isViewingLatestMove,
    isGameOver,
    status,
    result,
    isPlayerTurn,
    isSyncing,
    isSendingMove,
    syncError,
    whiteTime,
    blackTime,
    activeClock,
    isClockRunning,
    isUntimed: false,
    playerColor,
    boardOrientation,
    pendingPromotion,
    whiteCaptured,
    blackCaptured,
    squareStyles,
    shouldShowPromotionDialog,
    promotionColor,

    onDrop,
    handlePromotionSelect,
    handleFlipBoard,
    setBoardOrientation,

    goToMove,
    goToFirstMove,
    goToPreviousMove,
    goToNextMove,
    goToLastMove,

    refreshGame: fetchGameState,
  };
}