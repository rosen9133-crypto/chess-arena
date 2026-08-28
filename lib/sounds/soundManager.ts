import { Howl, Howler } from "howler";

export type SoundName =
  | "move"
  | "capture"
  | "check"
  | "castle"
  | "promote"
  | "win"
  | "lose"
  | "draw"
  | "victory-applause"
  | "defeat"
  | "clock-warning"
  | "clock-tick"
  | "clock-timeout";

const sounds: Partial<Record<SoundName, Howl>> = {};

const VOLUME_STORAGE_KEY = "chess-arena-master-volume";
const MUTED_STORAGE_KEY = "chess-arena-muted";

const DEFAULT_VOLUME = 0.7;

let initialized = false;
let masterVolume = DEFAULT_VOLUME;
let muted = false;
let soundSettingsLoaded = false;

function clampVolume(volume: number) {
  return Math.min(Math.max(volume, 0), 1);
}

function applySoundSettings() {
  Howler.volume(masterVolume);
  Howler.mute(muted);
}

export function loadSoundSettings() {
  if (soundSettingsLoaded) {
    return;
  }

  soundSettingsLoaded = true;

  if (typeof window !== "undefined") {
    const storedVolume = window.localStorage.getItem(
      VOLUME_STORAGE_KEY,
    );

    const storedMuted = window.localStorage.getItem(
      MUTED_STORAGE_KEY,
    );

    if (storedVolume !== null) {
      const parsedVolume = Number(storedVolume);

      if (Number.isFinite(parsedVolume)) {
        masterVolume = clampVolume(parsedVolume);
      }
    }

    if (storedMuted !== null) {
      muted = storedMuted === "true";
    }
  }

  applySoundSettings();
}

export function preloadSounds() {
  loadSoundSettings();

  if (initialized) {
    return;
  }

  initialized = true;

  sounds.move = new Howl({
    src: ["/sounds/move.mp3"],
    preload: true,
  });

  sounds.capture = new Howl({
    src: ["/sounds/capture.mp3"],
    preload: true,
  });

  sounds.check = new Howl({
    src: ["/sounds/check.mp3"],
    preload: true,
  });

  sounds.castle = new Howl({
    src: ["/sounds/castle.mp3"],
    preload: true,
  });

  sounds.promote = new Howl({
    src: ["/sounds/promote.mp3"],
    preload: true,
  });

  sounds.win = new Howl({
    src: ["/sounds/win.mp3"],
    preload: true,
  });

  sounds.lose = new Howl({
    src: ["/sounds/lose.mp3"],
    preload: true,
  });

  sounds.draw = new Howl({
    src: ["/sounds/draw.mp3"],
    preload: true,
  });

  sounds["victory-applause"] = new Howl({
    src: ["/sounds/victory-applause.mp3"],
    preload: true,
  });

  sounds.defeat = new Howl({
    src: ["/sounds/defeat.mp3"],
    preload: true,
  });

  sounds["clock-warning"] = new Howl({
    src: ["/sounds/clock-warning.mp3"],
    preload: true,
  });

  sounds["clock-tick"] = new Howl({
    src: ["/sounds/clock-tick.wav"],
    preload: true,
  });

  sounds["clock-timeout"] = new Howl({
    src: ["/sounds/clock-timeout.mp3"],
    preload: true,
  });

  applySoundSettings();
}

export function playSound(name: SoundName) {
  const sound = sounds[name];

  if (!sound) {
    return;
  }

  sound.stop();
  sound.play();
}

export function playSoundAndThen(
  name: SoundName,
  onEnd: () => void,
) {
  const sound = sounds[name];

  if (!sound) {
    onEnd();
    return;
  }

  sound.stop();
  sound.once("end", onEnd);
  sound.play();
}

export function stopSound(name: SoundName) {
  sounds[name]?.stop();
}

export function getMasterVolume() {
  loadSoundSettings();

  return masterVolume;
}

export function isSoundMuted() {
  loadSoundSettings();

  return muted;
}

export function setMasterVolume(volume: number) {
  const nextVolume = clampVolume(volume);

  masterVolume = nextVolume;

  if (nextVolume > 0 && muted) {
    muted = false;
  }

  applySoundSettings();

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      VOLUME_STORAGE_KEY,
      String(masterVolume),
    );

    window.localStorage.setItem(
      MUTED_STORAGE_KEY,
      String(muted),
    );
  }
}

export function setSoundMuted(nextMuted: boolean) {
  muted = nextMuted;

  applySoundSettings();

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      MUTED_STORAGE_KEY,
      String(muted),
    );
  }
}

export function toggleSoundMuted() {
  setSoundMuted(!muted);

  return muted;
}