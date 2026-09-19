"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Props = {
  challengeId: string;
  challengerId: string;
  challengerUsername: string;
  onDeclined?: () => void;
};

export default function DeclineGameChallengeButton({
  challengeId, challengerId, challengerUsername, onDeclined,
}: Props) {
  const router = useRouter();
  const [isDeclining, setIsDeclining] = useState(false);
  const [error, setError] = useState("");

  async function handleDecline() {
    if (isDeclining) return;
    setIsDeclining(true);
    setError("");

    try {
      const response = await fetch("/api/friends/challenge/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId }),
      });

      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setError(data.error ?? "Unable to decline challenge.");
        setIsDeclining(false);
        return;
      }

      onDeclined?.();

      const channel = supabase.channel(`friends:${challengerId}`);
      await new Promise<void>((resolve, reject) => {
        channel.subscribe((status, channelError) => {
          if (status === "SUBSCRIBED") resolve();
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            reject(channelError ?? new Error("Could not connect to Challenge Realtime."));
          }
        });
      });

      try {
        await channel.send({
          type: "broadcast",
          event: "friends-updated",
          payload: { kind: "game-challenge", challengeId, status: "DECLINED" },
        });
      } finally {
        await supabase.removeChannel(channel);
      }

      router.refresh();
    } catch {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleDecline}
        disabled={isDeclining}
        aria-label={`Decline challenge from ${challengerUsername}`}
        className="inline-flex min-w-[92px] items-center justify-center rounded-lg border border-red-400/25 bg-red-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-red-300 transition hover:border-red-300/50 hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDeclining ? "Declining..." : "Decline"}
      </button>
      {error ? <p className="max-w-[220px] text-right text-[11px] font-semibold text-red-300">{error}</p> : null}
    </div>
  );
}
