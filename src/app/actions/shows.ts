"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface Show {
  show_id: string;
  name: string;
  network: string | null;
  logo_url: string | null;
  created_at: string;
}

export async function getShows(): Promise<Show[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("shows")
    .select("*")
    .order("name");
  return (data ?? []) as Show[];
}

export async function upsertShow(
  show: { show_id?: string; name: string; network: string | null; logo_url: string | null }
): Promise<{ success: true; show_id: string } | { success: false; error: string }> {
  const supabase = createAdminClient();

  if (show.show_id) {
    // Update existing
    const { error } = await supabase
      .from("shows")
      .update({ name: show.name, network: show.network, logo_url: show.logo_url })
      .eq("show_id", show.show_id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/shows");
    return { success: true, show_id: show.show_id };
  } else {
    // Insert new
    const { data, error } = await supabase
      .from("shows")
      .insert({ name: show.name, network: show.network, logo_url: show.logo_url })
      .select("show_id")
      .single();
    if (error || !data) return { success: false, error: error?.message ?? "Insert failed" };
    revalidatePath("/admin/shows");
    return { success: true, show_id: data.show_id };
  }
}

export async function deleteShow(
  showId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("shows").delete().eq("show_id", showId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/shows");
  return { success: true };
}
