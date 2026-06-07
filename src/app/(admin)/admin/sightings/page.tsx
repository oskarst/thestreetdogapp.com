"use client";

import { Fragment, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/admin-header";
import type { DogAge, DogCharacter, DogGender } from "@/types/database";

interface AdminSighting {
  id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  character: DogCharacter;
  size: number;
  gender: DogGender;
  age: DogAge;
  notes: string | null;
  health_flag: boolean;
  user_nickname: string | null;
  user_email: string;
  dog_ear_tag: string | null;
  dog_names: string[];
}

interface EditDraft {
  character: DogCharacter;
  size: number;
  gender: DogGender;
  age: DogAge;
  notes: string;
  health_flag: boolean;
}

const CHARACTERS: DogCharacter[] = [
  "friendly",
  "very_friendly",
  "indifferent",
  "sleeping",
  "afraid",
  "aggressive",
];
const GENDERS: DogGender[] = ["male", "female", "unknown"];
const AGES: DogAge[] = ["puppy", "young", "adult", "old"];

export default function AdminSightingsPage() {
  const [sightings, setSightings] = useState<AdminSighting[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSightings();
  }, []);

  async function fetchSightings() {
    const res = await fetch("/api/admin/sightings");
    if (res.ok) setSightings(await res.json());
  }

  function startEdit(s: AdminSighting) {
    setEditId(s.id);
    setDraft({
      character: s.character,
      size: s.size,
      gender: s.gender,
      age: s.age,
      notes: s.notes ?? "",
      health_flag: s.health_flag,
    });
  }

  function cancelEdit() {
    setEditId(null);
    setDraft(null);
  }

  async function saveEdit(id: string) {
    if (!draft) return;
    setSaving(true);
    const res = await fetch(`/api/admin/sightings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character: draft.character,
        size: draft.size,
        gender: draft.gender,
        age: draft.age,
        notes: draft.notes.trim() || null,
        health_flag: draft.health_flag,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Sighting updated");
      cancelEdit();
      fetchSightings();
    } else {
      toast.error("Failed to update sighting");
    }
  }

  async function deleteSighting(id: string) {
    if (!confirm("Delete this sighting?")) return;
    const res = await fetch(`/api/admin/sightings/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Sighting deleted");
      fetchSightings();
    } else {
      toast.error("Failed to delete sighting");
    }
  }

  return (
    <div className="space-y-4">
      <AdminHeader
        eyebrow="Admin · Sightings"
        title="Capture log"
        meta={`${sightings.length} loaded`}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Dog</TableHead>
            <TableHead>Traits</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Image</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sightings.map((s) => {
            const editing = editId === s.id;
            return (
              <Fragment key={s.id}>
                <TableRow>
                  <TableCell>{s.user_nickname ?? s.user_email}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      {s.dog_names?.[0] ?? s.dog_ear_tag ?? "-"}
                      {s.health_flag && (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-red-500">
                          health
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.character.replace(/_/g, " ")} · {s.gender} · {s.age} · sz{" "}
                    {s.size}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(s.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {s.image_url ? (
                      <Badge variant="secondary">Yes</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => (editing ? cancelEdit() : startEdit(s))}
                      >
                        {editing ? (
                          <X className="size-3.5" />
                        ) : (
                          <Pencil className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => deleteSighting(s.id)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {editing && draft && (
                  <TableRow className="bg-muted/40">
                    <TableCell colSpan={7}>
                      <div className="flex flex-wrap items-end gap-3 py-1">
                        <Field label="Character">
                          <Select
                            value={draft.character}
                            onValueChange={(v) =>
                              setDraft({
                                ...draft,
                                character: v as DogCharacter,
                              })
                            }
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CHARACTERS.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c.replace(/_/g, " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Gender">
                          <Select
                            value={draft.gender}
                            onValueChange={(v) =>
                              setDraft({ ...draft, gender: v as DogGender })
                            }
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GENDERS.map((g) => (
                                <SelectItem key={g} value={g}>
                                  {g}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Age">
                          <Select
                            value={draft.age}
                            onValueChange={(v) =>
                              setDraft({ ...draft, age: v as DogAge })
                            }
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AGES.map((a) => (
                                <SelectItem key={a} value={a}>
                                  {a}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Size">
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={draft.size}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                size: Number(e.target.value),
                              })
                            }
                            className="w-20"
                          />
                        </Field>
                        <Field label="Notes" grow>
                          <Input
                            value={draft.notes}
                            onChange={(e) =>
                              setDraft({ ...draft, notes: e.target.value })
                            }
                            placeholder="Notes"
                          />
                        </Field>
                        <Field label="Health">
                          <label className="inline-flex h-9 items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={draft.health_flag}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  health_flag: e.target.checked,
                                })
                              }
                            />
                            <span>Needs attention</span>
                          </label>
                        </Field>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={saving}
                            onClick={() => saveEdit(s.id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
          {sightings.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-24 text-center text-muted-foreground"
              >
                No sightings found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function Field({
  label,
  grow,
  children,
}: {
  label: string;
  grow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex flex-col gap-1 ${grow ? "min-w-[180px] flex-1" : ""}`}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
