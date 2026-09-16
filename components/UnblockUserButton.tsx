"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UnblockUserButtonProps = {
  userId: string;
};

export default function UnblockUserButton({
  userId,
}: UnblockUserButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnblock() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/friends/unblock", {
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
        setError(data.error ?? "Failed to unblock player.");
        return;
      }

      router.refresh();
    } catch {
      setError("Failed to unblock player.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleUnblock}
        disabled={isLoading}
        className="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-800/70 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-200 transition hover:border-amber-400/45 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Unblocking..." : "Unblock"}
      </button>

      {error ? (
        <p className="max-w-[220px] text-right text-xs font-semibold text-rose-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
