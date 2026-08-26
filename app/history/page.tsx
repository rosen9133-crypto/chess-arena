import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type GameResult = "WHITE_WIN" | "BLACK_WIN" | "DRAW" | null;
type GameEndReason =
  | "CHECKMATE"
  | "DRAW"
  | "RESIGNATION"
  | "TIMEOUT"
  | null;

type GameTypeFilter = "all" | "rated" | "casual";
type TimeControlFilter = "all" | "bullet" | "blitz" | "rapid";
type ResultFilter = "all" | "wins" | "losses" | "draws";

type SearchParams = Promise<{
  type?: string;
  time?: string;
  result?: string;
}>;

function getResultLabel(result: GameResult, isWhite: boolean) {
  if (result === null) {
    return {
      label: "Finished",
      className: "text-slate-300",
    };
  }

  if (result === "DRAW") {
    return {
      label: "Draw",
      className: "text-sky-300",
    };
  }

  const didWin =
    (result === "WHITE_WIN" && isWhite) ||
    (result === "BLACK_WIN" && !isWhite);

  if (didWin) {
    return {
      label: "Victory",
      className: "text-emerald-400",
    };
  }

  return {
    label: "Defeat",
    className: "text-rose-400",
  };
}

function getEndReasonLabel(endReason: GameEndReason) {
  switch (endReason) {
    case "CHECKMATE":
      return "Checkmate";
    case "RESIGNATION":
      return "Resignation";
    case "TIMEOUT":
      return "Timeout";
    case "DRAW":
      return "Draw";
    default:
      return "Finished";
  }
}

function formatTimeControl(
  initialTimeSeconds: number,
  incrementSeconds: number,
) {
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

  return delta.startsWith("+")
    ? "text-emerald-400"
    : "text-rose-400";
}

function normalizeGameType(value?: string): GameTypeFilter {
  if (value === "rated" || value === "casual") {
    return value;
  }

  return "all";
}

function normalizeTimeControl(value?: string): TimeControlFilter {
  if (value === "bullet" || value === "blitz" || value === "rapid") {
    return value;
  }

  return "all";
}

function normalizeResult(value?: string): ResultFilter {
  if (
    value === "wins" ||
    value === "losses" ||
    value === "draws"
  ) {
    return value;
  }

  return "all";
}

function buildFilterHref(
  gameType: GameTypeFilter,
  timeControl: TimeControlFilter,
  result: ResultFilter,
) {
  const params = new URLSearchParams();

  if (gameType !== "all") {
    params.set("type", gameType);
  }

  if (timeControl !== "all") {
    params.set("time", timeControl);
  }

  if (result !== "all") {
    params.set("result", result);
  }

  const query = params.toString();

  return query ? `/history?${query}` : "/history";
}

function filterButtonClassName(active: boolean) {
  return active
    ? "rounded-lg bg-yellow-400 px-4 py-2 text-sm font-black text-slate-950 shadow-sm transition"
    : "rounded-lg px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white";
}

export default async function GameHistoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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
    },
  });

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;

  const selectedGameType = normalizeGameType(params.type);
  const selectedTimeControl = normalizeTimeControl(params.time);
  const selectedResult = normalizeResult(params.result);

  const games = await prisma.game.findMany({
    where: {
      status: "FINISHED",
      OR: [
        { whitePlayerId: user.id },
        { blackPlayerId: user.id },
      ],
    },
    orderBy: [
      { endedAt: "desc" },
      { startedAt: "desc" },
    ],
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

  const filteredGames = games.filter((game) => {
    const isWhite = game.whitePlayerId === user.id;

    const didWin =
      (game.result === "WHITE_WIN" && isWhite) ||
      (game.result === "BLACK_WIN" && !isWhite);

    const didLose =
      (game.result === "WHITE_WIN" && !isWhite) ||
      (game.result === "BLACK_WIN" && isWhite);

    const isDraw = game.result === "DRAW";

    const matchesGameType =
      selectedGameType === "all" ||
      (selectedGameType === "rated" && game.rated) ||
      (selectedGameType === "casual" && !game.rated);

    const matchesTimeControl =
      selectedTimeControl === "all" ||
      game.timeControl.toLowerCase() === selectedTimeControl;

    const matchesResult =
      selectedResult === "all" ||
      (selectedResult === "wins" && didWin) ||
      (selectedResult === "losses" && didLose) ||
      (selectedResult === "draws" && isDraw);

    return (
      matchesGameType &&
      matchesTimeControl &&
      matchesResult
    );
  });

  const makeHref = ({
    gameType = selectedGameType,
    timeControl = selectedTimeControl,
    result = selectedResult,
  }: {
    gameType?: GameTypeFilter;
    timeControl?: TimeControlFilter;
    result?: ResultFilter;
  }) => buildFilterHref(gameType, timeControl, result);

  return (
    <main className="min-h-screen bg-slate-900 px-4 py-12 text-white">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-yellow-400">
              Chess Arena
            </p>

            <h1 className="mt-2 text-4xl font-black">
              ♟️ Game History
            </h1>

            <p className="mt-2 text-slate-400">
              All completed online games for {user.username}
            </p>
          </div>

          <Link
            href="/dashboard"
            className="w-fit rounded-xl border border-slate-600 bg-slate-800 px-5 py-3 font-bold text-slate-200 transition hover:border-slate-500 hover:bg-slate-700"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-xl">
          <div className="grid gap-5 lg:grid-cols-3">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Game Type
              </p>

              <div className="flex flex-wrap gap-1 rounded-xl bg-slate-900/70 p-1">
                <Link
                  href={makeHref({ gameType: "all" })}
                  className={filterButtonClassName(
                    selectedGameType === "all",
                  )}
                >
                  All
                </Link>

                <Link
                  href={makeHref({ gameType: "rated" })}
                  className={filterButtonClassName(
                    selectedGameType === "rated",
                  )}
                >
                  Rated
                </Link>

                <Link
                  href={makeHref({ gameType: "casual" })}
                  className={filterButtonClassName(
                    selectedGameType === "casual",
                  )}
                >
                  Casual
                </Link>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Time Control
              </p>

              <div className="flex flex-wrap gap-1 rounded-xl bg-slate-900/70 p-1">
                <Link
                  href={makeHref({ timeControl: "all" })}
                  className={filterButtonClassName(
                    selectedTimeControl === "all",
                  )}
                >
                  All
                </Link>

                <Link
                  href={makeHref({ timeControl: "bullet" })}
                  className={filterButtonClassName(
                    selectedTimeControl === "bullet",
                  )}
                >
                  Bullet
                </Link>

                <Link
                  href={makeHref({ timeControl: "blitz" })}
                  className={filterButtonClassName(
                    selectedTimeControl === "blitz",
                  )}
                >
                  Blitz
                </Link>

                <Link
                  href={makeHref({ timeControl: "rapid" })}
                  className={filterButtonClassName(
                    selectedTimeControl === "rapid",
                  )}
                >
                  Rapid
                </Link>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Result
              </p>

              <div className="flex flex-wrap gap-1 rounded-xl bg-slate-900/70 p-1">
                <Link
                  href={makeHref({ result: "all" })}
                  className={filterButtonClassName(
                    selectedResult === "all",
                  )}
                >
                  All
                </Link>

                <Link
                  href={makeHref({ result: "wins" })}
                  className={filterButtonClassName(
                    selectedResult === "wins",
                  )}
                >
                  Wins
                </Link>

                <Link
                  href={makeHref({ result: "losses" })}
                  className={filterButtonClassName(
                    selectedResult === "losses",
                  )}
                >
                  Losses
                </Link>

                <Link
                  href={makeHref({ result: "draws" })}
                  className={filterButtonClassName(
                    selectedResult === "draws",
                  )}
                >
                  Draws
                </Link>
              </div>
            </div>
          </div>

          {(selectedGameType !== "all" ||
            selectedTimeControl !== "all" ||
            selectedResult !== "all") && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 pt-4">
              <p className="text-sm text-slate-400">
                Showing{" "}
                <span className="font-bold text-white">
                  {filteredGames.length}
                </span>{" "}
                {filteredGames.length === 1 ? "game" : "games"}
              </p>

              <Link
                href="/history"
                className="text-sm font-bold text-yellow-400 transition hover:text-yellow-300"
              >
                Clear Filters
              </Link>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
          {filteredGames.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-lg font-bold text-slate-300">
                No games match these filters.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Try changing or clearing the selected filters.
              </p>

              <Link
                href="/history"
                className="mt-5 inline-block rounded-xl bg-yellow-400 px-5 py-3 font-black text-slate-950 transition hover:bg-yellow-300"
              >
                Clear Filters
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {filteredGames.map((game) => {
                const isWhite = game.whitePlayerId === user.id;

                const opponent = isWhite
                  ? game.blackPlayer.username
                  : game.whitePlayer.username;

                const result = getResultLabel(
                  game.result,
                  isWhite,
                );

                const ratingDelta = game.rated
                  ? formatRatingDelta(
                      isWhite
                        ? game.whiteRatingBefore
                        : game.blackRatingBefore,
                      isWhite
                        ? game.whiteRatingAfter
                        : game.blackRatingAfter,
                    )
                  : null;

                const finishedAt =
                  game.endedAt ?? game.startedAt;

                return (
                  <Link
                    key={game.id}
                    href={`/play/online/game/${game.id}`}
                    className="grid gap-4 px-6 py-5 transition hover:bg-slate-700/40 sm:grid-cols-[1.3fr_0.8fr_0.8fr_auto] sm:items-center"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Opponent
                      </p>

                      <p className="mt-1 text-lg font-bold">
                        {opponent}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        Played as {isWhite ? "White" : "Black"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Result
                      </p>

                      <p
                        className={`mt-1 text-lg font-bold ${result.className}`}
                      >
                        {result.label}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {getEndReasonLabel(game.endReason)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Game
                      </p>

                      <p className="mt-1 font-bold">
                        {formatTimeControl(
                          game.initialTimeSeconds,
                          game.incrementSeconds,
                        )}{" "}
                        · {game.timeControl}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {game.rated ? "Rated" : "Casual"}

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
                        {new Intl.DateTimeFormat("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(finishedAt)}
                      </p>

                      <p className="mt-2 font-bold text-yellow-400">
                        View Game →
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