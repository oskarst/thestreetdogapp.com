import {
  Heart,
  HeartHandshake,
  Minus,
  Moon,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DogCharacter } from "@/types/database";

const CHARACTER_CONFIG: Record<
  DogCharacter,
  { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; fill: string; stroke: string }
> = {
  friendly: { icon: Heart, fill: "fill-emerald-200", stroke: "text-emerald-600" },
  very_friendly: { icon: HeartHandshake, fill: "fill-pink-200", stroke: "text-pink-600" },
  indifferent: { icon: Minus, fill: "fill-slate-200", stroke: "text-slate-500" },
  sleeping: { icon: Moon, fill: "fill-indigo-200", stroke: "text-indigo-500" },
  afraid: { icon: TriangleAlert, fill: "fill-amber-200", stroke: "text-amber-600" },
  aggressive: { icon: ShieldAlert, fill: "fill-red-200", stroke: "text-red-600" },
};

interface CharacterIconProps {
  character: DogCharacter;
  className?: string;
}

export function CharacterIcon({ character, className }: CharacterIconProps) {
  const config = CHARACTER_CONFIG[character];
  if (!config) return null;
  const Icon = config.icon;
  return <Icon className={cn("size-5", config.fill, config.stroke, className)} />;
}

export { CHARACTER_CONFIG };
