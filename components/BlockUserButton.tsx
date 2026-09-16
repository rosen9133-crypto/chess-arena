"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BlockUserButtonProps = {
  userId: string;
  username: string;
};

export default function BlockUserButton({
  userId,
  username,
}: BlockUserButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openConfirm() {
    setError(null);
    setIsConfirmOpen(true);
  }

  function closeConfirm() {
    if (isLoading) return;
    setIsConfirmOpen(false);
  }

  async function handleBlock() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/friends/block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Failed to block player.");
        return;
      }

      setIsConfirmOpen(false);
      router.refresh();
    } catch {
      setError("Failed to block player.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={openConfirm}
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-rose-300 transition hover:border-rose-300/55 hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Blocking..." : "Block"}
        </button>

        {error && !isConfirmOpen ? (
          <p className="max-w-[220px] text-right text-xs font-semibold text-rose-400">
            {error}
          </p>
        ) : null}
      </div>

      {isConfirmOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeConfirm();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="block-player-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-amber-300/20 bg-[linear-gradient(145deg,rgba(15,20,29,0.99),rgba(6,9,14,0.99))] shadow-[0_30px_100px_rgba(0,0,0,0.65)]"
          >
            <div className="border-b border-white/[0.07] px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-400/25 bg-rose-400/10 text-xl text-rose-300">
                  ×
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">
                    Chess Arena
                  </p>
                  <h2
                    id="block-player-title"
                    className="mt-1 text-xl font-black text-white"
                  >
                    Block {username}?
                  </h2>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm font-medium leading-6 text-slate-300">
                This player will be blocked and any friendship or pending friend
                request between you will be removed.
              </p>

              <p className="mt-3 text-xs font-semibold text-slate-500">
                You can unblock this player later from Player Search.
              </p>

              {error ? (
                <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.08] px-4 py-3 text-sm font-semibold text-rose-300">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-white/[0.07] bg-black/20 px-6 py-4">
              <button
                type="button"
                onClick={closeConfirm}
                disabled={isLoading}
                className="rounded-lg border border-slate-700 bg-slate-900/80 px-5 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-slate-300 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleBlock}
                disabled={isLoading}
                className="rounded-lg border border-rose-400/35 bg-rose-400/12 px-5 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-rose-300 transition hover:border-rose-300/60 hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Blocking..." : "Block Player"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
