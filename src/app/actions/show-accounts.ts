"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkIsAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface ShowAccount {
  id: string;
  handle: string;
  display_name: string;
  network: string;
  active: boolean;
  created_at: string;
}

export async function getShowAccounts(): Promise<ShowAccount[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("show_accounts")
    .select("*")
    .order("display_name");
  return (data ?? []) as ShowAccount[];
}

export async function addShowAccount(input: {
  handle: string;
  display_name: string;
  network: string;
}): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("show_accounts").insert({
    handle:       input.handle.replace(/^@/, "").trim(),
    display_name: input.display_name.trim(),
    network:      input.network.trim(),
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/show-accounts");
  return { success: true };
}

export async function toggleShowAccount(
  id: string,
  active: boolean,
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("show_accounts")
    .update({ active })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/show-accounts");
  return { success: true };
}

export async function deleteShowAccount(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("show_accounts").delete().eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/show-accounts");
  return { success: true };
}
