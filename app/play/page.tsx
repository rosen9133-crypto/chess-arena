import Link from "next/link";

export default function PlayPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl flex-col justify-center">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-yellow-400 sm:text-5xl">
            ♟️ Chess Arena
          </h1>

          <p className="mt-3 text-lg text-slate-400">
            Choose how you want to enter the arena.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/play/online"
            className="group rounded-3xl border border-yellow-400/30 bg-gradient-to-br from-slate-900 to-slate-800 p-8 shadow-2xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-yellow-400/70 hover:shadow-yellow-400/10"
          >
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400/10 text-4xl">
              🌐
            </div>

            <h2 className="text-2xl font-extrabold text-white transition group-hover:text-yellow-400">
              Play Online
            </h2>

            <p className="mt-3 leading-7 text-slate-400">
              Challenge real players, compete in rated games and climb the
              Chess Arena rankings.
            </p>

            <div className="mt-8 flex items-center font-bold text-yellow-400">
              Enter Online Arena
              <span className="ml-2 transition-transform group-hover:translate-x-1">
                →
              </span>
            </div>
          </Link>

          <Link
            href="/play/computer"
            className="group rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 p-8 shadow-2xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-blue-400/60 hover:shadow-blue-400/10"
          >
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-400/10 text-4xl">
              🤖
            </div>

            <h2 className="text-2xl font-extrabold text-white transition group-hover:text-blue-300">
              Play vs Computer
            </h2>

            <p className="mt-3 leading-7 text-slate-400">
              Train against Stockfish, choose your difficulty and improve your
              chess without affecting your online rating.
            </p>

            <div className="mt-8 flex items-center font-bold text-blue-300">
              Play Computer
              <span className="ml-2 transition-transform group-hover:translate-x-1">
                →
              </span>
            </div>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}