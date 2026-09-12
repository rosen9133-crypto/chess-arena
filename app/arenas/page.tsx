import Image from "next/image";
import Link from "next/link";
import ArenaCustomizeButton from "./ArenaCustomizeButton";
import ArenaActivateButton from "./ArenaActivateButton";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function SidebarIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-[clamp(1.7rem,3.7vh,2rem)] w-[clamp(1.7rem,3.7vh,2rem)] shrink-0 items-center justify-center rounded-md border border-slate-700/70 bg-slate-900/80 text-sm text-slate-300">
      {children}
    </span>
  );
}

const arenaCards = [
  {
    name: "Roman Colosseum",
    subtitle: "Strength and glory",
    description:
      "Enter the Colosseum and play surrounded by marble, fire and the atmosphere of ancient Rome.",
    image: "/arenas/roman-colosseum/roman-colosseum.png",
    available: true,
  },
  {
    name: "Frozen Kingdom",
    subtitle: "Cold and majestic",
    description: "An icy kingdom forged for players who keep their cool under pressure.",
    gradient: "from-sky-950 via-blue-950 to-slate-950",
    available: false,
  },
  {
    name: "Inferno Arena",
    subtitle: "Fire and power",
    description: "A dark battlefield of obsidian, heat and relentless pressure.",
    gradient: "from-red-950 via-orange-950 to-slate-950",
    available: false,
  },
  {
    name: "Cosmic Arena",
    subtitle: "Beyond the limits",
    description: "Take the board beyond Earth in a deep cosmic atmosphere.",
    gradient: "from-violet-950 via-indigo-950 to-slate-950",
    available: false,
  },
];

export default async function ArenasPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      username: true,
      rapidRating: true,
      activeArena: true,
      romanBoardStyle: true,
      romanArenaEffects: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const boardStyleLabel =
    user.romanBoardStyle === "classic" ? "Classic" : "Roman Arena";
  const effectsLabel =
    user.romanArenaEffects === "off"
      ? "Off"
      : user.romanArenaEffects === "low"
        ? "Low"
        : "High";

  return (
    <main className="min-h-screen bg-[#070c13] text-white">
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
            <Link href="/dashboard" className="reference-nav-item">
              <SidebarIcon>⌂</SidebarIcon><span>Home</span>
            </Link>
            <Link href="/play/online" className="reference-nav-item">
              <SidebarIcon>ϟ</SidebarIcon><span>Play Online</span>
            </Link>
            <Link href="/play/computer" className="reference-nav-item">
              <SidebarIcon>▣</SidebarIcon><span>Play Computer</span>
            </Link>
            <Link href="/tournaments" className="reference-nav-item">
              <SidebarIcon>♕</SidebarIcon><span>Tournaments</span>
            </Link>
            <Link href="/puzzles" className="reference-nav-item">
              <SidebarIcon>✚</SidebarIcon><span>Puzzles</span>
            </Link>
            <Link href="/learn" className="reference-nav-item">
              <SidebarIcon>▱</SidebarIcon><span>Learn</span>
            </Link>
            <Link href="/arenas" className="reference-nav-item reference-nav-active">
              <SidebarIcon>♛</SidebarIcon><span>Arenas</span>
            </Link>
            <Link href="/community" className="reference-nav-item">
              <SidebarIcon>♙</SidebarIcon><span>Community</span>
            </Link>
            <Link href="/leaderboard" className="reference-nav-item">
              <SidebarIcon>▥</SidebarIcon><span>Leaderboard</span>
            </Link>
            <Link href="/profile" className="reference-nav-item">
              <SidebarIcon>♙</SidebarIcon><span>Profile</span>
            </Link>
            <Link href="/shop" className="reference-nav-item">
              <SidebarIcon>▱</SidebarIcon><span>Shop</span>
            </Link>
          </nav>

          <div className="sidebar-footer space-y-1 border-t border-slate-800/80 p-2.5">
            <button
              type="button"
              className="w-full rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-400/10 to-amber-300/5 px-4 py-[clamp(0.05rem,0.14vh,0.14rem)] text-left transition hover:border-amber-400/50"
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Gold Pass</span>
              <span className="mt-1 block whitespace-nowrap text-sm font-bold text-slate-200">Premium rewards</span>
            </button>
            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 px-3 py-[clamp(0.05rem,0.14vh,0.14rem)]">
              <div className="flex h-[clamp(1.7rem,3.15vh,2rem)] w-[clamp(1.7rem,3.15vh,2rem)] items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 font-black text-amber-300">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-100">{user.username}</p>
                <p className="text-xs text-slate-500">Rapid {Math.round(user.rapidRating)}</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1800px] px-3 pb-10 pt-3 sm:px-5 xl:px-[22px] xl:pt-5">
            <section className="relative overflow-hidden rounded-xl border border-slate-800/90 bg-[#050a10] px-5 py-8 sm:px-8 xl:px-10">
              <div className="absolute right-[-4rem] top-[-7rem] h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
              <div className="relative z-10 max-w-3xl">
                <p className="text-[11px] font-black uppercase tracking-[0.38em] text-amber-400">Choose your world</p>
                <h1 className="mt-3 text-[clamp(2.4rem,5vw,4.5rem)] font-black leading-none tracking-tight">
                  Your Game. <span className="text-amber-400">Your Arena.</span>
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Change the atmosphere around your board without changing the game. Each Arena has its own visual identity, board style and effects.
                </p>
              </div>
            </section>

            <section className="mt-4 grid gap-4 2xl:grid-cols-[1.55fr_0.75fr]">
              <article className="group relative min-h-[430px] overflow-hidden rounded-xl border border-amber-400/30 bg-[#090d12] shadow-2xl shadow-black/30">
                <Image
                  src="/arenas/roman-colosseum/roman-colosseum.png"
                  alt="Roman Colosseum"
                  fill
                  priority
                  sizes="(min-width: 1536px) 65vw, 100vw"
                  className="object-cover object-center transition duration-500 group-hover:scale-[1.01]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/45 to-black/10" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20" />

                <div className="relative z-10 flex min-h-[430px] max-w-xl flex-col justify-end p-6 sm:p-8 xl:p-10">
                  <div className="mb-auto flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-amber-400/40 bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300 backdrop-blur-sm">Premium Arena</span>
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-950/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 backdrop-blur-sm">Available</span>
                  </div>

                  <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-400">Strength and glory</p>
                  <h2 className="mt-2 text-3xl font-black sm:text-4xl">Roman Colosseum</h2>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-slate-200">
                    Enter the Colosseum and play surrounded by marble, fire and the atmosphere of ancient Rome.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-md border border-white/15 bg-black/45 px-3 py-2 backdrop-blur-sm">Board: {boardStyleLabel}</span>
                    <span className="rounded-md border border-white/15 bg-black/45 px-3 py-2 backdrop-blur-sm">Effects: {effectsLabel}</span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <ArenaActivateButton
                      arenaId="roman-colosseum"
                      isActive={user.activeArena === "roman-colosseum"}
                    />
                    <ArenaCustomizeButton
                      initialBoardStyle={user.romanBoardStyle === "classic" ? "classic" : "roman"}
                      initialEffects={
                        user.romanArenaEffects === "off" || user.romanArenaEffects === "low"
                          ? user.romanArenaEffects
                          : "high"
                      }
                    />
                    <Link
                      href="/play/online"
                      className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-500/80 bg-black/45 px-6 font-black uppercase tracking-wide text-white backdrop-blur-sm transition hover:border-slate-300 hover:bg-black/60"
                    >
                      Play Online
                    </Link>
                  </div>
                </div>
              </article>

              <aside className="rounded-xl border border-slate-800/90 bg-[#090e16] p-6 sm:p-7">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">Arena Collection</p>
                <h2 className="mt-2 text-2xl font-black">Build your atmosphere</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Arena preferences are cosmetic. Your chess rules, rating and gameplay remain unchanged.
                </p>

                <div className="mt-7 space-y-4 border-t border-slate-800 pt-6">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-xl text-amber-400">♛</span>
                    <div><p className="font-black">Unique scenery</p><p className="mt-1 text-sm text-slate-400">Each premium Arena has its own visual world.</p></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-xl text-amber-400">▦</span>
                    <div><p className="font-black">Board Style</p><p className="mt-1 text-sm text-slate-400">Keep the Classic board or use the Arena board skin.</p></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-xl text-amber-400">✦</span>
                    <div><p className="font-black">Arena Effects</p><p className="mt-1 text-sm text-slate-400">Choose Off, Low or High effects before you play.</p></div>
                  </div>
                </div>
              </aside>
            </section>

            <section className="mt-4">
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">More Arenas</p>
                  <h2 className="mt-1 text-2xl font-black">Coming to Chess Arena</h2>
                </div>
                <span className="hidden text-xs font-bold uppercase tracking-[0.18em] text-slate-500 sm:block">More worlds. Same game.</span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {arenaCards.slice(1).map((arena) => (
                  <article key={arena.name} className={`relative min-h-[220px] overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br ${arena.gradient} p-5`}>
                    <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full border border-white/10 bg-white/5" />
                    <div className="absolute bottom-3 right-5 text-7xl text-white/10">♛</div>
                    <div className="relative z-10 flex h-full min-h-[180px] flex-col">
                      <span className="w-fit rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Coming Soon</span>
                      <div className="mt-auto">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{arena.subtitle}</p>
                        <h3 className="mt-1 text-xl font-black">{arena.name}</h3>
                        <p className="mt-2 max-w-sm text-sm leading-5 text-slate-400">{arena.description}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      <style>{`
        .chess-arena-sidebar {
          --sidebar-gap: clamp(2px, 0.32vh, 5px);
          --nav-font: clamp(0.74rem, 1.55vh, 0.94rem);
          --nav-icon: clamp(1.55rem, 3.35vh, 2rem);
          scrollbar-width: thin;
          scrollbar-color: rgba(245, 158, 11, 0.22) transparent;
        }
        .chess-arena-sidebar::-webkit-scrollbar { width: 4px; }
        .chess-arena-sidebar::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.22); border-radius: 999px; }
        .chess-arena-sidebar::-webkit-scrollbar-track { background: transparent; }
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
          transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
        }
        .reference-nav-item:hover { background: rgba(30, 41, 59, 0.58); color: white; }
        .reference-nav-active {
          border-color: rgba(251, 191, 36, 0.48);
          background: linear-gradient(90deg, rgba(245, 158, 11, 0.16), rgba(245, 158, 11, 0.07));
          color: rgb(252 211 77);
          box-shadow: inset 3px 0 0 rgb(251 191 36);
        }
        .reference-nav-item > span:first-child { width: var(--nav-icon); height: var(--nav-icon); flex: 0 0 var(--nav-icon); }
        .chess-arena-sidebar .sidebar-footer {
          display: flex;
          flex: 0 0 auto;
          flex-direction: column;
          gap: clamp(0.35rem, 0.75vh, 0.65rem);
          padding: clamp(0.35rem, 0.9vh, 0.75rem);
        }
        .chess-arena-sidebar .sidebar-footer > * { flex-shrink: 0; }
        .chess-arena-sidebar .sidebar-footer button { min-height: clamp(2rem, 4.5vh, 2.75rem); margin: 0; }
        @media (min-width: 1280px) and (max-height: 620px) {
          .chess-arena-sidebar { overflow-y: auto; }
          .reference-sidebar-nav { flex: none; grid-template-rows: repeat(11, 30px); }
        }
        @media (min-width: 1280px) and (max-height: 760px) {
          .chess-arena-sidebar .sidebar-footer {
            gap: clamp(0.22rem, 0.5vh, 0.4rem);
            padding-top: clamp(0.3rem, 0.6vh, 0.5rem);
            padding-bottom: clamp(0.28rem, 0.55vh, 0.45rem);
          }
        }
      `}</style>
    </main>
  );
}
