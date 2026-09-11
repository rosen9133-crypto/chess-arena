"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Chessboard } from "react-chessboard";
import type { Square } from "chess.js";

import ChessPiece from "@/components/ChessPiece";
import { MoveHistory } from "@/components/MoveHistory";
import OnlineDrawDialog from "@/components/OnlineDrawDialog";
import OnlineGameOverDialog from "@/components/OnlineGameOverDialog";
import OnlineResignDialog from "@/components/OnlineResignDialog";
import SoundControl from "@/components/SoundControl";
import { useOnlineChessGame } from "@/hooks/useOnlineChessGame";

type ChessColor = "w" | "b";

type ArenaId =
  | "classic"
  | "roman-colosseum"
  | "frozen-kingdom"
  | "cosmic-arena"
  | "inferno-arena"
  | "dragon-temple"
  | "desert-oasis";

type ArenaEffectsLevel = "off" | "low" | "high";

type ArenaDefinition = {
  id: ArenaId;
  name: string;
  premium: boolean;
};

const ARENAS: Record<ArenaId, ArenaDefinition> = {
  classic: {
    id: "classic",
    name: "Classic Chess Arena",
    premium: false,
  },
  "roman-colosseum": {
    id: "roman-colosseum",
    name: "Roman Colosseum",
    premium: true,
  },
  "frozen-kingdom": {
    id: "frozen-kingdom",
    name: "Frozen Kingdom",
    premium: true,
  },
  "cosmic-arena": {
    id: "cosmic-arena",
    name: "Cosmic Arena",
    premium: true,
  },
  "inferno-arena": {
    id: "inferno-arena",
    name: "Inferno Arena",
    premium: true,
  },
  "dragon-temple": {
    id: "dragon-temple",
    name: "Dragon Temple",
    premium: true,
  },
  "desert-oasis": {
    id: "desert-oasis",
    name: "Desert Oasis",
    premium: true,
  },
};

const DEFAULT_ARENA_ID: ArenaId = "classic";
const DEFAULT_ARENA_EFFECTS: ArenaEffectsLevel = "high";

type OpeningInfo = {
  eco: string;
  name: string;
  pgn: string;
  matchedMoves: number;
};

type OpeningApiResponse = {
  success: boolean;
  opening: OpeningInfo | null;
  error?: string;
};

type OnlineGameClientProps = {
  gameId: string;
  playerColor: ChessColor;
  timeControlLabel: string;
  category: string;
  rated: boolean;
  initialStatus: string;
  whitePlayer: {
    id: string;
    username: string;
    rating: number;
  };
  blackPlayer: {
    id: string;
    username: string;
    rating: number;
  };
};

type GameInfoRowProps = {
  label: string;
  value: string;
  highlight?: boolean;
};

function GameInfoRow({
  label,
  value,
  highlight = false,
}: GameInfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-800 py-3 last:border-b-0">
      <span className="text-slate-400">
        {label}
      </span>

      <strong
        className={`text-right [overflow-wrap:anywhere] ${
          highlight
            ? "text-yellow-400"
            : "text-slate-50"
        }`}
      >
        {value}
      </strong>
    </div>
  );
}

function getDisplayedClockSeconds(seconds: number) {
  return Math.max(0, Math.ceil(seconds));
}

function formatClockTime(seconds: number) {
  const totalSeconds = getDisplayedClockSeconds(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

type PlayerClockProps = {
  username: string;
  rating: number;
  color: ChessColor;
  time: number;
  active: boolean;
  label: string;
  capturedPieces: string[];
  materialAdvantage: number;
};

function PlayerClock({
  username,
  rating,
  color,
  time,
  active,
  label,
  capturedPieces,
  materialAdvantage,
}: PlayerClockProps) {
  const displayedSeconds = getDisplayedClockSeconds(time);
  const isCritical = displayedSeconds <= 10;
  const isLow = displayedSeconds < 60;

  const timeColorClass = isCritical
    ? "text-red-400"
    : isLow
      ? "text-yellow-400"
      : "text-white";

  return (
    <div
      className={`rounded-xl border px-3 py-1.5 ${
        active
          ? "border-emerald-400/70 bg-[linear-gradient(135deg,rgba(5,12,16,0.92),rgba(26,20,12,0.82))] shadow-[0_0_14px_rgba(52,211,153,0.14),0_10px_28px_rgba(0,0,0,0.28)] backdrop-blur-md"
          : "border-amber-200/20 bg-[linear-gradient(135deg,rgba(5,8,13,0.90),rgba(24,18,11,0.80))] shadow-[0_10px_28px_rgba(0,0,0,0.24)] backdrop-blur-md"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {label}
          </p>

          <div className="flex min-w-0 flex-nowrap items-center gap-x-2 overflow-hidden">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                active
                  ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                  : "bg-slate-600"
              }`}
            />
            <p className="shrink-0 whitespace-nowrap text-[15px] font-black leading-tight text-white">
              {username}
            </p>
            <span className="shrink-0 whitespace-nowrap text-xs font-bold text-yellow-300">
              ({rating}) 🏆
            </span>

            {capturedPieces.length > 0 && (
              <div className="flex min-w-0 flex-1 items-center overflow-hidden">
                {capturedPieces.map((piece, index) => (
                  <span
                    key={`${piece}-${index}`}
                    className="-mr-0.5 shrink-0 last:mr-0"
                  >
                    <ChessPiece piece={piece} size={16} />
                  </span>
                ))}
                {materialAdvantage > 0 && (
                  <span className="ml-1 shrink-0 text-xs font-black text-yellow-300">
                    +{materialAdvantage}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p
            className={`text-[9px] font-bold uppercase tracking-wider ${
              active ? "text-emerald-400" : "invisible"
            }`}
            aria-hidden={!active}
          >
            ● LIVE
          </p>
          <p className={`font-mono text-[22px] font-black leading-none tabular-nums sm:text-[26px] ${timeColorClass}`}>
            {formatClockTime(time)}
          </p>
        </div>
      </div>
    </div>
  );
}

const capturedPieceValues: Record<string, number> = {
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

function getCapturedMaterialValue(pieces: string[]) {
  return pieces.reduce(
    (total, piece) =>
      total + (capturedPieceValues[piece] ?? 0),
    0,
  );
}


type OnlineNavItem = {
  label: string;
  icon: string;
  href: string;
};

const ONLINE_NAV_ITEMS: OnlineNavItem[] = [
  { label: "Home", icon: "⌂", href: "/dashboard" },
  { label: "Play Online", icon: "♟", href: "/play/online" },
  { label: "Play Computer", icon: "♞", href: "/play/computer" },
  { label: "Tournaments", icon: "♛", href: "/tournaments" },
  { label: "Puzzles", icon: "◆", href: "/puzzles" },
  { label: "Learn", icon: "▤", href: "/learn" },
  { label: "Arenas", icon: "♜", href: "/arenas" },
  { label: "Community", icon: "♚", href: "/community" },
  { label: "Leaderboard", icon: "★", href: "/leaderboard" },
  { label: "Profile", icon: "●", href: "/profile" },
  { label: "Shop", icon: "◇", href: "/shop" },
];

function OnlineGameNavigation({
  username,
  rating,
  onNavigate,
}: {
  username: string;
  rating: number;
  onNavigate: (href: string) => void;
}) {
  return (
    <aside className="relative z-20 hidden lg:sticky lg:left-0 lg:top-0 lg:flex lg:h-dvh lg:w-[clamp(180px,14vw,230px)] lg:shrink-0 lg:flex-col lg:overflow-hidden lg:rounded-none lg:border-r lg:border-amber-200/15 lg:bg-[linear-gradient(180deg,rgba(5,8,13,0.68),rgba(5,8,13,0.78))] lg:p-2.5 lg:shadow-[12px_0_40px_rgba(0,0,0,0.24)] lg:backdrop-blur-[5px]">
      <button
        type="button"
        onClick={() => onNavigate("/dashboard")}
        className="flex items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.04]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-yellow-400/25 bg-yellow-400/10 text-lg text-yellow-300">
          ♚
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-black tracking-wide text-white">
            CHESS ARENA
          </span>
          <span className="block text-[8px] font-bold uppercase tracking-[0.22em] text-yellow-400/75">
            Your Game. Your Arena.
          </span>
        </span>
      </button>

      <nav className="arena-nav-scrollbar mt-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-0.5">
        {ONLINE_NAV_ITEMS.map((item) => {
          const active = item.label === "Play Online";

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.href)}
              className={`flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-left text-[12px] font-bold transition ${
                active
                  ? "border border-yellow-400/25 bg-yellow-400/10 text-yellow-300"
                  : "border border-transparent text-slate-300 hover:bg-white/[0.045] hover:text-white"
              }`}
            >
              <span className="w-5 shrink-0 text-center text-[14px]">
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onNavigate("/gold-pass")}
          className="mt-2 rounded-xl border border-yellow-400/25 bg-[linear-gradient(135deg,rgba(250,204,21,0.13),rgba(161,98,7,0.08))] px-3 py-2.5 text-left transition hover:border-yellow-400/45 hover:bg-yellow-400/15"
        >
          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">
            Gold Pass
          </span>
          <span className="mt-1 block text-[11px] font-medium leading-snug text-slate-300">
            Unlock premium Arena cosmetics.
          </span>
        </button>
      </nav>

      <button
        type="button"
        onClick={() => onNavigate("/profile")}
        className="mt-2 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/65 p-2 text-left transition hover:border-slate-700"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-yellow-400/25 bg-slate-900 text-xs font-black text-yellow-300">
          {username.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-black text-white">
            {username}
          </span>
          <span className="block text-[9px] font-bold text-yellow-300">
            {rating} 🏆
          </span>
        </span>
      </button>
    </aside>
  );
}

export default function OnlineGameClient({
  gameId,
  playerColor,
  timeControlLabel,
  category,
  rated,
  initialStatus,
  whitePlayer,
  blackPlayer,
}: OnlineGameClientProps) {
  const {
    displayGame,
    history,
    currentMoveIndex,
    whiteCaptured,
    blackCaptured,
    isGameOver,
    status,
    result,
    endReason,
    drawOfferBy,
    drawOfferedAt,
    rematchOfferBy,
    rematchGameId,
    isPlayerTurn,
    isResigning,
    isProcessingDraw,
    isProcessingRematch,
    isProcessingRating,
    isRatedGame,
    ratingResult,
    ratingError,
    boardOrientation,
    squareStyles,

    whiteTime,
    blackTime,
    activeClock,
    isClockRunning,

    onDrop,
    premove,
    queuePremove,
    clearPremove,
    resignGame,
    offerDraw,
    acceptDraw,
    declineDraw,
    offerRematch,
    acceptRematch,
    declineRematch,
    handlePromotionSelect,
    handleFlipBoard,
    goToMove,
    goToFirstMove,
    goToPreviousMove,
    goToNextMove,
    goToLastMove,
  } = useOnlineChessGame({
    gameId,
    playerColor,
  });

  const whiteCapturedMaterial =
    getCapturedMaterialValue(whiteCaptured);
  const blackCapturedMaterial =
    getCapturedMaterialValue(blackCaptured);

  const whiteMaterialAdvantage = Math.max(
    whiteCapturedMaterial - blackCapturedMaterial,
    0,
  );
  const blackMaterialAdvantage = Math.max(
    blackCapturedMaterial - whiteCapturedMaterial,
    0,
  );

  const router = useRouter();

  function navigateFromSidebar(href: string) {
    router.push(href);
  }

  // Arena foundation:
  // The game remains on Classic for now. Later steps can switch this ID
  // from the player's owned/selected Arena without touching chess logic.
  const activeArenaId: ArenaId = "roman-colosseum";
  const activeArena = ARENAS[activeArenaId];
  const [arenaEffects, setArenaEffects] =
    useState<ArenaEffectsLevel>(DEFAULT_ARENA_EFFECTS);
  const [romanBoardStyle, setRomanBoardStyle] = useState<"classic" | "roman">(
    "roman",
  );
  useEffect(() => {
    let cancelled = false;

    async function loadArenaPreferences() {
      try {
        const response = await fetch("/api/arena-preferences", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          romanBoardStyle?: string;
          romanArenaEffects?: string;
        };

        if (cancelled) {
          return;
        }

        if (
          data.romanBoardStyle === "classic" ||
          data.romanBoardStyle === "roman"
        ) {
          setRomanBoardStyle(data.romanBoardStyle);
        }

        if (
          data.romanArenaEffects === "off" ||
          data.romanArenaEffects === "low" ||
          data.romanArenaEffects === "high"
        ) {
          setArenaEffects(data.romanArenaEffects);
        }
      } catch (error) {
        console.error("ARENA PREFERENCES LOAD ERROR:", error);
      }
    }

    void loadArenaPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  const boardAreaRef = useRef<HTMLDivElement | null>(null);
  const leftGameColumnRef = useRef<HTMLDivElement | null>(null);
  const rightGameAreaRef = useRef<HTMLDivElement | null>(null);
  const [rightGameAreaHeight, setRightGameAreaHeight] = useState<number | null>(null);

  useEffect(() => {
    const boardArea = boardAreaRef.current;
    if (!boardArea) return;

    const applyTransparentPromotionStyle = () => {
      const elements = Array.from(
        boardArea.querySelectorAll<HTMLElement>("div"),
      );

      for (const element of elements) {
        const children = Array.from(element.children) as HTMLElement[];

        const isPromotionChoices =
          children.length === 4 &&
          children.every((child) => child.querySelector("svg"));

        if (!isPromotionChoices) continue;

        // Keep the native react-chessboard promotion layout,
        // but make only the promotion choices translucent.
        element.style.opacity = "1";
        element.style.transform = "none";
        element.style.transformOrigin = "center";
        element.style.background = "rgba(15, 23, 42, 0.88)";
        element.style.backgroundColor = "rgba(15, 23, 42, 0.88)";
        element.style.borderRadius = "8px";
        element.style.overflow = "visible";
        element.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.38)";
        element.style.transform = "translateY(8px)";

        const choiceSize = Math.max(
          34,
          Math.min(52, boardArea.getBoundingClientRect().width / 8),
        );

        element.style.width = `${choiceSize}px`;
        element.style.height = `${choiceSize * 4}px`;
        element.style.display = "flex";
        element.style.flexDirection = "column";

        for (const child of children) {
          child.style.width = `${choiceSize}px`;
          child.style.height = `${choiceSize}px`;
          child.style.minWidth = `${choiceSize}px`;
          child.style.minHeight = `${choiceSize}px`;
          child.style.background = "rgba(30, 41, 59, 0.9)";
          child.style.backgroundColor = "rgba(30, 41, 59, 0.9)";
          child.style.borderBottom = "1px solid rgba(148, 163, 184, 0.22)";
          child.style.display = "flex";
          child.style.alignItems = "center";
          child.style.justifyContent = "center";

          const svg = child.querySelector<SVGElement>("svg");
          if (svg) {
            svg.style.width = "82%";
            svg.style.height = "82%";
            svg.style.opacity = "1";
          }
        }

        if (children.length > 0) {
          children[children.length - 1].style.borderBottom = "none";
        }

        // The library places the choices inside a board-sized overlay.
        // Remove only that overlay's dimming so the real board/pieces
        // remain at their normal brightness.
        let parent = element.parentElement;
        const boardRect = boardArea.getBoundingClientRect();

        while (parent && parent !== boardArea) {
          const rect = parent.getBoundingClientRect();
          const coversBoard =
            Math.abs(rect.width - boardRect.width) < 12 &&
            Math.abs(rect.height - boardRect.height) < 12;

          if (coversBoard) {
            parent.style.background = "transparent";
            parent.style.backgroundColor = "transparent";
            break;
          }

          parent = parent.parentElement;
        }
      }
    };

    applyTransparentPromotionStyle();

    const observer = new MutationObserver(() => {
      applyTransparentPromotionStyle();
    });

    observer.observe(boardArea, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const leftGameColumn = leftGameColumnRef.current;
    const rightGameArea = rightGameAreaRef.current;

    if (!leftGameColumn || !rightGameArea) {
      return;
    }

    const updateRightGameAreaHeight = () => {
      const leftGameColumnRect = leftGameColumn.getBoundingClientRect();
      const rightGameAreaRect = rightGameArea.getBoundingClientRect();

      setRightGameAreaHeight(
        Math.max(0, leftGameColumnRect.bottom - rightGameAreaRect.top),
      );
    };

    updateRightGameAreaHeight();

    const resizeObserver = new ResizeObserver(updateRightGameAreaHeight);
    resizeObserver.observe(leftGameColumn);
    resizeObserver.observe(rightGameArea);

    window.addEventListener("resize", updateRightGameAreaHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateRightGameAreaHeight);
    };
  }, []);

  const currentPlayer =
    playerColor === "w"
      ? whitePlayer
      : blackPlayer;

  const opponent =
    playerColor === "w"
      ? blackPlayer
      : whitePlayer;

  const displayedWhiteRating =
    ratingResult?.whitePlayer.newRating !== null &&
    ratingResult?.whitePlayer.newRating !== undefined
      ? Math.round(ratingResult.whitePlayer.newRating)
      : whitePlayer.rating;

  const displayedBlackRating =
    ratingResult?.blackPlayer.newRating !== null &&
    ratingResult?.blackPlayer.newRating !== undefined
      ? Math.round(ratingResult.blackPlayer.newRating)
      : blackPlayer.rating;

  const currentPlayerDisplayedRating =
    playerColor === "w"
      ? displayedWhiteRating
      : displayedBlackRating;

  const opponentDisplayedRating =
    playerColor === "w"
      ? displayedBlackRating
      : displayedWhiteRating;

  const currentPlayerRating = ratingResult
    ? playerColor === "w"
      ? ratingResult.whitePlayer
      : ratingResult.blackPlayer
    : null;

  const currentPlayerTime =
    playerColor === "w"
      ? whiteTime
      : blackTime;

  const opponentTime =
    playerColor === "w"
      ? blackTime
      : whiteTime;

  const opponentColor: ChessColor =
    playerColor === "w" ? "b" : "w";

  const currentUserColor =
    playerColor === "w" ? "White" : "Black";

  const liveStatus =
    status ?? initialStatus;

  const isCurrentPlayerClockActive =
    isClockRunning &&
    activeClock === playerColor;

  const isOpponentClockActive =
    isClockRunning &&
    activeClock === opponentColor;

  const [isGameOverDialogClosed, setIsGameOverDialogClosed] =
    useState(false);

  const [isGameOverDialogReady, setIsGameOverDialogReady] =
    useState(false);

  useEffect(() => {
    if (status !== "FINISHED" || !isGameOver) {
      setIsGameOverDialogReady(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsGameOverDialogReady(true);
    }, 1300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isGameOver, status]);

  const [isResignDialogOpen, setIsResignDialogOpen] =
    useState(false);

  const [isDrawDialogOpen, setIsDrawDialogOpen] =
    useState(false);

  const [isRematchDialogOpen, setIsRematchDialogOpen] =
    useState(false);

  const [dismissedDrawOfferAt, setDismissedDrawOfferAt] =
    useState<string | null>(null);

  const [opening, setOpening] =
    useState<OpeningInfo | null>(null);

  const [selectedSquare, setSelectedSquare] =
    useState<Square | null>(null);

  const [clickPromotion, setClickPromotion] = useState<{
    from: Square;
    to: Square;
    isPremove: boolean;
  } | null>(null);

  const clickPromotionRef = useRef<{
    from: Square;
    to: Square;
    isPremove: boolean;
  } | null>(null);

  const legalMoveSquares = useMemo(() => {
    if (
      !selectedSquare ||
      !isPlayerTurn ||
      isGameOver
    ) {
      return [];
    }

    return displayGame.moves({
      square: selectedSquare,
      verbose: true,
    });
  }, [
    displayGame,
    isGameOver,
    isPlayerTurn,
    selectedSquare,
  ]);

  const premoveTargetSquares = useMemo(() => {
    if (
      !selectedSquare ||
      isPlayerTurn ||
      isGameOver
    ) {
      return [];
    }

    const piece = displayGame.get(selectedSquare);

    if (!piece || piece.color !== playerColor) {
      return [];
    }

    const file = selectedSquare.charCodeAt(0) - 97;
    const rank = Number(selectedSquare[1]);
    const targets: Square[] = [];

    const addTarget = (targetFile: number, targetRank: number) => {
      if (
        targetFile < 0 ||
        targetFile > 7 ||
        targetRank < 1 ||
        targetRank > 8
      ) {
        return;
      }

      targets.push(
        `${String.fromCharCode(97 + targetFile)}${targetRank}` as Square,
      );
    };

    switch (piece.type) {
      case "p": {
        const direction = piece.color === "w" ? 1 : -1;
        const startRank = piece.color === "w" ? 2 : 7;

        addTarget(file, rank + direction);

        if (rank === startRank) {
          addTarget(file, rank + direction * 2);
        }

        addTarget(file - 1, rank + direction);
        addTarget(file + 1, rank + direction);
        break;
      }

      case "n": {
        for (const [fileOffset, rankOffset] of [
          [1, 2],
          [2, 1],
          [2, -1],
          [1, -2],
          [-1, -2],
          [-2, -1],
          [-2, 1],
          [-1, 2],
        ]) {
          addTarget(file + fileOffset, rank + rankOffset);
        }
        break;
      }

      case "b":
      case "r":
      case "q": {
        const directions =
          piece.type === "b"
            ? [
                [1, 1],
                [1, -1],
                [-1, 1],
                [-1, -1],
              ]
            : piece.type === "r"
              ? [
                  [1, 0],
                  [-1, 0],
                  [0, 1],
                  [0, -1],
                ]
              : [
                  [1, 1],
                  [1, -1],
                  [-1, 1],
                  [-1, -1],
                  [1, 0],
                  [-1, 0],
                  [0, 1],
                  [0, -1],
                ];

        for (const [fileOffset, rankOffset] of directions) {
          for (let distance = 1; distance < 8; distance += 1) {
            const targetFile = file + fileOffset * distance;
            const targetRank = rank + rankOffset * distance;

            if (
              targetFile < 0 ||
              targetFile > 7 ||
              targetRank < 1 ||
              targetRank > 8
            ) {
              break;
            }

            const targetSquare =
              `${String.fromCharCode(97 + targetFile)}${targetRank}` as Square;

            targets.push(targetSquare);

            if (displayGame.get(targetSquare)) {
              break;
            }
          }
        }
        break;
      }

      case "k": {
        for (let fileOffset = -1; fileOffset <= 1; fileOffset += 1) {
          for (let rankOffset = -1; rankOffset <= 1; rankOffset += 1) {
            if (fileOffset === 0 && rankOffset === 0) {
              continue;
            }

            addTarget(file + fileOffset, rank + rankOffset);
          }
        }

        addTarget(file + 2, rank);
        addTarget(file - 2, rank);
        break;
      }
    }

    return targets;
  }, [
    displayGame,
    isGameOver,
    isPlayerTurn,
    playerColor,
    selectedSquare,
  ]);

  const clickMoveSquareStyles = useMemo(() => {
    const styles: Record<
      string,
      React.CSSProperties
    > = {};

    if (selectedSquare) {
      styles[selectedSquare] = {
        boxShadow:
          "inset 0 0 0 4px rgba(250, 204, 21, 0.95)",
        backgroundColor:
          "rgba(250, 204, 21, 0.28)",
      };
    }

    for (const move of legalMoveSquares) {
      const targetPiece = displayGame.get(
        move.to as Square,
      );

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

    for (const targetSquare of premoveTargetSquares) {
      styles[targetSquare] = {
        background:
          "radial-gradient(circle, rgba(168, 85, 247, 0.8) 0 18%, transparent 20%)",
      };
    }

    if (premove) {
      styles[premove.from] = {
        boxShadow:
          "inset 0 0 0 4px rgba(168, 85, 247, 0.95)",
        backgroundColor:
          "rgba(168, 85, 247, 0.28)",
      };

      styles[premove.to] = {
        boxShadow:
          "inset 0 0 0 4px rgba(168, 85, 247, 0.95)",
        backgroundColor:
          "rgba(168, 85, 247, 0.4)",
      };
    }

    return styles;
  }, [
    displayGame,
    legalMoveSquares,
    premove,
    premoveTargetSquares,
    selectedSquare,
  ]);

  const boardSquareStyles = useMemo(
    () => ({
      ...squareStyles,
      ...clickMoveSquareStyles,
    }),
    [clickMoveSquareStyles, squareStyles],
  );

  function handleSquareClick(square: string) {
    if (isGameOver) {
      setSelectedSquare(null);
      clearPremove();
      return;
    }

    const clickedSquare = square as Square;
    const clickedPiece =
      displayGame.get(clickedSquare);

    if (!isPlayerTurn) {
      if (premove) {
        clearPremove();
      }

      if (selectedSquare === clickedSquare) {
        setSelectedSquare(null);
        return;
      }

      if (selectedSquare) {
        const isPremoveTarget =
          premoveTargetSquares.includes(clickedSquare);

        if (isPremoveTarget) {
          const selectedPiece = displayGame.get(selectedSquare);
          const isPremovePromotion =
            selectedPiece?.type === "p" &&
            ((selectedPiece.color === "w" && clickedSquare[1] === "8") ||
              (selectedPiece.color === "b" && clickedSquare[1] === "1"));

          if (isPremovePromotion) {
            const pendingPromotion = {
              from: selectedSquare,
              to: clickedSquare,
              isPremove: true,
            };

            clickPromotionRef.current = pendingPromotion;
            setSelectedSquare(null);

            window.requestAnimationFrame(() => {
              if (clickPromotionRef.current === pendingPromotion) {
                setClickPromotion(pendingPromotion);
              }
            });

            return;
          }

          queuePremove({
            from: selectedSquare,
            to: clickedSquare,
          });
          setSelectedSquare(null);
          return;
        }
      }

      if (
        clickedPiece &&
        clickedPiece.color === playerColor
      ) {
        setSelectedSquare(clickedSquare);
        return;
      }

      setSelectedSquare(null);
      return;
    }

    if (premove) {
      clearPremove();
    }

    if (selectedSquare === clickedSquare) {
      setSelectedSquare(null);
      return;
    }

    if (selectedSquare) {
      const isLegalTarget =
        legalMoveSquares.some(
          (move) => move.to === clickedSquare,
        );

      if (isLegalTarget) {
        const selectedPiece = displayGame.get(selectedSquare);
        const isClickPromotion =
          selectedPiece?.type === "p" &&
          ((selectedPiece.color === "w" && clickedSquare[1] === "8") ||
            (selectedPiece.color === "b" && clickedSquare[1] === "1"));

        if (isClickPromotion) {
          const pendingPromotion = {
            from: selectedSquare,
            to: clickedSquare,
            isPremove: false,
          };

          clickPromotionRef.current = pendingPromotion;
          setSelectedSquare(null);

          window.requestAnimationFrame(() => {
            if (clickPromotionRef.current === pendingPromotion) {
              setClickPromotion(pendingPromotion);
            }
          });

          return;
        }

        onDrop(selectedSquare, clickedSquare);
        setSelectedSquare(null);
        return;
      }
    }

    if (
      clickedPiece &&
      clickedPiece.color === playerColor
    ) {
      setSelectedSquare(clickedSquare);
      return;
    }

    setSelectedSquare(null);
  }

  function handleNativePromotionPieceSelect(
    piece?: string,
    promoteFromSquare?: string,
    promoteToSquare?: string,
  ) {
    if (!piece) {
      return false;
    }

    const promotionPiece =
      piece[1]?.toLowerCase();

    if (
      promotionPiece !== "q" &&
      promotionPiece !== "r" &&
      promotionPiece !== "b" &&
      promotionPiece !== "n"
    ) {
      return false;
    }

    const pendingClickPromotion = clickPromotionRef.current;

    if (pendingClickPromotion) {
      const { from, to, isPremove } = pendingClickPromotion;

      clickPromotionRef.current = null;
      setClickPromotion(null);

      if (isPremove) {
        return queuePremove({
          from,
          to,
          promotion: promotionPiece,
        });
      }

      return onDrop(
        from,
        to,
        promotionPiece,
      );
    }

    if (
      !promoteFromSquare ||
      !promoteToSquare
    ) {
      return false;
    }

    if (!isPlayerTurn) {
      return queuePremove({
        from: promoteFromSquare,
        to: promoteToSquare,
        promotion: promotionPiece,
      });
    }

    return onDrop(
      promoteFromSquare,
      promoteToSquare,
      promotionPiece,
    );
  }

  function handlePieceDrop(
    sourceSquare: string,
    targetSquare: string,
  ) {
    setSelectedSquare(null);

    if (isGameOver) {
      clearPremove();
      return false;
    }

    if (isPlayerTurn) {
      if (premove) {
        clearPremove();
      }

      return onDrop(sourceSquare, targetSquare);
    }

    if (premove) {
      clearPremove();
    }

    const sourcePiece = displayGame.get(sourceSquare as Square);
    const isPremovePromotion =
      sourcePiece?.type === "p" &&
      ((sourcePiece.color === "w" && targetSquare[1] === "8") ||
        (sourcePiece.color === "b" && targetSquare[1] === "1"));

    if (isPremovePromotion) {
      return false;
    }

    return queuePremove({
      from: sourceSquare,
      to: targetSquare,
    });
  }

  const playerDrawColor =
    playerColor === "w" ? "WHITE" : "BLACK";

  const hasOutgoingDrawOffer =
    drawOfferBy === playerDrawColor;

  const hasIncomingDrawOffer =
    drawOfferBy !== null &&
    drawOfferBy !== playerDrawColor;

  const isIncomingDrawOfferDismissed =
    hasIncomingDrawOffer &&
    drawOfferedAt !== null &&
    dismissedDrawOfferAt === drawOfferedAt;

  const shouldShowIncomingDrawDialog =
    hasIncomingDrawOffer &&
    !isIncomingDrawOfferDismissed;

  const playerRematchColor =
    playerColor === "w" ? "WHITE" : "BLACK";

  const hasOutgoingRematchOffer =
    rematchOfferBy === playerRematchColor;

  const hasIncomingRematchOffer =
    rematchOfferBy !== null &&
    rematchOfferBy !== playerRematchColor;

  const shouldShowRematchDialog =
    isGameOverDialogClosed &&
    (isRematchDialogOpen || hasIncomingRematchOffer);

  useEffect(() => {
    if (rematchGameId) {
      router.push(`/play/online/game/${rematchGameId}`);
    }
  }, [rematchGameId, router]);

  const openingMoves = history.join(" ");

  useEffect(() => {
    if (!openingMoves) {
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
            pgn: openingMoves,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data =
          (await response.json()) as OpeningApiResponse;

        if (data.success) {
          setOpening(data.opening);
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "OPENING RECOGNITION REQUEST ERROR:",
          error,
        );
      }
    }

    void recognizeOpening();

    return () => {
      controller.abort();
    };
  }, [openingMoves]);

  const authoritativeResult =
    result === "WHITE_WIN" ||
    result === "BLACK_WIN" ||
    result === "DRAW"
      ? result
      : null;

  const gameOverReason =
    endReason === "CHECKMATE"
      ? "Checkmate"
      : endReason === "DRAW"
        ? "Draw"
        : endReason === "RESIGNATION"
          ? "Resignation"
          : endReason === "TIMEOUT"
            ? "Time out"
            : "Game finished";

  async function handleResignConfirm() {
    const resigned = await resignGame();

    if (resigned) {
      setIsResignDialogOpen(false);
    }
  }

  async function handleDrawOfferConfirm() {
    const offered = await offerDraw();

    if (offered) {
      setIsDrawDialogOpen(false);
    }
  }

  async function handleDrawAccept() {
    await acceptDraw();
  }

  async function handleDrawDecline() {
    await declineDraw();
  }

  async function handleRematchOffer() {
    const offered = await offerRematch();

    if (offered) {
      setIsRematchDialogOpen(false);
    }
  }

  async function handleRematchAccept() {
    await acceptRematch();
  }

  async function handleRematchDecline() {
    const declined = await declineRematch();

    if (declined) {
      setIsRematchDialogOpen(false);
    }
  }

  const finishedResultLabel =
    authoritativeResult === "WHITE_WIN"
      ? "White Wins"
      : authoritativeResult === "BLACK_WIN"
        ? "Black Wins"
        : authoritativeResult === "DRAW"
          ? "Draw"
          : "Finished";

  const moveHistoryResult =
    authoritativeResult === "WHITE_WIN"
      ? "1-0"
      : authoritativeResult === "BLACK_WIN"
        ? "0-1"
        : authoritativeResult === "DRAW"
          ? "½-½"
          : undefined;


  return (
    <>
      <OnlineGameOverDialog
        isOpen={
          status === "FINISHED" &&
          isGameOver &&
          isGameOverDialogReady &&
          !isGameOverDialogClosed
        }
        result={authoritativeResult}
        playerColor={playerColor}
        reason={gameOverReason}
        isRated={isRatedGame || rated}
        isRatingLoading={isProcessingRating}
        rating={
          currentPlayerRating
            ? {
                oldRating: currentPlayerRating.oldRating,
                newRating: currentPlayerRating.newRating,
                ratingChange: currentPlayerRating.ratingChange,
              }
            : null
        }
        ratingError={ratingError}
        onClose={() => setIsGameOverDialogClosed(true)}
      />

      <OnlineResignDialog
        isOpen={isResignDialogOpen}
        isSubmitting={isResigning}
        onCancel={() => setIsResignDialogOpen(false)}
        onConfirm={() => {
          void handleResignConfirm();
        }}
      />

      <OnlineDrawDialog
        isOpen={
          !isGameOver &&
          (isDrawDialogOpen ||
            shouldShowIncomingDrawDialog)
        }
        mode={
          shouldShowIncomingDrawDialog
            ? "RESPOND_TO_OFFER"
            : "CONFIRM_OFFER"
        }
        opponentUsername={opponent.username}
        isSubmitting={isProcessingDraw}
        onCancel={() => {
          if (hasIncomingDrawOffer) {
            void handleDrawDecline();
            return;
          }

          setIsDrawDialogOpen(false);
        }}
        onConfirm={() => {
          if (shouldShowIncomingDrawDialog) {
            void handleDrawAccept();
            return;
          }

          void handleDrawOfferConfirm();
        }}
        onDismiss={() => {
          if (drawOfferedAt) {
            setDismissedDrawOfferAt(drawOfferedAt);
          }
        }}
      />

      {shouldShowRematchDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-yellow-400/30 bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-center shadow-2xl shadow-black/60">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-3xl">
              ♟️
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.3em] text-yellow-400">
              Online Game
            </p>

            <h2 className="mt-2 text-3xl font-black text-white">
              {hasIncomingRematchOffer
                ? "Rematch Offered"
                : "Play Again?"}
            </h2>

            <p className="mt-3 text-slate-300">
              {hasIncomingRematchOffer
                ? `${opponent.username} wants a rematch. Colors will be switched.`
                : "Send a rematch offer. You will switch colors for the next game."}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (hasIncomingRematchOffer) {
                    void handleRematchDecline();
                    return;
                  }

                  setIsRematchDialogOpen(false);
                }}
                disabled={isProcessingRematch}
                className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {hasIncomingRematchOffer ? "Decline" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (hasIncomingRematchOffer) {
                    void handleRematchAccept();
                    return;
                  }

                  void handleRematchOffer();
                }}
                disabled={isProcessingRematch}
                className="rounded-xl bg-yellow-400 px-4 py-3 font-black text-slate-950 transition hover:bg-yellow-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessingRematch
                  ? "Please wait..."
                  : hasIncomingRematchOffer
                    ? "Accept Rematch"
                    : "Offer Rematch"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative isolate grid min-h-dvh w-full grid-cols-[clamp(180px,14vw,230px)_minmax(0,1fr)] items-start gap-[clamp(8px,1vw,16px)] overflow-hidden pr-[clamp(4px,0.7vw,12px)]">
        {activeArena.id === "roman-colosseum" && (
          <>
            <div
              aria-hidden="true"
              className="roman-scene-layer pointer-events-none absolute -z-20"
            >
              <img
                src="/arenas/roman-colosseum/roman-colosseum.png"
                alt=""
                className="absolute inset-0 h-full w-full"
              />

              {arenaEffects !== "off" && (
                <video
                  className="roman-real-fire roman-real-fire-test"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                >
                  <source
                    src="/arenas/roman-colosseum/roman-torch-flame-2.webm"
                    type="video/webm"
                  />
                </video>
              )}

              {arenaEffects === "high" && (
                <>
                  <video
                    className="roman-real-fire roman-real-fire-high-right"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                  >
                    <source
                      src="/arenas/roman-colosseum/roman-torch-flame-2.webm"
                      type="video/webm"
                    />
                  </video>
                </>
              )}
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(3,6,11,0.34)_0%,rgba(3,6,11,0.12)_22%,rgba(3,6,11,0.06)_58%,rgba(3,6,11,0.22)_100%),linear-gradient(180deg,rgba(2,6,12,0.08)_0%,rgba(2,6,12,0.04)_58%,rgba(2,6,12,0.18)_100%)]"
            />

            {arenaEffects !== "off" && (
              <div
                aria-hidden="true"
                className={`roman-fire-effects pointer-events-none absolute inset-0 -z-[5] ${
                  arenaEffects === "high" ? "roman-fire-effects-high" : ""
                }`}
              >


                {arenaEffects === "high" && (
                  <>
                    <span className="roman-ember roman-ember-1" />
                    <span className="roman-ember roman-ember-2" />
                    <span className="roman-ember roman-ember-3" />
                    <span className="roman-ember roman-ember-4" />
                    <span className="roman-ember roman-ember-5" />
                    <span className="roman-ember roman-ember-6" />
                    <span className="roman-ember roman-ember-7" />
                    <span className="roman-ember roman-ember-8" />
                    <span className="roman-ember roman-ember-9" />
                    <span className="roman-ember roman-ember-10" />
                  </>
                )}
              </div>
            )}
          </>
        )}

        <OnlineGameNavigation
          username={currentPlayer.username}
          rating={currentPlayerDisplayedRating}
          onNavigate={navigateFromSidebar}
        />

        <main className="min-w-0 flex-1">
      <section
        data-arena={activeArena.id}
        data-arena-effects={arenaEffects}
        className={`relative mt-[clamp(0px,0.6dvh,8px)] overflow-hidden rounded-[clamp(0px,1.8vw,28px)] lg:mt-[clamp(-12px,-1.2dvh,0px)] ${
          activeArena.id === "roman-colosseum"
            ? "border border-amber-200/15 bg-black/10 shadow-[0_24px_80px_rgba(0,0,0,0.30)]"
            : ""
        }`}
      >
        <div
          className={`relative z-10 mx-auto grid w-fit max-w-full items-start gap-[clamp(6px,0.7vw,10px)] lg:grid-cols-[minmax(0,calc(91dvh-clamp(78px,9dvh,96px)))_minmax(200px,18vw)] xl:grid-cols-[minmax(0,calc(91dvh-clamp(78px,9dvh,96px)))_minmax(210px,250px)] ${
            activeArena.id === "roman-colosseum"
              ? "px-[clamp(12px,2.2vw,34px)] py-[clamp(8px,1.5dvh,18px)]"
              : ""
          }`}
        >
          <div
            ref={leftGameColumnRef}
            className="mx-auto w-full min-w-0 lg:w-[min(100%,calc(91dvh-clamp(78px,9dvh,96px)))] xl:w-[min(100%,calc(91dvh-clamp(78px,9dvh,96px)))]"
          >
          <PlayerClock
            username={opponent.username}
            rating={opponentDisplayedRating}
            color={opponentColor}
            time={opponentTime}
            active={isOpponentClockActive}
            label="Opponent"
            capturedPieces={
              opponentColor === "w"
                ? whiteCaptured
                : blackCaptured
            }
            materialAdvantage={
              opponentColor === "w"
                ? whiteMaterialAdvantage
                : blackMaterialAdvantage
            }
          />

          <div
            ref={boardAreaRef}
            className="mt-1.5 overflow-hidden rounded-2xl border border-amber-200/30 bg-[linear-gradient(145deg,rgba(24,18,11,0.96),rgba(5,8,13,0.96))] p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.46),0_0_0_1px_rgba(245,158,11,0.08),0_0_24px_rgba(245,158,11,0.08)]"
          >
            <Chessboard
              position={displayGame.fen()}
              onPieceDrop={handlePieceDrop}
              onSquareClick={handleSquareClick}
              autoPromoteToQueen={false}
              onPromotionPieceSelect={handleNativePromotionPieceSelect}
              showPromotionDialog={clickPromotion !== null}
              promotionToSquare={clickPromotion?.to ?? null}
              boardOrientation={boardOrientation}
              customLightSquareStyle={{
                backgroundColor:
                  activeArena.id === "roman-colosseum" &&
                  romanBoardStyle === "roman"
                    ? "#D8C39A"
                    : "#E8EDF2",
                backgroundImage: "none",
              }}
              customDarkSquareStyle={{
                backgroundColor:
                  activeArena.id === "roman-colosseum" &&
                  romanBoardStyle === "roman"
                    ? "#76563A"
                    : "#4F6F8F",
                backgroundImage: "none",
              }}
              customSquareStyles={boardSquareStyles}
            />
          </div>

          <div className="mt-1.5">
            <PlayerClock
              username={currentPlayer.username}
              rating={currentPlayerDisplayedRating}
              color={playerColor}
            time={currentPlayerTime}
            active={isCurrentPlayerClockActive}
              label="You"
              capturedPieces={
                playerColor === "w"
                  ? whiteCaptured
                  : blackCaptured
              }
              materialAdvantage={
                playerColor === "w"
                  ? whiteMaterialAdvantage
                  : blackMaterialAdvantage
              }
            />
          </div>

          </div>

          <aside className="flex w-full min-w-0 flex-col items-center gap-[clamp(6px,0.8dvh,12px)] lg:items-stretch lg:pr-1">
            <div className="w-full lg:mb-[-1px]">
              <SoundControl />
            </div>

            <div
              ref={rightGameAreaRef}
              className="flex w-full min-h-0 flex-col gap-[clamp(6px,0.8dvh,12px)]"
              style={
                rightGameAreaHeight !== null
                  ? { height: `${rightGameAreaHeight}px` }
                  : undefined
              }
            >
            {opening && (
              <div className="w-full rounded-xl border border-amber-300/30 bg-[linear-gradient(135deg,rgba(31,23,13,0.88),rgba(5,8,13,0.86))] px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.24)] backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-yellow-400">
                  Opening
                </p>

                <p className="mt-1 text-sm font-black text-white">
                  {opening.eco} · {opening.name}
                </p>
              </div>
            )}

            <MoveHistory
              history={history}
              currentMoveIndex={currentMoveIndex}
              result={undefined}
              onMoveSelect={goToMove}
              onFirstMove={goToFirstMove}
              onPreviousMove={goToPreviousMove}
              onNextMove={goToNextMove}
              onLastMove={goToLastMove}
            />

            {!isGameOver && (
              <div className="w-full rounded-2xl border border-amber-200/20 bg-[linear-gradient(145deg,rgba(5,8,13,0.90),rgba(30,22,12,0.82))] p-3 shadow-[0_14px_36px_rgba(0,0,0,0.28)] backdrop-blur-md">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDrawDialogOpen(true)}
                    title={
                      !isPlayerTurn
                        ? "You can offer a draw on your turn"
                        : undefined
                    }
                    disabled={
                      !isPlayerTurn ||
                      hasOutgoingDrawOffer ||
                      hasIncomingDrawOffer ||
                      isProcessingDraw ||
                      isResigning
                    }
                    className="flex min-h-12 items-center justify-center rounded-xl border border-amber-200/20 bg-black/35 px-2 py-2.5 text-center text-xs font-bold text-slate-100 transition hover:border-sky-400/60 hover:bg-white/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {hasOutgoingDrawOffer
                      ? "🤝 Offer Sent"
                      : hasIncomingDrawOffer
                        ? "🤝 Draw Offered"
                        : "½ Offer Draw"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsResignDialogOpen(true)}
                    disabled={
                      isResigning ||
                      isProcessingDraw
                    }
                    className="flex min-h-12 items-center justify-center rounded-xl border border-amber-200/20 bg-black/35 px-2 py-2.5 text-center text-xs font-bold text-slate-100 transition hover:border-red-400/60 hover:bg-white/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    🏳️ Resign
                  </button>

                  <button
                    type="button"
                    onClick={handleFlipBoard}
                    className="flex min-h-12 items-center justify-center rounded-xl border border-amber-200/20 bg-black/35 px-2 py-2.5 text-center text-xs font-bold text-slate-100 transition hover:border-yellow-400/55 hover:bg-white/10 active:scale-[0.98]"
                  >
                    🔄 Flip Board
                  </button>

                </div>

                {hasOutgoingDrawOffer && (
                  <div className="mt-3 rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-center text-xs font-semibold text-sky-200">
                    Draw offer sent — waiting for your opponent.
                  </div>
                )}

                {isIncomingDrawOfferDismissed && (
                  <div className="mt-3 rounded-xl border border-sky-400/30 bg-sky-400/10 p-3">
                    <p className="text-center text-sm font-semibold text-sky-100">
                      {opponent.username} offered a draw.
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void handleDrawDecline();
                        }}
                        disabled={isProcessingDraw}
                        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Decline
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          void handleDrawAccept();
                        }}
                        disabled={isProcessingDraw}
                        className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-bold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Accept Draw
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isGameOver && (
              <div className="w-full rounded-2xl border border-yellow-400/35 bg-[linear-gradient(145deg,rgba(35,27,12,0.90),rgba(5,8,13,0.88))] p-2.5 shadow-[0_14px_36px_rgba(0,0,0,0.28)] backdrop-blur-md">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-yellow-400">
                    Post-Game Actions
                  </p>

                  {moveHistoryResult && (
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Result
                      </span>
                      <span className="text-sm font-black text-yellow-300">
                        {moveHistoryResult}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsRematchDialogOpen(true)}
                  disabled={
                    hasOutgoingRematchOffer ||
                    isProcessingRematch ||
                    rematchGameId !== null
                  }
                  className="w-full rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-300 transition hover:border-yellow-400/70 hover:bg-yellow-400/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {rematchGameId
                    ? "♟️ Opening Rematch..."
                    : hasOutgoingRematchOffer
                      ? "♟️ Rematch Offer Sent"
                      : hasIncomingRematchOffer
                        ? "♟️ Rematch Offered"
                        : "♟️ Rematch"}
                </button>

                {hasOutgoingRematchOffer && (
                  <div className="mt-3 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-center text-xs font-semibold text-yellow-200">
                    Rematch offer sent — waiting for your opponent.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    router.push("/dashboard");
                    router.refresh();
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 active:scale-[0.98]"
                >
                  🏠 Back to Dashboard
                </button>

                <button
                  type="button"
                  onClick={handleFlipBoard}
                  className="mt-1.5 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 active:scale-[0.98]"
                >
                  🔄 Flip Board
                </button>
              </div>
            )}
            </div>
          </aside>
        </div>
      </section>
        </main>
      </div>


      <style jsx global>{`
        .arena-nav-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }

        .arena-nav-scrollbar:hover {
          scrollbar-color: rgba(245, 158, 11, 0.42) transparent;
        }

        .arena-nav-scrollbar::-webkit-scrollbar {
          width: 5px;
        }

        .arena-nav-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .arena-nav-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 999px;
        }

        .arena-nav-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(245, 158, 11, 0.42);
        }

        .arena-nav-scrollbar:hover::-webkit-scrollbar-thumb:hover {
          background: rgba(250, 204, 21, 0.68);
        }
      `}</style>

    
      <style jsx global>{`
        .roman-scene-layer {
          left: 50%;
          top: 50%;
          width: max(100vw, calc(100vh * 1672 / 941));
          height: max(100vh, calc(100vw * 941 / 1672));
          transform: translate(-50%, -50%);
          overflow: hidden;
        }

        .roman-fire-effects {
          overflow: hidden;
        }

        .roman-real-fire {
          position: absolute;
          display: block;
          object-fit: contain;
          opacity: 0.82;
          filter: saturate(1.04) brightness(0.96);
          transform-origin: 50% 100%;
        }

        .roman-real-fire-test {
          left: 14.8%;
          top: 37%;
          width: 12.5%;
          height: 29%;
        }

        .roman-real-fire-high-right {
          left: 94.2%;
          top: 41.5%;
          width: 8%;
          height: 21%;
          opacity: 0.9;
        }

        .roman-fire-glow {
          position: absolute;
          display: block;
          border-radius: 9999px;
          background: radial-gradient(ellipse at center, rgba(255,191,73,0.20) 0%, rgba(245,118,22,0.11) 34%, rgba(180,58,10,0.045) 58%, transparent 76%);
          filter: blur(12px);
          mix-blend-mode: screen;
          transform-origin: 50% 100%;
          animation: roman-fire-flicker 3.4s ease-in-out infinite;
          will-change: opacity, transform;
        }

        .roman-fire-glow-left {
          left: 16%;
          top: 46%;
          width: 13%;
          height: 28%;
          animation-delay: -1.1s;
        }

        .roman-fire-glow-center {
          left: 30%;
          top: 51%;
          width: 12%;
          height: 25%;
          animation-duration: 2.9s;
          animation-delay: -2.2s;
        }

        .roman-fire-glow-right {
          right: 3%;
          top: 46%;
          width: 12%;
          height: 27%;
          animation-duration: 3.8s;
          animation-delay: -0.7s;
        }

        .roman-fire-effects-high .roman-fire-glow {
          background: radial-gradient(ellipse at center, rgba(255,198,76,0.26) 0%, rgba(247,117,18,0.14) 34%, rgba(180,58,10,0.055) 58%, transparent 76%);
        }

        .roman-ember {
          position: absolute;
          display: block;
          width: 3px;
          height: 3px;
          border-radius: 9999px;
          background: rgba(255,193,77,0.82);
          box-shadow: 0 0 7px rgba(251,146,60,0.62);
          opacity: 0;
          animation: roman-ember-rise 5.6s linear infinite;
          will-change: opacity, transform;
        }

        .roman-ember-1 { left: 20%; top: 68%; animation-delay: -0.4s; }
        .roman-ember-2 { left: 23%; top: 66%; animation-delay: -3.1s; animation-duration: 6.3s; }
        .roman-ember-3 { left: 34%; top: 70%; animation-delay: -1.8s; animation-duration: 5.1s; }
        .roman-ember-4 { left: 37%; top: 67%; animation-delay: -4.4s; animation-duration: 6.8s; }
        .roman-ember-5 { right: 7%; top: 68%; animation-delay: -2.6s; animation-duration: 5.9s; }
        .roman-ember-6 { right: 10%; top: 65%; animation-delay: -5s; animation-duration: 7.1s; }

        @keyframes roman-fire-flicker {
          0%, 100% { opacity: 0.52; transform: translate3d(0,0,0) scale(0.96,1); }
          24% { opacity: 0.76; transform: translate3d(1px,-2px,0) scale(1.04,1.07); }
          47% { opacity: 0.58; transform: translate3d(-1px,1px,0) scale(0.98,0.96); }
          72% { opacity: 0.82; transform: translate3d(1px,-1px,0) scale(1.06,1.04); }
        }

        @keyframes roman-ember-rise {
          0% { opacity: 0; transform: translate3d(0,0,0) scale(0.7); }
          12% { opacity: 0.7; }
          60% { opacity: 0.42; }
          100% { opacity: 0; transform: translate3d(10px,-90px,0) scale(0.25); }
        }

        @media (prefers-reduced-motion: reduce) {
          .roman-fire-glow, .roman-ember { animation: none !important; }
          .roman-fire-glow { opacity: 0.58; }
          .roman-ember { display: none; }
        }

        .roman-fire-effects-high .roman-fire-glow {
          background: radial-gradient(ellipse at center, rgba(255,215,105,0.48) 0%, rgba(255,139,31,0.30) 30%, rgba(220,72,10,0.13) 56%, transparent 78%);
          filter: blur(9px);
          animation-duration: 1.55s;
        }

        .roman-fire-wash {
          position: absolute;
          display: block;
          width: 34%;
          height: 52%;
          border-radius: 9999px;
          background: radial-gradient(ellipse at center, rgba(251,146,60,0.16) 0%, rgba(245,101,20,0.08) 42%, transparent 72%);
          filter: blur(24px);
          mix-blend-mode: screen;
          animation: roman-fire-wash-pulse 2.4s ease-in-out infinite;
        }

        .roman-fire-wash-left { left: 8%; top: 35%; animation-delay: -0.8s; }
        .roman-fire-wash-right { right: -5%; top: 34%; animation-delay: -1.7s; }

        .roman-fire-effects-high .roman-ember {
          width: 3px;
          height: 3px;
          background: rgba(255,205,92,0.96);
          box-shadow: 0 0 9px rgba(251,146,60,0.82);
          animation-duration: 4.5s;
        }

        .roman-ember-7 { right: 9%; top: 67%; animation-delay: -0.9s; }
        .roman-ember-8 { right: 5%; top: 73%; animation-delay: -3.5s; animation-duration: 5.9s; }
        .roman-ember-9 { left: 29%; top: 69%; animation-delay: -4.8s; animation-duration: 6.2s; }
        .roman-ember-10 { right: 17%; top: 70%; animation-delay: -1.9s; animation-duration: 5.1s; }

        @keyframes roman-fire-wash-pulse {
          0%, 100% { opacity: 0.28; transform: scale(0.96); }
          35% { opacity: 0.68; transform: scale(1.08); }
          66% { opacity: 0.42; transform: scale(1.01); }
        }

      `}</style>
</>
  );
}