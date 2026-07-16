export default function Header() {
  return (
    <header className="w-full border-b border-yellow-500/40 bg-black">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-2xl">👑</span>

          <span className="text-lg font-bold text-yellow-400 sm:text-2xl">
            Chess Arena
          </span>
        </div>

        <nav className="hidden items-center gap-6 text-sm text-white lg:flex">
          <a className="transition hover:text-yellow-400" href="#">
            Play
          </a>

          <a className="transition hover:text-yellow-400" href="#">
            Learn
          </a>

          <a className="transition hover:text-yellow-400" href="#">
            Tournaments
          </a>

          <a className="transition hover:text-yellow-400" href="#">
            Community
          </a>

          <a
            className="font-semibold text-yellow-400 transition hover:text-yellow-300"
            href="#"
          >
            Gold Pass
          </a>
        </nav>

        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          <button className="px-3 py-2 text-sm text-white transition hover:text-yellow-400">
            Sign In
          </button>

          <button className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-yellow-300">
            Register
          </button>
        </div>

        <button
          className="rounded-lg border border-yellow-400 px-3 py-2 text-yellow-400 sm:hidden"
          type="button"
          aria-label="Open menu"
        >
          ☰
        </button>
      </div>
    </header>
  );
}
