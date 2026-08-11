import { assertEmailCanBeSent } from "@/lib/email-policy";
import { createUnsubscribeToken, normalizeEmail } from "@/lib/unsubscribe-token";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://flexlabconnect.com").replace(/\/$/, "");
}

export function createUnsubscribeLinks(email: string) {
  const token = createUnsubscribeToken(normalizeEmail(email));
  const encoded = encodeURIComponent(token);
  return {
    token,
    preferenceUrl: `${siteUrl()}/unsubscribe?token=${encoded}`,
    oneClickUrl: `${siteUrl()}/api/unsubscribe?token=${encoded}`,
  };
}

export function createListUnsubscribeHeaders(email: string): Record<string, string> {
  const { oneClickUrl } = createUnsubscribeLinks(email);
  return {
    "List-Unsubscribe": `<${oneClickUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/**
 * Call this immediately before invoking SES for any optional/marketing message.
 * It blocks unknown, imported/cold, unsubscribed, bounced and complained recipients.
 */
export async function enforceSesRecipientPolicy(email: string): Promise<void> {
  await assertEmailCanBeSent(email);
}
