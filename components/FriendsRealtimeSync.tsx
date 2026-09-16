"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type FriendsRealtimeSyncProps = {
  userId: string;
};

export default function FriendsRealtimeSync({
  userId,
}: FriendsRealtimeSyncProps) {
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel(`friends:${userId}`)
      .on("broadcast", { event: "friends-updated" }, () => {
        router.refresh();
      })
      .subscribe();

    // Safety fallback: if a Realtime broadcast is missed while the browser
    // reconnects or the tab changes state, refresh the authoritative server
    // data automatically. This runs only while the Friends tab is mounted.
    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return null;
}
