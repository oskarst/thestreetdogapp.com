"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { resizeImage } from "@/lib/image-resize";

interface CameraUploadProps {
  label: string;
  onChange: (file: File) => void;
  value: File | null;
  required?: boolean;
}

export function CameraUpload({
  label,
  onChange,
  value,
  required,
}: CameraUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

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

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-6 transition-colors hover:border-primary/50 hover:bg-muted/50 active:scale-[0.98]"
      >
        {processing ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <Loader2 className="size-10 animate-spin text-muted-foreground/60" />
            <span className="text-sm font-medium text-muted-foreground">
              Resizing photo…
            </span>
          </div>
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview"
            className="h-40 w-auto rounded-lg object-cover"
          />
        ) : (
          <>
            <Camera className="size-10 text-muted-foreground/60" />
            <span className="text-sm font-medium text-muted-foreground">
              {label}
            </span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        required={required && !value}
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          // Reset the input so re-picking the same file still fires
          // onChange next time (browser dedupes by file identity).
          e.target.value = "";
          setProcessing(true);
          try {
            const resized = await resizeImage(file);
            onChange(resized);
          } catch {
            // If anything goes wrong with the canvas pipeline, hand
            // back the original file — the server still has its own
            // limit + sharp re-encode, so it'll fail loudly there if
            // it really is too big.
            onChange(file);
          } finally {
            setProcessing(false);
          }
        }}
      />
    </div>
  );
}
