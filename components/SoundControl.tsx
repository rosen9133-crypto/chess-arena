"use client";

import { useEffect, useRef, useState } from "react";

import {
  getMasterVolume,
  isSoundMuted,
  setMasterVolume,
  toggleSoundMuted,
} from "@/lib/sounds/soundManager";

export default function SoundControl() {
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);

  const previousVolumeRef = useRef(0.7);

  useEffect(() => {
    const savedVolume = getMasterVolume();
    const savedMuted = isSoundMuted();

    setVolume(savedVolume);
    setMuted(savedMuted);

    if (savedVolume > 0) {
      previousVolumeRef.current = savedVolume;
    }
  }, []);

  function handleVolumeChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const nextVolume =
      Number(event.target.value) / 100;

    setVolume(nextVolume);

    if (nextVolume > 0) {
      previousVolumeRef.current = nextVolume;

      if (muted) {
        setMuted(false);
      }
    } else {
      setMuted(true);
    }

    setMasterVolume(nextVolume);
  }

  function handleToggleMute() {
    if (!muted && volume > 0) {
      previousVolumeRef.current = volume;
    }

    if (volume === 0) {
      const restoredVolume =
        previousVolumeRef.current > 0
          ? previousVolumeRef.current
          : 0.7;

      setMasterVolume(restoredVolume);
      setVolume(restoredVolume);
      setMuted(false);

      return;
    }

    const nextMuted = toggleSoundMuted();

    setMuted(nextMuted);
  }

  const displayedVolume =
    muted ? 0 : Math.round(volume * 100);

  const soundIcon =
    muted || volume === 0
      ? "🔇"
      : volume < 0.5
        ? "🔉"
        : "🔊";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-300/25 bg-[linear-gradient(180deg,rgba(12,10,8,0.88),rgba(5,7,10,0.92))] px-3 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(251,191,36,0.06)]">
      <button
        type="button"
        onClick={handleToggleMute}
        aria-label={
          muted ? "Unmute sound" : "Mute sound"
        }
        title={
          muted ? "Unmute sound" : "Mute sound"
        }
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200/15 bg-black/35 text-lg shadow-inner transition hover:border-amber-400/55 hover:bg-amber-300/10 active:scale-[0.96]"
      >
        {soundIcon}
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={displayedVolume}
          onChange={handleVolumeChange}
          aria-label="Master volume"
          className="h-2 w-full cursor-pointer accent-amber-400"
        />

        <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-amber-100/90">
          {displayedVolume}%
        </span>
      </div>
    </div>
  );
}