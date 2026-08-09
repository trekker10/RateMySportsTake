import { redirect } from "next/navigation";
import { checkIsAdmin } from "@/lib/auth";
import InstagramTakesPanel from "./InstagramTakesPanel";

export default async function InstagramTakesPage() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) redirect("/");

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          📸 Instagram Video Takes
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Paste an Instagram reel URL to extract and save fantasy football takes.
        </p>
      </div>
      <InstagramTakesPanel />
    </div>
  );
}
