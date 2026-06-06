"use client";

import { useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

interface ImageZoomModalProps {
  /** Object URL (or any src) of the image to inspect. */
  src: string;
  /** Accessible label / alt for the image. */
  alt?: string;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const STEP = 0.5;

/**
 * Fullscreen zoom viewer for a just-captured photo. Useful for reading an
 * ear-tag number off the picture before typing it in. Zoom via the slider
 * or +/- buttons; when zoomed past 1x the image overflows its container and
 * pans with native scroll (and pinch where the browser supports it).
 */
export function ImageZoomModal({ src, alt = "Photo", onClose }: ImageZoomModalProps) {
  const [scale, setScale] = useState(MIN_SCALE);

  const clamp = (n: number) =>
    Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(n.toFixed(2))));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="font-mono text-[12.1px] tracking-[0.16em] uppercase text-white/70">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid place-items-center size-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Pannable viewport: native scroll handles drag when zoomed in. */}
      <div className="flex-1 overflow-auto overscroll-contain">
        {/* eslint-disable-next-line @next/next/no-img-element -- blob: object URL of a just-captured photo; next/image doesn't apply */}
        <img
          src={src}
          alt={alt}
          style={{ width: `${scale * 100}%`, maxWidth: "none" }}
          className="h-auto select-none"
          draggable={false}
        />
      </div>

      <div className="flex items-center gap-3 px-5 py-4 bg-black/40">
        <button
          type="button"
          onClick={() => setScale((s) => clamp(s - STEP))}
          disabled={scale <= MIN_SCALE}
          aria-label="Zoom out"
          className="grid place-items-center size-9 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 transition-colors"
        >
          <ZoomOut className="size-5" />
        </button>
        <input
          type="range"
          min={MIN_SCALE}
          max={MAX_SCALE}
          step={STEP}
          value={scale}
          onChange={(e) => setScale(clamp(Number(e.target.value)))}
          aria-label="Zoom level"
          className="flex-1 accent-white"
        />
        <button
          type="button"
          onClick={() => setScale((s) => clamp(s + STEP))}
          disabled={scale >= MAX_SCALE}
          aria-label="Zoom in"
          className="grid place-items-center size-9 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 transition-colors"
        >
          <ZoomIn className="size-5" />
        </button>
      </div>
    </div>
  );
}
