import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import crypto from "node:crypto";
import { requestsRepo } from "../db/requests.repo.js";
import {
  createRequestSchema,
  presignedUploadSchema,
  calculateEstimatedWeightKg
} from "../../shared/validation.js";
import { publishEventNotification } from "../notifications/sns.js";
import { jsonResponse, parseJsonBody, handleError } from "./http.js";
import { PHOTOS_BUCKET, APP_NAME } from "../../shared/config.js";

const region = process.env.AWS_REGION || "ap-south-1";
const s3Client = new S3Client({ region });

function generateRequestCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "KL-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generatePickupOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();
  const path = event.rawPath || event.requestContext.http.path;

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return jsonResponse(204, {});
  }

  try {
    // 1. POST /uploads/presign
    if (method === "POST" && path.endsWith("/uploads/presign")) {
      const body = parseJsonBody<{ contentType: "image/jpeg" | "image/png"; contentLength: number }>(event);
      const validated = presignedUploadSchema.parse(body);

      const fileKey = `photos/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${
        validated.contentType === "image/png" ? "png" : "jpg"
      }`;

      // 5-minute expiry, max 3 MB, exact content type
      const presigned = await createPresignedPost(s3Client, {
        Bucket: PHOTOS_BUCKET,
        Key: fileKey,
        Conditions: [
          ["content-length-range", 1, 3 * 1024 * 1024],
          ["eq", "$Content-Type", validated.contentType]
        ],
        Fields: {
          "Content-Type": validated.contentType
        },
        Expires: 300 // 5 minutes
      });

      return jsonResponse(200, {
        presigned,
        fileKey
      });
    }

    // 2. POST /requests
    if (method === "POST" && (path === "/requests" || path.endsWith("/requests"))) {
      const body = parseJsonBody(event);
      const validated = createRequestSchema.parse(body);

      const requestId = `req-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
      const code = generateRequestCode();
      const pickupOtp = generatePickupOtp();
      const estimatedWeightKg = calculateEstimatedWeightKg(validated.items);

      const newRequest = await requestsRepo.createRequest({
        id: requestId,
        code,
        householdName: validated.householdName,
        phone: validated.phone,
        locality: validated.locality,
        landmark: validated.landmark || "",
        items: validated.items,
        photoKey: validated.photoKey,
        pickupDate: validated.pickupDate,
        window: validated.window,
        estimatedWeightKg,
        pickupOtp
      });

      // SNS Notification
      await publishEventNotification({
        eventType: "REQUEST_CREATED",
        requestId: newRequest.id,
        requestCode: newRequest.code,
        locality: newRequest.locality,
        timestamp: newRequest.createdAt,
        details: {
          itemsCount: newRequest.items.length,
          estimatedWeightKg: newRequest.estimatedWeightKg
        }
      });

      const smsPreview = `[${APP_NAME}] Pickup request ${code} confirmed for ${validated.pickupDate} (${validated.window}). Your 4-digit pickup OTP is ${pickupOtp}. Do NOT share OTP until collector arrives.`;

      return jsonResponse(201, {
        request: newRequest,
        pickupOtp,
        smsPreview
      });
    }

    // 3. POST /requests/{id}/cancel
    const cancelMatch = path.match(/\/requests\/([^/]+)\/cancel$/);
    if (method === "POST" && cancelMatch) {
      const requestId = cancelMatch[1];
      let note: string | undefined;
      try {
        const body = parseJsonBody<{ note?: string }>(event);
        note = body?.note;
      } catch {
        // Body is optional for cancel
      }

      const cancelled = await requestsRepo.cancelRequest(requestId, note);

      await publishEventNotification({
        eventType: "CANCELLED",
        requestId: cancelled.id,
        requestCode: cancelled.code,
        locality: cancelled.locality,
        timestamp: cancelled.updatedAt,
        details: { note }
      });

      return jsonResponse(200, {
        message: "Request successfully cancelled.",
        request: cancelled
      });
    }

    // 4. GET /requests/{id} (needs lastFour query param)
    const getMatch = path.match(/\/requests\/([^/]+)$/);
    if (method === "GET" && getMatch) {
      const requestId = getMatch[1];
      const lastFour = event.queryStringParameters?.lastFour;

      if (!lastFour || !/^\d{4}$/.test(lastFour)) {
        return jsonResponse(400, {
          error: "VALIDATION_ERROR",
          message: "The 'lastFour' query parameter (last 4 digits of phone number) is required for tracking."
        });
      }

      const req = await requestsRepo.getRequestById(requestId);
      if (!req) {
        return jsonResponse(404, {
          error: "NOT_FOUND",
          message: `Pickup request ${requestId} was not found.`
        });
      }

      const phoneClean = req.phone.replace(/\D/g, "");
      if (!phoneClean.endsWith(lastFour)) {
        return jsonResponse(403, {
          error: "FORBIDDEN",
          message: "Verification failed. The last 4 digits do not match the phone number registered with this request."
        });
      }

      const events = await requestsRepo.getRequestEvents(requestId);

      return jsonResponse(200, {
        request: req,
        events
      });
    }

    return jsonResponse(404, {
      error: "NOT_FOUND",
      message: `Endpoint ${method} ${path} does not exist.`
    });
  } catch (err) {
    return handleError(err);
  }
}
