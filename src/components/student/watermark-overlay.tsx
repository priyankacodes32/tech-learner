import { useEffect, useState } from "react";

// Not screen-capture prevention (no webpage can block that) — this is traceability:
// if a recording leaks, the signed-in identity + timestamp are burned into every frame.
export function WatermarkOverlay({ identity }: { identity: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const label = `${identity} · ${now.toLocaleTimeString()}`;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 select-none overflow-hidden [-webkit-touch-callout:none]"
      aria-hidden="true"
    >
      <div className="grid h-[140%] w-[140%] -translate-x-[8%] -translate-y-[8%] grid-cols-3 gap-12 rotate-[-20deg] place-items-center">
        {Array.from({ length: 15 }).map((_, i) => (
          <span
            key={i}
            className="whitespace-nowrap text-xs font-semibold text-white/35 mix-blend-difference"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
