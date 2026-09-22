import { useEffect, useState } from "react";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function Countdown({ target, compact = false }: { target: string; compact?: boolean }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = new Date(target).getTime() - now;
  const { days, hours, minutes, seconds } = parts(diff);

  if (diff <= 0) {
    return <span className="text-sm font-medium text-live">Starting now</span>;
  }

  if (compact) {
    return (
      <span className="text-sm font-medium tabular-nums">
        {days > 0 ? `${days}d ` : ""}
        {hours}h {minutes}m
      </span>
    );
  }

  const cells = [
    { label: "days", value: days },
    { label: "hours", value: hours },
    { label: "mins", value: minutes },
    { label: "secs", value: seconds },
  ];

  return (
    <div className="flex gap-2">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="min-w-16 rounded-xl bg-sand px-3 py-2 text-center text-sand-foreground"
        >
          <div className="font-display text-2xl tabular-nums leading-none">
            {String(cell.value).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[0.65rem] uppercase tracking-widest opacity-70">
            {cell.label}
          </div>
        </div>
      ))}
    </div>
  );
}
