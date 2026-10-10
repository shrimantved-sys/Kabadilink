import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SNS_TOPIC_ARN } from "../../shared/config.js";

const region = process.env.AWS_REGION || "ap-south-1";
export const snsClient = new SNSClient({ region });

export type NotificationEvent =
  | "REQUEST_CREATED"
  | "ACCEPTED"
  | "PICKED_UP"
  | "HANDED_OVER"
  | "CANCELLED";

export async function publishEventNotification(payload: {
  eventType: NotificationEvent;
  requestId: string;
  requestCode: string;
  locality: string;
  timestamp: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  if (!SNS_TOPIC_ARN) {
    // In local dev/testing without SNS topic, silently log
    console.log("[SNS Mock] Notification published:", JSON.stringify(payload));
    return;
  }

  try {
    const subject = `[KabadiLink] ${payload.eventType} - ${payload.requestCode}`;
    const message = JSON.stringify(payload, null, 2);

    await snsClient.send(
      new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Subject: subject.slice(0, 100),
        Message: message
      })
    );
  } catch (err) {
    console.error("[SNS Error] Failed to publish event notification:", err);
    // Don't fail the primary API transaction if notification fails
  }
}
