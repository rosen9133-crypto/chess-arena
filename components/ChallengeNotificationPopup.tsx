"use client";

import AcceptGameChallengeButton from "@/components/AcceptGameChallengeButton";
import DeclineGameChallengeButton from "@/components/DeclineGameChallengeButton";

export type ChallengeNotification = {
  id: string;
  timeControl: string;
  initialTimeSeconds: number;
  incrementSeconds: number;
  rated: boolean;
  createdAt: string;
  challenger: {
    id: string;
    username: string;
    avatarUrl: string | null;
    bulletRating: number;
    blitzRating: number;
    rapidRating: number;
  };
};

type ChallengeNotificationPopupProps = {
  challenge: ChallengeNotification;
  onDismiss: () => void;
};

function getTimeControlLabel(
  initialTimeSeconds: number,
  incrementSeconds: number,
) {
  const initialMinutes = Math.floor(initialTimeSeconds / 60);

  return `${initialMinutes}+${incrementSeconds}`;
}

function getRelevantRating(challenge: ChallengeNotification) {
  switch (challenge.timeControl) {
    case "BULLET":
      return challenge.challenger.bulletRating;

    case "RAPID":
      return challenge.challenger.rapidRating;

    case "BLITZ":
    default:
      return challenge.challenger.blitzRating;
  }
}

export default function ChallengeNotificationPopup({
  challenge,
  onDismiss,
}: ChallengeNotificationPopupProps) {
  const timeControlLabel = getTimeControlLabel(
    challenge.initialTimeSeconds,
    challenge.incrementSeconds,
  );

  const relevantRating = Math.round(
    getRelevantRating(challenge),
  );

  const username = challenge.challenger.username;
  const avatarUrl = challenge.challenger.avatarUrl;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[200] flex justify-center sm:inset-x-auto sm:bottom-6 sm:right-6 sm:block">
      <div
        role="alert"
        aria-live="assertive"
        className="pointer-events-auto w-full max-w-[360px] overflow-hidden rounded-2xl border border-amber-400/30 bg-[#080d15]/95 shadow-[0_24px_80px_rgba(0,0,0,0.65),0_0_40px_rgba(245,158,11,0.08)] backdrop-blur-xl"
      >
        <div className="h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />

        <div className="bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.13),transparent_45%)] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10 text-sm text-amber-300">
                ♟
              </span>

              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">
                Game Challenge
              </p>
            </div>

            <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300">
              Live
            </span>
          </div>

          <div className="mt-4 flex min-w-0 items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${username} avatar`}
                className="h-14 w-14 shrink-0 rounded-xl border border-amber-400/25 object-cover shadow-[0_8px_25px_rgba(0,0,0,0.35)]"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-xl font-black text-amber-300 shadow-[0_8px_25px_rgba(0,0,0,0.35)]">
                {username.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-lg font-black text-white">
                {username}
              </p>

              <p className="mt-0.5 text-xs font-semibold text-slate-400">
                challenged you to a game
              </p>

              <p className="mt-1 text-xs font-bold text-slate-500">
                {challenge.timeControl.charAt(0) +
                  challenge.timeControl
                    .slice(1)
                    .toLowerCase()}{" "}
                rating{" "}
                <span className="text-slate-300">
                  {relevantRating}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex flex-1 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-amber-300">
              {timeControlLabel} · {challenge.timeControl}
            </span>

            <span
              className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] ${
                challenge.rated
                  ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
                  : "border-sky-400/25 bg-sky-400/10 text-sky-300"
              }`}
            >
              {challenge.rated ? "Rated" : "Casual"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="[&>div]:w-full [&_button]:w-full [&_button]:min-h-11 [&_button]:rounded-xl">
              <DeclineGameChallengeButton
                challengeId={challenge.id}
                challengerId={challenge.challenger.id}
                challengerUsername={username}
                onDeclined={onDismiss}
              />
            </div>

            <div className="[&>div]:w-full [&_button]:w-full [&_button]:min-h-11 [&_button]:rounded-xl">
              <AcceptGameChallengeButton
                challengeId={challenge.id}
                challengerId={challenge.challenger.id}
                challengerUsername={username}
                onAccepted={onDismiss}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}