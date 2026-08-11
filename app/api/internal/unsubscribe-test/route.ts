import { NextRequest, NextResponse } from "next/server";
import {
  ALLOWED_RECIPIENT_SOURCES,
  getEmailEligibility,
  registerEligibleRecipient,
  type AllowedRecipientSource,
} from "@/lib/email-policy";
import { createUnsubscribeLinks, createListUnsubscribeHeaders } from "@/lib/email-delivery";
import { isValidEmail, normalizeEmail } from "@/lib/unsubscribe-token";

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

  try {
    const body = await request.json().catch(() => null);
    const action = typeof body?.action === "string" ? body.action : "create";
    const email = normalizeEmail(typeof body?.email === "string" ? body.email : "");

    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, message: "A valid email is required." }, { status: 400 });
    }

    if (action === "check") {
      return NextResponse.json({ ok: true, eligibility: await getEmailEligibility(email) });
    }

    if (action !== "create") {
      return NextResponse.json({ ok: false, message: "action must be create or check." }, { status: 400 });
    }

    const requestedSource =
      typeof body?.source === "string" ? body.source : "confirmed_subscriber";
    if (!ALLOWED_RECIPIENT_SOURCES.includes(requestedSource as AllowedRecipientSource)) {
      return NextResponse.json(
        {
          ok: false,
          message: `source must be one of: ${ALLOWED_RECIPIENT_SOURCES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    await registerEligibleRecipient(email, requestedSource as AllowedRecipientSource, {
      sourceDetail: "protected_test_api",
    });

    const links = createUnsubscribeLinks(email);
    return NextResponse.json({
      ok: true,
      email,
      source: requestedSource,
      eligibility: await getEmailEligibility(email),
      links,
      listUnsubscribeHeaders: createListUnsubscribeHeaders(email),
      next: [
        "Open links.preferenceUrl in a browser and click unsubscribe.",
        "Then POST this API again with action=check; allowed should be false and reason should be unsubscribed.",
      ],
    });
  } catch (error) {
    console.error("[unsubscribe-test]", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Test setup failed." },
      { status: 500 }
    );
  }
}
