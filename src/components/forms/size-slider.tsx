"use client";

import { Slider } from "@/components/ui/slider";
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
        <Slider
          min={1}
          max={10}
          value={[value]}
          onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground">Large</span>
        <Badge variant="secondary" className="min-w-[2rem] justify-center text-sm">
          {value}
        </Badge>
      </div>
    </div>
  );
}
