import { BottomTabs } from "@/components/nav/bottom-tabs";
import { StickyAddDogButton } from "@/components/nav/sticky-add-dog-button";

/**
 * Fixed bottom chrome — owns positioning, background, top border, and
 * safe-area padding so the Add Dog button and the tab nav read as a
 * single footer block. Previously the Add Dog pill was a separate
 * floating layer above the tabs, which let it overlap content like the
 * map's dog-marker side panel; merging them into one container fixes
 * that and unifies the visual.
 */
export function AppFooter() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/92 backdrop-blur-md border-t border-rule pb-safe">
      <StickyAddDogButton />
      <BottomTabs />
    </div>
  );
}
