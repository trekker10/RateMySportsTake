import { createClient } from "@/lib/supabase/server";
import { checkIsAdmin } from "@/lib/auth";
import ProfileDropdown from "@/components/ProfileDropdown";

export default async function AuthButton() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = user ? await checkIsAdmin() : false;

  if (user) {
    return (
      <ProfileDropdown email={user.email ?? ""} isAdmin={isAdmin} />
    );
  }

  return (
    <a
      href="/auth/login"
      className="bg-gray-900 px-4 py-1.5 font-mono text-xs tracking-widest uppercase text-white hover:bg-black transition-colors"
    >
      Sign In
    </a>
  );
}
