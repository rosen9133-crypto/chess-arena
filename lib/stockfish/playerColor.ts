export const PLAYER_COLOR_OPTIONS = [
  {
    id: "white",
    label: "White",
    description: "You make the first move",
    icon: "⚪",
  },
  {
    id: "black",
    label: "Black",
    description: "Stockfish makes the first move",
    icon: "⚫",
  },
  {
    id: "random",
    label: "Random",
    description: "Let Chess Arena choose",
    icon: "🎲",
  },
] as const;

export type PlayerColorChoice =
  (typeof PLAYER_COLOR_OPTIONS)[number]["id"];

export type PlayerChessColor = "w" | "b";

export const DEFAULT_PLAYER_COLOR_CHOICE: PlayerColorChoice =
  "white";

export function resolvePlayerColor(
  choice: PlayerColorChoice,
): PlayerChessColor {
  if (choice === "random") {
    return Math.random() < 0.5 ? "w" : "b";
  }

  return choice === "white" ? "w" : "b";
}

export function getBoardOrientationForPlayer(
  playerColor: PlayerChessColor,
): "white" | "black" {
  return playerColor === "w" ? "white" : "black";
}