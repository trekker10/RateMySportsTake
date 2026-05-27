import { redirect } from "next/navigation";
import { checkIsAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ExpertEditForm from "./ExpertEditForm";
import FindTakesPanel from "./FindTakesPanel";
import ExpertTakesPanel from "./ExpertTakesPanel";

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
    <div className="max-w-4xl space-y-10">
      <div>
        <a href="/admin/experts" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Back to experts
        </a>
        <h1 className="mt-3 text-3xl font-bold">Edit {expert.name}</h1>
      </div>
      <ExpertEditForm expert={expert} />
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
          Takes ({expert.name})
        </h2>
        <ExpertTakesPanel expertId={expert.expert_id} />
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
          Find Takes Online
        </h2>
        <FindTakesPanel
          expertId={expert.expert_id}
          expertName={expert.name}
          twitterHandle={expert.twitter_handle ?? null}
        />
      </div>
    </div>
  );
}
