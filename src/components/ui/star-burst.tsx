"use client";

/**
 * One-shot star-particle burst, centered on its nearest positioned
 * ancestor. Reuses the `lvlup-star-fly` keyframes from the level-up
 * splash. Mount it when the celebration should fire; unmount (or key it)
 * to fire again. Purely decorative — hidden from a11y and reduced motion.
 */
export function StarBurst({
  radius = 70,
  size = 14,
  count = 8,
}: {
  /** How far the stars fly, in px. */
  radius?: number;
  /** Font size of each star, in px. */
  size?: number;
  count?: number;
}) {
  const stars = Array.from({ length: count }, (_, i) => {
    // Even spread with a slight per-star wobble so it reads hand-thrown.
    const angle = (i / count) * Math.PI * 2 + (i % 2 === 0 ? 0.2 : -0.15);
    const r = radius * (i % 3 === 0 ? 1 : 0.82);
    return {
      dx: `${Math.round(Math.cos(angle) * r)}px`,
      dy: `${Math.round(Math.sin(angle) * r)}px`,
      d: `${1.1 + (i % 4) * 0.15}s`,
    };
  });

  return (
    <span
      aria-hidden
      className="absolute inset-0 grid place-items-center pointer-events-none overflow-visible"
    >
      {stars.map((s, i) => (
        <span
          key={i}
          className="lvlup-star"
          style={
            {
              fontSize: `${size}px`,
              "--dx": s.dx,
              "--dy": s.dy,
              "--d": s.d,
            } as React.CSSProperties
          }
        >
          ✦
        </span>
      ))}
    </span>
  );
}
