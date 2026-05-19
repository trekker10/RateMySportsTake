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
            className="text-xs font-medium font-mono tracking-wider text-gray-500 hover:text-gray-900 transition-colors uppercase"
          >
            Admin
          </a>
        )}
        <span className="text-xs text-gray-400 hidden sm:block">
          {user.email}
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="font-mono text-xs tracking-wider text-gray-600 hover:text-gray-900 transition-colors uppercase"
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
      className="border border-gray-400 px-4 py-1.5 font-mono text-xs tracking-wider text-gray-700 hover:border-gray-900 hover:text-gray-900 transition-colors uppercase"
    >
      Sign in
    </a>
  );
}
