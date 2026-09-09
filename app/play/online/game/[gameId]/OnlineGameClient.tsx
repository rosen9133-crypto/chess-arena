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
          ? "border-emerald-400/70 bg-emerald-400/10 shadow-[0_0_10px_rgba(52,211,153,0.16)]"
          : "border-slate-700 bg-slate-950/85 shadow-none"
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
    <aside className="hidden lg:sticky lg:left-0 lg:top-0 lg:flex lg:h-dvh lg:w-[clamp(180px,14vw,230px)] lg:shrink-0 lg:flex-col lg:overflow-hidden lg:rounded-none lg:border-r lg:border-amber-300/15 lg:bg-[linear-gradient(180deg,rgba(10,14,21,0.98),rgba(5,8,13,0.98))] lg:p-2.5 lg:shadow-[12px_0_40px_rgba(0,0,0,0.28)]">
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

      <nav className="mt-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-0.5">
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
          <span className="mt-0.5 block text-[9px] leading-tight text-slate-400">
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
  const arenaEffects: ArenaEffectsLevel = DEFAULT_ARENA_EFFECTS;

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

      <div className="grid w-full grid-cols-[clamp(180px,14vw,230px)_minmax(0,1fr)] items-start gap-[clamp(8px,1vw,16px)] pr-[clamp(4px,0.7vw,12px)]">
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
            ? "border border-amber-300/20 bg-[radial-gradient(circle_at_50%_8%,rgba(251,191,36,0.18),transparent_32%),linear-gradient(180deg,rgba(68,45,25,0.96)_0%,rgba(30,24,20,0.98)_44%,rgba(10,13,18,1)_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            : ""
        }`}
      >
        {activeArena.id === "roman-colosseum" && (
          <>
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[clamp(54px,8dvh,92px)] border-b border-amber-200/10 bg-[linear-gradient(180deg,rgba(120,72,30,0.24),rgba(30,24,20,0.08))]" />
            <div aria-hidden="true" className="pointer-events-none absolute left-[3%] top-[clamp(22px,5dvh,58px)] h-[clamp(90px,19dvh,190px)] w-[clamp(10px,1.1vw,18px)] rounded-full bg-gradient-to-b from-amber-200/25 via-orange-500/12 to-transparent blur-[2px]" />
            <div aria-hidden="true" className="pointer-events-none absolute right-[3%] top-[clamp(22px,5dvh,58px)] h-[clamp(90px,19dvh,190px)] w-[clamp(10px,1.1vw,18px)] rounded-full bg-gradient-to-b from-amber-200/25 via-orange-500/12 to-transparent blur-[2px]" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-[7%] bottom-0 h-[clamp(42px,7dvh,74px)] rounded-t-[50%] border-t border-amber-200/10 bg-[radial-gradient(ellipse_at_center,rgba(161,98,40,0.16),rgba(15,18,24,0)_70%)]" />
          </>
        )}

        <div
          className={`relative z-10 mx-auto grid w-fit max-w-full items-start gap-[clamp(6px,0.7vw,10px)] lg:grid-cols-[minmax(0,calc(100dvh-clamp(112px,14dvh,132px)))_minmax(220px,20vw)] xl:grid-cols-[minmax(0,calc(100dvh-clamp(112px,14dvh,132px)))_minmax(230px,270px)] ${
            activeArena.id === "roman-colosseum"
              ? "px-[clamp(6px,1.2vw,18px)] py-[clamp(2px,0.55dvh,8px)]"
              : ""
          }`}
        >
          <div
            ref={leftGameColumnRef}
            className="mx-auto w-full min-w-0 lg:w-[min(100%,calc(100dvh-clamp(112px,14dvh,132px)))]"
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
            className="mt-1.5 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 p-1.5 shadow-2xl shadow-black/30"
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
                backgroundColor: "#E8EDF2",
              }}
              customDarkSquareStyle={{
                backgroundColor: "#4F6F8F",
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
              <div className="w-full rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3">
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
              <div className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 p-3 shadow-xl shadow-black/20">
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
                    className="flex min-h-12 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-2 py-2.5 text-center text-xs font-bold text-slate-100 transition hover:border-sky-400/60 hover:bg-slate-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="flex min-h-12 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-2 py-2.5 text-center text-xs font-bold text-slate-100 transition hover:border-red-400/60 hover:bg-slate-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    🏳️ Resign
                  </button>

                  <button
                    type="button"
                    onClick={handleFlipBoard}
                    className="flex min-h-12 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-2 py-2.5 text-center text-xs font-bold text-slate-100 transition hover:border-yellow-400/50 hover:bg-slate-700 active:scale-[0.98]"
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
              <div className="w-full rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-2.5">
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
    </>
  );
}