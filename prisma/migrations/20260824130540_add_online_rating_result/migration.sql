-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "blackRatingAfter" DOUBLE PRECISION,
ADD COLUMN     "blackRatingBefore" DOUBLE PRECISION,
ADD COLUMN     "ratingProcessedAt" TIMESTAMP(3),
ADD COLUMN     "whiteRatingAfter" DOUBLE PRECISION,
ADD COLUMN     "whiteRatingBefore" DOUBLE PRECISION;
