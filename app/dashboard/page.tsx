import Image from "next/image";
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

function SidebarIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-[clamp(1.7rem,3.7vh,2rem)] w-[clamp(1.7rem,3.7vh,2rem)] shrink-0 items-center justify-center rounded-md border border-slate-700/70 bg-slate-900/80 text-sm text-slate-300">
      {children}
    </span>
  );
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
      bulletRating: true,
      blitzRating: true,
      rapidRating: true,
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

  const totalGames = user.wins + user.losses + user.draws;
  const winRate =
    totalGames > 0 ? Math.round((user.wins / totalGames) * 100) : 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#172033_0%,_#0f172a_42%,_#080d18_100%)] text-white">
      <div className="flex min-h-screen">
        <aside className="chess-arena-sidebar sticky top-0 hidden h-screen w-[224px] shrink-0 overflow-y-auto overflow-x-hidden border-r border-slate-800/90 bg-[#050a10]/98 xl:flex xl:flex-col">
          <div className="border-b border-slate-800/80 px-4 pb-[clamp(0.25rem,0.6vh,0.55rem)] pt-[clamp(0.25rem,0.65vh,0.5rem)]">
            <div className="flex flex-col items-center text-center">
              <Image
                src="/images/chess-arena-logo.png"
                alt="Chess Arena"
                width={112}
                height={112}
                priority
                className="h-[clamp(72px,12vh,104px)] w-[clamp(72px,12vh,104px)] rounded-[1.45rem] object-cover shadow-[0_0_30px_rgba(251,191,36,0.12)]"
              />
              <p className="mt-[clamp(0.3rem,0.7vh,0.65rem)] text-[clamp(1rem,2.2vh,1.25rem)] font-black tracking-tight">
                <span className="text-white">Chess </span>
                <span className="text-amber-400">Arena</span>
              </p>
            </div>
          </div>

          <nav className="reference-sidebar-nav min-h-0 flex-1 px-3">
            <Link href="/dashboard" className="reference-nav-item reference-nav-active">
              <SidebarIcon>⌂</SidebarIcon>
              <span>Home</span>
            </Link>

            <Link href="/play/online" className="reference-nav-item">
              <SidebarIcon>ϟ</SidebarIcon>
              <span>Play Online</span>
            </Link>

            <Link href="/play/computer" className="reference-nav-item">
              <SidebarIcon>▣</SidebarIcon>
              <span>Play Computer</span>
            </Link>

            <Link href="/tournaments" className="reference-nav-item">
              <SidebarIcon>♕</SidebarIcon>
              <span>Tournaments</span>
            </Link>

            <Link href="/puzzles" className="reference-nav-item">
              <SidebarIcon>✚</SidebarIcon>
              <span>Puzzles</span>
            </Link>

            <Link href="/learn" className="reference-nav-item">
              <SidebarIcon>▱</SidebarIcon>
              <span>Learn</span>
            </Link>

            <Link href="/arenas" className="reference-nav-item">
              <SidebarIcon>♛</SidebarIcon>
              <span>Arenas</span>
            </Link>

            <Link href="/community" className="reference-nav-item">
              <SidebarIcon>♙</SidebarIcon>
              <span>Community</span>
            </Link>

            <Link href="/leaderboard" className="reference-nav-item">
              <SidebarIcon>▥</SidebarIcon>
              <span>Leaderboard</span>
            </Link>

            <Link href="/profile" className="reference-nav-item">
              <SidebarIcon>♙</SidebarIcon>
              <span>Profile</span>
            </Link>

            <Link href="/shop" className="reference-nav-item">
              <SidebarIcon>▱</SidebarIcon>
              <span>Shop</span>
            </Link>
          </nav>

          <div className="sidebar-footer space-y-1 border-t border-slate-800/80 p-2.5">
            <button
              type="button"
              className="w-full rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-400/10 to-amber-300/5 px-4 py-[clamp(0.05rem,0.14vh,0.14rem)] text-left transition hover:border-amber-400/50"
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                Gold Pass
              </span>
              <span className="mt-1 block text-sm whitespace-nowrap font-bold text-slate-200">
                Premium rewards
              </span>
            </button>

            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 px-3 py-[clamp(0.05rem,0.14vh,0.14rem)]">
              <div className="flex h-[clamp(1.7rem,3.15vh,2rem)] w-[clamp(1.7rem,3.15vh,2rem)] items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 font-black text-amber-300">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-100">
                  {user.username}
                </p>
                <p className="text-xs text-slate-500">
                  Rapid {Math.round(user.rapidRating)}
                </p>
              </div>
            </div>
          </div>
        
        <style>{`
          .chess-arena-sidebar {
            --sidebar-gap: clamp(2px, 0.32vh, 5px);
            --nav-font: clamp(0.74rem, 1.55vh, 0.94rem);
            --nav-icon: clamp(1.55rem, 3.35vh, 2rem);
            --brand-logo: clamp(72px, 12vh, 104px);
            scrollbar-width: thin;
            scrollbar-color: rgba(245, 158, 11, 0.22) transparent;
          }

          .chess-arena-sidebar::-webkit-scrollbar {
            width: 4px;
          }

          .chess-arena-sidebar::-webkit-scrollbar-thumb {
            background: rgba(245, 158, 11, 0.22);
            border-radius: 999px;
          }

          .chess-arena-sidebar::-webkit-scrollbar-track {
            background: transparent;
          }

          /* The sidebar is one viewport-height system:
             brand + 11 nav rows + Gold Pass/profile footer all share the space. */
          .reference-sidebar-nav {
            display: grid;
            flex: 1 1 auto;
            min-height: 0;
            grid-template-rows: repeat(11, minmax(30px, 1fr));
            gap: var(--sidebar-gap);
            padding-top: clamp(0.2rem, 0.55vh, 0.55rem);
            padding-bottom: clamp(0.2rem, 0.55vh, 0.55rem);
          }

          .reference-nav-item {
            display: flex;
            min-height: 0;
            align-items: center;
            gap: clamp(0.48rem, 0.75vw, 0.72rem);
            border: 1px solid transparent;
            border-radius: clamp(0.45rem, 0.9vh, 0.65rem);
            padding: 0 clamp(0.48rem, 0.7vw, 0.72rem);
            color: rgb(203 213 225);
            font-size: var(--nav-font);
            font-weight: 600;
            white-space: nowrap;
            transition:
              background-color 150ms ease,
              border-color 150ms ease,
              color 150ms ease;
          }

          .reference-nav-item:hover {
            background: rgba(30, 41, 59, 0.58);
            color: white;
          }

          .reference-nav-active {
            border-color: rgba(251, 191, 36, 0.48);
            background: linear-gradient(
              90deg,
              rgba(245, 158, 11, 0.16),
              rgba(245, 158, 11, 0.07)
            );
            color: rgb(252 211 77);
            box-shadow: inset 3px 0 0 rgb(251 191 36);
          }

          .reference-nav-item > span:first-child {
            width: var(--nav-icon);
            height: var(--nav-icon);
            flex: 0 0 var(--nav-icon);
          }

          /* Footer is ALWAYS present. Its footprint scales with viewport height. */
          .chess-arena-sidebar .sidebar-footer {
            display: block;
            flex: 0 0 auto;
            padding: clamp(0.35rem, 0.9vh, 0.75rem);
          }

          /* Existing Gold Pass/profile controls inside footer also scale naturally. */
          .chess-arena-sidebar .sidebar-footer a,
          .chess-arena-sidebar .sidebar-footer button {
            min-height: clamp(2rem, 4.5vh, 2.75rem);
          }

          /* Only genuinely short viewports use scroll.
             Nothing is hidden; the same complete sidebar remains available. */
          @media (min-width: 1280px) and (max-height: 620px) {
            .chess-arena-sidebar {
              overflow-y: auto;
            }

            .reference-sidebar-nav {
              flex: none;
              grid-template-rows: repeat(11, 30px);
            }
          }


          /* Step 30: give Gold Pass and the profile a clean visual separation
             without hiding either one or sacrificing the fluid navigation. */
          .chess-arena-sidebar .sidebar-footer {
            display: flex;
            flex-direction: column;
            gap: clamp(0.35rem, 0.75vh, 0.65rem);
            padding-top: clamp(0.45rem, 0.9vh, 0.75rem);
            padding-bottom: clamp(0.4rem, 0.8vh, 0.7rem);
          }

          .chess-arena-sidebar .sidebar-footer > * {
            flex-shrink: 0;
          }

          .chess-arena-sidebar .sidebar-footer a,
          .chess-arena-sidebar .sidebar-footer button {
            margin: 0;
          }

          @media (min-width: 1280px) and (max-height: 760px) {
            .chess-arena-sidebar .sidebar-footer {
              gap: clamp(0.22rem, 0.5vh, 0.4rem);
              padding-top: clamp(0.3rem, 0.6vh, 0.5rem);
              padding-bottom: clamp(0.28rem, 0.55vh, 0.45rem);
            }
          }
        `}</style>
</aside>

        <div className="min-w-0 flex-1 bg-[#070c13]">
          <div className="mx-auto w-full max-w-[1800px] px-2 pb-8 pt-0 sm:px-3 xl:px-[22px]">
            {/* Reference-style cinematic top area:
                compact utility controls, wide Hero, and a dedicated motto zone. */}
            <section className="relative h-[clamp(360px,46vh,430px)] overflow-hidden border-x border-b border-slate-800/80 bg-[#050a10]">
              <Image
                src="/images/chess-arena-hero.png"
                alt=""
                fill
                priority
                sizes="(min-width: 1280px) calc(100vw - 14rem), 100vw"
                className="object-cover object-[68%_52%]"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-[#050a10] from-[0%] via-[#050a10]/92 via-[31%] to-transparent to-[66%]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050a10]/75 via-transparent to-[#050a10]/20" />

              <div className="relative z-10 flex h-full items-center px-5 pb-5 pt-7 sm:px-7 xl:px-9">
                <div className="w-full max-w-[390px] 2xl:max-w-[430px]">
                  <p className="text-[11px] font-black uppercase tracking-[0.38em] text-amber-400">
                    More than a game
                  </p>

                  <h1 className="mt-3 text-[clamp(2.65rem,3.55vw,4.15rem)] font-black leading-[0.9] tracking-tight">
                    <span className="block text-white">Your Game.</span>
                    <span className="mt-2 block bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                      Your Arena.
                    </span>
                  </h1>

                  <p className="mt-4 max-w-[370px] text-[clamp(0.9rem,1vw,1.05rem)] leading-6 text-slate-300">
                    Play online, compete in tournaments, solve puzzles and become a legend.
                  </p>

                  <div className="mt-5 grid max-w-[330px] gap-2.5">
                    <Link
                      href="/play/online"
                      className="group flex min-h-11 items-center justify-between rounded-md bg-gradient-to-r from-amber-300 to-amber-500 px-6 font-black uppercase tracking-wide text-slate-950 shadow-[0_12px_30px_rgba(245,158,11,0.18)] transition hover:brightness-105"
                    >
                      <span className="flex items-center gap-3"><span className="text-xl">⚡</span>Play Online</span>
                      <span>›</span>
                    </Link>

                    <Link
                      href="/play/computer"
                      className="group flex min-h-11 items-center justify-between rounded-md border border-slate-600/90 bg-black/45 px-6 font-bold uppercase tracking-wide text-slate-100 backdrop-blur-sm transition hover:border-slate-400 hover:bg-black/60"
                    >
                      <span className="flex items-center gap-3"><span>▣</span>Play Computer</span>
                      <span>›</span>
                    </Link>
                  </div>

                  <p className="mt-4 text-xs text-slate-400">
                    Welcome back, <strong className="text-white">{user.username}</strong>
                    <span className="mx-2 text-slate-600">•</span>
                    Rapid <strong className="text-amber-300">{Math.round(user.rapidRating)}</strong>
                  </p>
                </div>
              </div>

              {/* Wide-screen motto matches the reference hierarchy instead of becoming another card. */}
              <div className="absolute right-[1.8%] top-[47%] z-20 hidden w-[138px] -translate-y-1/2 border-l border-amber-400/30 pl-5 min-[1280px]:block">
                <div className="mb-5 h-px w-10 bg-amber-400" />
                <p className="font-serif text-[13px] uppercase leading-[1.85] tracking-[0.25em] text-slate-100/90">
                  Different<br />
                  players.<br />
                  Different<br />
                  arenas.<br />
                  One passion.
                </p>
              </div>

              <div className="absolute bottom-4 right-4 z-20 hidden rounded-lg border border-amber-400/20 bg-[#060b12]/92 px-4 py-2.5 backdrop-blur-md lg:block min-[1280px]:right-[12.5%]">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">Player Hub</p>
                <p className="mt-1 text-lg font-black">{totalGames} games played</p>
                <p className="text-xs text-slate-400">{user.wins} wins · {user.draws} draws · {user.losses} defeats</p>
              </div>
            </section>

            {/* The reference places Arena discovery immediately under the Hero. */}
            <section className="mt-2 rounded-lg border border-slate-800/90 bg-[#050a10]/95 p-2.5">
              <div className="mb-2 flex items-center justify-between gap-4 px-1">
                <h2 className="text-sm font-black uppercase tracking-wide text-amber-400">
                  Choose Your Arena
                </h2>
                <Link href="/arenas" className="text-xs font-bold uppercase tracking-wide text-slate-400 transition hover:text-white">
                  View All →
                </Link>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Roman Colosseum", "Strength and glory", "from-amber-950/80 via-orange-900/45 to-slate-950"],
                  ["Frozen Kingdom", "Cold and majestic", "from-sky-950/90 via-blue-900/45 to-slate-950"],
                  ["Inferno Arena", "Fire and power", "from-red-950/90 via-orange-950/55 to-slate-950"],
                  ["Cosmic Arena", "Beyond the limits", "from-violet-950/90 via-indigo-950/55 to-slate-950"],
                ].map(([name, subtitle, gradient]) => (
                  <Link
                    key={name}
                    href="/arenas"
                    className={`group relative min-h-[118px] overflow-hidden rounded-md border border-slate-700/80 bg-gradient-to-br ${gradient} p-4 transition hover:-translate-y-0.5 hover:border-amber-400/50`}
                  >
                    <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full border border-white/10 bg-white/5" />
                    <div className="absolute bottom-4 right-5 text-6xl text-white/10">♛</div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-10">
                      <p className="font-black uppercase text-white">{name}</p>
                      <p className="mt-0.5 text-xs text-slate-300">{subtitle}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Same three-column rhythm as the approved reference. */}
            <section className="mt-2 grid gap-2.5 xl:grid-cols-[1.15fr_0.75fr_0.9fr]">
              <div className="relative min-h-[176px] overflow-hidden rounded-lg border border-slate-800/90 bg-[#070d14] p-4">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_40%,rgba(245,158,11,0.16),transparent_35%)]" />
                <div className="relative z-10 max-w-[62%]">
                  <p className="text-xs font-black uppercase tracking-wide text-amber-400">Live Tournament</p>
                  <h3 className="mt-2 text-xl font-black">Arena Cup 👑</h3>
                  <p className="mt-2 text-sm text-slate-300">10+0 <span className="mx-2 text-amber-400">•</span> Rated <span className="mx-2 text-amber-400">•</span> Prizes</p>
                  <p className="mt-3 text-sm text-slate-400">Compete. Climb. Become a champion.</p>
                  <Link href="/tournaments" className="mt-3 inline-flex min-h-10 items-center gap-4 rounded-md bg-gradient-to-r from-amber-300 to-amber-500 px-6 font-black text-slate-950">
                    Join Tournament <span>→</span>
                  </Link>
                </div>
                <div className="absolute bottom-2 right-7 text-[110px] leading-none text-amber-300/20">♛</div>
              </div>

              <div className="rounded-lg border border-slate-800/90 bg-[#070d14] p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-300">Last Game</p>
                {recentGames.length > 0 ? (
                  <>
                    <div className="mt-5 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 font-black text-amber-300">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-white">
                          {recentGames[0].whitePlayerId === user.id
                            ? recentGames[0].blackPlayer.username
                            : recentGames[0].whitePlayer.username}
                        </p>
                        <p className="text-xs text-slate-400">
                          {recentGames[0].timeControl} · {formatTimeControl(recentGames[0].initialTimeSeconds, recentGames[0].incrementSeconds)}
                        </p>
                      </div>
                    </div>
                    <Link href={`/play/online/game/${recentGames[0].id}`} className="mt-4 flex min-h-10 items-center justify-center rounded-md border border-slate-600 text-sm font-black uppercase text-white transition hover:bg-white/5">
                      View Game →
                    </Link>
                  </>
                ) : (
                  <p className="mt-4 text-xs text-slate-400">No completed games yet.</p>
                )}
              </div>

              <div className="relative overflow-hidden rounded-lg border border-slate-800/90 bg-[#070d14] p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-300">Daily Puzzle</p>
                <div className="mt-5 flex items-center gap-4">
                  <div className="text-6xl text-amber-400">✚</div>
                  <div>
                    <p className="font-semibold text-slate-200">Sharpen your mind.</p>
                    <p className="text-sm text-slate-400">Get better every day.</p>
                  </div>
                </div>
                <Link href="/puzzles" className="mt-4 flex min-h-10 items-center justify-center gap-4 rounded-md bg-gradient-to-r from-amber-300 to-amber-500 px-5 font-black uppercase text-slate-950">
                  Play Puzzle <span>→</span>
                </Link>
              </div>
            </section>

            {/* Cinematic separator from the reference, before the existing real Player Hub data. */}
            <section className="relative mt-2 min-h-[96px] overflow-hidden rounded-lg border border-slate-800/90 bg-gradient-to-r from-[#090e16] via-[#111827] to-[#080d16] px-8 py-6">
              <div className="absolute right-[18%] top-1/2 -translate-y-1/2 text-[100px] leading-none text-amber-400/10">♚</div>
              <p className="relative z-10 max-w-md font-serif text-sm uppercase leading-6 tracking-[0.25em] text-slate-200">
                Legends aren't born.<br />
                They are forged<br />
                in the arena.
              </p>
              <div className="absolute right-7 top-1/2 -translate-y-1/2 text-right">
                <p className="font-serif text-xl tracking-[0.18em] text-white">CHESS</p>
                <p className="font-serif text-xl tracking-[0.18em] text-amber-400">ARENA</p>
              </div>
            </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_1.95fr]">
          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/75 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  Player
                </p>
                <h2 className="mt-2 text-2xl font-black">{user.username}</h2>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-2xl">
                ♞
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-800 pt-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Games
                </p>
                <p className="mt-1 text-xl font-black">{totalGames}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Wins
                </p>
                <p className="mt-1 text-xl font-black text-emerald-400">
                  {user.wins}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Win rate
                </p>
                <p className="mt-1 text-xl font-black text-amber-400">
                  {winRate}%
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/75 p-5 shadow-xl shadow-black/15">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Bullet
                </p>
                <span className="text-xl">⚡</span>
              </div>
              <p className="mt-4 text-4xl font-black text-white">
                {Math.round(user.bulletRating)}
              </p>
              <p className="mt-1 text-sm text-slate-500">Fast chess rating</p>
            </div>

            <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-400/10 to-slate-900/80 p-5 shadow-xl shadow-black/15">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">
                  Blitz
                </p>
                <span className="text-xl">🔥</span>
              </div>
              <p className="mt-4 text-4xl font-black text-white">
                {Math.round(user.blitzRating)}
              </p>
              <p className="mt-1 text-sm text-slate-500">Blitz chess rating</p>
            </div>

            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/75 p-5 shadow-xl shadow-black/15">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Rapid
                </p>
                <span className="text-xl">⏱️</span>
              </div>
              <p className="mt-4 text-4xl font-black text-white">
                {Math.round(user.rapidRating)}
              </p>
              <p className="mt-1 text-sm text-slate-500">Rapid chess rating</p>
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/75 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-3 border-b border-slate-700/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                Match Archive
              </p>
              <h3 className="mt-1 text-2xl font-black">Recent Online Games</h3>
              <p className="mt-1 text-sm text-slate-400">
                Your last 10 completed games
              </p>
            </div>

            <Link
              href="/history"
              className="shrink-0 font-bold text-amber-400 transition hover:text-amber-300"
            >
              View All Games →
            </Link>
          </div>

          {recentGames.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400">
              You haven't completed any online games yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
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
                    className="grid gap-4 px-5 py-4 transition hover:bg-slate-800/70 sm:px-6 lg:grid-cols-[1.35fr_0.8fr_0.9fr_auto] lg:items-center"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Opponent
                      </p>
                      <p className="mt-1 text-lg font-black">{opponent}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Played as {isWhite ? "White" : "Black"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Result
                      </p>
                      <p className={`mt-1 text-lg font-black ${result.className}`}>
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
                      <p className="mt-1 font-black">
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
                            className={`ml-2 font-black ${getRatingDeltaClassName(
                              ratingDelta,
                            )}`}
                          >
                            {ratingDelta}
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <div className="lg:text-right">
                      <p className="text-sm text-slate-400">
                        {new Intl.DateTimeFormat("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(finishedAt)}
                      </p>
                      <p className="mt-2 font-black text-amber-400">
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
        </div>
      </div>
    </main>
  );
}
