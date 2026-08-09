export const STOCKFISH_DIFFICULTIES = [
  {
    id: "beginner",
    label: "Beginner",
    elo: 1320,
  },
  {
    id: "easy",
    label: "Easy",
    elo: 1450,
  },
  {
    id: "casual",
    label: "Casual",
    elo: 1600,
  },
  {
    id: "intermediate",
    label: "Intermediate",
    elo: 1800,
  },
  {
    id: "advanced",
    label: "Advanced",
    elo: 2000,
  },
  {
    id: "expert",
    label: "Expert",
    elo: 2200,
  },
  {
    id: "master",
    label: "Master",
    elo: 2500,
  },
] as const;

export type StockfishDifficultyId =
  (typeof STOCKFISH_DIFFICULTIES)[number]["id"];

export const DEFAULT_STOCKFISH_DIFFICULTY_ID: StockfishDifficultyId =
  "intermediate";

export function getStockfishDifficulty(
  difficultyId: StockfishDifficultyId,
) {
  return (
    STOCKFISH_DIFFICULTIES.find(
      (difficulty) =>
        difficulty.id === difficultyId,
    ) ??
    STOCKFISH_DIFFICULTIES.find(
      (difficulty) =>
        difficulty.id ===
        DEFAULT_STOCKFISH_DIFFICULTY_ID,
    )!
  );
}