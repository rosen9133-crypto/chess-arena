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
    const username = "Fenomena91";

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        wins: true,
        draws: true,
        losses: true,
        computerWins: true,
        computerDraws: true,
        computerLosses: true,
      },
    });

    if (!user) {
      throw new Error(`User "${username}" was not found.`);
    }

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

    let onlineWins = 0;
    let onlineDraws = 0;
    let onlineLosses = 0;

    for (const game of games) {
      if (game.result === "DRAW") {
        onlineDraws += 1;
        continue;
      }

      const userWon =
        (game.result === "WHITE_WIN" && game.whitePlayerId === user.id) ||
        (game.result === "BLACK_WIN" && game.blackPlayerId === user.id);

      if (userWon) {
        onlineWins += 1;
      } else if (
        game.result === "WHITE_WIN" ||
        game.result === "BLACK_WIN"
      ) {
        onlineLosses += 1;
      }
    }

    // Snapshot of the old mixed Player Hub statistics before Computer
    // results were separated into their own fields.
    const oldMixedWins = 102;
    const oldMixedDraws = 20;
    const oldMixedLosses = 145;

    const historicalComputerWins = oldMixedWins - onlineWins;
    const historicalComputerDraws = oldMixedDraws - onlineDraws;
    const historicalComputerLosses = oldMixedLosses - onlineLosses;

    if (
      historicalComputerWins < 0 ||
      historicalComputerDraws < 0 ||
      historicalComputerLosses < 0
    ) {
      throw new Error(
        "Calculated historical Computer statistics are invalid. No changes were made."
      );
    }

    console.log("\n=== BEFORE REPAIR ===");
    console.log(`Player: ${user.username}`);
    console.log(
      `Online fields: ${user.wins} wins / ${user.draws} draws / ${user.losses} losses`
    );
    console.log(
      `Computer fields: ${user.computerWins} wins / ${user.computerDraws} draws / ${user.computerLosses} losses`
    );

    console.log("\n=== CALCULATED FROM GAME HISTORY ===");
    console.log(
      `Online: ${onlineWins} wins / ${onlineDraws} draws / ${onlineLosses} losses`
    );
    console.log(
      `Historical Computer to restore: ${historicalComputerWins} wins / ${historicalComputerDraws} draws / ${historicalComputerLosses} losses`
    );

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        wins: onlineWins,
        draws: onlineDraws,
        losses: onlineLosses,
        computerWins: {
          increment: historicalComputerWins,
        },
        computerDraws: {
          increment: historicalComputerDraws,
        },
        computerLosses: {
          increment: historicalComputerLosses,
        },
      },
      select: {
        username: true,
        wins: true,
        draws: true,
        losses: true,
        computerWins: true,
        computerDraws: true,
        computerLosses: true,
      },
    });

    console.log("\n=== AFTER REPAIR ===");
    console.log(`Player: ${updated.username}`);
    console.log(
      `Online: ${updated.wins} wins / ${updated.draws} draws / ${updated.losses} losses`
    );
    console.log(
      `Computer: ${updated.computerWins} wins / ${updated.computerDraws} draws / ${updated.computerLosses} losses`
    );
    console.log("\nRepair completed successfully.\n");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("\nRepair failed:");
  console.error(error);
  process.exit(1);
});
