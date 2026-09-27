import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import AddFriendButton from "@/components/AddFriendButton";
import BlockUserButton from "@/components/BlockUserButton";
import ChallengeFriendButton from "@/components/ChallengeFriendButton";
import RemoveFriendButton from "@/components/RemoveFriendButton";
import { prisma } from "@/lib/prisma";

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
};

function countryFlagUrl(countryCode: string) {
  return `https://flagcdn.com/${countryCode.toLowerCase()}.svg`;
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      countryCode: true,
      avatarUrl: true,
      bulletRating: true,
      blitzRating: true,
      rapidRating: true,
      createdAt: true,
    },
  });

  if (!user) notFound();

  const session = await auth();
  const currentUser = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })
    : null;

  const isOwnProfile = currentUser?.id === user.id;

  const friendship =
    currentUser && !isOwnProfile
      ? await prisma.friendship.findFirst({
          where: {
            OR: [
              { requesterId: currentUser.id, addresseeId: user.id },
              { requesterId: user.id, addresseeId: currentUser.id },
            ],
          },
          select: {
            id: true,
            status: true,
            requesterId: true,
          },
        })
      : null;

  const block =
    currentUser && !isOwnProfile
      ? await prisma.userBlock.findFirst({
          where: {
            OR: [
              { blockerId: currentUser.id, blockedId: user.id },
              { blockerId: user.id, blockedId: currentUser.id },
            ],
          },
          select: {
            blockerId: true,
          },
        })
      : null;

  const isBlocked = Boolean(block);
  const blockedByCurrentUser = block?.blockerId === currentUser?.id;
  const isFriend = friendship?.status === "ACCEPTED";
  const requestSentByCurrentUser =
    friendship?.status === "PENDING" &&
    friendship.requesterId === currentUser?.id;

  const games = await prisma.game.findMany({
    where: {
      status: "FINISHED",
      OR: [{ whitePlayerId: user.id }, { blackPlayerId: user.id }],
    },
    select: {
      whitePlayerId: true,
      result: true,
      timeControl: true,
    },
  });

  let wins = 0;
  let draws = 0;
  let losses = 0;

  const byTimeControl = {
    BULLET: { wins: 0, draws: 0, losses: 0 },
    BLITZ: { wins: 0, draws: 0, losses: 0 },
    RAPID: { wins: 0, draws: 0, losses: 0 },
  };

  for (const game of games) {
    const isWhite = game.whitePlayerId === user.id;
    const stats = byTimeControl[game.timeControl];

    if (game.result === "DRAW" || game.result === null) {
      draws += 1;
      stats.draws += 1;
      continue;
    }

    const won =
      (game.result === "WHITE_WIN" && isWhite) ||
      (game.result === "BLACK_WIN" && !isWhite);

    if (won) {
      wins += 1;
      stats.wins += 1;
    } else {
      losses += 1;
      stats.losses += 1;
    }
  }

  const totalGames = wins + draws + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  const ratings = [
    { label: "Bullet", rating: Math.round(user.bulletRating), stats: byTimeControl.BULLET },
    { label: "Blitz", rating: Math.round(user.blitzRating), stats: byTimeControl.BLITZ },
    { label: "Rapid", rating: Math.round(user.rapidRating), stats: byTimeControl.RAPID },
  ];

  return (
    <main className="min-h-screen bg-[#070c13] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Link
            href="/profile?tab=friends"
            className="inline-flex items-center gap-2 text-sm font-black text-slate-400 transition hover:text-amber-300"
          >
            ← Back to Players
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-black text-amber-300 transition hover:text-amber-200"
          >
            Chess Arena
          </Link>
        </div>

        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0a1019] shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(245,158,11,0.16),transparent_32%),linear-gradient(135deg,#0a1019,#080d15_60%,#111827)]" />

          <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-amber-300/35 bg-[#080d15] text-4xl font-black text-amber-300 shadow-2xl sm:h-32 sm:w-32">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={`${user.username} avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user.username.charAt(0).toUpperCase()
                )}
              </div>

              <div className="min-w-0 pb-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">
                  Chess Arena Player
                </p>
                <h1 className="mt-2 truncate text-3xl font-black sm:text-4xl">
                  {user.displayName?.trim() || user.username}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-400">
                  <span>@{user.username}</span>
                  {user.countryCode ? (
                    <>
                      <span className="text-slate-700">•</span>
                      <span className="inline-flex items-center gap-2">
                        <img
                          src={countryFlagUrl(user.countryCode)}
                          alt={`${user.countryCode} flag`}
                          className="h-4 w-6 rounded-sm object-cover"
                        />
                        {user.countryCode}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-black/30 px-5 py-4 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Member Since
              </p>
              <p className="mt-1 font-black text-slate-200">
                {new Intl.DateTimeFormat("en", {
                  month: "long",
                  year: "numeric",
                }).format(user.createdAt)}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_1.85fr]">
          <section className="rounded-2xl border border-slate-800 bg-[#0a1019] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">
              About
            </p>
            <h2 className="mt-1 text-xl font-black">Player Profile</h2>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-300">
              {user.bio?.trim() || "This player has not added a bio yet."}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#0a1019] p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">
                  Online Chess
                </p>
                <h2 className="mt-1 text-xl font-black">Performance</h2>
              </div>
              <p className="text-sm font-bold text-slate-500">
                {totalGames} {totalGames === 1 ? "game" : "games"}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                <p className="text-[10px] font-black uppercase text-slate-500">Wins</p>
                <p className="mt-1 text-2xl font-black text-emerald-400">{wins}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                <p className="text-[10px] font-black uppercase text-slate-500">Draws</p>
                <p className="mt-1 text-2xl font-black text-sky-300">{draws}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                <p className="text-[10px] font-black uppercase text-slate-500">Losses</p>
                <p className="mt-1 text-2xl font-black text-rose-400">{losses}</p>
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                <p className="text-[10px] font-black uppercase text-slate-500">Win Rate</p>
                <p className="mt-1 text-2xl font-black text-amber-300">{winRate}%</p>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          {ratings.map(({ label, rating, stats }) => {
            const gamesPlayed = stats.wins + stats.draws + stats.losses;

            return (
              <div
                key={label}
                className="rounded-2xl border border-slate-800 bg-[#0a1019] p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    {label}
                  </p>
                  <span className="text-xs font-bold text-slate-600">
                    {gamesPlayed} games
                  </span>
                </div>

                <p className="mt-4 text-4xl font-black text-white">{rating}</p>

                <div className="mt-4 flex items-center gap-3 text-xs font-bold">
                  <span className="text-emerald-400">{stats.wins} W</span>
                  <span className="text-sky-300">{stats.draws} D</span>
                  <span className="text-rose-400">{stats.losses} L</span>
                </div>
              </div>
            );
          })}
        </section>

        {currentUser && !isOwnProfile ? (
          <section className="mt-5 rounded-2xl border border-amber-400/20 bg-[#0a1019] px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">
                  Player Actions
                </p>
                <p className="mt-1 text-sm font-bold text-slate-400">
                  Connect, challenge or manage this player.
                </p>
              </div>

              <div className="flex flex-wrap items-start gap-3 sm:justify-end">
                {isBlocked ? (
                  <span className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-5 py-2.5 text-sm font-black text-rose-300">
                    {blockedByCurrentUser ? "Blocked" : "Unavailable"}
                  </span>
                ) : isFriend && friendship ? (
                  <>
                    <ChallengeFriendButton
                      currentUserId={currentUser.id}
                      friendUserId={user.id}
                      username={user.username}
                    />
                    <RemoveFriendButton
                      friendshipId={friendship.id}
                      friendUserId={user.id}
                    />
                    <BlockUserButton userId={user.id} username={user.username} />
                  </>
                ) : (
                  <>
                    <AddFriendButton
                      addresseeId={user.id}
                      initialStatus={requestSentByCurrentUser ? "sent" : "idle"}
                    />
                    <BlockUserButton userId={user.id} username={user.username} />
                  </>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
