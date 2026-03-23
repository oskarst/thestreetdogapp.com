"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { DogCard } from "@/components/dog/dog-card";
import { cn } from "@/lib/utils";
import type { DogRow } from "@/types/database";

type FilterTab = "all" | "first_caught" | "my_catches" | "favorites";

interface DashboardContentProps {
  dogs: DogRow[];
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
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const caughtSet = useMemo(() => new Set(caughtDogIds), [caughtDogIds]);

  const tabs: { value: FilterTab; label: string }[] = [
    { value: "all", label: t("allDogs") },
    { value: "first_caught", label: t("firstCaught") },
    { value: "my_catches", label: t("myCatches") },
    { value: "favorites", label: t("favorites") },
  ];

  const filteredDogs = useMemo(() => {
    switch (activeTab) {
      case "first_caught":
        return dogs.filter((d) => d.first_registered_by_id === userId);
      case "my_catches":
        return dogs.filter((d) => caughtSet.has(d.id));
      case "favorites":
        return dogs.filter((d) => favoriteSet.has(d.id));
      default:
        return dogs;
    }
  }, [activeTab, dogs, userId, caughtSet, favoriteSet]);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredDogs.length === 0 ? (
        <div className="rounded-xl bg-muted/50 p-8 text-center text-sm text-muted-foreground">
          {t("noDogs")}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDogs.map((dog) => (
            <DogCard
              key={dog.id}
              dog={dog}
              userId={userId}
              isFavorited={favoriteSet.has(dog.id)}
              isCaught={caughtSet.has(dog.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
