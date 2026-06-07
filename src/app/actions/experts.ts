"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkIsAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function toggleVerified(expertId: string, verified: boolean) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  await supabase.from("experts").update({ verified }).eq("expert_id", expertId);

  revalidatePath("/admin/experts");
  revalidatePath("/experts");
  revalidatePath("/");
}

export async function toggleFantasyGuru(expertId: string, isFantasyGuru: boolean) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  await supabase.from("experts").update({ is_fantasy_guru: isFantasyGuru }).eq("expert_id", expertId);

  revalidatePath("/admin/experts");
  revalidatePath("/experts");
  revalidatePath("/fantasy");
}

export async function updateExpert(expertId: string, formData: FormData) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  await supabase.from("experts").update({
    name:             formData.get("name") as string,
    outlet:           (formData.get("outlet") as string) || null,
    twitter_handle:   (formData.get("twitter_handle") as string) || null,
    bio:              (formData.get("bio") as string) || null,
    avatar_url:       (formData.get("avatar_url") as string) || null,
    verified:         formData.get("verified") === "true",
    is_fantasy_guru:  formData.get("is_fantasy_guru") === "true",
  }).eq("expert_id", expertId);

  revalidatePath(`/experts/${expertId}`);
  revalidatePath("/admin/experts");
}

export async function deleteExpert(expertId: string): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const supabase = createAdminClient();

  // Delete takes and fantasy_takes first (child records)
  await supabase.from("takes").delete().eq("expert_id", expertId);
  await supabase.from("fantasy_takes").delete().eq("expert_id", expertId);
  await supabase.from("flip_flops").delete().eq("expert_id", expertId);

  // Delete the expert
  const { error } = await supabase.from("experts").delete().eq("expert_id", expertId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/experts");
  revalidatePath("/experts");
  revalidatePath("/");
  return { success: true };
}
