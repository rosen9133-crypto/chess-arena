-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('IN_PROGRESS', 'FINISHED', 'ABORTED');

-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('WHITE_WIN', 'BLACK_WIN', 'DRAW');

-- CreateEnum
CREATE TYPE "GameTimeControl" AS ENUM ('BULLET', 'BLITZ', 'RAPID');

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "whitePlayerId" TEXT NOT NULL,
    "blackPlayerId" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "result" "GameResult",
    "timeControl" "GameTimeControl" NOT NULL,
    "rated" BOOLEAN NOT NULL DEFAULT true,
    "initialTimeSeconds" INTEGER NOT NULL,
    "incrementSeconds" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Game_whitePlayerId_idx" ON "Game"("whitePlayerId");

-- CreateIndex
CREATE INDEX "Game_blackPlayerId_idx" ON "Game"("blackPlayerId");

-- CreateIndex
CREATE INDEX "Game_status_idx" ON "Game"("status");

-- CreateIndex
CREATE INDEX "Game_startedAt_idx" ON "Game"("startedAt");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_whitePlayerId_fkey" FOREIGN KEY ("whitePlayerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_blackPlayerId_fkey" FOREIGN KEY ("blackPlayerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
