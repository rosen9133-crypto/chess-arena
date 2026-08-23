-- CreateEnum
CREATE TYPE "GameDrawOfferBy" AS ENUM ('WHITE', 'BLACK');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "drawOfferBy" "GameDrawOfferBy",
ADD COLUMN     "drawOfferedAt" TIMESTAMP(3);
