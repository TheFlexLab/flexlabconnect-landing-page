# FlexLab Connect — SES, MongoDB Suppression & Unsubscribe

This Next.js app supports the FlexLab Connect SES setup with signed unsubscribe links, MongoDB-backed recipient suppression, and an HTTPS SNS webhook.

## Implemented

- `/unsubscribe?token=...` preference page
- `POST /api/unsubscribe`
- RFC 8058 `List-Unsubscribe` / one-click helper
- MongoDB-backed recipient eligibility and suppression
- Allowed recipient sources: existing customer, contact form, meeting request, confirmed subscriber
- Pre-send eligibility guard
- SNS signature verification and topic ARN validation
- SES configuration-set event processing
- Permanent bounce persistence
- Complaint persistence
- Deduplicated SES event audit records
- Protected unsubscribe test endpoint

## Architecture

```text
NEW AWS ACCOUNT
SES → Configuration Set → SNS
                         │ HTTPS
                         ▼
OLD AWS ACCOUNT
Amplify / Next.js → MongoDB Atlas
                    ├─ email_recipients
                    └─ email_events
```

MongoDB Atlas is external to both AWS accounts, so no cross-account IAM is required.

## Environment variables

```env
NEXT_PUBLIC_SITE_URL=https://flexlabconnect.com
UNSUBSCRIBE_SECRET=<minimum-32-character-secret>

MONGODB_URI=<your MongoDB Atlas connection URI>
MONGODB_DB_NAME=flexlabconnect
MONGODB_RECIPIENTS_COLLECTION=email_recipients
MONGODB_EVENTS_COLLECTION=email_events

SES_REGION=us-east-2
SES_CONFIGURATION_SET=flexlabconnect-production
SES_SNS_TOPIC_ARN=arn:aws:sns:us-east-2:157693542470:flexlabconnect-ses-events
SNS_AUTO_CONFIRM_SUBSCRIPTIONS=false

ENABLE_UNSUBSCRIBE_TEST_API=true
UNSUBSCRIBE_TEST_SECRET=<separate-test-secret>
```

Generate secrets with:

```bash
openssl rand -hex 32
```

Do not expose `MONGODB_URI`, `UNSUBSCRIBE_SECRET`, or `UNSUBSCRIBE_TEST_SECRET` to browser code.

### MongoDB Atlas network access

The deployed Amplify server must be able to reach the Atlas cluster. If Atlas network access is IP restricted, Amplify SSR does not provide a simple fixed outbound IP by default. For the short SES validation stage, configure Atlas network access appropriately for your deployment, then tighten it based on your final hosting/network architecture.

## Install and run

```bash
npm install
npm run dev
```

The project now depends on the official `mongodb` Node.js driver.

## SNS webhook

Health check:

```text
GET https://flexlabconnect.com/api/ses/events
```

Expected:

```json
{"ok":true,"service":"flexlabconnect-ses-events","status":"ready"}
```

The existing confirmed SNS subscription can keep using:

```text
https://flexlabconnect.com/api/ses/events
```

## End-to-end unsubscribe test

Keep these temporarily enabled:

```env
ENABLE_UNSUBSCRIBE_TEST_API=true
UNSUBSCRIBE_TEST_SECRET=<secret>
```

Create a test recipient:

```bash
curl -X POST https://flexlabconnect.com/api/internal/unsubscribe-test \
  -H "Content-Type: application/json" \
  -H "x-test-secret: YOUR_TEST_SECRET" \
  -d '{"action":"create","email":"your-test-email@example.com","source":"confirmed_subscriber"}'
```

Open the returned `links.preferenceUrl` and click unsubscribe.

Then verify:

```bash
curl -X POST https://flexlabconnect.com/api/internal/unsubscribe-test \
  -H "Content-Type: application/json" \
  -H "x-test-secret: YOUR_TEST_SECRET" \
  -d '{"action":"check","email":"your-test-email@example.com"}'
```

Expected eligibility after unsubscribe:

```json
{"allowed":false,"reason":"unsubscribed"}
```

After testing, set `ENABLE_UNSUBSCRIBE_TEST_API=false` and redeploy.

## MongoDB collections

The app automatically creates the collections/indexes on first use:

- `email_recipients`: recipient source, consent metadata, unsubscribe/bounce/complaint state
- `email_events`: unsubscribe and SES audit events

Permanent bounce and complaint events update `email_recipients`; delivery/send/etc. are retained as audit events.
