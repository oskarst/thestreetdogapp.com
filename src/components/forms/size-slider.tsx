"use client";

import { Badge } from "@/components/ui/badge";

interface SizeSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function SizeSlider({ value, onChange }: SizeSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Small</span>
        <input
          type="range"
          min={1}
          max={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1 appearance-none rounded-full bg-muted accent-primary cursor-pointer"
        />
        <span className="text-xs text-muted-foreground">Large</span>
        <Badge variant="secondary" className="min-w-[2rem] justify-center text-sm">
          {value}
        </Badge>
      </div>
    </div>
  );
}
