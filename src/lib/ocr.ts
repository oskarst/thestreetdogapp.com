interface ScanResult {
  success: boolean;
  earTagId?: string;
  existingDog?: { id: string; name: string | null } | null;
  error?: string;
}

export async function scanEarTag(file: File): Promise<ScanResult> {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch("/api/ocr", {
    method: "POST",
    body: formData,
  });

  if (res.status === 401) {
    return { success: false, error: "Log on Internet to use OCR." };
  }

  if (res.status === 429) {
    return { success: false, error: "OCR limit reached. Please enter the ID manually." };
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (typeof console !== "undefined") {
      console.error("[scanEarTag] /api/ocr failed:", res.status, data);
    }
    return {
      success: false,
      error: data?.error ?? `OCR processing failed (${res.status})`,
    };
  }

  return data ?? { success: false, error: "Empty OCR response" };
}
