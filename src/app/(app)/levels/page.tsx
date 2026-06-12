import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-cache";
import { getUserScore } from "@/lib/db/users";
import { deriveLevel, levelTable } from "@/lib/dashboard";
import { formatScore } from "@/lib/scoring";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export default async function LevelsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const score = await getUserScore(user.id).catch(() => null);
  const total = score?.total_score ?? 0;
  const { level: currentLevel } = deriveLevel(total);
  const levels = levelTable();

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      <div>
        <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
          Researcher · Ranks
        </div>
        <h1 className="text-[28.6px] font-bold tracking-[-0.02em] leading-tight">
          Levels
        </h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Every <b className="text-ink">{formatScore(1000)}</b> XP is a new
          level, and every level has its own rank — from Stray Spotter all the
          way up to Supreme Street Dog Professor.
        </p>
      </div>

      <ol className="space-y-1.5">
        {levels.map((lv) => {
          const isCurrent = lv.level === currentLevel;
          return (
            <li
              key={lv.level}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5",
                isCurrent
                  ? "bg-muted border border-ink/25"
                  : "bg-muted/30"
              )}
            >
              <span className="font-mono text-[13px] font-semibold tabular-nums w-8 shrink-0 text-muted-foreground">
                {String(lv.level).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[15px] truncate">
                    {lv.name}
                  </span>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-soft text-green-deep font-mono text-[10px] tracking-[0.06em] uppercase shrink-0">
                      <Icon name="medal" size={11} />
                      you
                    </span>
                  )}
                </div>
                <div className="font-mono text-[11px] tracking-[0.04em] text-muted-foreground">
                  {formatScore(lv.minXp)}
                  {lv.maxXp == null ? "+" : `–${formatScore(lv.maxXp)}`} XP
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
