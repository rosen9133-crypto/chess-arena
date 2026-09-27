"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import ChallengeNotificationPopup, {
  type ChallengeNotification,
} from "@/components/ChallengeNotificationPopup";

type GlobalNotificationsProps = {
  userId: string;
};

type FriendsRealtimePayload = {
  kind?: string;
  challengeId?: string;
  status?: string;
  gameId?: string;
};

function notifyBellToSync() {
  window.dispatchEvent(
    new Event("chess-arena:notifications-updated"),
  );
}

export default function GlobalNotifications({
  userId,
}: GlobalNotificationsProps) {
  const router = useRouter();
  const [gameChallenge, setGameChallenge] =
    useState<ChallengeNotification | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status !== 401) {
          console.error(
            "Unable to load global notifications:",
            response.status,
          );
        }

        return;
      }

      const data = (await response.json()) as {
        gameChallenge?: ChallengeNotification | null;
      };

      setGameChallenge(data.gameChallenge ?? null);
      notifyBellToSync();
    } catch (error) {
      console.error(
        "Global notifications load error:",
        error,
      );
    }
  }, []);

  useEffect(() => {
    void loadNotifications();


    const channel = supabase
      .channel(`friends:${userId}`)
      .on(
        "broadcast",
        { event: "friends-updated" },
        ({ payload }) => {
          const update = payload as FriendsRealtimePayload;

          if (update.kind === "game-challenge") {
            void loadNotifications();
          }

          router.refresh();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void loadNotifications();
        }
      });

    function refreshAfterReturning() {
      if (document.visibilityState === "visible") {
        void loadNotifications();
        router.refresh();
      }
    }

    function refreshAfterReconnect() {
      void loadNotifications();
      router.refresh();
    }

    document.addEventListener(
      "visibilitychange",
      refreshAfterReturning,
    );
    window.addEventListener("online", refreshAfterReconnect);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        refreshAfterReturning,
      );
      window.removeEventListener(
        "online",
        refreshAfterReconnect,
      );

      void supabase.removeChannel(channel);
    };
  }, [loadNotifications, router, userId]);

  if (!gameChallenge) {
    return null;
  }

  return (
    <ChallengeNotificationPopup
      challenge={gameChallenge}
      onDismiss={() => {
        setGameChallenge(null);
        notifyBellToSync();
      }}
    />
  );
}
