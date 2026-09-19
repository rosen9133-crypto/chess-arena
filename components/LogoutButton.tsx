"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton({ compact = false }: { compact?: boolean } = {}) {
  async function handleLogout() {
    await signOut({
      callbackUrl: "/login",
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={compact
        ? "flex w-full items-center justify-center gap-2 min-h-10 rounded-xl border border-amber-200/20 bg-black/35 px-3 py-2 text-xs font-bold text-slate-100 transition hover:border-red-400/60 hover:bg-white/10 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        : "w-full rounded bg-slate-700 py-3 font-bold text-white transition hover:bg-slate-600"
      }
    >
      {compact ? (
        <>
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H5v14h4M13 8l4 4-4 4M8 12h13" />
          </svg>
          Sign Out
        </>
      ) : "🚪 Sign Out"}
    </button>
  );
}