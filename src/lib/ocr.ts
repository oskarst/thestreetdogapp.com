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
    return { success: false, error: "Please sign in to use OCR scanning" };
  }

  if (res.status === 429) {
    return { success: false, error: "OCR limit reached. Please enter the ID manually." };
  }

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.error ?? "OCR processing failed" };
  }

  return data;
}
