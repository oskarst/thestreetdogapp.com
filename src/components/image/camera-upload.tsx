"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, RefreshCw, Search } from "lucide-react";
import { resizeImage } from "@/lib/image-resize";
import { ImageZoomModal } from "@/components/image/image-zoom-modal";

interface CameraUploadProps {
  label: string;
  onChange: (file: File) => void;
  value: File | null;
  required?: boolean;
  disabled?: boolean;
  /** When true, the dashed border switches to destructive to flag the
   *  field as failed validation. */
  invalid?: boolean;
  /** When true, the preview can be opened in a fullscreen zoom viewer —
   *  handy for reading an ear-tag number off the captured photo. */
  zoomable?: boolean;
}

export function CameraUpload({
  label,
  onChange,
  value,
  required,
  disabled,
  invalid,
  zoomable,
}: CameraUploadProps) {
  // Two separate inputs: one forces the camera (capture), the other omits
  // capture so the OS offers the photo library / files. Lets the user
  // either take a new picture or choose an existing one.
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  // Build the preview URL once per File and revoke it when the file
  // changes / the component unmounts. Without this, the previous
  // implementation called URL.createObjectURL on every render — leaking
  // a blob URL each time.
  const previewUrl = useMemo(
    () => (value ? URL.createObjectURL(value) : null),
    [value]
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFile(file: File | undefined, input: HTMLInputElement) {
    if (!file) return;
    // Reset the input so re-picking the same file still fires onChange next
    // time (browser dedupes by file identity).
    input.value = "";
    setProcessing(true);
    try {
      const resized = await resizeImage(file);
      onChange(resized);
    } catch {
      // If anything goes wrong with the canvas pipeline, hand back the
      // original file — the server still has its own limit + sharp
      // re-encode, so it'll fail loudly there if it really is too big.
      onChange(file);
    } finally {
      setProcessing(false);
    }
  }

  const tileBase =
    "w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/30 p-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const tileBorder = invalid
    ? "border-destructive bg-destructive/5"
    : "border-muted-foreground/25";

  return (
    <div>
      {processing ? (
        <div className={`${tileBase} ${tileBorder}`}>
          <Loader2 className="size-10 animate-spin text-muted-foreground/60" />
          <span className="text-sm font-medium text-muted-foreground">
            Resizing photo…
          </span>
        </div>
      ) : previewUrl ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => zoomable && setZoomOpen(true)}
            disabled={disabled}
            className={`relative w-full flex items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 p-3 transition-colors ${tileBorder} ${
              zoomable ? "cursor-zoom-in active:scale-[0.99]" : "cursor-default"
            }`}
            aria-label={zoomable ? "Zoom photo" : "Photo preview"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              className="h-40 w-auto rounded-lg object-cover"
            />
            {zoomable && (
              <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[12.1px] font-medium text-white">
                <Search className="size-3.5" /> Zoom
              </span>
            )}
          </button>
          {!disabled && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-rule-2 bg-card px-3 py-2 text-[13.2px] font-medium text-ink hover:bg-muted transition-colors"
              >
                <RefreshCw className="size-3.5" /> Retake
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-rule-2 bg-card px-3 py-2 text-[13.2px] font-medium text-ink hover:bg-muted transition-colors"
              >
                <ImageIcon className="size-3.5" /> Gallery
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={`${tileBase} ${tileBorder}`}>
          <Camera className="size-9 text-muted-foreground/60" />
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-ink bg-ink px-3.5 py-2 text-[13.2px] font-medium text-background active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-transform"
            >
              <Camera className="size-3.5" /> Take photo
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={disabled}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-rule-2 bg-card px-3.5 py-2 text-[13.2px] font-medium text-ink hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ImageIcon className="size-3.5" /> Gallery
            </button>
          </div>
        </div>
      )}

      {/* Camera: capture hints mobile browsers to open the rear camera. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        required={required && !value && !disabled}
        disabled={disabled}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0], e.target)}
      />
      {/* Gallery: no capture, so the OS offers the photo library / files. */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        disabled={disabled}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0], e.target)}
      />

      {zoomable && zoomOpen && previewUrl && (
        <ImageZoomModal
          src={previewUrl}
          alt="Captured photo"
          onClose={() => setZoomOpen(false)}
        />
      )}
    </div>
  );
}
