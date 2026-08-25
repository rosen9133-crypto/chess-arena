import { type Move } from "chess.js";

import {
  playSound,
  preloadSounds,
  type SoundName,
} from "@/lib/sounds/soundManager";

type ChessColor = "w" | "b";

type OnlineGameResult =
  | "WHITE_WIN"
  | "BLACK_WIN"
  | "DRAW"
  | null;

export function initializeOnlineGameSounds() {
  preloadSounds();
}

function getMoveSound(move: Move): SoundName {
  if (move.san.includes("+") || move.san.includes("#")) {
    return "check";
  }

  if (move.isPromotion()) {
    return "promote";
  }

  if (
    move.isKingsideCastle() ||
    move.isQueensideCastle()
  ) {
    return "castle";
  }

  if (move.isCapture()) {
    return "capture";
  }

  return "move";
}

export function playOnlineMoveSound(move: Move) {
  playSound(getMoveSound(move));
}

export function playOnlineGameResultSound(
  result: OnlineGameResult,
  playerColor: ChessColor,
) {
  if (result === "DRAW") {
    playSound("draw");
    return;
  }

  const playerWon =
    (result === "WHITE_WIN" && playerColor === "w") ||
    (result === "BLACK_WIN" && playerColor === "b");

  playSound(playerWon ? "win" : "lose");
}

export function playOnlineClockWarningSound() {
  playSound("clock-warning");
}

export function playOnlineClockTickSound() {
  playSound("clock-tick");
}

export function playOnlineClockTimeoutSound() {
  playSound("clock-timeout");
}