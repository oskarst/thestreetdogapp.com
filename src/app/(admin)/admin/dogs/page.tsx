"use client";

import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import type { DogRow } from "@/types/database";
import { toast } from "sonner";

interface DogWithMeta extends DogRow {
  sightings_count: number;
  registered_by_email: string | null;
}

export default function AdminDogsPage() {
  const [dogs, setDogs] = useState<DogWithMeta[]>([]);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");

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
      <h1 className="font-heading text-xl font-semibold">Dogs</h1>

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
    </div>
  );
}
