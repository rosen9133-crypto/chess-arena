export const STOCKFISH_DIFFICULTIES = [
  {
    id: "beginner",
    label: "Beginner",
    elo: 1350,
    uciElo: 1350,
    skillLevel: 0,
    thinkTimeMs: {
      min: 500,
      max: 1000,
    },
    multiPv: 1,
    humanizedMistakes: false,
    maxCentipawnLoss: 0,
    candidateWeights: [100],
  },
  {
    id: "easy",
    label: "Easy",
    elo: 1500,
    uciElo: 1500,
    skillLevel: 0,
    thinkTimeMs: {
      min: 650,
      max: 1200,
    },
    multiPv: 1,
    humanizedMistakes: false,
    maxCentipawnLoss: 0,
    candidateWeights: [100],
  },
  {
    id: "casual",
    label: "Casual",
    elo: 1700,
    uciElo: 1700,
    skillLevel: 0,
    thinkTimeMs: {
      min: 800,
      max: 1500,
    },
    multiPv: 1,
    humanizedMistakes: false,
    maxCentipawnLoss: 0,
    candidateWeights: [100],
  },
  {
    id: "intermediate",
    label: "Intermediate",
    elo: 1900,
    uciElo: 1900,
    skillLevel: 0,
    thinkTimeMs: {
      min: 1000,
      max: 2000,
    },
    multiPv: 1,
    humanizedMistakes: false,
    maxCentipawnLoss: 0,
    candidateWeights: [100],
  },
  {
    id: "advanced",
    label: "Advanced",
    elo: 2100,
    uciElo: 2100,
    skillLevel: 0,
    thinkTimeMs: {
      min: 1500,
      max: 2500,
    },
    multiPv: 1,
    humanizedMistakes: false,
    maxCentipawnLoss: 0,
    candidateWeights: [100],
  },
  {
    id: "expert",
    label: "Expert",
    elo: 2300,
    uciElo: 2300,
    skillLevel: 0,
    thinkTimeMs: {
      min: 2000,
      max: 3000,
    },
    multiPv: 1,
    humanizedMistakes: false,
    maxCentipawnLoss: 0,
    candidateWeights: [100],
  },
  {
    id: "master",
    label: "Master",
    elo: 2500,
    uciElo: 2500,
    skillLevel: 0,
    thinkTimeMs: {
      min: 2500,
      max: 4000,
    },
    multiPv: 1,
    humanizedMistakes: false,
    maxCentipawnLoss: 0,
    candidateWeights: [100],
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
