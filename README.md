# FlexLab Connect — Email Policy & Unsubscribe

This Next.js app contains the public FlexLab Connect communication-domain page plus a production-oriented unsubscribe and recipient-eligibility backend.

## What is implemented

- Signed unsubscribe tokens (email is not exposed in the URL)
- Branded `/unsubscribe?token=...` page
- POST `/api/unsubscribe` endpoint
- RFC 8058-compatible one-click POST endpoint using the same route
- DynamoDB-backed recipient eligibility / suppression state
- Allow-list of legitimate recipient sources:
  - `existing_customer`
  - `contact_form`
  - `meeting_request`
  - `confirmed_subscriber`
- Send guard that blocks unknown, disallowed, unsubscribed, bounced, and complained recipients before SES is called
- Protected test APIs so the full unsubscribe lifecycle can be verified before enabling production traffic
- Helper for generating `List-Unsubscribe` and `List-Unsubscribe-Post` headers

## 1. Configure environment

Copy `.env.example` to `.env.local` and fill in the values.

Required values:

```env
NEXT_PUBLIC_SITE_URL=https://flexlabconnect.com
UNSUBSCRIBE_SECRET=<minimum-32-character-secret>
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=<server-side-iam-access-key>
AWS_SECRET_ACCESS_KEY=<server-side-iam-secret>
DYNAMODB_EMAIL_TABLE=flexlabconnect-email-policy
DYNAMODB_AUTO_CREATE=true
ENABLE_UNSUBSCRIBE_TEST_API=true
UNSUBSCRIBE_TEST_SECRET=<separate-test-secret>
```

Generate secrets with:

```bash
openssl rand -hex 32
```

Never expose `UNSUBSCRIBE_SECRET`, `AWS_SECRET_ACCESS_KEY`, or `UNSUBSCRIBE_TEST_SECRET` to browser code.

## 2. IAM permissions for first test

If `DYNAMODB_AUTO_CREATE=true`, the server-side IAM principal needs:

- `dynamodb:CreateTable`
- `dynamodb:DescribeTable`
- `dynamodb:GetItem`
- `dynamodb:PutItem`

After the table is created, set `DYNAMODB_AUTO_CREATE=false`. You can then remove `dynamodb:CreateTable` from the IAM policy.

## 3. Run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## 4. Create a test recipient and unsubscribe link

Use Postman or curl:

```bash
curl -X POST http://localhost:3000/api/internal/unsubscribe-test \
  -H "Content-Type: application/json" \
  -H "x-test-secret: YOUR_UNSUBSCRIBE_TEST_SECRET" \
  -d '{"action":"create","email":"your-real-test-email@example.com","source":"confirmed_subscriber"}'
```

The response contains:

- `links.preferenceUrl` — browser unsubscribe page
- `links.oneClickUrl` — endpoint for `List-Unsubscribe`
- `listUnsubscribeHeaders` — headers to attach to optional emails
- current eligibility

Open `links.preferenceUrl`, click **Unsubscribe**, and confirm the success state.

## 5. Verify the recipient is blocked

```bash
curl -X POST http://localhost:3000/api/internal/unsubscribe-test \
  -H "Content-Type: application/json" \
  -H "x-test-secret: YOUR_UNSUBSCRIBE_TEST_SECRET" \
  -d '{"action":"check","email":"your-real-test-email@example.com"}'
```

Expected result after unsubscribe:

```json
{
  "ok": true,
  "eligibility": {
    "allowed": false,
    "reason": "unsubscribed"
  }
}
```

## 6. Test RFC 8058 one-click unsubscribe

Take the `links.oneClickUrl` returned by the test API and run:

```bash
curl -X POST "ONE_CLICK_URL_FROM_TEST_RESPONSE" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "List-Unsubscribe=One-Click"
```

Expected response: `status` is `unsubscribed` or `already_unsubscribed`.

## 7. Integrate with the actual SES sender

This project intentionally does not expose a generic public "send to any email" endpoint.

In the server-side code that invokes Amazon SES, import:

```ts
import {
  createListUnsubscribeHeaders,
  createUnsubscribeLinks,
  enforceSesRecipientPolicy,
} from "@/lib/email-delivery";
```

Before sending an optional email:

```ts
await enforceSesRecipientPolicy(recipientEmail);
```

Then build the recipient-specific unsubscribe URL:

```ts
const { preferenceUrl } = createUnsubscribeLinks(recipientEmail);
```

Put `preferenceUrl` in the email footer.

For raw/MIME email or any SES integration that supports custom headers:

```ts
const headers = createListUnsubscribeHeaders(recipientEmail);
```

This returns:

- `List-Unsubscribe: <https://flexlabconnect.com/api/unsubscribe?token=...>`
- `List-Unsubscribe-Post: List-Unsubscribe=One-Click`

## 8. Register legitimate recipients

When a person actually becomes eligible for email, your backend must call:

```ts
import { registerEligibleRecipient } from "@/lib/email-policy";

await registerEligibleRecipient(email, "confirmed_subscriber");
```

Use the appropriate real source:

- `existing_customer`
- `contact_form`
- `meeting_request`
- `confirmed_subscriber`

Do not register purchased, scraped, Apollo, imported cold, or otherwise unsolicited recipients as an allowed source.

## 9. Bounce / complaint integration

`lib/email-policy.ts` also exports:

```ts
markEmailRiskEvent(email, "bounce")
markEmailRiskEvent(email, "complaint")
```

Wire these functions into your SES event-processing path (for example SNS/EventBridge/Lambda -> your backend). Once recorded, the same send guard blocks future delivery.

That event-source wiring is infrastructure-specific and is not automatically enabled just by deploying this Next.js app.

## 10. Production lock-down

After testing:

```env
DYNAMODB_AUTO_CREATE=false
ENABLE_UNSUBSCRIBE_TEST_API=false
```

Also remove `dynamodb:CreateTable` permission if no longer needed.

## Important

The technical controls must match your real sending practices. Do not use the SES path for purchased, scraped, or unsolicited prospecting lists if your public policy and AWS production-access request state that SES is limited to customers, direct inquiries, meeting requests, and confirmed subscribers.
