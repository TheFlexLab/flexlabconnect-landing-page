import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { sendSesEmail } from "@/lib/ses-sender";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });

  try {
    const body = (await request.json()) as { to?: string; subject?: string; message?: string };
    const to = body.to?.trim().toLowerCase() || "";
    const subject = body.subject?.trim() || "";
    const message = body.message?.trim() || "";

    if (!EMAIL_RE.test(to) || to.length > 254) {
      return NextResponse.json({ error: "Enter a valid recipient email address." }, { status: 400 });
    }
    if (subject.length < 1 || subject.length > 200) {
      return NextResponse.json({ error: "Subject must be between 1 and 200 characters." }, { status: 400 });
    }
    if (message.length < 1 || message.length > 10000) {
      return NextResponse.json({ error: "Message must be between 1 and 10,000 characters." }, { status: 400 });
    }

    const result = await sendSesEmail({ to, subject, message });
    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send the test email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
