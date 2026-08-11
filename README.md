# FlexLab Connect — SES Email Policy, Unsubscribe & SNS Event Webhook

This Next.js app contains the public FlexLab Connect communication-domain page and the backend controls needed for a production-oriented Amazon SES setup.

## What is implemented

- Signed unsubscribe tokens (recipient email is not exposed in the URL)
- Branded `/unsubscribe?token=...` page
- POST `/api/unsubscribe` endpoint
- RFC 8058-compatible one-click unsubscribe using the same endpoint
- DynamoDB-backed recipient eligibility and suppression state
- Allow-list of legitimate recipient sources:
  - `existing_customer`
  - `contact_form`
  - `meeting_request`
  - `confirmed_subscriber`
- Pre-send guard that blocks unknown, disallowed, unsubscribed, bounced, and complained recipients
- `List-Unsubscribe` and `List-Unsubscribe-Post` header helpers
- Production HTTPS SNS endpoint: `POST /api/ses/events`
- SNS signature verification before any event is trusted
- SNS topic ARN allow-listing
- Secure SNS subscription auto-confirmation
- SES identity-notification payload support
- SES configuration-set event payload support
- Permanent bounce suppression
- Complaint suppression
- SES event audit records in DynamoDB
- Protected testing endpoints for the unsubscribe lifecycle

## Current AWS architecture

```text
Amazon SES (us-east-2)
  ├─ Identity: flexlabconnect.com
  ├─ Configuration set: flexlabconnect-production
  └─ SNS topic: flexlabconnect-ses-events
                         │
                         ▼
https://flexlabconnect.com/api/ses/events
                         │
                         ├─ verifies AWS SNS signature
                         ├─ validates topic ARN
                         ├─ confirms subscription
                         ├─ processes SES event
                         └─ writes suppression/audit state to DynamoDB
```

The same SNS endpoint supports both SES identity-level notifications and configuration-set event publishing.

## 1. Environment variables

Copy `.env.example` to `.env.local` for local testing or inject the values through your production hosting environment.

```env
NEXT_PUBLIC_SITE_URL=https://flexlabconnect.com
UNSUBSCRIBE_SECRET=<minimum-32-character-secret>

SES_REGION=us-east-2
AWS_ACCESS_KEY_ID=<server-side-iam-access-key>
AWS_SECRET_ACCESS_KEY=<server-side-iam-secret>

DYNAMODB_EMAIL_TABLE=flexlabconnect-email-policy
DYNAMODB_AUTO_CREATE=true

SES_CONFIGURATION_SET=flexlabconnect-production
SES_SNS_TOPIC_ARN=arn:aws:sns:us-east-2:157693542470:flexlabconnect-ses-events
SNS_AUTO_CONFIRM_SUBSCRIPTIONS=true

ENABLE_UNSUBSCRIBE_TEST_API=true
UNSUBSCRIBE_TEST_SECRET=<separate-test-secret>
```

Generate secrets with:

```bash
openssl rand -hex 32
```

Never expose `UNSUBSCRIBE_SECRET`, `AWS_SECRET_ACCESS_KEY`, or `UNSUBSCRIBE_TEST_SECRET` to browser code.

### IAM permissions

For the first run with `DYNAMODB_AUTO_CREATE=true`, the server-side IAM principal needs:

- `dynamodb:CreateTable`
- `dynamodb:DescribeTable`
- `dynamodb:GetItem`
- `dynamodb:PutItem`

After the table exists:

```env
DYNAMODB_AUTO_CREATE=false
```

Then remove `dynamodb:CreateTable` if it is no longer needed.

If the application runs on AWS with an IAM role, prefer the role over long-lived access keys. This project currently signs DynamoDB requests from the configured AWS credentials.

## 2. Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

The SNS endpoint health response is available at:

```text
GET /api/ses/events
```

Expected:

```json
{
  "ok": true,
  "service": "flexlabconnect-ses-events",
  "status": "ready"
}
```

## 3. Create the SNS HTTPS subscription

Deploy the app first so this URL is publicly reachable over HTTPS:

```text
https://flexlabconnect.com/api/ses/events
```

In AWS:

```text
Amazon SNS
→ Topics
→ flexlabconnect-ses-events
→ Create subscription
```

Use:

```text
Protocol: HTTPS
Endpoint: https://flexlabconnect.com/api/ses/events
```

Keep this enabled during the initial subscription:

```env
SNS_AUTO_CONFIRM_SUBSCRIPTIONS=true
```

When SNS sends `SubscriptionConfirmation`, the route:

1. verifies the SNS cryptographic signature,
2. verifies `SES_SNS_TOPIC_ARN`,
3. validates the AWS SNS URL,
4. calls the signed `SubscribeURL`, and
5. returns `subscription_confirmed`.

Refresh Amazon SNS. The subscription should become **Confirmed**.

After it is confirmed you may use:

```env
SNS_AUTO_CONFIRM_SUBSCRIPTIONS=false
```

Existing confirmed subscriptions continue delivering notifications; this only disables automatic confirmation of new subscription requests.

## 4. SNS security controls

`POST /api/ses/events` does **not** trust arbitrary JSON.

It requires:

- an allowed SNS message type,
- the exact configured SNS topic ARN,
- an AWS SNS signing-certificate URL,
- SNS SignatureVersion 1 or 2,
- a valid RSA signature.

The endpoint therefore cannot be used to suppress an address by simply posting a fake bounce JSON payload.

Keep the SNS topic access policy restricted to SES as configured in AWS.

## 5. Events handled

The route accepts both formats SES can send through your current setup:

### Identity feedback notifications

Examples:

- Bounce
- Complaint
- Delivery

These commonly use `notificationType`.

### Configuration-set event publishing

Examples selected in `flexlabconnect-production`:

- Send
- Rendering failure
- Reject
- Delivery
- Hard bounce
- Complaint
- Delivery delay
- Subscription

These commonly use `eventType`.

### Suppression behavior

- **Permanent/hard bounce** → recipient is marked `bounced=true`
- **Complaint** → recipient is marked `complained=true`
- Delivery/send/reject/delay/etc. → audit event only

The send guard subsequently blocks bounced or complained recipients.

Because identity notifications and configuration-set publishing can report overlapping events, SES audit records use deterministic hashes so duplicate deliveries overwrite the same logical audit record rather than generating unbounded duplicate records.

## 6. Important: configuration set must be attached to sends

Creating `flexlabconnect-production` in the AWS console is not enough by itself.

Your actual SES sender must specify the configuration set when sending production mail. For AWS SDK integrations this is normally the SES `ConfigurationSetName` / configuration-set field.

Use:

```env
SES_CONFIGURATION_SET=flexlabconnect-production
```

Identity-level Bounce/Complaint/Delivery notifications work independently, but the broader configuration-set events only appear when the sending request actually uses the configuration set.

## 7. Test unsubscribe lifecycle

Use Postman or curl:

```bash
curl -X POST http://localhost:3000/api/internal/unsubscribe-test \
  -H "Content-Type: application/json" \
  -H "x-test-secret: YOUR_UNSUBSCRIBE_TEST_SECRET" \
  -d '{"action":"create","email":"your-real-test-email@example.com","source":"confirmed_subscriber"}'
```

The response contains:

- `links.preferenceUrl`
- `links.oneClickUrl`
- `listUnsubscribeHeaders`
- current eligibility

Open `links.preferenceUrl` and click **Unsubscribe**.

Then check:

```bash
curl -X POST http://localhost:3000/api/internal/unsubscribe-test \
  -H "Content-Type: application/json" \
  -H "x-test-secret: YOUR_UNSUBSCRIBE_TEST_SECRET" \
  -d '{"action":"check","email":"your-real-test-email@example.com"}'
```

Expected:

```json
{
  "ok": true,
  "eligibility": {
    "allowed": false,
    "reason": "unsubscribed"
  }
}
```

## 8. RFC 8058 one-click unsubscribe

Take `links.oneClickUrl` returned by the protected test endpoint:

```bash
curl -X POST "ONE_CLICK_URL_FROM_TEST_RESPONSE" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "List-Unsubscribe=One-Click"
```

The response should report `unsubscribed` or `already_unsubscribed`.

## 9. Integrate the policy into the real SES sender

This application intentionally does not provide a generic public endpoint that sends mail to arbitrary addresses.

Before invoking SES for optional/marketing email:

```ts
import {
  createListUnsubscribeHeaders,
  createUnsubscribeLinks,
  enforceSesRecipientPolicy,
} from "@/lib/email-delivery";

await enforceSesRecipientPolicy(recipientEmail);

const { preferenceUrl } = createUnsubscribeLinks(recipientEmail);
const headers = createListUnsubscribeHeaders(recipientEmail);
```

Use `preferenceUrl` in the email footer.

For raw/MIME email, attach:

```text
List-Unsubscribe: <https://flexlabconnect.com/api/unsubscribe?token=...>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

Also attach the SES configuration set `flexlabconnect-production` in your SES send request.

## 10. Register legitimate recipients

When a person legitimately becomes eligible for communication:

```ts
import { registerEligibleRecipient } from "@/lib/email-policy";

await registerEligibleRecipient(email, "confirmed_subscriber");
```

Allowed sources are:

- `existing_customer`
- `contact_form`
- `meeting_request`
- `confirmed_subscriber`

A previous unsubscribe/bounce/complaint is deliberately not cleared by calling `registerEligibleRecipient` again.

## 11. Production lock-down

After all testing succeeds:

```env
DYNAMODB_AUTO_CREATE=false
ENABLE_UNSUBSCRIBE_TEST_API=false
SNS_AUTO_CONFIRM_SUBSCRIPTIONS=false
```

Also:

- remove `dynamodb:CreateTable` permission if unnecessary,
- use an IAM role where possible,
- keep SNS topic access restricted to SES,
- keep AWS credentials server-side only,
- monitor SES reputation metrics,
- keep account-level suppression enabled for bounces and complaints.

## 12. Deployment order for the current AWS setup

1. Deploy this updated Next.js app.
2. Configure production environment variables.
3. Confirm `GET https://flexlabconnect.com/api/ses/events` returns `status: ready`.
4. Create SNS HTTPS subscription to `https://flexlabconnect.com/api/ses/events`.
5. Verify SNS subscription becomes **Confirmed**.
6. Set `SNS_AUTO_CONFIRM_SUBSCRIPTIONS=false` and redeploy if desired.
7. Verify DynamoDB table exists.
8. Use SES mailbox simulator while still in sandbox to exercise bounce/complaint paths where available.
9. Ensure the real SES sender uses `flexlabconnect-production`.
10. Disable protected test APIs before production traffic.

## Important compliance note

The technical controls must match your actual sending practices and the statements in your SES production-access request. Do not register purchased, scraped, imported-cold, or otherwise unsolicited recipients as an allowed source if the SES use case is described as customers, direct inquiries, meeting requests, or confirmed subscribers.
