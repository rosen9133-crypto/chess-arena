"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  async function handleLogout() {
    await signOut({
      callbackUrl: "/login",
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full rounded bg-slate-700 py-3 font-bold text-white transition hover:bg-slate-600"
    >
      🚪 Sign Out
    </button>
  );
}