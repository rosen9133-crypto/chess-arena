"use client";

type ChessColor = "w" | "b";

type ChessClockProps = {
  whiteTime: number;
  blackTime: number;
  activeClock: ChessColor | null;
  isClockRunning: boolean;
};

function formatTime(seconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(seconds));

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
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
        <span className="text-sm text-slate-400">
          {icon} {label}
        </span>

        {active && (
          <span className="text-xs font-semibold text-green-400">
            ● LIVE
          </span>
        )}
      </div>

      <p className="text-center font-mono text-4xl font-bold text-white">
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
}: ChessClockProps) {
  return (
    <div className="w-72 rounded-xl bg-slate-800 p-5 shadow-lg">
      <h2 className="mb-5 text-2xl font-bold text-yellow-400">
        ⏱ Chess Clock
      </h2>

      <div className="space-y-4">
        <ClockRow
          label="Black"
          icon="⚫"
          time={blackTime}
          active={
            isClockRunning &&
            activeClock === "b"
          }
        />

        <ClockRow
          label="White"
          icon="⚪"
          time={whiteTime}
          active={
            isClockRunning &&
            activeClock === "w"
          }
        />
      </div>
    </div>
  );
}