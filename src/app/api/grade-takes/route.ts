import { NextRequest, NextResponse } from "next/server";
import { gradeAllPendingTakes } from "@/app/actions/grading";

// Called daily by Vercel Cron (or any scheduler via GET with ?secret=...)
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.GRADE_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await gradeAllPendingTakes();
  return NextResponse.json({ ok: true, ...result });
}
