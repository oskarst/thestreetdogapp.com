"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AdminSighting {
  id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  user_nickname: string | null;
  user_email: string;
  dog_ear_tag: string | null;
  dog_names: string[];
}

export default function AdminSightingsPage() {
  const [sightings, setSightings] = useState<AdminSighting[]>([]);

  useEffect(() => {
    fetchSightings();
  }, []);

  async function fetchSightings() {
    const res = await fetch("/api/admin/sightings");
    if (res.ok) {
      setSightings(await res.json());
    }
  }

  async function deleteSighting(id: string) {
    if (!confirm("Delete this sighting?")) return;
    const res = await fetch(`/api/admin/sightings/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Sighting deleted");
      fetchSightings();
    } else {
      toast.error("Failed to delete sighting");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-xl font-semibold">Sightings</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Dog</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Image</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sightings.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                {s.user_nickname ?? s.user_email}
              </TableCell>
              <TableCell>
                {s.dog_names?.[0] ?? s.dog_ear_tag ?? "-"}
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
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => deleteSighting(s.id)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {sightings.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No sightings found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
