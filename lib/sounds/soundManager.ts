import { Howl } from "howler";

export type SoundName =
  | "move"
  | "capture"
  | "check"
  | "castle"
  | "promote"
  | "win"
  | "lose"
  | "draw";

const sounds: Partial<Record<SoundName, Howl>> = {};

let initialized = false;

export function preloadSounds() {
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
}

export function playSound(name: SoundName) {
  const sound = sounds[name];

  if (!sound) {
    return;
  }

  sound.stop();
  sound.play();
}