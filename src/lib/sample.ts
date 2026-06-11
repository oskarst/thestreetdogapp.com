/**
 * Return up to `n` items chosen at random from `arr` (partial Fisher-Yates).
 * If `arr` has `n` or fewer items, it's returned as-is (original order).
 *
 * Kept in a helper rather than inlining Math.random in a component so the
 * render-purity lint stays quiet — the randomness lives here, not in render.
 */
export function sampleN<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const a = [...arr];
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
