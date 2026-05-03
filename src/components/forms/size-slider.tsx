"use client";

interface SizeSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function SizeSlider({ value, onChange }: SizeSliderProps) {
  const pct = ((value - 1) / 9) * 100;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-rule-2 bg-card p-3.5">
      <div className="relative flex-1 h-1 bg-rule rounded">
        <div
          className="absolute inset-y-0 left-0 bg-ink rounded"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={1}
          max={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Size"
        />
        <div
          className="absolute top-1/2 size-[18px] rounded-full bg-card border-2 border-ink -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[13px] font-semibold tracking-[0.02em] text-ink min-w-[42px] text-right">
        {value}/10
      </span>
    </div>
  );
}
