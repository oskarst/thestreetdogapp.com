"use client";

import { useRef } from "react";
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

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-6 transition-colors hover:border-primary/50 hover:bg-muted/50 active:scale-[0.98]"
      >
        {value ? (
          <img
            src={URL.createObjectURL(value)}
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
