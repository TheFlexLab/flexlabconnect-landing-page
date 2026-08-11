import { NextRequest, NextResponse } from "next/server";
import { unsubscribeEmail } from "@/lib/email-policy";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractTokenFromBody(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const value = (body as Record<string, unknown>).token;
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  try {
    const queryToken = request.nextUrl.searchParams.get("token")?.trim() || "";
    const contentType = request.headers.get("content-type") || "";
    let bodyToken = "";

    if (contentType.includes("application/json")) {
      bodyToken = extractTokenFromBody(await request.json().catch(() => null));
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const body = await request.text();
      const form = new URLSearchParams(body);
      bodyToken = form.get("token")?.trim() || "";
      // RFC 8058 one-click POST commonly sends only List-Unsubscribe=One-Click;
      // in that case the signed token stays in the URL query string.
    }

    const token = queryToken || bodyToken;
    if (!token) {
      return NextResponse.json(
        { ok: false, message: "Invalid unsubscribe request." },
        { status: 400 }
      );
    }

    const payload = verifyUnsubscribeToken(token);
    if (!payload) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "This unsubscribe link is invalid. Please contact info@flexlab.io for assistance.",
        },
        { status: 400 }
      );
    }

    const status = await unsubscribeEmail(payload.email);
    return NextResponse.json({
      ok: true,
      status,
      message:
        status === "already_unsubscribed"
          ? "You are already unsubscribed from optional FlexLab email communications."
          : "You have been successfully unsubscribed from optional FlexLab email communications.",
    });
  } catch (error) {
    console.error("[unsubscribe]", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          "We could not process your unsubscribe request. Please try again or contact info@flexlab.io.",
      },
      { status: 500 }
    );
  }
}
