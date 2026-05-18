"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { DogCard } from "@/components/dog/dog-card";
import { cn } from "@/lib/utils";
import type { DogListRow } from "@/types/database";

type FilterTab = "all" | "first_spotted" | "my_spottings" | "favorites";

const PAGE_SIZE = 12;

interface DashboardContentProps {
  dogs: DogListRow[];
  userId: string;
  favoriteIds: string[];
  caughtDogIds: string[];
}

export function DashboardContent({
  dogs,
  userId,
  favoriteIds,
  caughtDogIds,
}: DashboardContentProps) {
  const t = useTranslations("dashboard");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const caughtSet = useMemo(() => new Set(caughtDogIds), [caughtDogIds]);

  const tabs: { value: FilterTab; label: string; caption: string }[] = [
    { value: "all", label: t("allDogs"), caption: t("allDogsCaption") },
    {
      value: "first_spotted",
      label: t("firstSpotted"),
      caption: t("firstSpottedCaption"),
    },
    {
      value: "my_spottings",
      label: t("mySpottings"),
      caption: t("mySpottingsCaption"),
    },
    { value: "favorites", label: t("favorites"), caption: t("favoritesCaption") },
  ];

  const filteredDogs = useMemo(() => {
    switch (activeTab) {
      case "first_spotted":
        return dogs.filter((d) => d.first_registered_by_id === userId);
      case "my_spottings":
        return dogs.filter((d) => caughtSet.has(d.id));
      case "favorites":
        return dogs.filter((d) => favoriteSet.has(d.id));
      default:
        return dogs;
    }
  }, [activeTab, dogs, userId, caughtSet, favoriteSet]);

  // Reset visible window when the tab changes — otherwise switching from
  // a 200-dog "All" view to a 3-dog "Favorites" view leaves a stale window.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [activeTab]);

  const shown = filteredDogs.slice(0, visible);
  const remaining = filteredDogs.length - shown.length;

  return (
    <div className="space-y-3" data-tour-id="dashboard-content">
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "flex-1 min-w-0 flex flex-col items-center gap-0.5 rounded-md px-2 py-1.5 transition-colors",
              activeTab === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="text-sm font-medium leading-tight whitespace-nowrap">
              {tab.label}
            </span>
            <span className="font-mono text-[9px] tracking-[0.04em] leading-tight text-muted-foreground/80 truncate w-full text-center">
              {tab.caption}
            </span>
          </button>
        ))}
      </div>

      {filteredDogs.length === 0 ? (
        <div className="rounded-xl bg-muted/50 p-8 text-center text-sm text-muted-foreground">
          {t("noDogs")}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {shown.map((dog) => (
              <DogCard
                key={dog.id}
                dog={dog}
                userId={userId}
                isFavorited={favoriteSet.has(dog.id)}
                isCaught={caughtSet.has(dog.id)}
              />
            ))}
          </div>

          {remaining > 0 ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
                {t("showingOf", {
                  shown: shown.length,
                  total: filteredDogs.length,
                })}
              </span>
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-lg border border-rule-2 bg-card px-3.5 py-2 font-mono text-[11px] font-medium tracking-[0.06em] uppercase text-ink hover:bg-muted transition-colors"
              >
                {t("loadMore", { n: Math.min(PAGE_SIZE, remaining) })}
              </button>
            </div>
          ) : (
            filteredDogs.length > PAGE_SIZE && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setVisible(PAGE_SIZE)}
                  className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground hover:text-ink transition-colors"
                >
                  {t("collapseList")} ↑
                </button>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
