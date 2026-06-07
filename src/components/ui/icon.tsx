import { cn } from "@/lib/utils";

/**
 * Two-tone icon sprite — render once at the app shell so any page can
 * reference symbols via <Icon name="..." />.
 *
 * Each symbol uses currentColor + opacity for the duotone effect, so icons
 * automatically retint based on their container's `color` value.
 */
export function IconSprite() {
  return (
    <svg
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      aria-hidden="true"
    >
      <defs>
        {/* Achievement / content icons (filled duotone) */}
        <symbol id="i-dog" viewBox="0 0 24 24">
          {/* floppy ears */}
          <ellipse cx="6.4" cy="11" rx="2.4" ry="4.6" fill="currentColor" opacity="0.35" />
          <ellipse cx="17.6" cy="11" rx="2.4" ry="4.6" fill="currentColor" opacity="0.35" />
          {/* head */}
          <circle cx="12" cy="12" r="5.9" fill="currentColor" opacity="0.35" />
          {/* snout */}
          <ellipse cx="12" cy="15" rx="2.7" ry="2.1" fill="currentColor" opacity="0.5" />
          {/* eyes */}
          <circle cx="9.9" cy="11" r="0.95" fill="currentColor" />
          <circle cx="14.1" cy="11" r="0.95" fill="currentColor" />
          {/* nose */}
          <ellipse cx="12" cy="14.2" rx="1.5" ry="1.05" fill="currentColor" />
        </symbol>
        <symbol id="i-paw" viewBox="0 0 24 24">
          <ellipse cx="12" cy="16" rx="5.5" ry="4" fill="currentColor" opacity="0.35" />
          <ellipse cx="6.5" cy="10" rx="2" ry="2.5" fill="currentColor" />
          <ellipse cx="10" cy="6.5" rx="1.8" ry="2.4" fill="currentColor" />
          <ellipse cx="14" cy="6.5" rx="1.8" ry="2.4" fill="currentColor" />
          <ellipse cx="17.5" cy="10" rx="2" ry="2.5" fill="currentColor" />
        </symbol>
        <symbol id="i-target" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
          <circle cx="12" cy="12" r="6.5" fill="currentColor" opacity="0.35" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </symbol>
        <symbol id="i-flag" viewBox="0 0 24 24">
          <rect x="6" y="3" width="1.5" height="18" fill="currentColor" />
          <path d="M7.5 4 L18 4 L15.5 7.5 L18 11 L7.5 11 Z" fill="currentColor" opacity="0.35" />
        </symbol>
        <symbol id="i-medal" viewBox="0 0 24 24">
          <path d="M9 2 L12 11 L7 11 Z" fill="currentColor" opacity="0.35" />
          <path d="M15 2 L17 11 L12 11 Z" fill="currentColor" opacity="0.35" />
          <circle cx="12" cy="16" r="5.5" fill="currentColor" />
        </symbol>
        <symbol id="i-fire" viewBox="0 0 24 24">
          <path
            d="M12 2 C9 7 6 10 6 14.5 C6 18.5 8.5 22 12 22 C15.5 22 18 18.5 18 14.5 C18 11 15 9 13 7 C13 9 12 11 11 11 C11 9 11.5 6 12 2 Z"
            fill="currentColor"
            opacity="0.35"
          />
          <path
            d="M12 9 C10.5 12 10 13.5 10 15.5 C10 18 11 20 12 20 C13 20 14 18 14 15.5 C14 13.5 13 12 12 9 Z"
            fill="currentColor"
          />
        </symbol>

        {/* Character (dog mood) face icons */}
        <symbol id="i-friendly" viewBox="0 0 24 24">
          <circle cx="9" cy="10" r="1" fill="currentColor" />
          <circle cx="15" cy="10" r="1" fill="currentColor" />
          <path d="M8 14 Q12 17 16 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>
        <symbol id="i-veryfriendly" viewBox="0 0 24 24">
          <path d="M7 10.5 Q9 8 11 10.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M13 10.5 Q15 8 17 10.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8 13.5 Q12 17.5 16 13.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>
        <symbol id="i-sleeping" viewBox="0 0 24 24">
          <path d="M7 11 L10 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M14 11 L17 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M9.5 15 Q12 14 14.5 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path
            d="M16 7 L20 7 L16 11 L20 11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
          />
        </symbol>
        <symbol id="i-indifferent" viewBox="0 0 24 24">
          <circle cx="9" cy="10.5" r="1" fill="currentColor" />
          <circle cx="15" cy="10.5" r="1" fill="currentColor" />
          <path d="M8 15 L16 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>
        <symbol id="i-afraid" viewBox="0 0 24 24">
          <circle cx="9" cy="10" r="1.1" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="15" cy="10" r="1.1" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 16 Q12 12.5 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M19 5 Q20.5 7.5 19 9 Q17.5 7.5 19 5 Z" fill="currentColor" opacity="0.5" />
        </symbol>
        <symbol id="i-aggressive" viewBox="0 0 24 24">
          <path d="M6 9 L10 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M14 11 L18 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8 17 Q12 13 16 17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>

        {/* Navigation icons */}
        <symbol id="i-home" viewBox="0 0 24 24">
          <path d="M4 11 L12 4 L20 11 L20 20 L14 20 L14 14 L10 14 L10 20 L4 20 Z" fill="currentColor" opacity="0.35" />
          <path d="M4 11 L12 4 L20 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-pin" viewBox="0 0 24 24">
          <path d="M12 22 C7 17 5 13 5 10 A7 7 0 0 1 19 10 C19 13 17 17 12 22 Z" fill="currentColor" opacity="0.35" />
          <circle cx="12" cy="10" r="2.5" fill="currentColor" />
        </symbol>
        <symbol id="i-image" viewBox="0 0 24 24">
          <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="9" cy="10" r="1.5" fill="currentColor" />
          <path d="M5 17 L10 12 L14 16 L17 14 L19 17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </symbol>
      </defs>
    </svg>
  );
}

export type IconName =
  | "dog"
  | "paw"
  | "target"
  | "flag"
  | "medal"
  | "fire"
  | "friendly"
  | "veryfriendly"
  | "sleeping"
  | "indifferent"
  | "afraid"
  | "aggressive"
  | "home"
  | "pin"
  | "image";

interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  name: IconName;
  size?: number | string;
}

/**
 * Reference a symbol from the IconSprite. Inherits color via currentColor.
 *
 * @example
 *   <Icon name="paw" className="text-ink size-5" />
 */
export function Icon({ name, size = 22, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      fill="currentColor"
      className={cn("inline-block shrink-0", className)}
      {...props}
    >
      <use href={`#i-${name}`} />
    </svg>
  );
}
