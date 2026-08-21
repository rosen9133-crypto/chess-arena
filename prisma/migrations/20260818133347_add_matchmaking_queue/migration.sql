-- CreateTable
CREATE TABLE "MatchmakingQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timeControl" "GameTimeControl" NOT NULL,
    "initialTimeSeconds" INTEGER NOT NULL,
    "incrementSeconds" INTEGER NOT NULL DEFAULT 0,
    "rated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchmakingQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchmakingQueue_userId_key" ON "MatchmakingQueue"("userId");

-- CreateIndex
CREATE INDEX "MatchmakingQueue_timeControl_initialTimeSeconds_incrementSe_idx" ON "MatchmakingQueue"("timeControl", "initialTimeSeconds", "incrementSeconds", "rated");

-- CreateIndex
CREATE INDEX "MatchmakingQueue_createdAt_idx" ON "MatchmakingQueue"("createdAt");

-- AddForeignKey
ALTER TABLE "MatchmakingQueue" ADD CONSTRAINT "MatchmakingQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
