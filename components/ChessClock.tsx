"use client";

type ChessColor = "w" | "b";

type ChessClockProps = {
  whiteTime: number;
  blackTime: number;
  activeClock: ChessColor | null;
  isClockRunning: boolean;
  playerColor: ChessColor;
};

function formatTime(seconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function ClockRow({
  label,
  icon,
  time,
  active,
}: {
  label: string;
  icon: string;
  time: number;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        active
          ? "border-green-500 bg-green-500/10"
          : "border-slate-700 bg-slate-900"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">
          {icon} {label}
        </span>

        {active && (
          <span className="text-xs font-semibold text-green-400">
            ● LIVE
          </span>
        )}
      </div>

      <p
        className={`text-center font-mono text-4xl font-bold ${
          time <= 10
            ? "text-red-400"
            : time < 60
            ? "text-yellow-400"
            : "text-white"
        }`}
      >
        {formatTime(time)}
      </p>
    </div>
  );
}

export default function ChessClock({
  whiteTime,
  blackTime,
  activeClock,
  isClockRunning,
  playerColor,
}: ChessClockProps) {
  const whiteClock = (
    <ClockRow
      label="White"
      icon="⚪"
      time={whiteTime}
      active={isClockRunning && activeClock === "w"}
    />
  );

  const blackClock = (
    <ClockRow
      label="Black"
      icon="⚫"
      time={blackTime}
      active={isClockRunning && activeClock === "b"}
    />
  );

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <h2 className="mb-4 text-center text-lg font-bold">
        ⏱ Chess Clock
      </h2>

      <div className="space-y-4">
        {playerColor === "w" ? blackClock : whiteClock}
        {playerColor === "w" ? whiteClock : blackClock}
      </div>
    </div>
  );
}