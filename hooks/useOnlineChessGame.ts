import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Chess, type Move, type Square } from "chess.js";

import {
  getCheckSquareStyles,
  getLastMoveSquareStyles,
} from "@/lib/boardStyles";
import { getCapturedPieces } from "@/lib/gameUtils";
import { createGameWithHistory } from "@/lib/history";
import { supabase } from "@/lib/supabase";
import {
  initializeOnlineGameSounds,
  playOnlineClockTickSound,
  playOnlineClockTimeoutSound,
  playOnlineClockWarningSound,
  playOnlineGameResultSound,
  playOnlineMoveSound,
} from "@/lib/sounds/onlineGameSounds";
import type {
  BoardOrientation,
  PendingPromotion,
  PromotionPiece,
} from "@/types/chess";

type ChessColor = "w" | "b";

type OnlineGameStatus = string;
type OnlineGameResult = string | null;
type OnlineDrawOfferBy = "WHITE" | "BLACK" | null;
type OnlineDrawAction = "OFFER" | "ACCEPT" | "DECLINE";
type OnlineRematchOfferBy = "WHITE" | "BLACK" | null;
type OnlineRematchAction = "OFFER" | "ACCEPT" | "DECLINE";

type OnlineRatingPlayerResult = {
  id: string;
  username: string;
  oldRating: number | null;
  newRating: number | null;
  ratingChange: number | null;
};

type OnlineRatingResult = {
  gameId: string;
  timeControl: string;
  result: string;
  alreadyProcessed: boolean;
  whitePlayer: OnlineRatingPlayerResult;
  blackPlayer: OnlineRatingPlayerResult;
};

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
    endReason: string | null;
    rated: boolean;
    fen: string;
    pgn: string;
    whiteTimeMs: number;
    blackTimeMs: number;
    clockStartedAt: string | null;
    drawOfferBy?: OnlineDrawOfferBy;
    drawOfferedAt?: string | null;
    rematchOfferBy?: OnlineRematchOfferBy;
    rematchOfferedAt?: string | null;
    rematchGameId?: string | null;
  };
};

type OnlineRatingResponse = {
  success?: boolean;
  error?: string;
  alreadyProcessed?: boolean;
  gameId?: string;
  timeControl?: string;
  result?: string;
  whitePlayer?: OnlineRatingPlayerResult;
  blackPlayer?: OnlineRatingPlayerResult;
};

type OnlineRematchResponse = {
  success?: boolean;
  error?: string;
  game?: {
    id: string;
    rematchOfferBy: OnlineRematchOfferBy;
    rematchOfferedAt: string | null;
    rematchGameId: string | null;
  };
  rematchGame?: {
    id: string;
  } | null;
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

  const [isResigning, setIsResigning] =
    useState(false);

  const [isProcessingDraw, setIsProcessingDraw] =
    useState(false);

  const [isProcessingRematch, setIsProcessingRematch] =
    useState(false);

  const [isProcessingRating, setIsProcessingRating] =
    useState(false);

  const [isRatedGame, setIsRatedGame] =
    useState(false);

  const [ratingResult, setRatingResult] =
    useState<OnlineRatingResult | null>(null);

  const [ratingError, setRatingError] =
    useState<string | null>(null);

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

  const [endReason, setEndReason] =
    useState<string | null>(null);

  const [drawOfferBy, setDrawOfferBy] =
    useState<OnlineDrawOfferBy>(null);

  const [drawOfferedAt, setDrawOfferedAt] =
    useState<string | null>(null);

  const [rematchOfferBy, setRematchOfferBy] =
    useState<OnlineRematchOfferBy>(null);

  const [rematchOfferedAt, setRematchOfferedAt] =
    useState<string | null>(null);

  const [rematchGameId, setRematchGameId] =
    useState<string | null>(null);

  const gameRef = useRef(game);
  const currentMoveIndexRef =
    useRef(currentMoveIndex);
  const isSendingMoveRef =
    useRef(false);
  const isResigningRef =
    useRef(false);
  const isProcessingDrawRef =
    useRef(false);
  const isProcessingRematchRef =
    useRef(false);
  const isProcessingRatingRef =
    useRef(false);
  const timeoutRefreshRequestedRef =
    useRef(false);
  const realtimeChannelRef =
    useRef<ReturnType<typeof supabase.channel> | null>(null);
  const soundStateInitializedRef = useRef(false);
  const lastSoundedMoveIndexRef = useRef(0);
  const previousStatusRef = useRef<OnlineGameStatus | null>(null);
  const clockWarningPlayedRef = useRef(false);
  const clockTickSecondRef = useRef<number | null>(null);
  const clockTimeoutPlayedRef = useRef(false);

  useEffect(() => {
    initializeOnlineGameSounds();
  }, []);

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
    !isResigning &&
    !isProcessingDraw &&
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
      const serverHistory = serverGame.history({ verbose: true }) as Move[];
      const serverMoveIndex = serverHistory.length;

      if (!soundStateInitializedRef.current) {
        lastSoundedMoveIndexRef.current = serverMoveIndex;
      } else if (serverMoveIndex > lastSoundedMoveIndexRef.current) {
        const latestMove = serverHistory[serverMoveIndex - 1];

        if (latestMove) {
          playOnlineMoveSound(latestMove);
        }

        lastSoundedMoveIndexRef.current = serverMoveIndex;
      }

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

  const processRatedResult = useCallback(async () => {
    if (isProcessingRatingRef.current) {
      return;
    }

    isProcessingRatingRef.current = true;
    setIsProcessingRating(true);
    setRatingError(null);

    try {
      const response = await fetch(
        "/api/rated-game-result",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ gameId }),
        },
      );

      const data =
        (await response.json()) as OnlineRatingResponse;

      if (
        !response.ok ||
        !data.success ||
        !data.gameId ||
        !data.timeControl ||
        !data.result ||
        !data.whitePlayer ||
        !data.blackPlayer
      ) {
        throw new Error(
          data.error ??
            "Could not process the rating result.",
        );
      }

      setRatingResult({
        gameId: data.gameId,
        timeControl: data.timeControl,
        result: data.result,
        alreadyProcessed:
          data.alreadyProcessed ?? false,
        whitePlayer: data.whitePlayer,
        blackPlayer: data.blackPlayer,
      });
    } catch (error) {
      console.error(
        "ONLINE RATING RESULT ERROR:",
        error,
      );

      setRatingError(
        "Could not update the player ratings.",
      );

      isProcessingRatingRef.current = false;
    } finally {
      setIsProcessingRating(false);
    }
  }, [gameId]);

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
        setEndReason(data.game.endReason);
        setIsRatedGame(data.game.rated);
        setDrawOfferBy(data.game.drawOfferBy ?? null);
        setDrawOfferedAt(data.game.drawOfferedAt ?? null);
        setRematchOfferBy(data.game.rematchOfferBy ?? null);
        setRematchOfferedAt(data.game.rematchOfferedAt ?? null);
        setRematchGameId(data.game.rematchGameId ?? null);

        if (
          data.game.status === "FINISHED" &&
          data.game.rated &&
          !ratingResult
        ) {
          void processRatedResult();
        }

        if (
          data.game.status === "IN_PROGRESS" &&
          data.game.clockStartedAt &&
          data.game.whiteTimeMs > 0 &&
          data.game.blackTimeMs > 0
        ) {
          timeoutRefreshRequestedRef.current = false;
        }

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

        if (!soundStateInitializedRef.current) {
          lastSoundedMoveIndexRef.current =
            authoritativeGame.history().length;
          previousStatusRef.current = data.game.status;
          soundStateInitializedRef.current = true;
        }

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
    }, [
      applyServerClock,
      applyServerGame,
      gameId,
      processRatedResult,
      ratingResult,
    ]);

  useEffect(() => {
    if (!soundStateInitializedRef.current || !status) {
      return;
    }

    const previousStatus = previousStatusRef.current;

    if (
      previousStatus !== "FINISHED" &&
      status === "FINISHED"
    ) {
      // The server updates status, result and endReason together, but React
      // state can expose them across separate renders. Wait until the full
      // authoritative game-over payload is available before playing sounds.
      if (!result || !endReason) {
        return;
      }

      playOnlineGameResultSound(
        result as "WHITE_WIN" | "BLACK_WIN" | "DRAW",
        playerColor,
        endReason,
      );
    }

    previousStatusRef.current = status;
  }, [endReason, playerColor, result, status]);

  useEffect(() => {
    if (!soundStateInitializedRef.current || isGameOver) {
      return;
    }

    const playerTime =
      playerColor === "w" ? whiteTime : blackTime;

    if (playerTime > 60) {
      clockWarningPlayedRef.current = false;
    }

    if (playerTime > 10) {
      clockTickSecondRef.current = null;
    }

    if (playerTime > 0) {
      clockTimeoutPlayedRef.current = false;
    }

    if (
      playerTime <= 60 &&
      playerTime > 10 &&
      !clockWarningPlayedRef.current
    ) {
      clockWarningPlayedRef.current = true;
      playOnlineClockWarningSound();
    }

    if (playerTime <= 10 && playerTime > 0) {
      const wholeSecond = Math.ceil(playerTime);

      if (clockTickSecondRef.current !== wholeSecond) {
        clockTickSecondRef.current = wholeSecond;
        playOnlineClockTickSound();
      }
    }

    if (
      playerTime <= 0 &&
      !clockTimeoutPlayedRef.current
    ) {
      clockTimeoutPlayedRef.current = true;
      playOnlineClockTimeoutSound();
    }
  }, [blackTime, isGameOver, playerColor, whiteTime]);

  useEffect(() => {
    if (
      isGameOver ||
      !clockStartedAt ||
      !activeClock ||
      timeoutRefreshRequestedRef.current
    ) {
      return;
    }

    const activeTimeMs =
      activeClock === "w"
        ? displayedWhiteTimeMs
        : displayedBlackTimeMs;

    if (activeTimeMs > 0) {
      return;
    }

    timeoutRefreshRequestedRef.current = true;
    void fetchGameState();
  }, [
    activeClock,
    clockStartedAt,
    displayedBlackTimeMs,
    displayedWhiteTimeMs,
    fetchGameState,
    isGameOver,
  ]);

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
      isResigningRef.current ||
      isProcessingDrawRef.current ||
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
  } catch {
    isSendingMoveRef.current = false;
    setIsSendingMove(false);
    return false;
    }

    gameRef.current = optimisticGame;
    setGame(optimisticGame);

    const optimisticHistory =
      optimisticGame.history({ verbose: true }) as Move[];
    const optimisticMoveIndex = optimisticHistory.length;
    const optimisticMove =
      optimisticHistory[optimisticMoveIndex - 1];

    currentMoveIndexRef.current = optimisticMoveIndex;
    setCurrentMoveIndex(optimisticMoveIndex);
    setPendingPromotion(null);

    if (optimisticMove) {
      playOnlineMoveSound(optimisticMove);
      lastSoundedMoveIndexRef.current = optimisticMoveIndex;
    }

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
      setEndReason(data.game.endReason);
      setDrawOfferBy(data.game.drawOfferBy ?? null);
      setDrawOfferedAt(data.game.drawOfferedAt ?? null);

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

  async function resignGame() {
    if (
      isResigningRef.current ||
      isSendingMoveRef.current ||
      isProcessingDrawRef.current ||
      isGameOver
    ) {
      return false;
    }

    isResigningRef.current = true;
    setIsResigning(true);
    setSyncError(null);

    try {
      const response = await fetch(
        "/api/online-resign",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            gameId,
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
            "The game could not be resigned.",
        );
      }

      const authoritativeGame =
        createChessFromServerState(
          data.game.fen,
          data.game.pgn,
        );

      applyServerGame(
        data.game.fen,
        data.game.pgn,
      );

      setStatus(data.game.status);
      setResult(data.game.result);
      setEndReason(data.game.endReason);
      setDrawOfferBy(data.game.drawOfferBy ?? null);
      setDrawOfferedAt(data.game.drawOfferedAt ?? null);

      applyServerClock(
        data.game.whiteTimeMs,
        data.game.blackTimeMs,
        data.game.clockStartedAt,
        authoritativeGame.turn(),
      );

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
          console.error(
            "ONLINE RESIGN REALTIME BROADCAST ERROR:",
            error,
          );
        }
      }

      return true;
    } catch (error) {
      console.error(
        "ONLINE RESIGN ERROR:",
        error,
      );

      setSyncError(
        error instanceof Error
          ? error.message
          : "The game could not be resigned.",
      );

      await fetchGameState();

      return false;
    } finally {
      isResigningRef.current = false;
      setIsResigning(false);
    }
  }

  async function processDrawAction(
    action: OnlineDrawAction,
  ) {
    if (
      isProcessingDrawRef.current ||
      isSendingMoveRef.current ||
      isResigningRef.current ||
      isGameOver
    ) {
      return false;
    }

    isProcessingDrawRef.current = true;
    setIsProcessingDraw(true);
    setSyncError(null);

    try {
      const response = await fetch(
        "/api/online-draw",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            gameId,
            action,
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
            "The draw action could not be completed.",
        );
      }

      const authoritativeGame =
        createChessFromServerState(
          data.game.fen,
          data.game.pgn,
        );

      applyServerGame(
        data.game.fen,
        data.game.pgn,
      );

      setStatus(data.game.status);
      setResult(data.game.result);
      setEndReason(data.game.endReason);
      setDrawOfferBy(data.game.drawOfferBy ?? null);
      setDrawOfferedAt(data.game.drawOfferedAt ?? null);

      applyServerClock(
        data.game.whiteTimeMs,
        data.game.blackTimeMs,
        data.game.clockStartedAt,
        authoritativeGame.turn(),
      );

      setSyncError(null);

      const realtimeChannel =
        realtimeChannelRef.current;

      if (realtimeChannel) {
        try {
          await realtimeChannel.send({
            type: "broadcast",
            event: "game-updated",
            payload: { gameId },
          });
        } catch (error) {
          console.error(
            "ONLINE DRAW REALTIME BROADCAST ERROR:",
            error,
          );
        }
      }

      return true;
    } catch (error) {
      console.error(
        "ONLINE DRAW ERROR:",
        error,
      );

      setSyncError(
        error instanceof Error
          ? error.message
          : "The draw action could not be completed.",
      );

      await fetchGameState();

      return false;
    } finally {
      isProcessingDrawRef.current = false;
      setIsProcessingDraw(false);
    }
  }

  function offerDraw() {
    return processDrawAction("OFFER");
  }

  function acceptDraw() {
    return processDrawAction("ACCEPT");
  }

  function declineDraw() {
    return processDrawAction("DECLINE");
  }

  async function processRematchAction(
    action: OnlineRematchAction,
  ) {
    if (
      isProcessingRematchRef.current ||
      !isGameOver
    ) {
      return false;
    }

    isProcessingRematchRef.current = true;
    setIsProcessingRematch(true);
    setSyncError(null);

    try {
      const response = await fetch(
        "/api/online-rematch",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            gameId,
            action,
          }),
        },
      );

      const data =
        (await response.json()) as OnlineRematchResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            "The rematch action could not be completed.",
        );
      }

      if (data.game) {
        setRematchOfferBy(
          data.game.rematchOfferBy ?? null,
        );
        setRematchOfferedAt(
          data.game.rematchOfferedAt ?? null,
        );
        setRematchGameId(
          data.game.rematchGameId ?? null,
        );
      }

      if (data.rematchGame?.id) {
        setRematchOfferBy(null);
        setRematchOfferedAt(null);
        setRematchGameId(
          data.rematchGame.id,
        );
      }

      setSyncError(null);

      const realtimeChannel =
        realtimeChannelRef.current;

      if (realtimeChannel) {
        try {
          await realtimeChannel.send({
            type: "broadcast",
            event: "game-updated",
            payload: { gameId },
          });
        } catch (error) {
          console.error(
            "ONLINE REMATCH REALTIME BROADCAST ERROR:",
            error,
          );
        }
      }

      return true;
    } catch (error) {
      console.error(
        "ONLINE REMATCH ERROR:",
        error,
      );

      setSyncError(
        error instanceof Error
          ? error.message
          : "The rematch action could not be completed.",
      );

      await fetchGameState();

      return false;
    } finally {
      isProcessingRematchRef.current = false;
      setIsProcessingRematch(false);
    }
  }

  function offerRematch() {
    return processRematchAction("OFFER");
  }

  function acceptRematch() {
    return processRematchAction("ACCEPT");
  }

  function declineRematch() {
    return processRematchAction("DECLINE");
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
      isResigningRef.current ||
      isProcessingDrawRef.current ||
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
    endReason,
    drawOfferBy,
    drawOfferedAt,
    rematchOfferBy,
    rematchOfferedAt,
    rematchGameId,
    isPlayerTurn,
    isSyncing,
    isSendingMove,
    isResigning,
    isProcessingDraw,
    isProcessingRematch,
    isProcessingRating,
    isRatedGame,
    ratingResult,
    ratingError,
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
    resignGame,
    offerDraw,
    acceptDraw,
    declineDraw,
    offerRematch,
    acceptRematch,
    declineRematch,
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