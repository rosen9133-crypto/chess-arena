import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import OnlineGameClient from "./OnlineGameClient";

type OnlineGamePageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

export default async function OnlineGamePage({
  params,
}: OnlineGamePageProps) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const { gameId } = await params;

  const currentUser = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      username: true,
    },
  });

  if (!currentUser) {
    redirect("/login");
  }

  const game = await prisma.game.findUnique({
    where: {
      id: gameId,
    },
    select: {
      id: true,
      status: true,
      result: true,
      timeControl: true,
      rated: true,
      initialTimeSeconds: true,
      incrementSeconds: true,
      startedAt: true,
      endedAt: true,

      whitePlayer: {
        select: {
          id: true,
          username: true,
          bulletRating: true,
          blitzRating: true,
          rapidRating: true,
        },
      },

      blackPlayer: {
        select: {
          id: true,
          username: true,
          bulletRating: true,
          blitzRating: true,
          rapidRating: true,
        },
      },
    },
  });

  if (!game) {
    notFound();
  }

  const isPlayer =
    game.whitePlayer.id === currentUser.id ||
    game.blackPlayer.id === currentUser.id;

  if (!isPlayer) {
    redirect("/play/online");
  }

  const playerColor =
    game.whitePlayer.id === currentUser.id
      ? ("w" as const)
      : ("b" as const);

  const formatTimeControl = () => {
    const minutes = Math.floor(
      game.initialTimeSeconds / 60,
    );

    return `${minutes}+${game.incrementSeconds}`;
  };

  const getPlayerRating = (player: {
    bulletRating: number;
    blitzRating: number;
    rapidRating: number;
  }) => {
    switch (game.timeControl) {
      case "BULLET":
        return Math.round(player.bulletRating);
      case "BLITZ":
        return Math.round(player.blitzRating);
      case "RAPID":
        return Math.round(player.rapidRating);
    }
  };

  const whitePlayer = {
    id: game.whitePlayer.id,
    username: game.whitePlayer.username,
    rating: getPlayerRating(game.whitePlayer),
  };

  const blackPlayer = {
    id: game.blackPlayer.id,
    username: game.blackPlayer.username,
    rating: getPlayerRating(game.blackPlayer),
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#172554_0%,_#0f172a_45%,_#020617_100%)] px-3 py-2 text-slate-50 sm:px-4">
      <div className="mx-auto w-full max-w-[1120px]">
        <OnlineGameClient
          gameId={game.id}
          playerColor={playerColor}
          timeControlLabel={formatTimeControl()}
          category={game.timeControl}
          rated={game.rated}
          initialStatus={game.status}
          whitePlayer={whitePlayer}
          blackPlayer={blackPlayer}
        />
      </div>
    </main>
  );

}
