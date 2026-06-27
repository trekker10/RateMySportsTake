import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Server action POSTs carry a Next-Action header.
  // Passing them through updateSession can cause the middleware to return
  // a response with the wrong Content-Type, triggering
  // "An unexpected response was received from the server" on the client.
  if (request.headers.has("next-action")) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
