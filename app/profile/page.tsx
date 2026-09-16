import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import LogoutButton from "@/components/LogoutButton";
import AddFriendButton from "@/components/AddFriendButton";
import AcceptFriendButton from "@/components/AcceptFriendButton";
import DeclineFriendButton from "@/components/DeclineFriendButton";
import RemoveFriendButton from "@/components/RemoveFriendButton";
import FriendsRealtimeSync from "@/components/FriendsRealtimeSync";
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
  searchParams: Promise<{ tab?: string; page?: string; q?: string }>;
}) {
  const { tab, page, q } = await searchParams;
  const activeTab =
    tab === "games" || tab === "statistics" || tab === "friends"
      ? tab
      : "overview";
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

  const friendSearchQuery = q?.trim() ?? "";
  const friendSearchResults =
    activeTab === "friends" && friendSearchQuery.length >= 2
      ? await prisma.user.findMany({
          where: {
            id: { not: user.id },
            username: {
              contains: friendSearchQuery,
              mode: "insensitive",
            },
          },
          orderBy: { username: "asc" },
          take: 10,
          select: {
            id: true,
            username: true,
            bulletRating: true,
            blitzRating: true,
            rapidRating: true,
          },
        })
      : [];

  const incomingFriendRequests =
    activeTab === "friends"
      ? await prisma.friendship.findMany({
          where: { addresseeId: user.id, status: "PENDING" },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            requester: {
              select: {
                id: true,
                username: true,
                bulletRating: true,
                blitzRating: true,
                rapidRating: true,
              },
            },
          },
        })
      : [];

  const outgoingFriendRequests =
    activeTab === "friends"
      ? await prisma.friendship.findMany({
          where: { requesterId: user.id, status: "PENDING" },
          select: {
            addresseeId: true,
          },
        })
      : [];

  const outgoingFriendRequestIds = new Set(
    outgoingFriendRequests.map((request) => request.addresseeId),
  );

  const acceptedFriendships =
    activeTab === "friends"
      ? await prisma.friendship.findMany({
          where: {
            status: "ACCEPTED",
            OR: [{ requesterId: user.id }, { addresseeId: user.id }],
          },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            requesterId: true,
            addresseeId: true,
            requester: {
              select: {
                id: true,
                username: true,
                bulletRating: true,
                blitzRating: true,
                rapidRating: true,
              },
            },
            addressee: {
              select: {
                id: true,
                username: true,
                bulletRating: true,
                blitzRating: true,
                rapidRating: true,
              },
            },
          },
        })
      : [];

  const friends = acceptedFriendships.map((friendship) => ({
    friendshipId: friendship.id,
    ...(friendship.requesterId === user.id
      ? friendship.addressee
      : friendship.requester),
  }));

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
    take:
      activeTab === "games"
        ? GAMES_PER_PAGE
        : activeTab === "statistics"
          ? 10
          : 5,
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
      timeControl: true,
      rated: true,
      whiteRatingBefore: true,
      whiteRatingAfter: true,
      blackRatingBefore: true,
      blackRatingAfter: true,
      endedAt: true,
      startedAt: true,
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

  const performanceByTimeControl = ["BULLET", "BLITZ", "RAPID"].map((control) => {
    let wins = 0;
    let draws = 0;
    let losses = 0;

    for (const game of onlineStats) {
      if (game.timeControl !== control) continue;

      const isWhite = game.whitePlayerId === user.id;

      if (game.result === "DRAW" || game.result === null) {
        draws += 1;
        continue;
      }

      const won =
        (game.result === "WHITE_WIN" && isWhite) ||
        (game.result === "BLACK_WIN" && !isWhite);

      if (won) wins += 1;
      else losses += 1;
    }

    const games = wins + draws + losses;
    const controlWinRate = games > 0 ? Math.round((wins / games) * 100) : 0;

    return {
      control,
      games,
      wins,
      draws,
      losses,
      winRate: controlWinRate,
    };
  });

  const performanceByColor = [
    { color: "White", isWhite: true },
    { color: "Black", isWhite: false },
  ].map(({ color, isWhite }) => {
    let wins = 0;
    let draws = 0;
    let losses = 0;

    for (const game of onlineStats) {
      const playedAsWhite = game.whitePlayerId === user.id;
      if (playedAsWhite !== isWhite) continue;

      if (game.result === "DRAW" || game.result === null) {
        draws += 1;
        continue;
      }

      const won =
        (game.result === "WHITE_WIN" && playedAsWhite) ||
        (game.result === "BLACK_WIN" && !playedAsWhite);

      if (won) wins += 1;
      else losses += 1;
    }

    const games = wins + draws + losses;
    const colorWinRate = games > 0 ? Math.round((wins / games) * 100) : 0;

    return {
      color,
      games,
      wins,
      draws,
      losses,
      winRate: colorWinRate,
    };
  });

  const ratingProgression = ["BULLET", "BLITZ", "RAPID"].map((control) => {
    const games = onlineStats
      .filter((game) => game.rated && game.timeControl === control)
      .map((game) => {
        const isWhite = game.whitePlayerId === user.id;
        return {
          date: game.endedAt ?? game.startedAt,
          before: isWhite ? game.whiteRatingBefore : game.blackRatingBefore,
          after: isWhite ? game.whiteRatingAfter : game.blackRatingAfter,
        };
      })
      .filter(
        (game): game is { date: Date; before: number; after: number } =>
          game.before !== null && game.after !== null,
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const points =
      games.length > 0
        ? [
            { date: games[0].date, rating: Math.round(games[0].before) },
            ...games.map((game) => ({
              date: game.date,
              rating: Math.round(game.after),
            })),
          ]
        : [];

    const ratings = points.map((point) => point.rating);
    const minRating = ratings.length > 0 ? Math.min(...ratings) : 0;
    const maxRating = ratings.length > 0 ? Math.max(...ratings) : 0;
    const currentRating =
      control === "BULLET"
        ? Math.round(user.bulletRating)
        : control === "BLITZ"
          ? Math.round(user.blitzRating)
          : Math.round(user.rapidRating);

    const width = 1000;
    const height = 260;
    const padLeft = 78;
    const padRight = 24;
    const padTop = 20;
    const padBottom = 44;

    const rawMin = ratings.length > 0 ? Math.min(...ratings) : 0;
    const rawMax = ratings.length > 0 ? Math.max(...ratings) : 0;
    const axisStep = 100;
    const axisMin =
      ratings.length > 0 ? Math.floor((rawMin - 50) / axisStep) * axisStep : 0;
    const axisMax =
      ratings.length > 0 ? Math.ceil((rawMax + 50) / axisStep) * axisStep : 0;
    const axisRange = Math.max(axisStep, axisMax - axisMin);

    const chartPoints = points.map((point, index) => {
      const x =
        points.length === 1
          ? (padLeft + width - padRight) / 2
          : padLeft +
            (index / (points.length - 1)) * (width - padLeft - padRight);
      const y =
        height -
        padBottom -
        ((point.rating - axisMin) / axisRange) *
          (height - padTop - padBottom);
      return { ...point, x, y };
    });

    const yTicks = Array.from({ length: 5 }, (_, index) => {
      const value = axisMin + (axisRange * index) / 4;
      const y =
        height -
        padBottom -
        (index / 4) * (height - padTop - padBottom);
      return { value: Math.round(value), y };
    }).reverse();

    const firstDate = points[0]?.date ?? null;
    const lastDate = points[points.length - 1]?.date ?? null;
    const dateTicks =
      firstDate && lastDate
        ? Array.from({ length: 4 }, (_, index) => {
            const ratio = index / 3;
            const timestamp =
              firstDate.getTime() +
              (lastDate.getTime() - firstDate.getTime()) * ratio;
            return {
              x: padLeft + ratio * (width - padLeft - padRight),
              label: new Intl.DateTimeFormat("en", {
                month: "short",
                year: "numeric",
              }).format(new Date(timestamp)),
            };
          })
        : [];

    const polyline = chartPoints
      .map((point) => `${point.x},${point.y}`)
      .join(" ");
    const areaPath =
      chartPoints.length > 1
        ? `M ${chartPoints[0].x} ${height - padBottom} L ${chartPoints
            .map((point) => `${point.x} ${point.y}`)
            .join(" L ")} L ${chartPoints[chartPoints.length - 1].x} ${
            height - padBottom
          } Z`
        : "";

    return {
      control,
      points: chartPoints,
      polyline,
      areaPath,
      yTicks,
      dateTicks,
      minRating,
      maxRating,
      currentRating,
      ratedGames: games.length,
    };
  });

  const recentForm = recentGames.slice(0, 10).map((game) => {
    const isWhite = game.whitePlayerId === user.id;

    if (game.result === "DRAW" || game.result === null) {
      return "D" as const;
    }

    const won =
      (game.result === "WHITE_WIN" && isWhite) ||
      (game.result === "BLACK_WIN" && !isWhite);

    return won ? ("W" as const) : ("L" as const);
  });

  const recentWins = recentForm.filter((result) => result === "W").length;
  const recentDraws = recentForm.filter((result) => result === "D").length;
  const recentLosses = recentForm.filter((result) => result === "L").length;
  const recentWinRate =
    recentForm.length > 0
      ? Math.round((recentWins / recentForm.length) * 100)
      : 0;

  let currentStreakCount = 0;
  let currentStreakResult: "W" | "D" | "L" | null = null;

  for (const result of recentForm) {
    if (currentStreakResult === null) {
      currentStreakResult = result;
      currentStreakCount = 1;
      continue;
    }

    if (result !== currentStreakResult) break;
    currentStreakCount += 1;
  }

  const currentStreakLabel =
    currentStreakResult === "W"
      ? `${currentStreakCount} win${currentStreakCount === 1 ? "" : "s"}`
      : currentStreakResult === "L"
        ? `${currentStreakCount} loss${currentStreakCount === 1 ? "" : "es"}`
        : currentStreakResult === "D"
          ? `${currentStreakCount} draw${currentStreakCount === 1 ? "" : "s"}`
          : "No games";

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
      <FriendsRealtimeSync userId={user.id} />
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
              <Link
                href="/profile?tab=statistics"
                className={`px-5 py-3 text-sm font-black transition ${
                  activeTab === "statistics"
                    ? "border-b-2 border-amber-400 text-amber-300"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Statistics
              </Link>
              <Link
                href="/profile?tab=friends"
                className={`px-5 py-3 text-sm font-black transition ${
                  activeTab === "friends"
                    ? "border-b-2 border-amber-400 text-amber-300"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Friends
              </Link>
              <span className="px-5 py-3 text-sm font-black text-slate-500">
                Achievements
              </span>
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
            ) : activeTab === "games" ? (
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
            ) : activeTab === "friends" ? (
              <section className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-[#0a1019]">
                <div className="border-b border-slate-800 px-6 py-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">
                    Player Network
                  </p>
                  <h2 className="mt-1 text-2xl font-black">Friends</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Find Chess Arena players by username
                  </p>
                </div>

                <div className="p-6">
                  <div className="mb-6">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                          Friend Requests
                        </p>
                        <h3 className="mt-1 text-lg font-black text-slate-100">Incoming Requests</h3>
                      </div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                        {incomingFriendRequests.length} {incomingFriendRequests.length === 1 ? "request" : "requests"}
                      </p>
                    </div>

                    {incomingFriendRequests.length > 0 ? (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
                        <div className="divide-y divide-slate-800">
                          {incomingFriendRequests.map((request) => (
                            <div key={request.id} className="flex flex-col gap-4 bg-slate-950/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex min-w-0 items-center gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 font-black text-amber-300">
                                  {request.requester.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-black text-slate-100">{request.requester.username}</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Bullet {Math.round(request.requester.bulletRating)}
                                    <span className="mx-2 text-slate-700">•</span>
                                    Blitz {Math.round(request.requester.blitzRating)}
                                    <span className="mx-2 text-slate-700">•</span>
                                    Rapid {Math.round(request.requester.rapidRating)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <AcceptFriendButton
                                  friendshipId={request.id}
                                  requesterId={request.requester.id}
                                />
                                <DeclineFriendButton
                                  friendshipId={request.id}
                                  requesterId={request.requester.id}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/25 px-5 py-6 text-center">
                        <p className="text-sm text-slate-500">No incoming friend requests.</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-800 pt-6">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                          Player Network
                        </p>
                        <h3 className="mt-1 text-lg font-black text-slate-100">My Friends</h3>
                      </div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                        {friends.length} {friends.length === 1 ? "friend" : "friends"}
                      </p>
                    </div>

                    {friends.length > 0 ? (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
                        <div className="divide-y divide-slate-800">
                          {friends.map((friend) => (
                            <div
                              key={friend.id}
                              className="flex flex-col gap-4 bg-slate-950/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex min-w-0 items-center gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 font-black text-emerald-300">
                                  {friend.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-black text-slate-100">
                                    {friend.username}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Bullet {Math.round(friend.bulletRating)}
                                    <span className="mx-2 text-slate-700">•</span>
                                    Blitz {Math.round(friend.blitzRating)}
                                    <span className="mx-2 text-slate-700">•</span>
                                    Rapid {Math.round(friend.rapidRating)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex w-fit items-center rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-300">
                                  Friend
                                </span>
                                <RemoveFriendButton
                                  friendshipId={friend.friendshipId}
                                  friendUserId={friend.id}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/25 px-5 py-6 text-center">
                        <p className="text-sm text-slate-500">No friends yet.</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 border-t border-slate-800 pt-6">
                  <form method="GET" action="/profile" className="flex flex-col gap-3 sm:flex-row">
                    <input type="hidden" name="tab" value="friends" />
                    <input
                      type="search"
                      name="q"
                      defaultValue={friendSearchQuery}
                      placeholder="Search username..."
                      autoComplete="off"
                      className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-400/60"
                    />
                    <button
                      type="submit"
                      className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-6 py-3 text-sm font-black text-amber-300 transition hover:border-amber-300/55 hover:bg-amber-400/15"
                    >
                      Search Player
                    </button>
                  </form>

                  {friendSearchQuery.length > 0 && friendSearchQuery.length < 2 ? (
                    <p className="mt-4 text-sm text-slate-500">
                      Enter at least 2 characters to search.
                    </p>
                  ) : null}

                  {friendSearchQuery.length >= 2 ? (
                    <div className="mt-5 overflow-hidden rounded-xl border border-slate-800">
                      {friendSearchResults.length > 0 ? (
                        <div className="divide-y divide-slate-800">
                          {friendSearchResults.map((player) => (
                            <div
                              key={player.id}
                              className="flex flex-col gap-4 bg-slate-950/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex min-w-0 items-center gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 font-black text-amber-300">
                                  {player.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-black text-slate-100">
                                    {player.username}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Bullet {Math.round(player.bulletRating)}
                                    <span className="mx-2 text-slate-700">•</span>
                                    Blitz {Math.round(player.blitzRating)}
                                    <span className="mx-2 text-slate-700">•</span>
                                    Rapid {Math.round(player.rapidRating)}
                                  </p>
                                </div>
                              </div>
                              {friends.some((friend) => friend.id === player.id) ? (
                                <span className="rounded-xl border border-emerald-400/35 bg-emerald-400/10 px-5 py-2.5 text-sm font-black uppercase tracking-[0.12em] text-emerald-300">
                                  Friend
                                </span>
                              ) : (
                                <AddFriendButton
                                  addresseeId={player.id}
                                  initialStatus={
                                    outgoingFriendRequestIds.has(player.id)
                                      ? "sent"
                                      : "idle"
                                  }
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-6 py-10 text-center">
                          <p className="font-black text-slate-300">No players found</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Try another username.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-dashed border-slate-800 bg-slate-950/25 px-6 py-10 text-center">
                      <p className="text-sm text-slate-500">
                        Search for a player to start building your friends list.
                      </p>
                    </div>
                  )}
                  </div>
                </div>
              </section>
            ) : (
              <section className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_1.85fr]">
                <div className="rounded-2xl border border-slate-800 bg-[#0a1019] p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">
                    Online Performance
                  </p>
                  <h2 className="mt-1 text-2xl font-black">Statistics</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Your completed online games
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                      <p className="text-xs uppercase text-slate-500">Games</p>
                      <p className="mt-1 text-3xl font-black">{totalGames}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                      <p className="text-xs uppercase text-slate-500">Win Rate</p>
                      <p className="mt-1 text-3xl font-black text-amber-300">
                        {winRate}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-emerald-400/5 p-3">
                      <p className="text-2xl font-black text-emerald-400">
                        {onlineWins}
                      </p>
                      <p className="text-[10px] uppercase text-slate-500">Wins</p>
                    </div>
                    <div className="rounded-xl bg-sky-400/5 p-3">
                      <p className="text-2xl font-black text-sky-300">
                        {onlineDraws}
                      </p>
                      <p className="text-[10px] uppercase text-slate-500">Draws</p>
                    </div>
                    <div className="rounded-xl bg-rose-400/5 p-3">
                      <p className="text-2xl font-black text-rose-400">
                        {onlineLosses}
                      </p>
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
                      className="rounded-2xl border border-slate-800 bg-[#0a1019] p-5"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                          {name}
                        </p>
                        <span>{icon}</span>
                      </div>
                      <p className="mt-5 text-4xl font-black">{value}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Current rated chess rating
                      </p>
                    </div>
                  ))}
                </div>

                <div className="xl:col-span-2">
                  <div className="mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">
                      Time Controls
                    </p>
                    <h3 className="mt-1 text-xl font-black">
                      Performance by Time Control
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Results from your completed online games
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {performanceByTimeControl.map((stats) => (
                      <div
                        key={stats.control}
                        className="rounded-2xl border border-slate-800 bg-[#0a1019] p-5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-black text-slate-200">
                            {stats.control.charAt(0) +
                              stats.control.slice(1).toLowerCase()}
                          </p>
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-300">
                            {stats.winRate}% Win Rate
                          </p>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-3">
                            <p className="text-[10px] uppercase text-slate-500">
                              Games
                            </p>
                            <p className="mt-1 text-2xl font-black">
                              {stats.games}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-3">
                            <p className="text-[10px] uppercase text-slate-500">
                              Win Rate
                            </p>
                            <p className="mt-1 text-2xl font-black text-amber-300">
                              {stats.winRate}%
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg bg-emerald-400/5 p-3">
                            <p className="text-lg font-black text-emerald-400">
                              {stats.wins}
                            </p>
                            <p className="text-[9px] uppercase text-slate-500">
                              Wins
                            </p>
                          </div>
                          <div className="rounded-lg bg-sky-400/5 p-3">
                            <p className="text-lg font-black text-sky-300">
                              {stats.draws}
                            </p>
                            <p className="text-[9px] uppercase text-slate-500">
                              Draws
                            </p>
                          </div>
                          <div className="rounded-lg bg-rose-400/5 p-3">
                            <p className="text-lg font-black text-rose-400">
                              {stats.losses}
                            </p>
                            <p className="text-[9px] uppercase text-slate-500">
                              Losses
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="xl:col-span-2">
                  <div className="mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">
                      Playing Color
                    </p>
                    <h3 className="mt-1 text-xl font-black">
                      White vs Black Performance
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Compare your results when playing each side
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {performanceByColor.map((stats) => (
                      <div
                        key={stats.color}
                        className="rounded-2xl border border-slate-800 bg-[#0a1019] p-5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl ${
                                stats.color === "White"
                                  ? "border-slate-600 bg-slate-100 text-slate-950"
                                  : "border-slate-700 bg-slate-950 text-slate-100"
                              }`}
                            >
                              ♟
                            </span>
                            <div>
                              <p className="text-sm font-black text-slate-200">
                                Playing as {stats.color}
                              </p>
                              <p className="text-xs text-slate-500">
                                {stats.games} completed games
                              </p>
                            </div>
                          </div>

                          <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-300">
                            {stats.winRate}% Win Rate
                          </p>
                        </div>

                        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                          <div className="rounded-lg border border-slate-800 bg-slate-950/55 p-3">
                            <p className="text-lg font-black text-slate-100">
                              {stats.games}
                            </p>
                            <p className="text-[9px] uppercase text-slate-500">
                              Games
                            </p>
                          </div>
                          <div className="rounded-lg bg-emerald-400/5 p-3">
                            <p className="text-lg font-black text-emerald-400">
                              {stats.wins}
                            </p>
                            <p className="text-[9px] uppercase text-slate-500">
                              Wins
                            </p>
                          </div>
                          <div className="rounded-lg bg-sky-400/5 p-3">
                            <p className="text-lg font-black text-sky-300">
                              {stats.draws}
                            </p>
                            <p className="text-[9px] uppercase text-slate-500">
                              Draws
                            </p>
                          </div>
                          <div className="rounded-lg bg-rose-400/5 p-3">
                            <p className="text-lg font-black text-rose-400">
                              {stats.losses}
                            </p>
                            <p className="text-[9px] uppercase text-slate-500">
                              Losses
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="xl:col-span-2">
                  <div className="mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">
                      Rating History
                    </p>
                    <h3 className="mt-1 text-xl font-black">Rating Progression</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Your rating movement across completed rated online games
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    {ratingProgression.map((series) => (
                      <div
                        key={series.control}
                        className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0a1019] p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-black text-slate-200">
                              {series.control.charAt(0) +
                                series.control.slice(1).toLowerCase()}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {series.ratedGames} rated games
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                              Current
                            </p>
                            <p className="text-2xl font-black text-amber-300">
                              {series.currentRating}
                            </p>
                          </div>
                        </div>

                        {series.points.length > 1 ? (
                          <>
                            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/45 p-3">
                              <svg
                                viewBox="0 0 1000 260"
                                role="img"
                                aria-label={`${series.control} rating progression`}
                                className="h-[190px] w-full overflow-visible"
                                preserveAspectRatio="none"
                              >
                                <defs>
                                  <linearGradient
                                    id={`rating-fill-${series.control}`}
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                  >
                                    <stop
                                      offset="0%"
                                      stopColor="rgb(252 211 77)"
                                      stopOpacity="0.22"
                                    />
                                    <stop
                                      offset="100%"
                                      stopColor="rgb(252 211 77)"
                                      stopOpacity="0.015"
                                    />
                                  </linearGradient>
                                </defs>

                                {series.yTicks.map((tick) => (
                                  <g key={`${series.control}-y-${tick.value}`}>
                                    <line
                                      x1="78"
                                      y1={tick.y}
                                      x2="976"
                                      y2={tick.y}
                                      stroke="rgba(100,116,139,.18)"
                                      strokeWidth="1"
                                      vectorEffect="non-scaling-stroke"
                                    />
                                    <text
                                      x="62"
                                      y={tick.y + 5}
                                      textAnchor="end"
                                      fill="rgb(100 116 139)"
                                      fontSize="26"
                                      fontWeight="700"
                                    >
                                      {tick.value}
                                    </text>
                                  </g>
                                ))}

                                {series.dateTicks.map((tick, index) => (
                                  <g key={`${series.control}-x-${index}`}>
                                    <line
                                      x1={tick.x}
                                      y1="20"
                                      x2={tick.x}
                                      y2="216"
                                      stroke="rgba(100,116,139,.10)"
                                      strokeWidth="1"
                                      vectorEffect="non-scaling-stroke"
                                    />
                                    <text
                                      x={tick.x}
                                      y="250"
                                      textAnchor={
                                        index === 0
                                          ? "start"
                                          : index === series.dateTicks.length - 1
                                            ? "end"
                                            : "middle"
                                      }
                                      fill="rgb(100 116 139)"
                                      fontSize="24"
                                      fontWeight="700"
                                    >
                                      {tick.label}
                                    </text>
                                  </g>
                                ))}

                                <path
                                  d={series.areaPath}
                                  fill={`url(#rating-fill-${series.control})`}
                                />

                                <polyline
                                  points={series.polyline}
                                  fill="none"
                                  stroke="rgb(252 211 77)"
                                  strokeWidth="2.25"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  vectorEffect="non-scaling-stroke"
                                />

                                {series.points.length > 0 ? (
                                  <circle
                                    cx={series.points[series.points.length - 1].x}
                                    cy={series.points[series.points.length - 1].y}
                                    r="5"
                                    fill="rgb(252 211 77)"
                                    stroke="rgb(7 12 19)"
                                    strokeWidth="2"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                ) : null}
                              </svg>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                              <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
                                <span className="text-slate-500">Low </span>
                                <strong className="text-sky-300">
                                  {series.minRating}
                                </strong>
                              </div>
                              <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
                                <span className="text-slate-500">High </span>
                                <strong className="text-emerald-400">
                                  {series.maxRating}
                                </strong>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="mt-5 flex min-h-[188px] items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/35 px-4 text-center">
                            <p className="text-sm text-slate-500">
                              Not enough rated games for a rating graph yet.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="xl:col-span-2">
                  <div className="mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">
                      Recent Form
                    </p>
                    <h3 className="mt-1 text-xl font-black">
                      Last {recentForm.length} Online Games
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Your most recent completed online results
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-[#0a1019] p-5">
                    <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          {recentForm.map((result, index) => (
                            <div
                              key={`recent-form-${index}`}
                              className={`flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-black ${
                                result === "W"
                                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                                  : result === "D"
                                    ? "border-sky-400/30 bg-sky-400/10 text-sky-300"
                                    : "border-rose-400/30 bg-rose-400/10 text-rose-400"
                              }`}
                            >
                              {result}
                            </div>
                          ))}
                        </div>

                        <p className="mt-3 text-xs text-slate-500">
                          Most recent game first
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                          <p className="text-[10px] uppercase text-slate-500">
                            Recent Win Rate
                          </p>
                          <p className="mt-1 text-2xl font-black text-amber-300">
                            {recentWinRate}%
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                          <p className="text-[10px] uppercase text-slate-500">
                            Current Streak
                          </p>
                          <p className="mt-1 text-2xl font-black text-slate-100">
                            {currentStreakLabel}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-emerald-400/5 p-3">
                        <p className="text-xl font-black text-emerald-400">
                          {recentWins}
                        </p>
                        <p className="text-[10px] uppercase text-slate-500">
                          Wins
                        </p>
                      </div>
                      <div className="rounded-xl bg-sky-400/5 p-3">
                        <p className="text-xl font-black text-sky-300">
                          {recentDraws}
                        </p>
                        <p className="text-[10px] uppercase text-slate-500">
                          Draws
                        </p>
                      </div>
                      <div className="rounded-xl bg-rose-400/5 p-3">
                        <p className="text-xl font-black text-rose-400">
                          {recentLosses}
                        </p>
                        <p className="text-[10px] uppercase text-slate-500">
                          Losses
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section
              className={`relative mt-5 flex min-h-[112px] items-center overflow-hidden rounded-t-2xl border border-slate-800 bg-gradient-to-r from-[#090e16] via-[#111827] to-[#080d16] px-7 py-6 ${
                activeTab !== "games" ? "flex-1" : ""
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