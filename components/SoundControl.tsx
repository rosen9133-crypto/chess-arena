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
    <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 shadow-lg">
      <button
        type="button"
        onClick={handleToggleMute}
        aria-label={
          muted ? "Unmute sound" : "Mute sound"
        }
        title={
          muted ? "Unmute sound" : "Mute sound"
        }
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-lg transition hover:border-yellow-400 active:scale-[0.96]"
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
          className="h-2 w-full cursor-pointer accent-yellow-400"
        />

        <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-300">
          {displayedVolume}%
        </span>
      </div>
    </div>
  );
}