"use client";

import { useState } from "react";
import AcceptGameChallengeButton from "@/components/AcceptGameChallengeButton";
import DeclineGameChallengeButton from "@/components/DeclineGameChallengeButton";

type Props = {
  challengeId: string;
  challengerId: string;
  challengerUsername: string;
  bulletRating: number;
  blitzRating: number;
  rapidRating: number;
  timeControlLabel: string;
  timeControl: string;
  rated: boolean;
};

export default function IncomingGameChallengeRow({
  challengeId,
  challengerId,
  challengerUsername,
  bulletRating,
  blitzRating,
  rapidRating,
  timeControlLabel,
  timeControl,
  rated,
}: Props) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="flex flex-col gap-4 bg-[linear-gradient(90deg,rgba(245,158,11,0.07),rgba(2,6,23,0.35))] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 font-black text-amber-300">
          {challengerUsername.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0">
          <p className="truncate font-black text-slate-100">
            {challengerUsername}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Bullet {Math.round(bulletRating)}
            <span className="mx-2 text-slate-700">•</span>
            Blitz {Math.round(blitzRating)}
            <span className="mx-2 text-slate-700">•</span>
            Rapid {Math.round(rapidRating)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className="inline-flex items-center rounded-lg border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-amber-300">
          {timeControlLabel} · {timeControl}
        </span>

        <span
          className={`inline-flex items-center rounded-lg border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${
            rated
              ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
              : "border-sky-400/25 bg-sky-400/10 text-sky-300"
          }`}
        >
          {rated ? "Rated" : "Casual"}
        </span>

        <AcceptGameChallengeButton
          challengeId={challengeId}
          challengerId={challengerId}
          challengerUsername={challengerUsername}
          onAccepted={() => setIsVisible(false)}
        />

        <DeclineGameChallengeButton
          challengeId={challengeId}
          challengerId={challengerId}
          challengerUsername={challengerUsername}
          onDeclined={() => setIsVisible(false)}
        />
      </div>
    </div>
  );
}
