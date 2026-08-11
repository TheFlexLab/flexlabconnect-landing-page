import { NextRequest, NextResponse } from "next/server";
import { processSesEventPayload } from "@/lib/ses-events";
import { type SnsEnvelope, verifySnsEnvelope } from "@/lib/sns";

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
      if (!envelope.SubscribeURL) {
        return NextResponse.json(
          { ok: false, message: "SNS SubscribeURL is missing." },
          { status: 400 }
        );
      }
    
      const subscribeUrl = new URL(envelope.SubscribeURL);
    
      if (
        subscribeUrl.protocol !== "https:" ||
        !subscribeUrl.hostname.endsWith(".amazonaws.com")
      ) {
        return NextResponse.json(
          { ok: false, message: "Invalid SNS SubscribeURL." },
          { status: 400 }
        );
      }
    
      const response = await fetch(envelope.SubscribeURL, {
        method: "GET",
        cache: "no-store",
      });
    
      const responseText = await response.text();
    
      console.info("[ses-sns] subscription confirmation response", {
        topicArn: envelope.TopicArn,
        messageId: envelope.MessageId,
        status: response.status,
        body: responseText.slice(0, 500),
      });
    
      if (!response.ok) {
        return NextResponse.json(
          {
            ok: false,
            message: `SNS confirmation failed with HTTP ${response.status}.`,
          },
          { status: 502 }
        );
      }
    
      return NextResponse.json({
        ok: true,
        status: "subscription_confirmed",
      });
    }

    console.info("[ses-sns] incoming envelope", {
      type: envelope.Type,
      topicArn: envelope.TopicArn,
      messageId: envelope.MessageId,
      hasSubscribeUrl: Boolean(envelope.SubscribeURL),
    });

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
