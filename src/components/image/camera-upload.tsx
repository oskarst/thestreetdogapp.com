"use client";

import { useEffect, useMemo, useRef } from "react";
import { Camera } from "lucide-react";

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
        {previewUrl ? (
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
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange(file);
        }}
      />
    </div>
  );
}
