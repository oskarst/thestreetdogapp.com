/**
 * Tiny shared validators for API route inputs. Avoids pulling Zod into
 * every micro-route just to do shape checks the path/body layer should
 * have caught.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUUID(s: unknown): s is string {
  return typeof s === "string" && UUID_RE.test(s);
}

/**
 * Sanitize user-supplied search strings before they're interpolated into
 * a PostgREST `.or()` filter expression. PostgREST's filter grammar uses
 * `,` as a clause separator, `()` for grouping, `:` for value markers,
 * `*` for the IN-list, `%` as the wildcard, and `{}` for array literals
 * — any of those would let an attacker break out of the `.or()` clause
 * the route built and add arbitrary new filters.
 *
 * Strips the dangerous chars rather than rejecting because legitimate
 * search inputs (e.g. "hello, world") would otherwise get bounced.
 */
export function sanitizeSearch(raw: string, maxLen = 50): string {
  return raw
    .replace(/[,()'":*%\\{}]/g, "")
    .trim()
    .slice(0, maxLen);
}
