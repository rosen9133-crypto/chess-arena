import { type Move } from "chess.js";

import {
  playSound,
  playSoundAndThen,
  preloadSounds,
  type SoundName,
} from "@/lib/sounds/soundManager";

type ChessColor = "w" | "b";

type OnlineGameResult =
  | "WHITE_WIN"
  | "BLACK_WIN"
  | "DRAW"
  | null;

type OnlineGameEndReason =
  | "CHECKMATE"
  | "DRAW"
  | "RESIGNATION"
  | "TIMEOUT"
  | string
  | null;

export function initializeOnlineGameSounds() {
  preloadSounds();
}

function getMoveSound(move: Move): SoundName {
  if (move.san.includes("+")) {
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
  // The final checkmate sound is handled by the authoritative
  // FINISHED + CHECKMATE result sequence below.
  if (move.san.includes("#")) {
    return;
  }

  playSound(getMoveSound(move));
}

export function playOnlineGameResultSound(
  result: OnlineGameResult,
  playerColor: ChessColor,
  endReason: OnlineGameEndReason,
) {
  if (result === "DRAW") {
    playSound("draw");
    return;
  }

  if (!result) {
    return;
  }

  const playerWon =
    (result === "WHITE_WIN" && playerColor === "w") ||
    (result === "BLACK_WIN" && playerColor === "b");

  const resultSound: SoundName = playerWon
    ? "victory-applause"
    : "defeat";

  if (endReason === "CHECKMATE") {
    playSoundAndThen("win", () => {
      playSound(resultSound);
    });

    return;
  }

  // Resignation, timeout and other decisive endings do not play Checkmate.
  playSound(resultSound);
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
