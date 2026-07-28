export type SoundName =
  | "move"
  | "capture"
  | "check"
  | "castle"
  | "promote"
  | "win"
  | "lose"
  | "draw";

const sounds: Partial<Record<SoundName, HTMLAudioElement>> = {};

export function preloadSounds() {
  if (typeof window === "undefined") {
    return;
  }

  const soundFiles: Record<SoundName, string> = {
    move: "/sounds/move.mp3",
    capture: "/sounds/capture.mp3",
    check: "/sounds/check.mp3",
    castle: "/sounds/castle.mp3",
    promote: "/sounds/promote.mp3",
    win: "/sounds/win.mp3",
    lose: "/sounds/lose.mp3",
    draw: "/sounds/draw.mp3",
  };

  (Object.keys(soundFiles) as SoundName[]).forEach((name) => {
    const audio = new Audio(soundFiles[name]);
    audio.preload = "auto";
    sounds[name] = audio;
  });
}

export function playSound(name: SoundName) {
  const sound = sounds[name];

  if (!sound) {
    return;
  }

  sound.currentTime = 0;

  sound.play().catch(() => {
    // ignore autoplay errors
  });
}