import Link from "next/link";
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
        },
      },

      blackPlayer: {
        select: {
          id: true,
          username: true,
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#172554_0%,_#0f172a_45%,_#020617_100%)] px-4 py-10 text-slate-50 sm:px-6">
      <div className="mx-auto w-full max-w-[1100px]">
        <header className="mb-8 text-center">
          <div className="mb-2 text-5xl">
            ⚔️
          </div>

          <h1 className="text-4xl font-black text-yellow-400 sm:text-5xl">
            Online Game
          </h1>

          <p className="mt-3 text-slate-400">
            Your Chess Arena match is ready.
          </p>
        </header>

        <section className="rounded-[22px] border border-blue-400/30 bg-gradient-to-br from-blue-900/30 to-slate-950/90 p-5 shadow-2xl shadow-black/30 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <PlayerCard
              label="⚪ WHITE"
              username={game.whitePlayer.username}
              active={playerColor === "w"}
            />

            <PlayerCard
              label="⚫ BLACK"
              username={game.blackPlayer.username}
              active={playerColor === "b"}
            />
          </div>

          <OnlineGameClient
            gameId={game.id}
            playerColor={playerColor}
            timeControlLabel={formatTimeControl()}
            category={game.timeControl}
            rated={game.rated}
            initialStatus={game.status}
            whitePlayer={game.whitePlayer}
            blackPlayer={game.blackPlayer}
          />
        </section>

        <Link
          href="/play/online"
          className="mt-5 block rounded-xl border border-slate-700 bg-slate-800/90 px-5 py-3.5 text-center font-bold text-slate-200 transition hover:bg-slate-700"
        >
          ← Back to Online Arena
        </Link>
      </div>
    </main>
  );
}

type PlayerCardProps = {
  label: string;
  username: string;
  active: boolean;
};

function PlayerCard({
  label,
  username,
  active,
}: PlayerCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        active
          ? "border-yellow-400/50 bg-yellow-400/10"
          : "border-slate-700 bg-slate-900/60"
      }`}
    >
      <div className="text-xs font-bold tracking-widest text-slate-400">
        {label}
      </div>

      <div className="mt-2 text-xl font-black text-white">
        {username}
      </div>

      {active && (
        <div className="mt-2 text-xs font-bold uppercase tracking-wider text-yellow-400">
          You
        </div>
      )}
    </div>
  );
}