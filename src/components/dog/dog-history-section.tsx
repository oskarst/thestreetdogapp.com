"use client";

import { useRef, useState } from "react";
import { SectionLabel } from "@/components/ui/section-label";
import { LocationHistoryMap } from "@/components/map/location-history-map";
import { DailyActivityMap } from "@/components/map/daily-activity-map";
import { SightingList } from "@/components/dog/sighting-list";
import type { SightingWithUser } from "@/lib/db/sightings";

interface Loc {
  latitude: number;
  longitude: number;
  timestamp: string;
  nickname: string;
  notes: string | null;
}

/**
 * Bottom of the dog profile: the location-history map, the optional 24h map,
 * and the sighting log. Tapping a sighting in the log focuses (opens + pans to)
 * its marker on the location-history map.
 */
export function DogHistorySection({
  sightings,
  locations,
  dailySightings,
  showDailyMap,
}: {
  sightings: SightingWithUser[];
  locations: Loc[];
  dailySightings: Loc[];
  showDailyMap: boolean;
}) {
  const [focus, setFocus] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  function handleSelect(index: number) {
    setFocus(index);
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="space-y-4">
      {locations.length > 0 && (
        <div ref={mapRef}>
          <SectionLabel meta={`${locations.length} sightings`}>
            Location History
          </SectionLabel>
          <div className="rounded-xl border border-rule overflow-hidden">
            <LocationHistoryMap locations={locations} focusIndex={focus} />
          </div>
        </div>
      )}

      {showDailyMap && (
        <div>
          <SectionLabel meta={`${dailySightings.length} in last 24h`}>
            Today&apos;s Activity
          </SectionLabel>
          <div className="rounded-xl border border-rule overflow-hidden">
            <DailyActivityMap sightings={dailySightings} />
            <div className="px-3 py-2 border-t border-rule bg-background font-mono text-[11px] tracking-[0.04em] text-muted-foreground">
              markers numbered oldest (1) to newest ({dailySightings.length})
            </div>
          </div>
        </div>
      )}

      {locations.length > 0 && (
        <p className="font-mono text-[11px] tracking-[0.04em] text-muted-foreground -mb-1">
          Tap a sighting below to find it on the map.
        </p>
      )}
      <SightingList
        sightings={sightings}
        onSelect={handleSelect}
        activeIndex={focus}
      />
    </div>
  );
}
