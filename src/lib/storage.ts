import { supabase } from "./supabase";

export function getPublicStorageUrl(bucket: "listing-images" | "business-images" | "avatars", path: string | null | undefined): string {
  if (!path) return "";
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
