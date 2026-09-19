"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  challengeId: string;
  challengerId: string;
  challengerUsername: string;
  onAccepted?: () => void;
};

type AcceptChallengeResponse = {
  message?: string;
  error?: string;
  game?: {
    id: string;
  };
};

export default function AcceptGameChallengeButton({
  challengeId,
  challengerId,
  challengerUsername,
  onAccepted,
}: Props) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState("");

  async function handleAccept() {
    if (isAccepting) return;

    setIsAccepting(true);
    setError("");

    try {
      const response = await fetch("/api/friends/challenge/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ challengeId }),
      });

      const data = (await response.json()) as AcceptChallengeResponse;

      if (!response.ok) {
        setError(data.error ?? "Unable to accept challenge.");
        return;
      }

      const gameId = data.game?.id;

      if (!gameId) {
        setError("Game was created, but the game ID is missing.");
        return;
      }

      onAccepted?.();

      const channel = supabase.channel(`friends:${challengerId}`);

      await new Promise<void>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
          reject(new Error("Realtime subscription timeout."));
        }, 5000);

        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            window.clearTimeout(timeoutId);
            resolve();
          }

          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            window.clearTimeout(timeoutId);
            reject(new Error(`Realtime channel status: ${status}`));
          }
        });
      });

      await channel.send({
        type: "broadcast",
        event: "friends-updated",
        payload: {
          kind: "game-challenge",
          challengeId,
          status: "ACCEPTED",
          gameId,
        },
      });

      await supabase.removeChannel(channel);

      router.push(`/play/online/game/${gameId}`);
    } catch (acceptError) {
      console.error("Accept game challenge error:", acceptError);

      // The game may already have been created successfully even if the
      // realtime notification failed. Refresh so the UI can reconcile.
      router.refresh();

      setError(
        `Challenge accepted, but ${challengerUsername} may need a moment to receive the game.`,
      );
    } finally {
      setIsAccepting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleAccept}
        disabled={isAccepting}
        className="inline-flex items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-300 transition hover:border-emerald-300/50 hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isAccepting ? "Accepting..." : "Accept"}
      </button>

      {error ? (
        <p className="max-w-56 text-[11px] font-semibold leading-4 text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
