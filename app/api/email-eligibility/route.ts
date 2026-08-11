import { NextRequest, NextResponse } from "next/server";
import { getEmailEligibility } from "@/lib/email-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const expected = process.env.UNSUBSCRIBE_TEST_SECRET?.trim();
  if (!expected || process.env.ENABLE_UNSUBSCRIBE_TEST_API !== "true") return false;
  return request.headers.get("x-test-secret") === expected;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  if (!email) {
    return NextResponse.json({ ok: false, message: "email is required." }, { status: 400 });
  }

  try {
    const eligibility = await getEmailEligibility(email);
    return NextResponse.json({ ok: true, eligibility });
  } catch (error) {
    console.error("[email-eligibility]", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to check recipient." },
      { status: 500 }
    );
  }
}
