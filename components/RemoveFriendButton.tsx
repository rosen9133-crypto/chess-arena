"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type RemoveFriendButtonProps = {
  friendshipId: string;
  friendUserId: string;
};

export default function RemoveFriendButton({
  friendshipId,
  friendUserId,
}: RemoveFriendButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/friends/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ friendshipId }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;

      if (!response.ok) {
        setError(data?.error ?? "Could not remove friend.");
        setIsLoading(false);
        return;
      }

      const channel = supabase.channel(`friends:${friendUserId}`);

      await new Promise<void>((resolve, reject) => {
        channel.subscribe((channelStatus, error) => {
          if (channelStatus === "SUBSCRIBED") {
            resolve();
            return;
          }

          if (
            channelStatus === "CHANNEL_ERROR" ||
            channelStatus === "TIMED_OUT"
          ) {
            reject(error ?? new Error("Could not connect to Friends Realtime."));
          }
        });
      });

      try {
        await channel.send({
          type: "broadcast",
          event: "friends-updated",
          payload: {},
        });
      } finally {
        await supabase.removeChannel(channel);
      }

      router.refresh();
    } catch {
      setError("Could not remove friend.");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleRemove}
        disabled={isLoading}
        className="rounded-xl border border-rose-400/35 bg-rose-400/10 px-5 py-2.5 text-sm font-black text-rose-300 transition hover:border-rose-300/60 hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Removing..." : "Remove Friend"}
      </button>

      {error ? (
        <p className="max-w-[260px] text-xs font-semibold text-rose-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
