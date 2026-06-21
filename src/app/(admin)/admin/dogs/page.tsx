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
import { MoreHorizontal, Search } from "lucide-react";
import type {
  DogAge,
  DogCharacter,
  DogGender,
  DogRow,
  DogStatus,
} from "@/types/database";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/admin-header";

interface DogWithMeta extends DogRow {
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
      images: dog.images ?? [],
      ear_tag_image: dog.ear_tag_image ?? null,
    });
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
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ear Tag</TableHead>
            <TableHead>Names</TableHead>
            <TableHead>Sightings</TableHead>
            <TableHead>Last Seen</TableHead>
            <TableHead>Registered By</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {dogs.map((dog) => (
            <TableRow key={dog.id}>
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
          {dogs.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {editDraft.images.map((url, i) => (
                      <a
                        key={url + i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative size-24 shrink-0 overflow-hidden rounded-lg border border-rule bg-muted"
                        title="Open full size"
                      >
                        <Image
                          src={url}
                          alt={`Dog image ${i + 1}`}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </a>
                    ))}
                    {editDraft.ear_tag_image && (
                      <a
                        href={editDraft.ear_tag_image}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative size-24 shrink-0 overflow-hidden rounded-lg border border-dashed border-rule-2 bg-muted"
                        title="Ear-tag photo"
                      >
                        <Image
                          src={editDraft.ear_tag_image}
                          alt="Ear-tag photo"
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] font-mono uppercase tracking-[0.1em] text-white text-center py-0.5">
                          ear tag
                        </span>
                      </a>
                    )}
                  </div>
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
