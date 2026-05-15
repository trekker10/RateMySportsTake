import { redirect } from "next/navigation";
import { checkIsAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ExpertEditForm from "./ExpertEditForm";

export default async function ExpertEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) redirect("/");

  const { id } = await params;
  const supabase = await createClient();
  const { data: expert } = await supabase
    .from("experts")
    .select("*")
    .eq("expert_id", id)
    .single();

  if (!expert) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <a href="/admin/experts" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Back to experts
        </a>
        <h1 className="mt-3 text-3xl font-bold">Edit {expert.name}</h1>
      </div>
      <ExpertEditForm expert={expert} />
    </div>
  );
}
