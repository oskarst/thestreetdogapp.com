/**
 * Dog size is stored as an INTEGER 1-10 in the sightings table (CHECK
 * 1..10). The UI collects it as five buckets — XS/S/M/L/XL — each mapped to
 * a representative integer so existing 1-10 data stays valid and readable
 * with no migration. sizeLabel() buckets any stored value back to a label.
 */

export interface SizeOption {
  /** Integer written to the sightings.size column. */
  value: number;
  label: string;
  /** Optional breed hint shown under the extremes. */
  hint?: string;
}

export const SIZE_OPTIONS: SizeOption[] = [
  { value: 1, label: "XS", hint: "Chihuahua" },
  { value: 3, label: "S" },
  { value: 5, label: "M" },
  { value: 8, label: "L" },
  { value: 10, label: "XL", hint: "Shepherd" },
];

/** Default selection (medium) — matches the previous slider default of 5. */
export const DEFAULT_SIZE = 5;

/**
 * Bucket any stored 1-10 size into one of the five labels. Used for display
 * (e.g. the sighting list) so old slider-era values render consistently.
 */
export function sizeLabel(size: number): string {
  if (size <= 2) return "XS";
  if (size <= 4) return "S";
  if (size <= 6) return "M";
  if (size <= 8) return "L";
  return "XL";
}
