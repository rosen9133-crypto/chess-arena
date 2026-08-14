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
import type { PlayerColorChoice } from "@/components/PlayerColorSelector";

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
    id: "no-time",
    label: "∞ No Time",
    category: "Casual",
    initialMinutes: 0,
    incrementSeconds: 0,
  },
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
  TIME_CONTROLS[5];

function getInitialTimeSeconds(
  initialMinutes: number,
) {
  return initialMinutes * 60;
}

const CLOCK_UPDATE_INTERVAL_MS = 250;

type ChessColor = "w" | "b";

const SAVED_GAME_STORAGE_KEY = "chess-arena-current-game-v1";

type SavedGameMove = {
  from: string;
  to: string;
  promotion?: PromotionPiece;
};

type SavedGameState = {
  version: 1;
  moves: SavedGameMove[];
  currentMoveIndex: number;
  hasGameStarted: boolean;
  playerColorChoice: PlayerColorChoice;
  playerColor: ChessColor;
  boardOrientation: BoardOrientation;
  selectedStockfishDifficultyId: StockfishDifficultyId;
  selectedTimeControlId: string;
  whiteTime: number;
  blackTime: number;
  activeClock: ChessColor | null;
  timedOutColor: ChessColor | null;
  resignedColor: ChessColor | null;
  drawAgreed?: boolean;
  pendingPromotion: PendingPromotion | null;
  isAwaitingColorChoice: boolean;
  isGameOverDialogClosed: boolean;
  savedAt: number;
};

type StockfishCandidate = {
  move: string;
  score: number;
};

function chooseWeakLegalMove(
  game: Chess,
  difficultyId: StockfishDifficultyId,
) {
  const legalMoves = game.moves({ verbose: true });

  if (legalMoves.length === 0) return null;

  const pick = (moves: typeof legalMoves) =>
    moves[Math.floor(Math.random() * moves.length)];

  const quietMoves = legalMoves.filter(
    (move) =>
      !move.captured &&
      !move.promotion &&
      !move.san.includes("+") &&
      !move.san.includes("#"),
  );

  if (difficultyId === "beginner") {
    const roll = Math.random();

    if (roll < 0.75 && quietMoves.length > 0) {
      return pick(quietMoves);
    }

    return pick(legalMoves);
  }

  const roll = Math.random();

  if (roll < 0.55 && quietMoves.length > 0) {
    return pick(quietMoves);
  }

  if (roll < 0.75) {
    return pick(legalMoves);
  }

  return null;
}

function parseStockfishScore(message: string) {
  const cpMatch = message.match(/\bscore cp (-?\d+)/);

  if (cpMatch) {
    return Number(cpMatch[1]);
  }

  const mateMatch = message.match(/\bscore mate (-?\d+)/);

  if (mateMatch) {
    const mateIn = Number(mateMatch[1]);

    return mateIn > 0
      ? 100000 - Math.abs(mateIn)
      : -100000 + Math.abs(mateIn);
  }

  return null;
}


function resolvePlayerColor(
  choice: PlayerColorChoice,
): ChessColor {
  if (choice === "white") {
    return "w";
  }

  if (choice === "black") {
    return "b";
  }

  return Math.random() < 0.5 ? "w" : "b";
}

export function useChessGame() {
  const [game, setGame] = useState(
    () => new Chess(),
  );

  const [
    playerColorChoice,
    setPlayerColorChoiceState,
  ] = useState<PlayerColorChoice>("white");

  const [
    playerColor,
    setPlayerColor,
  ] = useState<ChessColor>("w");

  const [
    resignedColor,
    setResignedColor,
  ] = useState<ChessColor | null>(null);

  const [drawAgreed, setDrawAgreed] = useState(false);
  const [
    isEvaluatingDrawOffer,
    setIsEvaluatingDrawOffer,
  ] = useState(false);
  const [
    drawOfferMessage,
    setDrawOfferMessage,
  ] = useState<string | null>(null);

  const drawOfferEvaluationRef = useRef<{
    active: boolean;
    latestScore: number | null;
  }>({
    active: false,
    latestScore: null,
  });

  const [
    isAwaitingColorChoice,
    setIsAwaitingColorChoice,
  ] = useState(false);

  const [
    hasGameStarted,
    setHasGameStarted,
  ] = useState(false);

  const [
  selectedTimeControlId,
  setSelectedTimeControlIdState,
] = useState<string>(DEFAULT_TIME_CONTROL.id);

  const selectedTimeControl =
    TIME_CONTROLS.find(
      (control) =>
        control.id === selectedTimeControlId,
    ) ?? DEFAULT_TIME_CONTROL;
  const isUntimedGame =
    selectedTimeControl.id === "no-time";


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

  const stockfishCandidatesRef =
    useRef<Map<number, StockfishCandidate>>(
      new Map(),
    );

  const [
    selectedStockfishDifficultyId,
    setSelectedStockfishDifficultyId,
  ] = useState<StockfishDifficultyId>(
    DEFAULT_STOCKFISH_DIFFICULTY_ID,
  );

  const [hasRestoredSavedGame, setHasRestoredSavedGame] =
    useState(false);

  const selectedStockfishDifficulty =
    getStockfishDifficulty(
      selectedStockfishDifficultyId,
    );

  const latestGameRef = useRef(game);
  const playerColorRef = useRef<ChessColor>(
    playerColor,
  );

  const stopClockTick = useCallback(() => {
    stopSound("clock-tick");
    clockTickingColorRef.current = null;
  }, []);

  useEffect(() => {
    latestGameRef.current = game;
  }, [game]);

  useEffect(() => {
    playerColorRef.current = playerColor;
  }, [playerColor]);

  useEffect(() => {
    try {
      const rawSavedGame = window.localStorage.getItem(
        SAVED_GAME_STORAGE_KEY,
      );

      if (!rawSavedGame) {
        setHasRestoredSavedGame(true);
        return;
      }

      const savedGame = JSON.parse(
        rawSavedGame,
      ) as SavedGameState;

      if (
        savedGame.version !== 1 ||
        !Array.isArray(savedGame.moves) ||
        !savedGame.hasGameStarted
      ) {
        window.localStorage.removeItem(
          SAVED_GAME_STORAGE_KEY,
        );
        setHasRestoredSavedGame(true);
        return;
      }

      const restoredGame = new Chess();

      savedGame.moves.forEach((move) => {
        restoredGame.move({
          from: move.from,
          to: move.to,
          ...(move.promotion
            ? { promotion: move.promotion }
            : {}),
        });
      });

      const restoredTimeControl =
        TIME_CONTROLS.find(
          (control) =>
            control.id === savedGame.selectedTimeControlId,
        ) ?? DEFAULT_TIME_CONTROL;

      let restoredWhiteTime = Math.max(
        0,
        Number(savedGame.whiteTime) || 0,
      );
      let restoredBlackTime = Math.max(
        0,
        Number(savedGame.blackTime) || 0,
      );
      let restoredActiveClock = savedGame.activeClock;
      let restoredTimedOutColor = savedGame.timedOutColor;

      const shouldAccountForRefreshTime =
        restoredTimeControl.id !== "no-time" &&
        restoredActiveClock !== null &&
        restoredTimedOutColor === null &&
        savedGame.resignedColor === null &&
        !restoredGame.isGameOver();

      if (shouldAccountForRefreshTime) {
        const elapsedSeconds = Math.max(
          0,
          (Date.now() - Number(savedGame.savedAt || Date.now())) /
            1000,
        );

        if (restoredActiveClock === "w") {
          restoredWhiteTime = Math.max(
            0,
            restoredWhiteTime - elapsedSeconds,
          );

          if (restoredWhiteTime === 0) {
            restoredTimedOutColor = "w";
            restoredActiveClock = null;
          }
        } else {
          restoredBlackTime = Math.max(
            0,
            restoredBlackTime - elapsedSeconds,
          );

          if (restoredBlackTime === 0) {
            restoredTimedOutColor = "b";
            restoredActiveClock = null;
          }
        }
      }

      if (restoredTimeControl.id === "no-time") {
        restoredActiveClock = null;
      }

      const safeMoveIndex = Math.min(
        Math.max(Number(savedGame.currentMoveIndex) || 0, 0),
        restoredGame.history().length,
      );

      latestGameRef.current = restoredGame;
      playerColorRef.current = savedGame.playerColor;

      setGame(restoredGame);
      setCurrentMoveIndex(safeMoveIndex);
      setHasGameStarted(true);
      setPlayerColorChoiceState(savedGame.playerColorChoice);
      setPlayerColor(savedGame.playerColor);
      setBoardOrientation(savedGame.boardOrientation);
      setSelectedStockfishDifficultyId(
        savedGame.selectedStockfishDifficultyId,
      );
      setSelectedTimeControlIdState(restoredTimeControl.id);
      setWhiteTime(restoredWhiteTime);
      setBlackTime(restoredBlackTime);
      setActiveClock(restoredActiveClock);
      setTimedOutColor(restoredTimedOutColor);
      setResignedColor(savedGame.resignedColor);
      setDrawAgreed(savedGame.drawAgreed ?? false);
      setPendingPromotion(savedGame.pendingPromotion ?? null);
      setIsAwaitingColorChoice(
        savedGame.isAwaitingColorChoice ?? false,
      );
      setIsGameOverDialogClosed(
        savedGame.isGameOverDialogClosed ?? false,
      );
      lastClockUpdateRef.current = Date.now();
    } catch (error) {
      console.error(
        "Could not restore the saved Chess Arena game:",
        error,
      );
      window.localStorage.removeItem(
        SAVED_GAME_STORAGE_KEY,
      );
    } finally {
      setHasRestoredSavedGame(true);
    }
  }, []);

  useEffect(() => {
    if (!hasRestoredSavedGame) {
      return;
    }

    if (!hasGameStarted) {
      window.localStorage.removeItem(
        SAVED_GAME_STORAGE_KEY,
      );
      return;
    }

    const moves: SavedGameMove[] = game
      .history({ verbose: true })
      .map((move) => ({
        from: move.from,
        to: move.to,
        ...(move.promotion
          ? { promotion: move.promotion as PromotionPiece }
          : {}),
      }));

    const savedGame: SavedGameState = {
      version: 1,
      moves,
      currentMoveIndex,
      hasGameStarted,
      playerColorChoice,
      playerColor,
      boardOrientation,
      selectedStockfishDifficultyId,
      selectedTimeControlId,
      whiteTime,
      blackTime,
      activeClock,
      timedOutColor,
      resignedColor,
      drawAgreed,
      pendingPromotion,
      isAwaitingColorChoice,
      isGameOverDialogClosed,
      savedAt: Date.now(),
    };

    window.localStorage.setItem(
      SAVED_GAME_STORAGE_KEY,
      JSON.stringify(savedGame),
    );
  }, [
    activeClock,
    blackTime,
    boardOrientation,
    currentMoveIndex,
    game,
    hasGameStarted,
    hasRestoredSavedGame,
    isAwaitingColorChoice,
    isGameOverDialogClosed,
    pendingPromotion,
    playerColor,
    playerColorChoice,
    resignedColor,
    drawAgreed,
    selectedStockfishDifficultyId,
    selectedTimeControlId,
    timedOutColor,
    whiteTime,
  ]);

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
      `setoption name MultiPV value ${selectedStockfishDifficulty.multiPv}`,
    );

    if (selectedStockfishDifficulty.uciElo !== null) {
      engine.send(
        "setoption name UCI_LimitStrength value true",
      );
      engine.send(
        `setoption name UCI_Elo value ${selectedStockfishDifficulty.uciElo}`,
      );
    } else {
      engine.send(
        "setoption name UCI_LimitStrength value false",
      );
      engine.send(
        `setoption name Skill Level value ${selectedStockfishDifficulty.skillLevel}`,
      );
    }

    engine.send("isready");

    const unsubscribe = engine.subscribe(
      (message) => {
        if (drawOfferEvaluationRef.current.active) {
          if (message.startsWith("info ")) {
            const score = parseStockfishScore(message);

            if (score !== null) {
              drawOfferEvaluationRef.current.latestScore = score;
            }

            return;
          }

          if (message.startsWith("bestmove ")) {
            const evaluation =
              drawOfferEvaluationRef.current.latestScore;

            drawOfferEvaluationRef.current = {
              active: false,
              latestScore: null,
            };

            setIsEvaluatingDrawOffer(false);

            if (evaluation === null) {
              setDrawOfferMessage(
                "The computer could not evaluate the draw offer. Try again.",
              );
              return;
            }

            // Stockfish scores the position from the side-to-move perspective.
            // A draw is accepted when the computer is not clearly better:
            // roughly equal positions, or positions where the player is better.
            const DRAW_DECLINE_THRESHOLD_CP = -50;
            const computerClearlyBetter =
              evaluation < DRAW_DECLINE_THRESHOLD_CP;

            if (computerClearlyBetter) {
              setDrawOfferMessage("Draw offer declined.");
              return;
            }

            stopClockTick();
            stopSound("clock-warning");
            stopSound("clock-timeout");
            setActiveClock(null);
            setPendingPromotion(null);
            setDrawAgreed(true);
            setDrawOfferMessage("Draw offer accepted.");
            setIsGameOverDialogClosed(false);
            playSound("draw");
            return;
          }

          return;
        }

        if (message.startsWith("info ")) {
          const multiPvMatch =
            message.match(/\bmultipv (\d+)/);
          const pvMatch =
            message.match(
              /\bpv ([a-h][1-8][a-h][1-8][qrbn]?)/,
            );
          const score = parseStockfishScore(message);

          if (
            multiPvMatch &&
            pvMatch &&
            score !== null
          ) {
            stockfishCandidatesRef.current.set(
              Number(multiPvMatch[1]),
              {
                move: pvMatch[1],
                score,
              },
            );
          }

          return;
        }

        if (!message.startsWith("bestmove ")) {
          return;
        }

        stockfishThinkingRef.current = false;

        const engineBestMove =
          message.split(" ")[1];

        if (
          !engineBestMove ||
          engineBestMove === "(none)"
        ) {
          return;
        }

        const candidates = Array.from(
          stockfishCandidatesRef.current.entries(),
        )
          .sort(([a], [b]) => a - b)
          .map(([, candidate]) => candidate);

        stockfishCandidatesRef.current.clear();

        let bestMove = engineBestMove;

        if (
          selectedStockfishDifficulty.humanizedMistakes &&
          candidates.length > 1
        ) {
          const bestScore = candidates[0].score;

          const weightedCandidates: Array<{
            move: string;
            weight: number;
          }> = [];

          candidates.forEach((candidate, index) => {
            const centipawnLoss = Math.max(
              0,
              bestScore - candidate.score,
            );

            if (
              centipawnLoss >
              selectedStockfishDifficulty.maxCentipawnLoss
            ) {
              return;
            }

            const weight = Number(
              selectedStockfishDifficulty
                .candidateWeights[index] ?? 0,
            );

            if (weight <= 0) {
              return;
            }

            weightedCandidates.push({
              move: candidate.move,
              weight,
            });
          });

          const totalWeight =
            weightedCandidates.reduce(
              (sum, candidate) =>
                sum + candidate.weight,
              0,
            );

          if (totalWeight > 0) {
            let roll = Math.random() * totalWeight;

            for (const candidate of weightedCandidates) {
              roll -= candidate.weight;

              if (roll <= 0) {
                bestMove = candidate.move;
                break;
              }
            }
          }
        }

        const currentGame = latestGameRef.current;

        const engineColor =
          playerColorRef.current === "w"
            ? "b"
            : "w";

        if (
          currentGame.turn() !== engineColor ||
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
            !isUntimedGame &&
            selectedTimeControl.incrementSeconds >
            0
          ) {
            if (engineColor === "w") {
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

          if (gameCopy.isGameOver() || isUntimedGame) {
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
    selectedStockfishDifficulty.uciElo,
    selectedStockfishDifficulty.skillLevel,
    selectedStockfishDifficulty.multiPv,
    selectedStockfishDifficulty.humanizedMistakes,
    selectedStockfishDifficulty.maxCentipawnLoss,
    selectedStockfishDifficulty.candidateWeights,
    selectedTimeControl.incrementSeconds,
    isUntimedGame,
    stopClockTick,
  ]);

  useEffect(() => {
    if (
      game.isGameOver() ||
      timedOutColor !== null ||
      resignedColor !== null ||
      isAwaitingColorChoice ||
      !hasGameStarted ||
      stockfishThinkingRef.current ||
      !stockfishRef.current
    ) {
      return;
    }

    const engineColor: ChessColor =
      playerColor === "w" ? "b" : "w";

    if (game.turn() !== engineColor) {
      return;
    }

    if (
      selectedStockfishDifficultyId === "beginner" ||
      selectedStockfishDifficultyId === "easy"
    ) {
      const weakMove = chooseWeakLegalMove(
        game,
        selectedStockfishDifficultyId,
      );

      const weakMoveChance =
        selectedStockfishDifficultyId === "beginner"
          ? 0.9
          : 0.6;

      if (
        weakMove &&
        Math.random() < weakMoveChance
      ) {
        const { min, max } =
          selectedStockfishDifficulty.thinkTimeMs;

        const delayMs = Math.round(
          min + Math.random() * (max - min),
        );

        stockfishThinkingRef.current = true;

        const timeoutId = window.setTimeout(() => {
          const currentGame = latestGameRef.current;
          const currentEngineColor =
            playerColorRef.current === "w"
              ? "b"
              : "w";

          if (
            currentGame.turn() !== currentEngineColor ||
            currentGame.isGameOver()
          ) {
            stockfishThinkingRef.current = false;
            return;
          }

          const gameCopy =
            createGameWithHistory(currentGame);

          try {
            const result = gameCopy.move({
              from: weakMove.from,
              to: weakMove.to,
              ...(weakMove.promotion
                ? {
                    promotion:
                      weakMove.promotion as PromotionPiece,
                  }
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
              !isUntimedGame &&
              selectedTimeControl.incrementSeconds > 0
            ) {
              if (currentEngineColor === "w") {
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

            if (
              gameCopy.isGameOver() ||
              isUntimedGame
            ) {
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
          } catch (error) {
            console.error(
              "Weak computer move was invalid:",
              weakMove,
              error,
            );
          } finally {
            stockfishThinkingRef.current = false;
          }
        }, delayMs);

        return () => {
          window.clearTimeout(timeoutId);
          stockfishThinkingRef.current = false;
        };
      }
    }

    stockfishThinkingRef.current = true;
    stockfishCandidatesRef.current.clear();

    stockfishRef.current.send(
      `position fen ${game.fen()}`,
    );

    const { min, max } =
      selectedStockfishDifficulty.thinkTimeMs;

    const thinkTimeMs = Math.round(
      min + Math.random() * (max - min),
    );

    stockfishRef.current.send(
      `go movetime ${thinkTimeMs}`,
    );
  }, [
    game,
    playerColor,
    resignedColor,
    timedOutColor,
    isAwaitingColorChoice,
    hasGameStarted,
    selectedStockfishDifficultyId,
    selectedStockfishDifficulty.elo,
    selectedStockfishDifficulty.uciElo,
    selectedStockfishDifficulty.skillLevel,
    selectedStockfishDifficulty.thinkTimeMs,
    selectedStockfishDifficulty.humanizedMistakes,
    selectedStockfishDifficulty.maxCentipawnLoss,
    selectedStockfishDifficulty.candidateWeights,
  ]);

  useEffect(() => {
    if (
      isUntimedGame ||
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
  }, [activeClock, game, timedOutColor, isUntimedGame]);

  useEffect(() => {
    if (
      isUntimedGame ||
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
    isUntimedGame,
    stopClockTick,
  ]);

  useEffect(() => {
    if (timedOutColor === null) {
      return;
    }

    stopClockTick();
    playSound("clock-timeout");

    if (timedOutColor === playerColorRef.current) {
      playSound("lose");
    } else {
      playSound("win");
    }
  }, [timedOutColor, stopClockTick]);

  useEffect(() => {
    if (
      !hasRestoredSavedGame ||
      hasGameStarted ||
      game.history().length > 0
    ) {
      return;
    }

    const initialTime = getInitialTimeSeconds(
      selectedTimeControl.initialMinutes,
    );

    setWhiteTime(initialTime);
    setBlackTime(initialTime);
  }, [
    game,
    hasGameStarted,
    hasRestoredSavedGame,
    selectedTimeControl.initialMinutes,
  ]);

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
    chessGameOver ||
    timedOutColor !== null ||
    resignedColor !== null ||
    drawAgreed;

  function addIncrement(color: ChessColor) {
  if (
    isUntimedGame ||
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
    if (
      timedOutColor !== null ||
      !isViewingLatestMove
    ) {
      return null;
    }

    const gameCopy = createGameWithHistory(game);

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

      if (gameCopy.isGameOver() || isUntimedGame) {
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
      resignedColor !== null ||
      isAwaitingColorChoice ||
      !hasGameStarted ||
      pendingPromotion ||
      !isViewingLatestMove ||
      displayGame.turn() !== playerColor ||
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

  const setPlayerColorChoice: Dispatch<
    SetStateAction<PlayerColorChoice>
  > = (value) => {
    if (hasGameStarted) {
      return;
    }

    const nextChoice =
      typeof value === "function"
        ? value(playerColorChoice)
        : value;

    setPlayerColorChoiceState(nextChoice);
  };

  function handleStartGame() {
    if (hasGameStarted) {
      return;
    }

    const nextPlayerColor =
      resolvePlayerColor(playerColorChoice);

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

    const initialTime = getInitialTimeSeconds(
      selectedTimeControl.initialMinutes,
    );

    const freshGame = new Chess();

    latestGameRef.current = freshGame;
    playerColorRef.current = nextPlayerColor;

    setGame(freshGame);
    setCurrentMoveIndex(0);
    setPlayerColor(nextPlayerColor);
    setBoardOrientation(
      nextPlayerColor === "w"
        ? "white"
        : "black",
    );
    setIsAwaitingColorChoice(false);
    setPendingPromotion(null);
    setResignedColor(null);
    setDrawAgreed(false);
    setDrawOfferMessage(null);
    setIsEvaluatingDrawOffer(false);
    drawOfferEvaluationRef.current = {
      active: false,
      latestScore: null,
    };
    setTimedOutColor(null);
    setIsGameOverDialogClosed(false);
    setWhiteTime(initialTime);
    setBlackTime(initialTime);
    setHasGameStarted(true);
    lastClockUpdateRef.current = Date.now();
    setActiveClock(isUntimedGame ? null : "w");
  }

  function handleOfferDraw() {
    if (
      !hasGameStarted ||
      isGameOver ||
      isEvaluatingDrawOffer ||
      game.turn() !== playerColor ||
      stockfishThinkingRef.current ||
      !stockfishRef.current
    ) {
      return;
    }

    setDrawOfferMessage("Computer is considering the draw offer…");
    setIsEvaluatingDrawOffer(true);

    drawOfferEvaluationRef.current = {
      active: true,
      latestScore: null,
    };

    stockfishCandidatesRef.current.clear();
    stockfishRef.current.send("stop");
    stockfishRef.current.send(
      `position fen ${game.fen()}`,
    );
    stockfishRef.current.send("go depth 12");
  }

  function handleResign() {
    if (!hasGameStarted || isGameOver) {
      return;
    }

    stockfishThinkingRef.current = false;
    stockfishRef.current?.send("stop");
    stopClockTick();
    setActiveClock(null);
    setPendingPromotion(null);
    setResignedColor(playerColor);
    setIsGameOverDialogClosed(false);
    playSound("lose");
  }

  function handleRematch() {
    if (!isGameOver) {
      return;
    }

    const nextPlayerColor: ChessColor =
      playerColor === "w" ? "b" : "w";

    stockfishThinkingRef.current = false;
    stockfishCandidatesRef.current.clear();
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

    const initialTime = getInitialTimeSeconds(
      selectedTimeControl.initialMinutes,
    );

    const freshGame = new Chess();

    latestGameRef.current = freshGame;
    playerColorRef.current = nextPlayerColor;

    setGame(freshGame);
    setCurrentMoveIndex(0);
    setPlayerColor(nextPlayerColor);
    setBoardOrientation(
      nextPlayerColor === "w"
        ? "white"
        : "black",
    );
    setIsAwaitingColorChoice(false);
    setPendingPromotion(null);
    setResignedColor(null);
    setDrawAgreed(false);
    setDrawOfferMessage(null);
    setIsEvaluatingDrawOffer(false);
    drawOfferEvaluationRef.current = {
      active: false,
      latestScore: null,
    };
    setTimedOutColor(null);
    setIsGameOverDialogClosed(false);
    setWhiteTime(initialTime);
    setBlackTime(initialTime);
    setHasGameStarted(true);
    lastClockUpdateRef.current = Date.now();
    setActiveClock(isUntimedGame ? null : "w");
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

    const freshGame = new Chess();

    latestGameRef.current = freshGame;
    setGame(freshGame);
    setCurrentMoveIndex(0);
    setHasGameStarted(false);
    setIsAwaitingColorChoice(false);
    setPendingPromotion(null);
    setResignedColor(null);
    setDrawAgreed(false);
    setDrawOfferMessage(null);
    setIsEvaluatingDrawOffer(false);
    drawOfferEvaluationRef.current = {
      active: false,
      latestScore: null,
    };
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

    const historyLength = game.history().length;

    if (
      timedOutColor !== null ||
      resignedColor !== null ||
      historyLength === 0
    ) {
      return;
    }

    stockfishThinkingRef.current = false;
    stockfishCandidatesRef.current.clear();
    stockfishRef.current?.send("stop");

    const isComputerTurn =
      game.turn() !== playerColor;

    const movesToUndo = isComputerTurn ? 1 : 2;

    const targetMoveIndex = Math.max(
      historyLength - movesToUndo,
      0,
    );

    const gameCopy = createGameWithHistory(
      game,
      targetMoveIndex,
    );

    stopClockTick();

    latestGameRef.current = gameCopy;
    setGame(gameCopy);
    setCurrentMoveIndex(
      gameCopy.history().length,
    );
    setIsGameOverDialogClosed(false);
    setTimedOutColor(null);
    setResignedColor(null);
    setDrawAgreed(false);
    setDrawOfferMessage(null);

    if (isUntimedGame || gameCopy.isGameOver()) {
      setActiveClock(null);
    } else {
      lastClockUpdateRef.current = Date.now();
      setActiveClock(gameCopy.turn());
    }
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
    game.history().length > 0 &&
    !isGameOver;

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

  const resignationGameOverDetails =
    resignedColor === "w"
      ? {
          isOpen: true,
          title: "Black wins by resignation",
          subtitle:
            "White resigned the game.",
          score: "0–1",
          result: "black-win" as const,
        }
      : resignedColor === "b"
        ? {
            isOpen: true,
            title: "White wins by resignation",
            subtitle:
              "Black resigned the game.",
            score: "1–0",
            result: "white-win" as const,
          }
        : null;

  const agreedDrawGameOverDetails =
    drawAgreed
      ? {
          isOpen: true,
          title: "Draw agreed",
          subtitle:
            "The computer accepted your draw offer.",
          score: "½–½",
          result: "draw" as const,
        }
      : null;

  const gameOverDetails =
    agreedDrawGameOverDetails ??
    resignationGameOverDetails ??
    timeoutGameOverDetails ??
    standardGameOverDetails;

  const shouldShowGameOverDialog =
    gameOverDetails.isOpen &&
    !isGameOverDialogClosed;

  const shouldShowPromotionDialog =
    pendingPromotion !== null &&
    !displayGame.isGameOver() &&
    timedOutColor === null &&
    resignedColor === null &&
    !drawAgreed;

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
    isUntimedGame,
    stockfishDifficulty: selectedStockfishDifficulty,
    stockfishDifficulties: STOCKFISH_DIFFICULTIES,
    playerColorChoice,
    playerColor,
    setPlayerColorChoice,
    isAwaitingColorChoice,
    selectedStockfishDifficultyId,
    setSelectedStockfishDifficultyId,
    selectedTimeControlId,
    setSelectedTimeControlId,
    whiteTime,
    blackTime,
    activeClock,
    timedOutColor,
    drawAgreed,
    isEvaluatingDrawOffer,
    drawOfferMessage,
    canOfferDraw:
      hasGameStarted &&
      !isGameOver &&
      game.turn() === playerColor &&
      !stockfishThinkingRef.current,
    isClockRunning,
    setBoardOrientation,
    onDrop,
    handlePromotionSelect,
    handleStartGame,
    handleRematch,
    handleNewGame,
    handleOfferDraw,
    handleResign,
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