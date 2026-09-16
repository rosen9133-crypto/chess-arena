"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type AddFriendButtonProps = {
  addresseeId: string;
  initialStatus?: "idle" | "sent";
};

type FriendRequestResponse = {
  message?: string;
  error?: string;
};

export default function AddFriendButton({
  addresseeId,
  initialStatus = "idle",
}: AddFriendButtonProps) {
  const router = useRouter();
  const [actionStatus, setActionStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >(initialStatus);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setActionStatus(initialStatus);
    setMessage("");
  }, [initialStatus]);

  const isSent = actionStatus === "sent";
  const isSending = actionStatus === "sending";
  const hasError = actionStatus === "error";

  async function sendFriendRequest() {
    if (isSending || isSent) return;

    setActionStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/friends/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ addresseeId }),
      });

      const data = (await response.json()) as FriendRequestResponse;

      if (!response.ok) {
        setActionStatus("error");
        setMessage(data.error ?? "Could not send friend request.");
        return;
      }

      setActionStatus("sent");
      setMessage(data.message ?? "Friend request sent.");

      const channel = supabase.channel(`friends:${addresseeId}`);

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
      setActionStatus("error");
      setMessage("Could not send friend request.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={sendFriendRequest}
        disabled={isSending || isSent}
        className={`rounded-xl border px-5 py-2.5 text-sm font-black transition ${
          isSent
            ? "cursor-default border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
            : "border-amber-400/30 bg-amber-400/10 text-amber-300 hover:border-amber-300/55 hover:bg-amber-400/15 disabled:cursor-wait disabled:opacity-70"
        }`}
      >
        {isSending
          ? "Sending..."
          : isSent
            ? "Request Sent"
            : "Add Friend"}
      </button>

      {message ? (
        <p
          className={`max-w-[280px] text-xs ${
            hasError ? "text-rose-400" : "text-emerald-400"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
