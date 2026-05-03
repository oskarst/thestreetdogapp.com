"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, WifiOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/ui/section-label";
import { CameraUpload } from "@/components/image/camera-upload";
import { LocationPicker } from "@/components/map/location-picker";
import { CharacterPicker } from "@/components/forms/character-picker";
import { SizeSlider } from "@/components/forms/size-slider";
import { GenderPicker } from "@/components/forms/gender-picker";
import { AgePicker } from "@/components/forms/age-picker";
import { OfflineSyncPanel } from "@/components/pwa/offline-sync-panel";
import { scanEarTag } from "@/lib/ocr";
import { saveOfflineDog } from "@/lib/offline-db";

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

  const [dogImage, setDogImage] = useState<File | null>(null);
  const [earTagImage, setEarTagImage] = useState<File | null>(null);
  const [earTagId, setEarTagId] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [character, setCharacter] = useState<DogCharacter | "">("");
  const [size, setSize] = useState(5);
  const [gender, setGender] = useState<DogGender | "">("");
  const [age, setAge] = useState<DogAge | "">("");
  const [notes, setNotes] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [existingDog, setExistingDog] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [savedOffline, setSavedOffline] = useState(false);

  async function handleEarTagImage(file: File | null) {
    setEarTagImage(file);
    setScanError("");
    setExistingDog(null);

    if (!file) return;

    setScanning(true);
    try {
      const result = await scanEarTag(file);
      if (result.success && result.earTagId) {
        setEarTagId(result.earTagId);
        if (result.existingDog) {
          setExistingDog({
            id: result.existingDog.id,
            name: result.existingDog.name ?? `Dog #${result.earTagId}`,
          });
        }
      } else if (result.error) {
        setScanError(result.error);
      }
    } catch {
      setScanError(t("scanFailed"));
    } finally {
      setScanning(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!dogImage) {
      setError(t("errorPhoto"));
      return;
    }
    if (!location) {
      setError(t("errorLocation"));
      return;
    }
    if (!character) {
      setError(t("errorCharacter"));
      return;
    }
    if (!gender) {
      setError(t("errorGender"));
      return;
    }
    if (!age) {
      setError(t("errorAge"));
      return;
    }

    setSubmitting(true);

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
        return;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("errorSaveOffline")
        );
        setSubmitting(false);
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
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? t("errorGeneric"));
      }

      const data = await res.json();
      router.push(
        `/dog-caught/${data.dogId}?points=${data.points}&catchType=${data.catchType}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorSubmit"));
      setSubmitting(false);
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section>
        <SectionLabel meta={t("metaRequired")}>{t("dogPhoto")}</SectionLabel>
        <CameraUpload
          label={t("tapDogPhoto")}
          onChange={setDogImage}
          value={dogImage}
          required
        />
      </section>

      <section>
        <SectionLabel meta={t("metaOptionalOcr")}>{t("earTag")}</SectionLabel>
        <div className="space-y-2.5">
          <CameraUpload
            label={t("tapEarTagPhoto")}
            onChange={handleEarTagImage}
            value={earTagImage}
          />
          {scanning && (
            <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.04em] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {t("scanningEarTag")}
            </div>
          )}
          {scanError && (
            <p className="font-mono text-[11px] tracking-[0.04em] text-muted-foreground">
              {scanError}
            </p>
          )}
          {existingDog && (
            <div className="rounded-lg border border-rule-2 bg-card px-3.5 py-2.5 text-sm">
              {t("dogAlreadyRegistered")}{" "}
              <a
                href={`/dog/${existingDog.id}`}
                className="font-medium text-ink underline underline-offset-2"
              >
                {existingDog.name}
              </a>
            </div>
          )}
          <Input
            id="earTagId"
            placeholder={t("earTagPlaceholder")}
            value={earTagId}
            onChange={(e) => setEarTagId(e.target.value)}
            className="h-10 rounded-xl border-rule-2 bg-card font-mono text-sm tracking-[0.02em]"
          />
        </div>
      </section>

      <section>
        <SectionLabel meta={t("metaGpsLocked")}>{t("location")}</SectionLabel>
        <LocationPicker onChange={setLocation} />
      </section>

      <section>
        <SectionLabel meta={t("metaPickOne")}>{t("character")}</SectionLabel>
        <CharacterPicker value={character} onChange={setCharacter} />
      </section>

      <section>
        <SectionLabel meta={t("metaScale")}>{t("size")}</SectionLabel>
        <SizeSlider value={size} onChange={setSize} />
      </section>

      <section>
        <SectionLabel meta={t("metaPickOne")}>{t("gender")}</SectionLabel>
        <GenderPicker value={gender} onChange={setGender} />
      </section>

      <section>
        <SectionLabel meta={t("metaPickOne")}>{t("age")}</SectionLabel>
        <AgePicker value={age} onChange={setAge} />
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
        disabled={submitting}
        className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-ink text-background text-[15px] font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
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
