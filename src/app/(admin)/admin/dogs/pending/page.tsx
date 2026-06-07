"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/admin-header";

interface PendingDog {
  id: string;
  name: string | null;
  image: string | null;
  ear_tag_id: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  submitted_by: string;
}

export default function AdminPendingDogsPage() {
  const [dogs, setDogs] = useState<PendingDog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetchPending();
  }, []);

  async function fetchPending() {
    setLoading(true);
    const res = await fetch("/api/admin/dogs/pending");
    if (res.ok) setDogs(await res.json());
    setLoading(false);
  }

  async function setStatus(id: string, status: "approved" | "rejected") {
    setBusy(id);
    const res = await fetch(`/api/admin/dogs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(
        status === "approved" ? "Approved — now public" : "Declined"
      );
      setDogs((prev) => prev.filter((d) => d.id !== id));
    } else {
      toast.error("Failed to update");
    }
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      <AdminHeader
        eyebrow="Admin · Pending dogs"
        title="Photo review"
        meta={`${dogs.length} pending`}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : dogs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing to review. All caught up.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dogs.map((d) => (
            <div
              key={d.id}
              className="flex flex-col overflow-hidden rounded-xl border bg-card"
            >
              <div className="relative aspect-[4/3] bg-muted">
                {d.image ? (
                  <Image
                    src={d.image}
                    alt="Submitted photo"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 360px"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1 p-3 text-sm">
                <div className="font-medium">{d.name ?? "Unnamed"}</div>
                <div className="text-xs text-muted-foreground">
                  by {d.submitted_by} · {new Date(d.created_at).toLocaleString()}
                </div>
                {d.ear_tag_id && (
                  <div className="font-mono text-xs">tag {d.ear_tag_id}</div>
                )}
              </div>
              <div className="flex gap-2 p-3 pt-0">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={busy === d.id}
                  onClick={() => setStatus(d.id, "approved")}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={busy === d.id}
                  onClick={() => setStatus(d.id, "rejected")}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
