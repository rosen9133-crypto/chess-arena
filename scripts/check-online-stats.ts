import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../app/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing.");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
      },
      orderBy: {
        username: "asc",
      },
    });

    console.log("\n=== ONLINE PVP STATISTICS (FINISHED GAMES ONLY) ===\n");

    for (const user of users) {
      const games = await prisma.game.findMany({
        where: {
          status: "FINISHED",
          OR: [
            { whitePlayerId: user.id },
            { blackPlayerId: user.id },
          ],
        },
        select: {
          whitePlayerId: true,
          blackPlayerId: true,
          result: true,
        },
      });

      let wins = 0;
      let draws = 0;
      let losses = 0;

      for (const game of games) {
        if (game.result === "DRAW") {
          draws += 1;
          continue;
        }

        const userWon =
          (game.result === "WHITE_WIN" && game.whitePlayerId === user.id) ||
          (game.result === "BLACK_WIN" && game.blackPlayerId === user.id);

        if (userWon) {
          wins += 1;
        } else if (
          game.result === "WHITE_WIN" ||
          game.result === "BLACK_WIN"
        ) {
          losses += 1;
        }
      }

      console.log(`Player: ${user.username}`);
      console.log(`Online games: ${games.length}`);
      console.log(`Wins: ${wins}`);
      console.log(`Draws: ${draws}`);
      console.log(`Losses: ${losses}`);
      console.log("----------------------------------------");
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("\nFailed to calculate online statistics:");
  console.error(error);
  process.exit(1);
});
