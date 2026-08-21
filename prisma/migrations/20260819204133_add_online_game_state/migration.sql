-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "fen" TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
ADD COLUMN     "pgn" TEXT NOT NULL DEFAULT '';
