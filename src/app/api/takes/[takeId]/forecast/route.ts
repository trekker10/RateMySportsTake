import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCrowdSettings } from "@/app/actions/crowdSettings";

type Params = { params: Promise<{ takeId: string }> };

// ── GET /api/takes/[takeId]/forecast ─────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { takeId } = await params;
  const supabase = await createClient();

  // vote tallies
  const { data: votes } = await supabase
    .from("take_votes")
    .select("vote")
    .eq("take_id", takeId);

  const well   = votes?.filter((v) => v.vote === "well").length  ?? 0;
  const poorly = votes?.filter((v) => v.vote === "poorly").length ?? 0;

  // current user's vote (if logged in)
  let myVote: "well" | "poorly" | null = null;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: mine } = await supabase
      .from("take_votes")
      .select("vote")
      .eq("take_id", takeId)
      .eq("user_id", user.id)
      .maybeSingle();
    myVote = (mine?.vote as "well" | "poorly") ?? null;
  }

  // take grading status
  const { data: take } = await supabase
    .from("takes")
    .select("outcome_status")
    .eq("take_id", takeId)
    .maybeSingle();

  const graded  = take?.outcome_status === "confirmed_true" || take?.outcome_status === "confirmed_false" || take?.outcome_status === "partially_true";
  const verdict = take?.outcome_status === "confirmed_true" ? "right"
                : (take?.outcome_status === "confirmed_false" || take?.outcome_status === "partially_true") ? "wrong"
                : undefined;

  const { minVotes } = await getCrowdSettings();
  return NextResponse.json({ well, poorly, myVote, graded, verdict, minVotes });
}

// ── POST /api/takes/[takeId]/forecast ────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Params) {
  const { takeId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Login required to vote" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const vote = body?.vote as "well" | "poorly" | undefined;
  if (vote !== "well" && vote !== "poorly") {
    return NextResponse.json({ error: "vote must be 'well' or 'poorly'" }, { status: 400 });
  }

  // reject if take is already graded
  const { data: take } = await supabase
    .from("takes")
    .select("outcome_status")
    .eq("take_id", takeId)
    .maybeSingle();

  const graded = take?.outcome_status === "confirmed_true" || take?.outcome_status === "confirmed_false" || take?.outcome_status === "partially_true";
  if (graded) {
    return NextResponse.json({ error: "Voting is closed for graded takes" }, { status: 409 });
  }

  // check existing vote
  const { data: existing } = await supabase
    .from("take_votes")
    .select("vote_id, vote")
    .eq("take_id", takeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    // insert
    await supabase.from("take_votes").insert({ take_id: takeId, user_id: user.id, vote });
  } else if (existing.vote === vote) {
    // same side → undo (delete)
    await supabase.from("take_votes").delete().eq("vote_id", existing.vote_id);
  } else {
    // switch sides → update
    await supabase.from("take_votes").update({ vote, updated_at: new Date().toISOString() }).eq("vote_id", existing.vote_id);
  }

  // return fresh tally
  const { data: votes } = await supabase.from("take_votes").select("vote").eq("take_id", takeId);
  const well   = votes?.filter((v) => v.vote === "well").length  ?? 0;
  const poorly = votes?.filter((v) => v.vote === "poorly").length ?? 0;
  const { data: mine } = await supabase.from("take_votes").select("vote").eq("take_id", takeId).eq("user_id", user.id).maybeSingle();
  const myVote = (mine?.vote as "well" | "poorly") ?? null;

  return NextResponse.json({ well, poorly, myVote, graded: false });
}
