import { createClient } from "@/lib/supabase/client";

export async function uploadDogImage(
  file: File,
  userId: string
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("dogs").upload(path, file);
  if (error) throw error;

  return getPublicUrl("dogs", path);
}

export async function uploadEarTagImage(
  file: File,
  userId: string
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("ear-tags").upload(path, file);
  if (error) throw error;

  return getPublicUrl("ear-tags", path);
}

export function getPublicUrl(bucket: string, path: string): string {
  const supabase = createClient();
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}
