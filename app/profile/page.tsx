import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import LogoutButton from "@/components/LogoutButton";
import { prisma } from "@/lib/prisma";

type GameResult = "WHITE_WIN" | "BLACK_WIN" | "DRAW" | null;
type GameEndReason = "CHECKMATE" | "DRAW" | "RESIGNATION" | "TIMEOUT" | null;

function resultLabel(result: GameResult, isWhite: boolean) {
  if (result === "DRAW") return { text: "Draw", color: "text-sky-300" };
  const won =
    (result === "WHITE_WIN" && isWhite) ||
    (result === "BLACK_WIN" && !isWhite);
  if (result === null) return { text: "Finished", color: "text-slate-300" };
  return won
    ? { text: "Victory", color: "text-emerald-400" }
    : { text: "Defeat", color: "text-rose-400" };
}

function endReasonLabel(reason: GameEndReason) {
  if (reason === "CHECKMATE") return "Checkmate";
  if (reason === "RESIGNATION") return "Resignation";
  if (reason === "TIMEOUT") return "Timeout";
  if (reason === "DRAW") return "Draw";
  return "Finished";
}

function timeControl(initial: number, increment: number) {
  const start =
    initial >= 60 && initial % 60 === 0
      ? String(initial / 60)
      : `${initial}s`;
  return `${start}+${increment}`;
}

function ratingDelta(before: number | null, after: number | null) {
  if (before === null || after === null) return null;
  const delta = Math.round(after - before);
  return delta > 0 ? `+${delta}` : String(delta);
}

function SidebarIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-[clamp(1.7rem,3.7vh,2rem)] w-[clamp(1.7rem,3.7vh,2rem)] shrink-0 items-center justify-center rounded-md border border-slate-700/70 bg-slate-900/80 text-sm text-slate-300">
      {children}
    </span>
  );
}

const GAMES_PER_PAGE = 20;

const navItems = [
  ["Home", "⌂", "/dashboard"],
  ["Play Online", "ϟ", "/play/online"],
  ["Play Computer", "▣", "/play/computer"],
  ["Tournaments", "♕", "/tournaments"],
  ["Puzzles", "✚", "/puzzles"],
  ["Learn", "▱", "/learn"],
  ["Arenas", "♛", "/arenas"],
  ["Community", "♙", "/community"],
  ["Leaderboard", "▥", "/leaderboard"],
  ["Profile", "♙", "/profile"],
  ["Shop", "▱", "/shop"],
] as const;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { tab, page } = await searchParams;
  const activeTab = tab === "games" ? "games" : "overview";
  const requestedPage = Number.parseInt(page ?? "1", 10);
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const session = await auth();

  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      username: true,
      bulletRating: true,
      blitzRating: true,
      rapidRating: true,
      wins: true,
      losses: true,
      draws: true,
      activeArena: true,
    },
  });

  if (!user) redirect("/login");

  const gamesWhere = {
    status: "FINISHED" as const,
    OR: [{ whitePlayerId: user.id }, { blackPlayerId: user.id }],
  };

  const totalCompletedGames =
    activeTab === "games"
      ? await prisma.game.count({ where: gamesWhere })
      : 0;

  const totalPages =
    activeTab === "games"
      ? Math.max(1, Math.ceil(totalCompletedGames / GAMES_PER_PAGE))
      : 1;
  const safePage = Math.min(currentPage, totalPages);

  const recentGames = await prisma.game.findMany({
    where: gamesWhere,
    orderBy: [{ endedAt: "desc" }, { startedAt: "desc" }],
    skip: activeTab === "games" ? (safePage - 1) * GAMES_PER_PAGE : 0,
    take: activeTab === "games" ? GAMES_PER_PAGE : 5,
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
      whitePlayer: { select: { username: true } },
      blackPlayer: { select: { username: true } },
    },
  });

  const onlineStats = await prisma.game.findMany({
    where: gamesWhere,
    select: {
      whitePlayerId: true,
      result: true,
    },
  });

  let onlineWins = 0;
  let onlineDraws = 0;
  let onlineLosses = 0;

  for (const game of onlineStats) {
    const isWhite = game.whitePlayerId === user.id;

    if (game.result === "DRAW" || game.result === null) {
      onlineDraws += 1;
      continue;
    }

    const won =
      (game.result === "WHITE_WIN" && isWhite) ||
      (game.result === "BLACK_WIN" && !isWhite);

    if (won) onlineWins += 1;
    else onlineLosses += 1;
  }

  const totalGames = onlineWins + onlineDraws + onlineLosses;
  const winRate =
    totalGames > 0 ? Math.round((onlineWins / totalGames) * 100) : 0;

  const arenaNames: Record<string, string> = {
    classic: "Classic Chess Arena",
    "roman-colosseum": "Roman Colosseum",
    "frozen-kingdom": "Frozen Kingdom",
    "inferno-arena": "Inferno Arena",
    "cosmic-arena": "Cosmic Arena",
    "dragon-temple": "Dragon Temple",
    "desert-oasis": "Desert Oasis",
  };
  const activeArenaName =
    arenaNames[user.activeArena] ?? "Classic Chess Arena";

  return (
    <main className="min-h-screen bg-[#070c13] text-white">
      <div className="flex min-h-screen">
        <aside className="chess-arena-sidebar sticky top-0 hidden h-screen w-[224px] shrink-0 overflow-y-auto overflow-x-hidden border-r border-slate-800/90 bg-[#050a10]/98 xl:flex xl:flex-col">
          <div className="shrink-0 border-b border-slate-800/80 px-4 py-2">
            <Link href="/dashboard" className="flex flex-col items-center text-center">
              <Image
                src="/images/chess-arena-logo.png"
                alt="Chess Arena"
                width={112}
                height={112}
                priority
                className="h-[clamp(72px,12vh,104px)] w-[clamp(72px,12vh,104px)] rounded-[1.45rem] object-cover shadow-[0_0_30px_rgba(251,191,36,0.12)]"
              />
              <p className="mt-1 text-lg font-black">
                Chess <span className="text-amber-400">Arena</span>
              </p>
            </Link>
          </div>

          <nav className="reference-sidebar-nav min-h-0 flex-1 px-3">
            {navItems.map(([label, icon, href]) => (
              <Link
                key={label}
                href={href}
                className={`reference-nav-item ${
                  label === "Profile" ? "reference-nav-active" : ""
                }`}
              >
                <SidebarIcon>{icon}</SidebarIcon>
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="sidebar-footer shrink-0 border-t border-slate-800/80">
            <Link
              href="/gold-pass"
              className="block rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2"
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                Gold Pass
              </span>
              <span className="text-sm font-bold text-slate-200">
                Premium rewards
              </span>
            </Link>

            <div className="flex items-center gap-3 rounded-xl bg-slate-900/80 px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 font-black text-amber-300">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{user.username}</p>
                <p className="text-xs text-slate-500">
                  Rapid {Math.round(user.rapidRating)}
                </p>
              </div>
            </div>

            <LogoutButton />
          </div>

          <style>{`
            .chess-arena-sidebar {
              scrollbar-width: thin;
              scrollbar-color: rgba(245,158,11,.42) transparent;
            }
            .chess-arena-sidebar::-webkit-scrollbar {
              width: 5px;
            }
            .chess-arena-sidebar::-webkit-scrollbar-track {
              background: transparent;
            }
            .chess-arena-sidebar::-webkit-scrollbar-thumb {
              background: transparent;
              border-radius: 999px;
            }
            .chess-arena-sidebar:hover {
              scrollbar-color: rgba(245,158,11,.42) transparent;
            }
            .chess-arena-sidebar:hover::-webkit-scrollbar-thumb {
              background: rgba(245,158,11,.58);
            }

            .chess-arena-sidebar {
              --sidebar-gap: clamp(2px, 0.32vh, 5px);
              --nav-font: clamp(0.74rem, 1.55vh, 0.94rem);
              --nav-icon: clamp(1.55rem, 3.35vh, 2rem);
              scrollbar-width: thin;
              scrollbar-color: transparent transparent;
            }
            .reference-sidebar-nav {
              display:grid;
              flex:none;
              min-height:auto;
              grid-template-rows:repeat(11,clamp(34px,5vh,42px));
              gap:var(--sidebar-gap);
              padding:.35rem 0 .75rem;
            }
            .reference-nav-item {
              display:flex; min-height:0; align-items:center;
              gap:clamp(.48rem,.75vw,.72rem); border:1px solid transparent;
              border-radius:clamp(.45rem,.9vh,.65rem);
              padding:0 clamp(.48rem,.7vw,.72rem);
              color:rgb(203 213 225); font-size:var(--nav-font);
              font-weight:600; white-space:nowrap;
            }
            .reference-nav-item:hover { background:rgba(30,41,59,.58); color:white; }
            .reference-nav-active {
              border-color:rgba(251,191,36,.48);
              background:linear-gradient(90deg,rgba(245,158,11,.16),rgba(245,158,11,.07));
              color:rgb(252 211 77); box-shadow:inset 3px 0 0 rgb(251 191 36);
            }
            .reference-nav-item > span:first-child {
              width:var(--nav-icon); height:var(--nav-icon); flex:0 0 var(--nav-icon);
            }
            .sidebar-footer {
              display:flex; flex-direction:column; gap:clamp(.3rem,.65vh,.55rem);
              flex:0 0 auto;
              padding:clamp(.35rem,.8vh,.65rem);
            }
            
          `}</style>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col px-3 pb-0 sm:px-5 xl:px-7">
            <section className="relative mt-3 overflow-hidden rounded-2xl border border-slate-800/90 bg-[#050a10]">
              {user.activeArena === "roman-colosseum" ? (
                <>
                  <Image
                    src="/arenas/roman-colosseum/roman-colosseum.png"
                    alt=""
                    fill
                    priority
                    sizes="(min-width:1280px) calc(100vw - 224px), 100vw"
                    className="object-cover object-center opacity-45"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#050a10] via-[#050a10]/90 to-[#050a10]/30" />
                </>
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(245,158,11,0.15),transparent_34%),linear-gradient(135deg,#050a10,#0b1220_65%,#111827)]" />
              )}

              <div className="relative z-10 flex min-h-[260px] flex-col justify-end gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex min-w-0 items-end gap-5">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-amber-300/35 bg-[#080d15]/90 text-4xl font-black text-amber-300 shadow-2xl sm:h-28 sm:w-28">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 pb-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">
                      Chess Arena Player
                    </p>
                    <h1 className="mt-2 truncate text-3xl font-black sm:text-4xl">
                      {user.username}
                    </h1>
                    <p className="mt-3 text-sm text-slate-300">
                      Rapid{" "}
                      <strong className="text-amber-300">
                        {Math.round(user.rapidRating)}
                      </strong>
                      <span className="mx-3 text-slate-600">•</span>
                      {totalGames} games played
                    </p>
                  </div>
                </div>

                <Link
                  href="/arenas"
                  className="min-w-[220px] rounded-xl border border-amber-300/25 bg-black/45 px-5 py-4 backdrop-blur-md transition hover:border-amber-300/50"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Active Arena
                  </p>
                  <p className="mt-1 font-black text-amber-300">
                    {activeArenaName} →
                  </p>
                </Link>
              </div>
            </section>

            <div className="mt-3 flex gap-1 overflow-x-auto border-b border-slate-800">
              <Link
                href="/profile"
                className={`px-5 py-3 text-sm font-black transition ${
                  activeTab === "overview"
                    ? "border-b-2 border-amber-400 text-amber-300"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Overview
              </Link>
              <Link
                href="/profile?tab=games"
                className={`px-5 py-3 text-sm font-black transition ${
                  activeTab === "games"
                    ? "border-b-2 border-amber-400 text-amber-300"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Games
              </Link>
              {["Statistics", "Friends", "Achievements"].map((tabName) => (
                <span
                  key={tabName}
                  className="px-5 py-3 text-sm font-black text-slate-500"
                >
                  {tabName}
                </span>
              ))}
            </div>

            {activeTab === "overview" ? (
              <>
            <section className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_1.85fr]">
              <div className="rounded-2xl border border-slate-800 bg-[#0a1019] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">
                  Performance
                </p>
                <h2 className="mt-1 text-xl font-black">Player Overview</h2>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                    <p className="text-xs uppercase text-slate-500">Games</p>
                    <p className="mt-1 text-2xl font-black">{totalGames}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                    <p className="text-xs uppercase text-slate-500">Win Rate</p>
                    <p className="mt-1 text-2xl font-black text-amber-300">{winRate}%</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-emerald-400/5 p-3">
                    <p className="text-xl font-black text-emerald-400">{onlineWins}</p>
                    <p className="text-[10px] uppercase text-slate-500">Wins</p>
                  </div>
                  <div className="rounded-xl bg-sky-400/5 p-3">
                    <p className="text-xl font-black text-sky-300">{onlineDraws}</p>
                    <p className="text-[10px] uppercase text-slate-500">Draws</p>
                  </div>
                  <div className="rounded-xl bg-rose-400/5 p-3">
                    <p className="text-xl font-black text-rose-400">{onlineLosses}</p>
                    <p className="text-[10px] uppercase text-slate-500">Losses</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Bullet", Math.round(user.bulletRating), "⚡"],
                  ["Blitz", Math.round(user.blitzRating), "🔥"],
                  ["Rapid", Math.round(user.rapidRating), "⏱"],
                ].map(([name, value, icon]) => (
                  <div
                    key={String(name)}
                    className={`rounded-2xl border p-5 ${
                      name === "Blitz"
                        ? "border-amber-400/30 bg-gradient-to-b from-amber-400/10 to-[#0a1019]"
                        : "border-slate-800 bg-[#0a1019]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                        {name}
                      </p>
                      <span>{icon}</span>
                    </div>
                    <p className="mt-5 text-4xl font-black">{value}</p>
                    <p className="mt-2 text-xs text-slate-500">Rated chess</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-[#0a1019]">
              <div className="border-b border-slate-800 px-6 py-5">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">
                  Match Archive
                </p>
                <h2 className="mt-1 text-xl font-black">Recent Games</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Your last 5 completed online games
                </p>
              </div>

              {recentGames.length === 0 ? (
                <div className="px-6 py-12 text-center text-slate-400">
                  You haven&apos;t completed any online games yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {recentGames.map((game) => {
                    const isWhite = game.whitePlayerId === user.id;
                    const opponent = isWhite
                      ? game.blackPlayer.username
                      : game.whitePlayer.username;
                    const result = resultLabel(game.result, isWhite);
                    const delta = game.rated
                      ? ratingDelta(
                          isWhite ? game.whiteRatingBefore : game.blackRatingBefore,
                          isWhite ? game.whiteRatingAfter : game.blackRatingAfter,
                        )
                      : null;
                    const deltaColor =
                      delta?.startsWith("+")
                        ? "text-emerald-400"
                        : delta && delta !== "0"
                          ? "text-rose-400"
                          : "text-slate-300";
                    const finishedAt = game.endedAt ?? game.startedAt;

                    return (
                      <Link
                        key={game.id}
                        href={`/play/online/game/${game.id}`}
                        className="grid gap-4 px-6 py-4 transition hover:bg-slate-800/45 lg:grid-cols-[1.3fr_.8fr_.9fr_auto] lg:items-center"
                      >
                        <div>
                          <p className="text-[10px] uppercase text-slate-500">Opponent</p>
                          <p className="mt-1 font-black">{opponent}</p>
                          <p className="text-xs text-slate-500">
                            Played as {isWhite ? "White" : "Black"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-slate-500">Result</p>
                          <p className={`mt-1 font-black ${result.color}`}>{result.text}</p>
                          <p className="text-xs text-slate-500">{endReasonLabel(game.endReason)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-slate-500">Game</p>
                          <p className="mt-1 font-black">
                            {timeControl(game.initialTimeSeconds, game.incrementSeconds)} · {game.timeControl}
                          </p>
                          <p className="text-xs text-slate-500">
                            {game.rated ? "Rated" : "Casual"}
                            {game.rated && delta ? (
                              <span className={`ml-2 font-black ${deltaColor}`}>{delta}</span>
                            ) : null}
                          </p>
                        </div>
                        <div className="lg:text-right">
                          <p className="text-xs text-slate-500">
                            {new Intl.DateTimeFormat("en-GB", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(finishedAt)}
                          </p>
                          <p className="mt-2 text-sm font-black text-amber-300">View Game →</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-slate-800 px-6 py-4 text-center">
                <Link
                  href="/profile?tab=games"
                  className="inline-flex items-center gap-2 text-sm font-black text-amber-300 transition hover:text-amber-200"
                >
                  View All Games <span>→</span>
                </Link>
              </div>
            </section>

              </>
            ) : (
              <section className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-[#0a1019]">
                <div className="flex flex-col gap-3 border-b border-slate-800 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">
                      Match Archive
                    </p>
                    <h2 className="mt-1 text-2xl font-black">Games</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Your completed online games
                    </p>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    {totalCompletedGames} {totalCompletedGames === 1 ? "game" : "games"}
                  </p>
                </div>

                {recentGames.length === 0 ? (
                  <div className="px-6 py-14 text-center text-slate-400">
                    You haven&apos;t completed any online games yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {recentGames.map((game) => {
                      const isWhite = game.whitePlayerId === user.id;
                      const opponent = isWhite
                        ? game.blackPlayer.username
                        : game.whitePlayer.username;
                      const result = resultLabel(game.result, isWhite);
                      const delta = game.rated
                        ? ratingDelta(
                            isWhite ? game.whiteRatingBefore : game.blackRatingBefore,
                            isWhite ? game.whiteRatingAfter : game.blackRatingAfter,
                          )
                        : null;
                      const deltaColor =
                        delta?.startsWith("+")
                          ? "text-emerald-400"
                          : delta && delta !== "0"
                            ? "text-rose-400"
                            : "text-slate-300";
                      const finishedAt = game.endedAt ?? game.startedAt;

                      return (
                        <Link
                          key={game.id}
                          href={`/play/online/game/${game.id}`}
                          className="grid gap-4 px-6 py-4 transition hover:bg-slate-800/45 lg:grid-cols-[1.3fr_.8fr_.9fr_auto] lg:items-center"
                        >
                          <div>
                            <p className="text-[10px] uppercase text-slate-500">Opponent</p>
                            <p className="mt-1 font-black">{opponent}</p>
                            <p className="text-xs text-slate-500">
                              Played as {isWhite ? "White" : "Black"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-slate-500">Result</p>
                            <p className={`mt-1 font-black ${result.color}`}>{result.text}</p>
                            <p className="text-xs text-slate-500">
                              {endReasonLabel(game.endReason)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-slate-500">Game</p>
                            <p className="mt-1 font-black">
                              {timeControl(game.initialTimeSeconds, game.incrementSeconds)} ·{" "}
                              {game.timeControl}
                            </p>
                            <p className="text-xs text-slate-500">
                              {game.rated ? "Rated" : "Casual"}
                              {game.rated && delta ? (
                                <span className={`ml-2 font-black ${deltaColor}`}>{delta}</span>
                              ) : null}
                            </p>
                          </div>
                          <div className="lg:text-right">
                            <p className="text-xs text-slate-500">
                              {new Intl.DateTimeFormat("en-GB", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(finishedAt)}
                            </p>
                            <p className="mt-2 text-sm font-black text-amber-300">
                              View Game →
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {totalCompletedGames > 0 && totalPages > 1 ? (
                  <div className="flex flex-col gap-3 border-t border-slate-800 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    {safePage > 1 ? (
                      <Link
                        href={`/profile?tab=games&page=${safePage - 1}`}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-black text-slate-200 transition hover:border-amber-400/40 hover:text-amber-300"
                      >
                        ← Previous
                      </Link>
                    ) : (
                      <span className="inline-flex cursor-not-allowed items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-2 text-sm font-black text-slate-600">
                        ← Previous
                      </span>
                    )}

                    <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Page <span className="text-slate-200">{safePage}</span> of{" "}
                      <span className="text-slate-200">{totalPages}</span>
                    </p>

                    {safePage < totalPages ? (
                      <Link
                        href={`/profile?tab=games&page=${safePage + 1}`}
                        className="inline-flex items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-black text-amber-300 transition hover:border-amber-300/55 hover:bg-amber-400/15"
                      >
                        Next →
                      </Link>
                    ) : (
                      <span className="inline-flex cursor-not-allowed items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-2 text-sm font-black text-slate-600">
                        Next →
                      </span>
                    )}
                  </div>
                ) : null}
              </section>
            )}

            <section
              className={`relative mt-5 flex min-h-[112px] items-center overflow-hidden rounded-t-2xl border border-slate-800 bg-gradient-to-r from-[#090e16] via-[#111827] to-[#080d16] px-7 py-6 ${
                activeTab === "overview" ? "flex-1" : ""
              }`}
            >
              <div className="absolute right-[15%] top-1/2 -translate-y-1/2 text-[110px] leading-none text-amber-400/10">♚</div>
              <p className="relative z-10 font-serif text-sm uppercase leading-6 tracking-[0.25em] text-slate-200">
                Legends aren&apos;t born.<br />
                They are forged in the Arena.
              </p>
              <div className="absolute right-7 top-1/2 -translate-y-1/2 text-right">
                <p className="font-serif text-xl tracking-[0.18em]">CHESS</p>
                <p className="font-serif text-xl tracking-[0.18em] text-amber-400">ARENA</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
