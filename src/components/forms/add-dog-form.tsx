"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CameraUpload } from "@/components/image/camera-upload";
import { LocationPicker } from "@/components/map/location-picker";
import { CharacterPicker } from "@/components/forms/character-picker";
import { SizeSlider } from "@/components/forms/size-slider";
import { GenderPicker } from "@/components/forms/gender-picker";
import { AgePicker } from "@/components/forms/age-picker";
import { OfflineSyncPanel } from "@/components/pwa/offline-sync-panel";
import { scanEarTag } from "@/lib/ocr";
import { saveOfflineDog } from "@/lib/offline-db";
import { toast } from "sonner";

import type { DogCharacter, DogGender, DogAge } from "@/types/database";

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
      setScanError("Scan failed. Enter the ear tag ID manually.");
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
          err instanceof Error ? err.message : "Failed to save offline"
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
        throw new Error(body?.error ?? "Something went wrong");
      }

      const data = await res.json();
      router.push(
        `/dog-caught/${data.dogId}?points=${data.points}&catchType=${data.catchType}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
      setSubmitting(false);
    }
  }

  if (savedOffline) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <WifiOff className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold">Saved Offline</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your dog catch has been saved and will automatically sync when you reconnect to the internet.
        </p>
        <Button variant="outline" onClick={() => {
          setDogImage(null);
          setEarTagImage(null);
          setEarTagId("");
          setLocation(null);
          setCharacter("");
          setSize(5);
          setGender("");
          setAge("");
          setNotes("");
          setScanError("");
          setExistingDog(null);
          setError("");
          setSavedOffline(false);
        }}>
          Catch Another Dog
        </Button>
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

      {/* Dog Photo */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dogPhoto")} *</CardTitle>
        </CardHeader>
        <CardContent>
          <CameraUpload
            label={t("tapDogPhoto")}
            onChange={setDogImage}
            value={dogImage}
            required
          />
        </CardContent>
      </Card>

      {/* Ear Tag */}
      <Card>
        <CardHeader>
          <CardTitle>{t("earTag")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CameraUpload
            label={t("tapEarTagPhoto")}
            onChange={handleEarTagImage}
            value={earTagImage}
          />
          {scanning && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Scanning ear tag...
            </div>
          )}
          {scanError && (
            <p className="text-sm text-muted-foreground">{scanError}</p>
          )}
          {existingDog && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-800 dark:bg-blue-950">
              Dog already registered &mdash;{" "}
              <a
                href={`/dog/${existingDog.id}`}
                className="font-medium text-blue-600 underline dark:text-blue-400"
              >
                {existingDog.name}
              </a>
            </div>
          )}
          <div>
            <Label htmlFor="earTagId">{t("earTagId")}</Label>
            <Input
              id="earTagId"
              placeholder={t("earTagPlaceholder")}
              value={earTagId}
              onChange={(e) => setEarTagId(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>{t("location")} *</CardTitle>
        </CardHeader>
        <CardContent>
          <LocationPicker onChange={setLocation} />
        </CardContent>
      </Card>

      {/* Character */}
      <Card>
        <CardHeader>
          <CardTitle>{t("character")} *</CardTitle>
        </CardHeader>
        <CardContent>
          <CharacterPicker value={character} onChange={setCharacter} />
        </CardContent>
      </Card>

      {/* Size */}
      <Card>
        <CardHeader>
          <CardTitle>{t("size")} *</CardTitle>
        </CardHeader>
        <CardContent>
          <SizeSlider value={size} onChange={setSize} />
        </CardContent>
      </Card>

      {/* Gender */}
      <Card>
        <CardHeader>
          <CardTitle>{t("gender")} *</CardTitle>
        </CardHeader>
        <CardContent>
          <GenderPicker value={gender} onChange={setGender} />
        </CardContent>
      </Card>

      {/* Age */}
      <Card>
        <CardHeader>
          <CardTitle>{t("age")} *</CardTitle>
        </CardHeader>
        <CardContent>
          <AgePicker value={age} onChange={setAge} />
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>{t("notes")}</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            rows={3}
            placeholder={t("notesPlaceholder")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        disabled={submitting}
        className="w-full text-base"
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          t("catchThisDog")
        )}
      </Button>
    </form>
  );
}
