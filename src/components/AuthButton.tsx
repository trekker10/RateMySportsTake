import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { checkIsAdmin } from "@/lib/auth";

export default async function AuthButton() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = user ? await checkIsAdmin() : false;

  if (user) {
    return (
      <div className="flex items-center gap-4">
        {isAdmin && (
          <a
            href="/admin"
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Admin
          </a>
        )}
        <span className="text-xs text-gray-500 hidden sm:block">
          {user.email}
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-gray-300 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <a
      href="/auth/login"
      className="rounded-lg bg-gray-700 px-4 py-1.5 text-sm text-gray-200 hover:bg-gray-600 transition-colors"
    >
      Sign in
    </a>
  );
}
