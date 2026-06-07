interface CheckResult {
  ok: boolean;
  error?: string;
  /** dog-photo-check only: whether a dog was detected. When false, the
   *  upload is still allowed but will be reviewed by an admin. */
  hasDog?: boolean;
}

async function postImage(
  endpoint: string,
  file: File
): Promise<CheckResult> {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(endpoint, { method: "POST", body: formData });

  if (res.status === 401) {
    return { ok: false, error: "Log on Internet to verify image." };
  }
  if (res.status === 429) {
    return { ok: false, error: "Daily image-check limit reached." };
  }

  const data = (await res.json().catch(() => null)) as
    | { ok?: boolean; error?: string; hasDog?: boolean }
    | null;

  if (!res.ok) {
    if (typeof console !== "undefined") {
      console.error(`[image-checks] ${endpoint} failed:`, res.status, data);
    }
    return {
      ok: false,
      error: data?.error ?? `Image check failed (${res.status})`,
    };
  }

  if (data?.ok === false) {
    return { ok: false, error: data.error ?? "Image rejected." };
  }
  return { ok: true, hasDog: data?.hasDog };
}

export function checkEarTagImage(file: File): Promise<CheckResult> {
  return postImage("/api/ear-tag-check", file);
}

export function checkDogPhoto(file: File): Promise<CheckResult> {
  return postImage("/api/dog-photo-check", file);
}
