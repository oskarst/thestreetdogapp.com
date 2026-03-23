"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import type { DogRow } from "@/types/database";

interface MapSidePanelProps {
  dog: DogRow | null;
  onClose: () => void;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function MapSidePanel({ dog, onClose }: MapSidePanelProps) {
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (dog) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [dog, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${
          dog ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel - slides up from bottom on mobile */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${
          dog ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "60vh" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close panel"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        {dog && (
          <div className="px-4 pb-6 pt-1 overflow-y-auto" style={{ maxHeight: "calc(60vh - 32px)" }}>
            <div className="flex gap-3 items-start">
              {/* Thumbnail */}
              {dog.images && dog.images.length > 0 ? (
                <img
                  src={dog.images[0]}
                  alt={dog.names?.[0] ?? "Dog"}
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl text-gray-400">
                    {dog.names?.[0]?.[0]?.toUpperCase() ?? "?"}
                  </span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg leading-tight truncate">
                  {dog.names?.[0] ?? "Unknown Dog"}
                </h3>

                {dog.ear_tag_id && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Tag: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{dog.ear_tag_id}</code>
                  </p>
                )}

                {dog.last_sighting_date && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Last seen: {formatRelativeDate(dog.last_sighting_date)}
                  </p>
                )}
              </div>
            </div>

            <Link
              href={`/dog/${dog.id}`}
              className="mt-4 block w-full text-center bg-primary text-white py-2.5 rounded-xl font-medium no-underline hover:bg-primary/90 transition-colors"
            >
              View Profile
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
