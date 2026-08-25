import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import LogoutButton from "@/components/LogoutButton";
import { prisma } from "@/lib/prisma";

type GameResult = "WHITE_WIN" | "BLACK_WIN" | "DRAW" | null;
type GameEndReason = "CHECKMATE" | "DRAW" | "RESIGNATION" | "TIMEOUT" | null;

function getResultLabel(result: GameResult, isWhite: boolean) {
  if (result === null) {
    return {
      label: "Завършена",
      className: "text-slate-300",
    };
  }

  if (result === "DRAW") {
    return {
      label: "Реми",
      className: "text-sky-300",
    };
  }

  const didWin =
    (result === "WHITE_WIN" && isWhite) ||
    (result === "BLACK_WIN" && !isWhite);

  if (didWin) {
    return {
      label: "Победа",
      className: "text-emerald-400",
    };
  }

  return {
    label: "Загуба",
    className: "text-rose-400",
  };
}

function getEndReasonLabel(endReason: GameEndReason) {
  switch (endReason) {
    case "CHECKMATE":
      return "Мат";
    case "RESIGNATION":
      return "Предаване";
    case "TIMEOUT":
      return "Изтекло време";
    case "DRAW":
      return "Реми";
    default:
      return "Завършена";
  }
}

function formatTimeControl(initialTimeSeconds: number, incrementSeconds: number) {
  const initialTime =
    initialTimeSeconds >= 60 && initialTimeSeconds % 60 === 0
      ? String(initialTimeSeconds / 60)
      : `${initialTimeSeconds}s`;

  return `${initialTime}+${incrementSeconds}`;
}

function formatRatingDelta(before: number | null, after: number | null) {
  if (before === null || after === null) {
    return null;
  }

  const difference = Math.round(after - before);

  if (difference > 0) {
    return `+${difference}`;
  }

  return String(difference);
}

function getRatingDeltaClassName(delta: string | null) {
  if (!delta || delta === "0") {
    return "text-slate-300";
  }

  return delta.startsWith("+") ? "text-emerald-400" : "text-rose-400";
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      username: true,
      rating: true,
      wins: true,
      losses: true,
      draws: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const recentGames = await prisma.game.findMany({
    where: {
      status: "FINISHED",
      OR: [{ whitePlayerId: user.id }, { blackPlayerId: user.id }],
    },
    orderBy: [{ endedAt: "desc" }, { startedAt: "desc" }],
    take: 10,
    select: {
      id: true,
      whitePlayerId: true,
      blackPlayerId: true,
      result: true,
      endReason: true,
      timeControl: true,
      rated: true,
      initialTimeSeconds: true,
      incrementSeconds: true,
      whiteRatingBefore: true,
      whiteRatingAfter: true,
      blackRatingBefore: true,
      blackRatingAfter: true,
      startedAt: true,
      endedAt: true,
      whitePlayer: {
        select: {
          username: true,
        },
      },
      blackPlayer: {
        select: {
          username: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-900 px-4 py-12 text-white">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-5xl font-bold text-yellow-400">
            👑 Chess Arena
          </h1>

          <h2 className="text-3xl font-bold">
            Добре дошъл, {user.username}!
          </h2>
        </div>

        <section className="mx-auto mb-10 w-full max-w-[420px] space-y-4 rounded-xl bg-slate-800 p-8 shadow-xl">
          <p>
            <strong>👤 Потребител:</strong> {user.username}
          </p>

          <p>
            <strong>⭐ Рейтинг:</strong> {user.rating}
          </p>

          <p>
            <strong>🏆 Победи:</strong> {user.wins}
          </p>

          <p>
            <strong>❌ Загуби:</strong> {user.losses}
          </p>

          <p>
            <strong>🤝 Ремита:</strong> {user.draws}
          </p>

          <Link
            href="/play"
            className="block w-full rounded bg-yellow-400 py-3 text-center font-bold text-black hover:bg-yellow-500"
          >
            ▶ Play Chess
          </Link>

          <LogoutButton />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
          <div className="border-b border-slate-700 px-6 py-5">
            <h3 className="text-2xl font-bold text-yellow-400">
              ♟️ Последни онлайн партии
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Последните 10 завършени партии
            </p>
          </div>

          {recentGames.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400">
              Все още нямаш завършени онлайн партии.
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {recentGames.map((game) => {
                const isWhite = game.whitePlayerId === user.id;
                const opponent = isWhite
                  ? game.blackPlayer.username
                  : game.whitePlayer.username;
                const result = getResultLabel(game.result, isWhite);
                const ratingDelta = game.rated
                  ? formatRatingDelta(
                      isWhite
                        ? game.whiteRatingBefore
                        : game.blackRatingBefore,
                      isWhite ? game.whiteRatingAfter : game.blackRatingAfter,
                    )
                  : null;
                const finishedAt = game.endedAt ?? game.startedAt;

                return (
                  <Link
                    key={game.id}
                    href={`/play/online/game/${game.id}`}
                    className="grid gap-4 px-6 py-5 transition hover:bg-slate-700/40 sm:grid-cols-[1.3fr_0.8fr_0.8fr_auto] sm:items-center"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Противник
                      </p>
                      <p className="mt-1 text-lg font-bold">{opponent}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Играл си с {isWhite ? "белите" : "черните"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Резултат
                      </p>
                      <p className={`mt-1 text-lg font-bold ${result.className}`}>
                        {result.label}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {getEndReasonLabel(game.endReason)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Партия
                      </p>
                      <p className="mt-1 font-bold">
                        {formatTimeControl(
                          game.initialTimeSeconds,
                          game.incrementSeconds,
                        )}{" "}
                        · {game.timeControl}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {game.rated ? "Рейтингова" : "Безрейтингова"}
                        {game.rated && ratingDelta ? (
                          <span
                            className={`ml-2 font-bold ${getRatingDeltaClassName(
                              ratingDelta,
                            )}`}
                          >
                            {ratingDelta}
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-sm text-slate-400">
                        {new Intl.DateTimeFormat("bg-BG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(finishedAt)}
                      </p>
                      <p className="mt-2 font-bold text-yellow-400">
                        Виж партията →
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}