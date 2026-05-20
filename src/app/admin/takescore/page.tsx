import { redirect } from "next/navigation";
import { checkIsAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import TakeScoreAdmin from "./TakeScoreAdmin";
import { getTakeScoreConfig, getConfigHistory } from "@/app/actions/takescore";

export default async function TakeScoreAdminPage() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) redirect("/");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [config, history] = await Promise.all([
    getTakeScoreConfig(),
    getConfigHistory(),
  ]);

  return (
    <div className="max-w-5xl">
      <TakeScoreAdmin
        config={config}
        configHistory={history}
        adminEmail={user?.email ?? ""}
      />
    </div>
  );
}
