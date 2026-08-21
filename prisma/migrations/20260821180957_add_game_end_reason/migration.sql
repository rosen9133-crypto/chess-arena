-- CreateEnum
CREATE TYPE "GameEndReason" AS ENUM ('CHECKMATE', 'DRAW', 'RESIGNATION', 'TIMEOUT');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "endReason" "GameEndReason";
