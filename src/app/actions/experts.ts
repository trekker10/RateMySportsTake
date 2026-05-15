"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkIsAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateExpert(expertId: string, formData: FormData) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  await supabase.from("experts").update({
    name:           formData.get("name") as string,
    outlet:         (formData.get("outlet") as string) || null,
    twitter_handle: (formData.get("twitter_handle") as string) || null,
    bio:            (formData.get("bio") as string) || null,
    avatar_url:     (formData.get("avatar_url") as string) || null,
  }).eq("expert_id", expertId);

  revalidatePath(`/experts/${expertId}`);
  revalidatePath("/admin/experts");
}
