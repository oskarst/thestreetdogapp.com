"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MoreHorizontal,
  Search,
  Star,
  ArrowLeft,
  ArrowRight,
  X,
  TriangleAlert,
} from "lucide-react";
import type {
  DogAge,
  DogCharacter,
  DogGender,
  DogRow,
  DogStatus,
} from "@/types/database";
import { toast } from "sonner";
import { cityLabel, CITY_SLUGS } from "@/lib/cities";
import { AdminHeader } from "@/components/admin/admin-header";

interface DogWithMeta extends DogRow {
  thumbnail?: string | null;
  sightings_count: number;
  registered_by_email: string | null;
}

interface EditDraft {
  id: string;
  ear_tag_id: string;
  namesCsv: string;
  character: DogCharacter | "unset";
  gender: DogGender | "unset";
  age: DogAge | "unset";
  size: number | null;
  status: DogStatus;
  city_slug: string | null;
  images: string[];
  ear_tag_image: string | null;
}

const CHARACTER_OPTIONS: DogCharacter[] = [
  "friendly",
  "very_friendly",
  "indifferent",
  "sleeping",
  "afraid",
  "aggressive",
];
const GENDER_OPTIONS: DogGender[] = ["male", "female", "unknown"];
const AGE_OPTIONS: DogAge[] = ["puppy", "young", "adult", "old"];
const STATUS_OPTIONS: DogStatus[] = ["approved", "pending", "rejected"];

export default function AdminDogsPage() {
  const [dogs, setDogs] = useState<DogWithMeta[]>([]);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [cityFilter, setCityFilter] = useState<string>("all");

  // Tags that appear in more than one city among the loaded dogs — these get
  // a "same number in another city" warning so an admin can spot a possible
  // mis-tag or a genuinely distinct dog that shares a number.
  const earTagCities = new Map<string, Set<string>>();
  for (const d of dogs) {
    if (!d.ear_tag_id) continue;
    const set = earTagCities.get(d.ear_tag_id) ?? new Set<string>();
    set.add(d.city_slug ?? "unknown");
    earTagCities.set(d.ear_tag_id, set);
  }
  const tagInMultipleCities = (dog: DogWithMeta) =>
    !!dog.ear_tag_id && (earTagCities.get(dog.ear_tag_id)?.size ?? 0) > 1;

  // City dropdown options: the known/canonical slugs plus any geocoded
  // cities that already exist in the loaded data, so the override and filter
  // cover dynamically-detected cities too.
  const cityOptions = Array.from(
    new Set<string>([
      ...CITY_SLUGS,
      ...dogs
        .map((d) => d.city_slug)
        .filter((s): s is string => !!s),
    ])
  ).sort((a, b) => cityLabel(a).localeCompare(cityLabel(b)));

  const visibleDogs =
    cityFilter === "all"
      ? dogs
      : dogs.filter((d) => (d.city_slug ?? "unknown") === cityFilter);

  useEffect(() => {
    fetchDogs();
  }, []);

  async function fetchDogs() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/dogs?${params}`);
    if (res.ok) {
      setDogs(await res.json());
    }
  }

  function handleSearch() {
    startTransition(() => {
      fetchDogs();
    });
  }

  async function deleteDog(id: string) {
    if (!confirm("Delete this dog and all its sightings?")) return;
    const res = await fetch(`/api/admin/dogs/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Dog deleted");
      fetchDogs();
    } else {
      toast.error("Failed to delete dog");
    }
  }

  function openEdit(dog: DogWithMeta) {
    setEditDraft({
      id: dog.id,
      ear_tag_id: dog.ear_tag_id ?? "",
      namesCsv: (dog.names ?? []).join(", "),
      character: (dog.character ?? "unset") as EditDraft["character"],
      gender: (dog.gender ?? "unset") as EditDraft["gender"],
      age: (dog.age ?? "unset") as EditDraft["age"],
      size: dog.size ?? null,
      status: dog.status ?? "approved",
      city_slug: dog.city_slug ?? null,
      images: dog.images ?? [],
      ear_tag_image: dog.ear_tag_image ?? null,
    });
  }

  // Image strip controls — operate on editDraft.images; saveEdit sends the
  // resulting array, so one PATCH field covers set-primary/reorder/delete.
  function setPrimaryImage(i: number) {
    setEditDraft((d) => {
      if (!d || i <= 0) return d;
      const next = [...d.images];
      const [picked] = next.splice(i, 1);
      next.unshift(picked);
      return { ...d, images: next };
    });
  }
  function moveImage(i: number, dir: -1 | 1) {
    setEditDraft((d) => {
      if (!d) return d;
      const j = i + dir;
      if (j < 0 || j >= d.images.length) return d;
      const next = [...d.images];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...d, images: next };
    });
  }
  function removeImage(i: number) {
    setEditDraft((d) =>
      d ? { ...d, images: d.images.filter((_, idx) => idx !== i) } : d
    );
  }

  async function saveEdit() {
    if (!editDraft) return;
    const payload: Record<string, unknown> = {
      ear_tag_id: editDraft.ear_tag_id.trim() || null,
      names: editDraft.namesCsv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      character: editDraft.character === "unset" ? null : editDraft.character,
      gender: editDraft.gender === "unset" ? null : editDraft.gender,
      age: editDraft.age === "unset" ? null : editDraft.age,
      size: editDraft.size,
      status: editDraft.status,
      city_slug: editDraft.city_slug,
      images: editDraft.images,
      ear_tag_image: editDraft.ear_tag_image,
    };
    setSavingEdit(true);
    const res = await fetch(`/api/admin/dogs/${editDraft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSavingEdit(false);
    if (res.ok) {
      toast.success("Dog updated");
      setEditDraft(null);
      fetchDogs();
    } else {
      const err = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      toast.error(err?.error ?? "Failed to update dog");
    }
  }

  async function mergeDog() {
    if (!mergeSourceId || !mergeTargetId.trim()) return;
    const res = await fetch("/api/admin/dogs/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceId: mergeSourceId,
        targetId: mergeTargetId.trim(),
      }),
    });
    if (res.ok) {
      toast.success("Dogs merged successfully");
      setMergeSourceId(null);
      setMergeTargetId("");
      fetchDogs();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to merge dogs");
    }
  }

  return (
    <div className="space-y-4">
      <AdminHeader
        eyebrow="Admin · Dogs"
        title="Subject registry"
        meta={`${dogs.length} loaded`}
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by ear tag or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-8"
          />
        </div>
        <Button onClick={handleSearch} variant="outline" disabled={isPending}>
          Search
        </Button>
        <Select value={cityFilter} onValueChange={(v) => setCityFilter(v ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {cityOptions.map((slug) => (
              <SelectItem key={slug} value={slug}>
                {cityLabel(slug)}
              </SelectItem>
            ))}
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14" />
            <TableHead>Ear Tag</TableHead>
            <TableHead>Names</TableHead>
            <TableHead>Sightings</TableHead>
            <TableHead>Last Seen</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Registered By</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleDogs.map((dog) => (
            <TableRow key={dog.id}>
              <TableCell>
                {(dog.thumbnail ?? dog.images?.[0]) ? (
                  <button
                    type="button"
                    onClick={() => openEdit(dog)}
                    className="relative block size-10 overflow-hidden rounded-md border border-rule bg-muted"
                    title="Edit dog"
                  >
                    <Image
                      src={(dog.thumbnail ?? dog.images[0]) as string}
                      alt={dog.names?.[0] ?? "Dog"}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </button>
                ) : (
                  <div className="grid size-10 place-items-center rounded-md border border-rule bg-muted text-[9px] text-muted-foreground">
                    —
                  </div>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {dog.ear_tag_id ?? "-"}
              </TableCell>
              <TableCell>{dog.names.join(", ") || "-"}</TableCell>
              <TableCell>{dog.sightings_count}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {dog.last_sighting_date
                  ? new Date(dog.last_sighting_date).toLocaleDateString()
                  : "-"}
              </TableCell>
              <TableCell className="text-xs">
                <span className="inline-flex items-center gap-1">
                  {cityLabel(dog.city_slug)}
                  {tagInMultipleCities(dog) && (
                    <span
                      className="text-amber-600"
                      title={`Tag ${dog.ear_tag_id} also exists in another city`}
                    >
                      <TriangleAlert className="size-3.5" />
                    </span>
                  )}
                </span>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {dog.registered_by_email ?? "-"}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-xs" />
                    }
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(dog)}>
                      Edit attributes
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setMergeSourceId(dog.id);
                        setMergeTargetId("");
                      }}
                    >
                      Merge into...
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => deleteDog(dog.id)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {visibleDogs.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No dogs found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Merge dialog */}
      <Dialog
        open={mergeSourceId !== null}
        onOpenChange={(open) => {
          if (!open) setMergeSourceId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Dog</DialogTitle>
            <DialogDescription>
              All sightings, names, images, and favorites from the source dog
              will be transferred to the target dog. The source dog will be
              deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Dog ID</label>
            <Input
              placeholder="Paste the target dog UUID..."
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeSourceId(null)}>
              Cancel
            </Button>
            <Button
              onClick={mergeDog}
              disabled={!mergeTargetId.trim()}
            >
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit attributes dialog */}
      <Dialog
        open={editDraft !== null}
        onOpenChange={(open) => {
          if (!open) setEditDraft(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit dog attributes</DialogTitle>
            <DialogDescription>
              Whitelisted fields only. Images are shown for reference;
              image arrays, registration metadata, and last-sighting
              timestamps stay read-only here.
            </DialogDescription>
          </DialogHeader>
          {editDraft && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Images{editDraft.images.length > 0 && ` (${editDraft.images.length})`}
                </label>
                {editDraft.images.length === 0 && !editDraft.ear_tag_image ? (
                  <div className="text-xs text-muted-foreground">
                    No images on file.
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {editDraft.images.map((url, i) => (
                        <div
                          key={url + i}
                          className="relative size-28 shrink-0 overflow-hidden rounded-lg border border-rule bg-muted"
                        >
                          <Image
                            src={url}
                            alt={`Dog image ${i + 1}`}
                            fill
                            className="object-cover"
                            sizes="112px"
                          />
                          {i === 0 && (
                            <span className="absolute left-1 top-1 rounded bg-ink/80 px-1 py-px font-mono text-[8px] uppercase tracking-[0.1em] text-background">
                              primary
                            </span>
                          )}
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-black/55 p-0.5">
                            <button
                              type="button"
                              title="Move left"
                              disabled={i === 0}
                              onClick={() => moveImage(i, -1)}
                              className="grid size-5 place-items-center rounded text-white hover:bg-white/20 disabled:opacity-30"
                            >
                              <ArrowLeft className="size-3" />
                            </button>
                            <button
                              type="button"
                              title="Set as primary"
                              disabled={i === 0}
                              onClick={() => setPrimaryImage(i)}
                              className="grid size-5 place-items-center rounded text-white hover:bg-white/20 disabled:opacity-30"
                            >
                              <Star className="size-3" />
                            </button>
                            <button
                              type="button"
                              title="Move right"
                              disabled={i === editDraft.images.length - 1}
                              onClick={() => moveImage(i, 1)}
                              className="grid size-5 place-items-center rounded text-white hover:bg-white/20 disabled:opacity-30"
                            >
                              <ArrowRight className="size-3" />
                            </button>
                            <button
                              type="button"
                              title="Remove image"
                              onClick={() => removeImage(i)}
                              className="grid size-5 place-items-center rounded text-white hover:bg-destructive"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {editDraft.ear_tag_image && (
                        <div className="relative size-28 shrink-0 overflow-hidden rounded-lg border border-dashed border-rule-2 bg-muted">
                          <Image
                            src={editDraft.ear_tag_image}
                            alt="Ear-tag photo"
                            fill
                            className="object-cover"
                            sizes="112px"
                          />
                          <span className="absolute inset-x-0 top-0 bg-black/60 py-px text-center font-mono text-[8px] uppercase tracking-[0.1em] text-white">
                            ear tag
                          </span>
                          <button
                            type="button"
                            title="Clear ear-tag photo"
                            onClick={() =>
                              setEditDraft((d) =>
                                d ? { ...d, ear_tag_image: null } : d
                              )
                            }
                            className="absolute bottom-1 right-1 grid size-5 place-items-center rounded bg-black/60 text-white hover:bg-destructive"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      First image is the primary (shown on cards). Removing a
                      photo detaches it from this dog; the file stays in
                      storage. Changes apply on Save.
                    </p>
                  </>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Ear tag ID</label>
                <Input
                  placeholder="e.g. 123 or empty for none"
                  value={editDraft.ear_tag_id}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, ear_tag_id: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Names (comma-separated)
                </label>
                <Input
                  placeholder="e.g. Frank, Bubu"
                  value={editDraft.namesCsv}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, namesCsv: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Character</label>
                  <Select
                    value={editDraft.character}
                    onValueChange={(v) =>
                      setEditDraft({
                        ...editDraft,
                        character: (v ?? "unset") as EditDraft["character"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">— unset —</SelectItem>
                      {CHARACTER_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Gender</label>
                  <Select
                    value={editDraft.gender}
                    onValueChange={(v) =>
                      setEditDraft({
                        ...editDraft,
                        gender: (v ?? "unset") as EditDraft["gender"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">— unset —</SelectItem>
                      {GENDER_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Age</label>
                  <Select
                    value={editDraft.age}
                    onValueChange={(v) =>
                      setEditDraft({
                        ...editDraft,
                        age: (v ?? "unset") as EditDraft["age"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">— unset —</SelectItem>
                      {AGE_OPTIONS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Size (1–10)</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={editDraft.size ?? ""}
                    onChange={(e) =>
                      setEditDraft({
                        ...editDraft,
                        size: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Visibility / status
                  </label>
                  <Select
                    value={editDraft.status}
                    onValueChange={(v) =>
                      setEditDraft({
                        ...editDraft,
                        status: v as DogStatus,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s === "approved"
                            ? "Approved (public)"
                            : s === "pending"
                              ? "Pending review (hidden)"
                              : "Rejected (hidden)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">City</label>
                  <Select
                    value={editDraft.city_slug ?? "unset"}
                    onValueChange={(v) =>
                      setEditDraft({
                        ...editDraft,
                        city_slug: v === "unset" ? null : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">— unset —</SelectItem>
                      {cityOptions.map((slug) => (
                        <SelectItem key={slug} value={slug}>
                          {cityLabel(slug)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDraft(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
