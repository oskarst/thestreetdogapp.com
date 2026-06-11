import { getTranslations } from "next-intl/server";
import { getLeaderboardWindow } from "@/lib/db/users";
import { deriveLevel, deriveTitle } from "@/lib/dashboard";
import { formatScore } from "@/lib/scoring";
import { cn } from "@/lib/utils";

/**
 * Leaderboard strip shown under the mission chooser: the player's rank plus
 * the players just above and below them (4 rows total). Renders nothing if
 * the window comes back empty (e.g. brand-new account before any scoring).
 */
export async function LeaderboardBlock() {
  const [t, rows] = await Promise.all([
    getTranslations("missions"),
    getLeaderboardWindow(),
  ]);

  if (rows.length === 0) return null;

  return (
    <section className="card-soft px-4 py-4">
      <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
        {t("leaderboardLabel")}
      </div>
      <h2 className="text-[17.6px] font-semibold leading-tight mt-0.5 mb-3">
        {t("leaderboardTitle")}
      </h2>

      <ol className="space-y-1.5">
        {rows.map((row) => {
          const { level } = deriveLevel(row.score);
          const { title } = deriveTitle(level);
          return (
            <li
              key={row.user_id}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2",
                row.is_me
                  ? "bg-green-soft border border-green-deep/30"
                  : "bg-muted/40"
              )}
            >
              <span className="font-mono text-[13px] font-semibold tabular-nums w-7 shrink-0 text-muted-foreground">
                #{row.rank}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-[14.3px] truncate">
                    {row.is_me ? t("you") : row.nickname ?? "—"}
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.06em] uppercase text-green-deep shrink-0">
                    {title}
                  </span>
                </div>
                <div className="font-mono text-[11px] tracking-[0.04em] text-muted-foreground">
                  {t("levelShort", { level })}
                </div>
              </div>
              <span className="font-mono text-[13.5px] font-semibold tabular-nums shrink-0">
                {formatScore(row.score)}{" "}
                <span className="text-muted-foreground text-[11px]">XP</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
