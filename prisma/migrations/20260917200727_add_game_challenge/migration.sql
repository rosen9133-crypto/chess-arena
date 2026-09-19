-- CreateEnum
CREATE TYPE "GameChallengeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "GameChallenge" (
    "id" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "challengedId" TEXT NOT NULL,
    "timeControl" "GameTimeControl" NOT NULL,
    "initialTimeSeconds" INTEGER NOT NULL,
    "incrementSeconds" INTEGER NOT NULL DEFAULT 0,
    "rated" BOOLEAN NOT NULL DEFAULT true,
    "status" "GameChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameChallenge_challengerId_status_idx" ON "GameChallenge"("challengerId", "status");

-- CreateIndex
CREATE INDEX "GameChallenge_challengedId_status_idx" ON "GameChallenge"("challengedId", "status");

-- CreateIndex
CREATE INDEX "GameChallenge_createdAt_idx" ON "GameChallenge"("createdAt");

-- AddForeignKey
ALTER TABLE "GameChallenge" ADD CONSTRAINT "GameChallenge_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameChallenge" ADD CONSTRAINT "GameChallenge_challengedId_fkey" FOREIGN KEY ("challengedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
