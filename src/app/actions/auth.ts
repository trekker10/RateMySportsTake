"use server";

import { cookies } from "next/headers";
import { createHash } from "crypto";

function sessionToken(password: string) {
  return createHash("sha256")
    .update(`rmst:${password}`)
    .digest("hex");
}

export async function verifyImportPassword(password: string): Promise<boolean> {
  const expected = process.env.IMPORT_PASSWORD;
  if (!expected || password !== expected) return false;

  const cookieStore = await cookies();
  cookieStore.set("import_session", sessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/import",
  });
  return true;
}

export async function checkImportAccess(): Promise<boolean> {
  const expected = process.env.IMPORT_PASSWORD;
  if (!expected) return true; // no password set = open

  const cookieStore = await cookies();
  const session = cookieStore.get("import_session")?.value;
  return session === sessionToken(expected);
}
