import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const DEFAULT_REGION = "us-east-2";
const DEFAULT_FROM_EMAIL = "contact@flexlabconnect.com";
const DEFAULT_FROM_NAME = "FlexLab";

const sesClient = new SESv2Client({
  region: process.env.SES_REGION || DEFAULT_REGION,
});

export async function sendSesEmail(input: {
  to: string;
  subject: string;
  message: string;
}): Promise<{ messageId: string }> {
  const fromEmail = process.env.SES_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const fromName = process.env.SES_FROM_NAME || DEFAULT_FROM_NAME;
  const replyTo = process.env.SES_REPLY_TO || fromEmail;

  const command = new SendEmailCommand({
    FromEmailAddress: `${fromName} <${fromEmail}>`,

    Destination: {
      ToAddresses: [input.to],
    },

    ReplyToAddresses: [replyTo],

    Content: {
      Simple: {
        Subject: {
          Data: input.subject,
          Charset: "UTF-8",
        },
        Body: {
          Text: {
            Data: input.message,
            Charset: "UTF-8",
          },
        },
      },
    },
  });

  const response = await sesClient.send(command);

  if (!response.MessageId) {
    throw new Error(
      "Amazon SES accepted the request but did not return a MessageId."
    );
  }

  return {
    messageId: response.MessageId,
  };
}