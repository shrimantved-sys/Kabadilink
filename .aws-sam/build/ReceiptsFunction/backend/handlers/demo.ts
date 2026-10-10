import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { PutCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../db/client.js";
import { requestsRepo } from "../db/requests.repo.js";
import { generateSeedData } from "../db/seed.data.js";
import { TABLE_NAME, DEMO_MODE } from "../../shared/config.js";
import { jsonResponse, handleError } from "./http.js";

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();
  const path = event.rawPath || event.requestContext.http.path;

  if (method === "OPTIONS") {
    return jsonResponse(204, {});
  }

  // DEMO_MODE Guard
  if (!DEMO_MODE) {
    return jsonResponse(403, {
      error: "FORBIDDEN",
      message: "Demo operations are disabled in this environment."
    });
  }

  try {
    // 1. POST /demo/seed
    if (method === "POST" && (path === "/demo/seed" || path.endsWith("/demo/seed"))) {
      const seed = generateSeedData();

      // Seed requests
      for (const req of seed.requests) {
        await docClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              PK: `REQ#${req.id}`,
              SK: "META",
              ...req
            }
          })
        );
      }

      // Seed events
      for (const evt of seed.events) {
        await docClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: evt
          })
        );
      }

      // Seed receipts
      for (const rcp of seed.receipts) {
        await docClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              PK: `RECEIPT#${rcp.receiptId}`,
              SK: "META",
              ...rcp
            }
          })
        );
      }

      return jsonResponse(200, {
        message: "Demo data successfully seeded with 6 requests across all lifecycle states.",
        stats: {
          requests: seed.requests.length,
          events: seed.events.length,
          receipts: seed.receipts.length
        }
      });
    }

    // 2. POST /demo/reset
    if (method === "POST" && (path === "/demo/reset" || path.endsWith("/demo/reset"))) {
      // Scan and delete all items from table
      const scanRes = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          ProjectionExpression: "PK, SK"
        })
      );

      const items = scanRes.Items || [];
      for (const item of items) {
        await docClient.send(
          new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
              PK: item.PK,
              SK: item.SK
            }
          })
        );
      }

      return jsonResponse(200, {
        message: "Database successfully cleared.",
        deletedCount: items.length
      });
    }

    // 3. POST /demo/recycler-ack/{id}
    const ackMatch = path.match(/\/demo\/recycler-ack\/([^/]+)$/);
    if (method === "POST" && ackMatch) {
      const requestId = ackMatch[1];
      const updated = await requestsRepo.simulateRecyclerAck(requestId);

      return jsonResponse(200, {
        message: "Facility intake confirmed (SIMULATED).",
        mode: "SIMULATED",
        request: updated
      });
    }

    return jsonResponse(404, {
      error: "NOT_FOUND",
      message: `Demo endpoint ${method} ${path} does not exist.`
    });
  } catch (err) {
    return handleError(err);
  }
}
