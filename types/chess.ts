export type BoardOrientation = "white" | "black";

export type PromotionPiece = "q" | "r" | "b" | "n";

export type ChessMove = {
  from: string;
  to: string;
  promotion?: PromotionPiece;
};

export type PieceType = "p" | "n" | "b" | "r" | "q";

export type PendingPromotion = {
  from: string;
  to: string;
  color: "w" | "b";
};

export type GameResult =
  | "white-win"
  | "black-win"
  | "draw"
  | null;

export type GameOverDetails = {
  isOpen: boolean;
  title: string;
  subtitle: string;
  score: string;
  result: GameResult;
};