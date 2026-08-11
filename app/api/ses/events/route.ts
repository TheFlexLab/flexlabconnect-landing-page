import { NextRequest, NextResponse } from "next/server";
import { processSesEventPayload } from "@/lib/ses-events";
import {
  confirmSnsSubscription,
  type SnsEnvelope,
  verifySnsEnvelope,
} from "@/lib/sns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "flexlabconnect-ses-events",
    status: "ready",
  });
}

export async function POST(request: NextRequest) {
  try {
    const envelope = (await request.json().catch(() => null)) as SnsEnvelope | null;
    if (!envelope || typeof envelope !== "object") {
      return NextResponse.json({ ok: false, message: "Invalid SNS payload." }, { status: 400 });
    }

    await verifySnsEnvelope(envelope);

    if (envelope.Type === "SubscriptionConfirmation") {
      await confirmSnsSubscription(envelope);
      console.info("[ses-sns] subscription confirmed", {
        topicArn: envelope.TopicArn,
        messageId: envelope.MessageId,
      });
      return NextResponse.json({ ok: true, status: "subscription_confirmed" });
    }

    if (envelope.Type === "UnsubscribeConfirmation") {
      console.warn("[ses-sns] unsubscribe confirmation received", {
        topicArn: envelope.TopicArn,
        messageId: envelope.MessageId,
      });
      return NextResponse.json({ ok: true, status: "unsubscribe_confirmation_received" });
    }

    if (envelope.Type !== "Notification" || typeof envelope.Message !== "string") {
      return NextResponse.json(
        { ok: false, message: "Unsupported SNS message type." },
        { status: 400 }
      );
    }

    const sesPayload = JSON.parse(envelope.Message) as unknown;
    const processed = await processSesEventPayload(sesPayload);

    console.info("[ses-sns] event processed", {
      messageId: processed.messageId,
      eventType: processed.eventType,
      recipientCount: processed.recipients.length,
      suppressedCount: processed.suppressed.length,
    });

    return NextResponse.json({
      ok: true,
      status: "processed",
      eventType: processed.eventType,
      recipientCount: processed.recipients.length,
      suppressedCount: processed.suppressed.length,
    });
  } catch (error) {
    console.error("[ses-sns]", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to process SNS event.",
      },
      { status: 400 }
    );
  }
}
