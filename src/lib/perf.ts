/**
 * Lightweight timing helper for server components / route handlers.
 * Logs `[perf] {label} = {ms}ms` to stdout — surfaces in Vercel function
 * logs. Wrap any await with `time("label", () => fn())` to measure it.
 *
 * No-op in production builds is NOT what we want here — these are
 * diagnostic logs that should ship to Vercel so we can see real
 * user-region latency. Remove the perf calls once we've nailed the bug.
 */
export async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const ms = Math.round(performance.now() - start);
    console.log(`[perf] ${label} = ${ms}ms`);
  }
}
