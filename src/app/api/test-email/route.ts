import { NextResponse } from "next/server";

// The former public endpoint could send email to arbitrary addresses without
// authentication or rate limits. Keep it disabled until a safe admin-only
// diagnostic with ownership and abuse controls is designed.
export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
