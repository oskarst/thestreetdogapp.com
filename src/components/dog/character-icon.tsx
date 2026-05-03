import { Icon, type IconName } from "@/components/ui/icon";
import type { DogCharacter } from "@/types/database";

const CHARACTER_ICON: Record<DogCharacter, IconName> = {
  friendly: "friendly",
  very_friendly: "veryfriendly",
  indifferent: "indifferent",
  sleeping: "sleeping",
  afraid: "afraid",
  aggressive: "aggressive",
};

interface CharacterIconProps {
  character: DogCharacter;
  className?: string;
  size?: number;
}

/**
 * Two-tone glyph for a dog's character mood. Inherits color from container
 * via currentColor.
 */
export function CharacterIcon({
  character,
  className,
  size = 20,
}: CharacterIconProps) {
  const name = CHARACTER_ICON[character];
  if (!name) return null;
  return <Icon name={name} size={size} className={className} />;
}
