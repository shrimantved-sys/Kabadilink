import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { receiptsRepo } from "../db/receipts.repo.js";
import { jsonResponse, handleError } from "./http.js";

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();
  const path = event.rawPath || event.requestContext.http.path;

  if (method === "OPTIONS") {
    return jsonResponse(204, {});
  }

  try {
    // 1. GET /verify/{receiptId} (Public verification - Minimal data, NO phone number)
    const verifyMatch = path.match(/\/verify\/([^/]+)$/);
    if (method === "GET" && verifyMatch) {
      const receiptId = verifyMatch[1];
      const result = await receiptsRepo.verifyReceipt(receiptId);

      if (!result.found) {
        return jsonResponse(404, {
          error: "NOT_FOUND",
          message: result.message || "Receipt was not found in the database."
        });
      }

      return jsonResponse(200, result);
    }

    // 2. GET /receipts/{receiptId} (Full receipt details for household / printer)
    const receiptMatch = path.match(/\/receipts\/([^/]+)$/);
    if (method === "GET" && receiptMatch) {
      const receiptId = receiptMatch[1];
      const receipt = await receiptsRepo.getReceiptById(receiptId);

      if (!receipt) {
        return jsonResponse(404, {
          error: "NOT_FOUND",
          message: `Receipt ${receiptId} was not found.`
        });
      }

      return jsonResponse(200, { receipt });
    }

    return jsonResponse(404, {
      error: "NOT_FOUND",
      message: `Receipts endpoint ${method} ${path} does not exist.`
    });
  } catch (err) {
    return handleError(err);
  }
}
