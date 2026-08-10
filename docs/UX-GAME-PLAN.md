# Game-feel UX plan

Goal: make the app *look and feel* like a game without turning it into noise.
The loop is already game-shaped (catch → XP → level → titles → quests →
missions → achievements); what's missing is **juice** (instant, animated
feedback) and a **visual language** that reads "game" at a glance.

Current baseline: instant level-up splash with star burst shipped (global
`LevelUpOverlay`, event-driven from the sighting API).

## Phase 1 — Juice the existing loop (high impact, small diffs)

1. **Animated XP bar fill on dashboard arrival.** The hero bar has
   `xp-fill`; extend it to animate from the *previous* seen XP (localStorage,
   same trick as `sd_seen_level`) to the current value, with a count-up
   number. Arriving after a catch should visibly "pour in" the new points.
2. **Reward screen sequencing.** `/dog-caught` currently shows everything at
   once. Stagger it: photo pop (`ach-pop`) → `+100` count-up → breakdown rows
   slide in one by one (~120 ms apart) → mission progress bar fills. One
   `animation-delay` cascade, no new libs.
3. **Quest claim celebration.** `claim_daily_quest` succeeds silently apart
   from `router.refresh()`. Reuse the level-up star-burst particles (extract
   into a `<StarBurst/>` helper) on the claim button + a sonner toast with
   the +50.
4. **Achievement unlock moments.** Achievements currently just appear
   unlocked on next render. Track seen-achievements in localStorage like
   levels; on a new unlock, fire a compact toast-style banner with the badge
   popping in (`ach-pop`), queued after any level splash.
5. **Streak flame.** Streak days are computed but visually flat. Give the
   streak counter a small flame icon that grows/pulses at 3+, 7+, 30+ days.

## Phase 2 — Game-like visual language (design pass, no logic)

6. **Level ring instead of bar.** Move the level number into a circular
   progress ring (SVG, animatable) around the user avatar/paw — the single
   strongest "game HUD" signal. Keep the linear bar as the detailed view.
7. **Badge/medal art per title tier.** 20 `LEVEL_NAMES` exist but all render
   as text. Design 4–5 medal tiers (bronze/silver/gold/emerald/legendary
   paw-medals, one SVG each, tinted per tier) shown next to the title, in
   the splash, and on `/levels` (which becomes a "trophy road" — vertical
   rail with nodes, current position highlighted, next reward teased).
8. **Card frames by rarity.** Dog cards get subtle frame treatments: normal
   catch = plain, first-catch = green glow edge, new dog (Pioneer) = gold
   corner ticket. Makes the gallery read as a collection game.
9. **HUD-ify the top nav.** Compact XP pill (level + mini ring) always
   visible in the nav → every screen reminds you there's a progression.
10. **Motion grammar.** Standardize on the springy cubic-bezier from the
    splash (`0.34,1.56,0.64,1`) for all pops; 150–250 ms for taps, 400–600 ms
    for celebrations. Everything honors `prefers-reduced-motion`.

## Phase 3 — Deeper game surfaces (bigger, needs product sign-off)

11. **Collection book ("Dogdex").** Reframe All Dogs as a collection with
    silhouette placeholders for uncaught dogs in your city — the Pokédex
    pattern; pairs with Find Doggo.
12. **Weekly leaderboard with leagues.** Bronze/Silver/Gold weekly cohorts
    (small groups of ~30) rather than one global board — keeps new users
    competitive. Needs a `get_weekly_scores` RPC.
13. **Season pass styling for missions.** District missions rendered as a
    map-conquest board: raions as territory cards with progress rings and a
    "liberated" stamp when completed.
14. **Sound (opt-in).** Tiny synth chirps for catch/quest/level-up behind a
    mute toggle (localStorage), off by default in the PWA.

## Non-goals

- No dark-pattern pressure (timers, FOMO shops). It's a civic app first.
- No heavy animation libs; CSS + a few SVGs keep the PWA light.
- Don't touch the scoring economy itself (rebalanced in migrations 027/031).

## Suggested order

Phase 1 is one focused day and multiplies perceived quality immediately.
Phase 2 item 6+7 (ring + medals) is the biggest visual "it's a game now"
unlock. Phase 3 items each deserve their own scoping.
