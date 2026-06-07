"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, WifiOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/ui/section-label";
import { CameraUpload } from "@/components/image/camera-upload";
import { LocationPicker } from "@/components/map/location-picker";
import { SizeSelector } from "@/components/forms/size-selector";
import { GenderPicker } from "@/components/forms/gender-picker";
import { AgePicker } from "@/components/forms/age-picker";
import { OfflineSyncPanel } from "@/components/pwa/offline-sync-panel";
import { checkDogPhoto, checkEarTagImage } from "@/lib/image-checks";
import { saveOfflineDog } from "@/lib/offline-db";
import { DEFAULT_SIZE } from "@/lib/size";

import type { DogCharacter, DogGender, DogAge } from "@/types/database";

function makeUuid(): string {
  // crypto.randomUUID requires a secure context; the app is HTTPS-only.
  // Fallback covers Safari < 15.4 just in case.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function AddDogForm() {
  const router = useRouter();
  const t = useTranslations("addDog");
  const searchParams = useSearchParams();
  // Deep-link prefill: /add-dog?earTag=XXX lands here from the Find a
  // Doggo target screen so the user doesn't have to retype the tag.
  const prefilledEarTag = searchParams.get("earTag") ?? "";

  const [dogImage, setDogImage] = useState<File | null>(null);
  const [dogImageChecking, setDogImageChecking] = useState(false);
  const [dogImageError, setDogImageError] = useState("");
  // No dog detected in the photo: not blocked, but the entry will be saved
  // privately and reviewed by an admin before it appears publicly.
  const [dogImagePendingReview, setDogImagePendingReview] = useState(false);
  const [earTagImage, setEarTagImage] = useState<File | null>(null);
  const [earTagImageChecking, setEarTagImageChecking] = useState(false);
  const [earTagImageError, setEarTagImageError] = useState("");
  const [earTagId, setEarTagId] = useState(prefilledEarTag);
  const [noEarTag, setNoEarTag] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  // Friendliness/character is hidden from the UI for now to keep the form
  // simple, but the column is still required, so we always submit a sensible
  // default.
  const [character] = useState<DogCharacter>("friendly");
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [gender, setGender] = useState<DogGender | "">("");
  const [age, setAge] = useState<DogAge | "">("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Top-level error reserved for server / network failures the form
  // can't attribute to a specific field (e.g. /api/sightings 500). Field
  // validation errors live in fieldErrors below and render inline.
  const [error, setError] = useState("");
  const [savedOffline, setSavedOffline] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  type FieldKey =
    | "dogImage"
    | "earTag"
    | "location"
    | "gender"
    | "age";

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldKey, string>>
  >({});

  // Refs for each validated section so we can scroll the offending one
  // into view on submit. block: "center" puts the field roughly in the
  // middle of the viewport so the inline error below it is visible too.
  const sectionRefs: Record<FieldKey, React.RefObject<HTMLElement | null>> = {
    dogImage: useRef<HTMLElement | null>(null),
    earTag: useRef<HTMLElement | null>(null),
    location: useRef<HTMLElement | null>(null),
    gender: useRef<HTMLElement | null>(null),
    age: useRef<HTMLElement | null>(null),
  };

  function flagField(field: FieldKey, message: string) {
    setFieldErrors({ [field]: message });
    requestAnimationFrame(() => {
      sectionRefs[field].current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  function clearFieldError(field: FieldKey) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  // Top-banner showError stays for server-side failures only.
  function showError(msg: string) {
    setError(msg);
    requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function toggleNoEarTag() {
    setNoEarTag((prev) => {
      const next = !prev;
      if (next) {
        setEarTagId("");
        setEarTagImage(null);
        setEarTagImageError("");
      }
      return next;
    });
  }

  // Skip the network check when the user is offline — we can't reach
  // OpenAI, and the form's existing offline path saves to IndexedDB
  // without validation. Online submission re-runs through /api/sightings
  // which is also where final checks should land in future.
  function shouldSkipImageCheck(): boolean {
    return typeof navigator !== "undefined" && !navigator.onLine;
  }

  async function handleDogImage(file: File | null) {
    setDogImage(file);
    setDogImageError("");
    setDogImagePendingReview(false);

    if (!file || shouldSkipImageCheck()) return;

    setDogImageChecking(true);
    try {
      const result = await checkDogPhoto(file);
      if (!result.ok) {
        // Hard block: explicit-content moderation failed (or the check
        // errored). Drop the photo and surface the reason.
        setDogImage(null);
        setDogImageError(result.error ?? t("errorGeneric"));
      } else if (result.hasDog === false) {
        // No dog detected: keep the photo, but flag that it will be saved
        // privately and reviewed by an admin before going public.
        setDogImagePendingReview(true);
      }
    } catch {
      setDogImage(null);
      setDogImageError(t("errorGeneric"));
    } finally {
      setDogImageChecking(false);
    }
  }

  async function handleEarTagImage(file: File | null) {
    setEarTagImage(file);
    setEarTagImageError("");

    if (!file || shouldSkipImageCheck()) return;

    setEarTagImageChecking(true);
    try {
      const result = await checkEarTagImage(file);
      if (!result.ok) {
        setEarTagImage(null);
        setEarTagImageError(result.error ?? t("errorGeneric"));
      }
    } catch {
      setEarTagImage(null);
      setEarTagImageError(t("errorGeneric"));
    } finally {
      setEarTagImageChecking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (!dogImage) {
      flagField("dogImage", t("errorPhoto"));
      return;
    }
    // Ear tag is fully optional: a dog can be logged with no tag photo and
    // no tag ID. Whatever the user does provide (photo and/or ID) is sent;
    // a blank ear-tag section no longer blocks submission.
    if (!location) {
      flagField("location", t("errorLocation"));
      return;
    }
    if (!gender) {
      flagField("gender", t("errorGender"));
      return;
    }
    if (!age) {
      flagField("age", t("errorAge"));
      return;
    }

    setSubmitting(true);
    // Tell sw-register.tsx not to soft-reload mid-submit if a new SW
    // takes over right now — it would cancel the response render and the
    // user would never see /dog-caught. Cleared in finally blocks below.
    try {
      window.sessionStorage.setItem("sdog:submitting", "1");
    } catch {
      /* private mode — best-effort. */
    }

    // Offline: save to IndexedDB instead of posting
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      try {
        await saveOfflineDog({
          dogImage,
          earTagImage: earTagImage ?? undefined,
          earTagId: earTagId.trim() || undefined,
          latitude: location.lat,
          longitude: location.lng,
          character,
          size,
          gender,
          age,
          notes: notes.trim() || undefined,
          clientUuid: makeUuid(),
          createdAt: new Date().toISOString(),
        });

        // Register background sync
        if ("serviceWorker" in navigator && "SyncManager" in window) {
          const reg = await navigator.serviceWorker.ready;
          await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register("sync-dogs");
        }

        setSavedOffline(true);
        setSubmitting(false);
        clearSubmittingFlag();
        return;
      } catch (err) {
        showError(
          err instanceof Error ? err.message : t("errorSaveOffline")
        );
        setSubmitting(false);
        clearSubmittingFlag();
        return;
      }
    }

    // Online: POST to API
    try {
      const formData = new FormData();
      formData.append("dogImage", dogImage);
      if (earTagImage) formData.append("earTagImage", earTagImage);
      if (earTagId.trim()) formData.append("earTagId", earTagId.trim());
      formData.append("latitude", String(location.lat));
      formData.append("longitude", String(location.lng));
      formData.append("character", character);
      formData.append("size", String(size));
      formData.append("gender", gender);
      formData.append("age", age);
      if (notes.trim()) formData.append("notes", notes.trim());

      const res = await fetch("/api/sightings", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        // Show the most useful message we can. If the response is JSON
        // with .error, use it; otherwise fall back to the raw text body
        // (e.g. Vercel HTML 500 → "Server error 500"); only as a last
        // resort show the localised generic.
        const text = await res.text();
        let serverMsg: string | null = null;
        try {
          const parsed = JSON.parse(text);
          serverMsg = parsed?.error ?? null;
        } catch {
          serverMsg = text.length > 0 && text.length < 200 ? text : null;
        }
        console.error(
          "[add-dog] /api/sightings non-ok:",
          res.status,
          res.statusText,
          text.slice(0, 500)
        );
        throw new Error(
          serverMsg ?? `${t("errorGeneric")} (${res.status})`
        );
      }

      const data = await res.json();
      const params = new URLSearchParams({
        points: String(data.points),
        catchType: String(data.catchType),
      });
      if (data.missionAward) {
        params.set("missionXp", String(data.missionAward.awarded));
        params.set("missionProgress", String(data.missionAward.progress));
        params.set("missionTarget", String(data.missionAward.target));
        if (data.missionAward.completed) {
          params.set("missionCompleted", "1");
          params.set(
            "missionFinishXp",
            String(data.missionAward.completion_bonus)
          );
        }
      }
      router.push(`/dog-caught/${data.dogId}?${params.toString()}`);
      // Leave the flag in place until just before navigation completes —
      // if the page is replaced, sessionStorage gets cleared automatically
      // on the new render. Belt-and-suspenders: clear it too in case the
      // route guard turns this into a same-document navigation.
      clearSubmittingFlag();
    } catch (err) {
      showError(err instanceof Error ? err.message : t("errorSubmit"));
      setSubmitting(false);
      clearSubmittingFlag();
    }
  }

  function clearSubmittingFlag() {
    try {
      window.sessionStorage.removeItem("sdog:submitting");
    } catch {
      /* private mode — best-effort. */
    }
  }

  if (savedOffline) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-soft text-amber-brand">
          <WifiOff className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold">{t("savedOfflineTitle")}</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          {t("savedOfflineDesc")}
        </p>
        <OfflineSyncPanel />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <div
          ref={errorRef}
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive scroll-mt-20"
        >
          {error}
        </div>
      )}

      <section ref={sectionRefs.dogImage} className="scroll-mt-24">
        <SectionLabel meta={t("metaRequired")}>{t("dogPhoto")}</SectionLabel>
        <CameraUpload
          label={t("tapDogPhoto")}
          zoomable
          onChange={(file) => {
            handleDogImage(file);
            clearFieldError("dogImage");
          }}
          value={dogImage}
          required
          invalid={Boolean(fieldErrors.dogImage) || Boolean(dogImageError)}
        />
        {dogImageChecking && (
          <div className="mt-2 flex items-center gap-2 font-mono text-[12.1px] tracking-[0.04em] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            {t("checkingImage")}
          </div>
        )}
        {dogImageError && (
          <p
            role="alert"
            className="mt-2 text-sm font-medium text-destructive"
          >
            {dogImageError}
          </p>
        )}
        {fieldErrors.dogImage && (
          <p
            role="alert"
            className="mt-2 text-sm font-medium text-destructive"
          >
            {fieldErrors.dogImage}
          </p>
        )}
        {dogImagePendingReview && dogImage && (
          <p className="mt-2 rounded-lg border border-amber-brand/40 bg-amber-soft px-3 py-2 text-[13px] leading-snug text-amber-brand">
            {t("photoPendingReview")}
          </p>
        )}
      </section>

      <section ref={sectionRefs.earTag} className="scroll-mt-24">
        <SectionLabel meta={noEarTag ? t("metaNotApplicable") : t("metaOptional")}>{t("earTag")}</SectionLabel>
        <div className="space-y-2.5">
          <CameraUpload
            label={t("tapEarTagPhoto")}
            zoomable
            onChange={(file) => {
              handleEarTagImage(file);
              clearFieldError("earTag");
            }}
            value={earTagImage}
            disabled={noEarTag}
            invalid={
              (Boolean(fieldErrors.earTag) || Boolean(earTagImageError)) &&
              !noEarTag
            }
          />
          {earTagImageChecking && (
            <div className="flex items-center gap-2 font-mono text-[12.1px] tracking-[0.04em] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {t("checkingImage")}
            </div>
          )}
          {earTagImageError && (
            <p
              role="alert"
              className="text-sm font-medium text-destructive"
            >
              {earTagImageError}
            </p>
          )}
          <div className="flex items-stretch gap-2">
            <Input
              id="earTagId"
              placeholder={t("earTagPlaceholder")}
              value={earTagId}
              onChange={(e) => {
                setEarTagId(e.target.value);
                if (e.target.value.trim()) clearFieldError("earTag");
              }}
              disabled={noEarTag}
              className="h-10 flex-1 rounded-xl border-rule-2 bg-card font-mono text-sm tracking-[0.02em] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => {
                toggleNoEarTag();
                clearFieldError("earTag");
              }}
              aria-pressed={noEarTag}
              className={
                noEarTag
                  ? "h-10 px-3 rounded-xl border border-ink bg-ink text-background font-mono text-[12.1px] tracking-[0.08em] uppercase whitespace-nowrap transition-colors"
                  : "h-10 px-3 rounded-xl border border-rule-2 bg-card text-ink font-mono text-[12.1px] tracking-[0.08em] uppercase whitespace-nowrap transition-colors hover:bg-muted"
              }
            >
              {t("noEarTag")}
            </button>
          </div>
          {!noEarTag && (
            <p className="text-[13.2px] leading-snug text-muted-foreground">
              {t.rich("earTagHint", {
                id: (chunks) => (
                  <>
                    <span aria-hidden className="text-ink">↳ </span>
                    <span className="font-bold font-mono text-ink bg-amber-soft px-1 py-0.5 rounded">
                      {chunks}
                    </span>
                  </>
                ),
              })}
            </p>
          )}
          {fieldErrors.earTag && (
            <p
              role="alert"
              className="text-sm font-medium text-destructive"
            >
              {fieldErrors.earTag}
            </p>
          )}
        </div>
      </section>

      <section ref={sectionRefs.location} className="scroll-mt-24">
        <SectionLabel meta={t("metaGpsLocked")}>{t("location")}</SectionLabel>
        <LocationPicker
          onChange={(pos) => {
            setLocation(pos);
            clearFieldError("location");
          }}
        />
        {fieldErrors.location && (
          <p
            role="alert"
            className="mt-2 text-sm font-medium text-destructive"
          >
            {fieldErrors.location}
          </p>
        )}
      </section>

      <section>
        <SectionLabel meta={t("metaScale")}>{t("size")}</SectionLabel>
        <SizeSelector value={size} onChange={setSize} />
      </section>

      <section ref={sectionRefs.gender} className="scroll-mt-24">
        <SectionLabel meta={t("metaPickOne")}>{t("gender")}</SectionLabel>
        <GenderPicker
          value={gender}
          onChange={(value) => {
            setGender(value);
            clearFieldError("gender");
          }}
        />
        {fieldErrors.gender && (
          <p
            role="alert"
            className="mt-2 text-sm font-medium text-destructive"
          >
            {fieldErrors.gender}
          </p>
        )}
      </section>

      <section ref={sectionRefs.age} className="scroll-mt-24">
        <SectionLabel meta={t("metaPickOne")}>{t("age")}</SectionLabel>
        <AgePicker
          value={age}
          onChange={(value) => {
            setAge(value);
            clearFieldError("age");
          }}
        />
        {fieldErrors.age && (
          <p
            role="alert"
            className="mt-2 text-sm font-medium text-destructive"
          >
            {fieldErrors.age}
          </p>
        )}
      </section>

      <section>
        <SectionLabel meta={t("metaOptional")}>{t("notes")}</SectionLabel>
        <textarea
          rows={3}
          placeholder={t("notesPlaceholder")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-xl border border-rule-2 bg-card px-3.5 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:border-ink"
        />
      </section>

      <button
        type="submit"
        disabled={submitting || dogImageChecking || earTagImageChecking}
        className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-ink text-background text-[16.5px] font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        <span className="font-mono text-[var(--green-brand)] font-medium">&gt;</span>
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          t("catchThisDog")
        )}
      </button>
    </form>
  );
}
