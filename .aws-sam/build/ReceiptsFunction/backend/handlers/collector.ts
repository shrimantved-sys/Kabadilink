import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { requestsRepo } from "../db/requests.repo.js";
import { SAMPLE_RECYCLERS } from "../db/seed.data.js";
import {
  collectorAcceptSchema,
  collectorPickupSchema,
  collectorHandoverSchema,
  calculateIllustrativePayout
} from "../../shared/validation.js";
import { maskPhoneNumber } from "../../shared/crypto.js";
import { publishEventNotification } from "../notifications/sns.js";
import { jsonResponse, parseJsonBody, handleError } from "./http.js";
import type { RequestMeta } from "../../shared/types.js";

/**
 * Sanitizes request object before returning to collector:
 * 1. NEVER returns pickupOtp.
 * 2. Only reveals full phone number if status is ACCEPTED and belongs to current collector.
 */
function sanitizeRequestForCollector(
  req: RequestMeta,
  currentCollectorId?: string
): Omit<RequestMeta, "pickupOtp"> {
  const { pickupOtp, ...safeReq } = req;

  const isAssigned =
    currentCollectorId &&
    safeReq.collectorId === currentCollectorId &&
    safeReq.status !== "REQUESTED";

  if (!isAssigned) {
    safeReq.phone = maskPhoneNumber(safeReq.phone);
  }

  return safeReq;
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();
  const path = event.rawPath || event.requestContext.http.path;

  if (method === "OPTIONS") {
    return jsonResponse(204, {});
  }

  try {
    // 1. GET /recyclers
    if (method === "GET" && (path === "/recyclers" || path.endsWith("/recyclers"))) {
      return jsonResponse(200, {
        recyclers: SAMPLE_RECYCLERS,
        note: "All listed recyclers and registration numbers are SAMPLE data."
      });
    }

    // 2. GET /collector/requests?locality=
    if (method === "GET" && path.includes("/collector/requests")) {
      const locality = event.queryStringParameters?.locality;
      const collectorId = event.queryStringParameters?.collectorId;

      const openRequests = await requestsRepo.getOpenRequests(locality);

      // Group requests by locality with summary statistics
      const groupedByLocality: Record<
        string,
        {
          locality: string;
          requests: Array<ReturnType<typeof sanitizeRequestForCollector>>;
          totalEstimatedWeightKg: number;
          illustrativePayoutEstimate: number;
          requestCount: number;
        }
      > = {};

      for (const req of openRequests) {
        const loc = req.locality;
        if (!groupedByLocality[loc]) {
          groupedByLocality[loc] = {
            locality: loc,
            requests: [],
            totalEstimatedWeightKg: 0,
            illustrativePayoutEstimate: 0,
            requestCount: 0
          };
        }

        const sanitized = sanitizeRequestForCollector(req, collectorId);
        groupedByLocality[loc].requests.push(sanitized);
        groupedByLocality[loc].totalEstimatedWeightKg += req.estimatedWeightKg;
        groupedByLocality[loc].illustrativePayoutEstimate += calculateIllustrativePayout(req.items);
        groupedByLocality[loc].requestCount += 1;
      }

      // Round aggregated values
      const localityGroups = Object.values(groupedByLocality).map((group) => ({
        ...group,
        totalEstimatedWeightKg: Math.round(group.totalEstimatedWeightKg * 10) / 10
      }));

      return jsonResponse(200, {
        localityGroups,
        totalOpenCount: openRequests.length,
        disclaimer: "Rates and payout estimates are illustrative, not real market rates."
      });
    }

    // 3. POST /collector/accept
    if (method === "POST" && (path === "/collector/accept" || path.endsWith("/collector/accept"))) {
      const body = parseJsonBody(event);
      const { collectorId, requestIds } = collectorAcceptSchema.parse(body);

      const result = await requestsRepo.acceptRequests(requestIds, collectorId);

      for (const id of result.acceptedIds) {
        await publishEventNotification({
          eventType: "ACCEPTED",
          requestId: id,
          requestCode: id,
          locality: "UNKNOWN",
          timestamp: new Date().toISOString(),
          details: { collectorId }
        });
      }

      return jsonResponse(200, {
        message: `Successfully accepted ${result.acceptedIds.length} request(s) into trip.`,
        acceptedIds: result.acceptedIds,
        failedIds: result.failedIds
      });
    }

    // 4. POST /collector/requests/{id}/pickup
    const pickupMatch = path.match(/\/collector\/requests\/([^/]+)\/pickup$/);
    if (method === "POST" && pickupMatch) {
      const requestId = pickupMatch[1];
      const body = parseJsonBody(event);
      const { collectorId, otp, weightKg } = collectorPickupSchema.parse(body);

      const updated = await requestsRepo.confirmPickup(requestId, collectorId, otp, weightKg);

      await publishEventNotification({
        eventType: "PICKED_UP",
        requestId: updated.id,
        requestCode: updated.code,
        locality: updated.locality,
        timestamp: updated.pickedUpAt || new Date().toISOString(),
        details: { collectorId, actualWeightKg: weightKg }
      });

      return jsonResponse(200, {
        message: "Pickup successfully confirmed with OTP verification.",
        request: sanitizeRequestForCollector(updated, collectorId)
      });
    }

    // 5. POST /collector/requests/{id}/handover
    const handoverMatch = path.match(/\/collector\/requests\/([^/]+)\/handover$/);
    if (method === "POST" && handoverMatch) {
      const requestId = handoverMatch[1];
      const body = parseJsonBody(event);
      const { collectorId, recyclerId } = collectorHandoverSchema.parse(body);

      const { request: updated, receipt } = await requestsRepo.handoverToRecycler(
        requestId,
        collectorId,
        recyclerId
      );

      await publishEventNotification({
        eventType: "HANDED_OVER",
        requestId: updated.id,
        requestCode: updated.code,
        locality: updated.locality,
        timestamp: updated.handedOverAt || new Date().toISOString(),
        details: {
          collectorId,
          recyclerId,
          receiptId: receipt.receiptId,
          fingerprint: receipt.shortCode
        }
      });

      return jsonResponse(200, {
        message: "E-waste successfully handed over to sample recycler. Receipt generated.",
        request: sanitizeRequestForCollector(updated, collectorId),
        receipt
      });
    }

    return jsonResponse(404, {
      error: "NOT_FOUND",
      message: `Collector endpoint ${method} ${path} does not exist.`
    });
  } catch (err) {
    return handleError(err);
  }
}
