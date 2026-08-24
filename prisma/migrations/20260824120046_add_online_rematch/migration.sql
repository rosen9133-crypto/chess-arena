-- CreateEnum
CREATE TYPE "GameRematchOfferBy" AS ENUM ('WHITE', 'BLACK');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "rematchGameId" TEXT,
ADD COLUMN     "rematchOfferBy" "GameRematchOfferBy",
ADD COLUMN     "rematchOfferedAt" TIMESTAMP(3);
