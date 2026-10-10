import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand
} from "@aws-sdk/lib-dynamodb";
import { docClient } from "./client.js";
import { TABLE_NAME, GSI1_NAME, RECEIPT_DISCLAIMER } from "../../shared/config.js";
import type {
  RequestMeta,
  RequestEvent,
  RequestStatus,
  ReceiptSnapshot,
  RequestItem
} from "../../shared/types.js";
import {
  computeReceiptFingerprint,
  maskPhoneNumber,
  extractFirstName
} from "../../shared/crypto.js";
import { SAMPLE_COLLECTORS, SAMPLE_RECYCLERS } from "./seed.data.js";

export class ConflictError extends Error {
  statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class RequestsRepository {
  private tableName = TABLE_NAME;

  /**
   * Create a new pickup request and initial event
   */
  async createRequest(
    data: Omit<RequestMeta, "createdAt" | "updatedAt" | "status" | "GSI1PK" | "GSI1SK">
  ): Promise<RequestMeta> {
    const now = new Date().toISOString();
    const item: RequestMeta = {
      ...data,
      status: "REQUESTED",
      createdAt: now,
      updatedAt: now,
      GSI1PK: `OPEN#${data.locality}`,
      GSI1SK: now
    };

    // Store request metadata
    await docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `REQ#${item.id}`,
          SK: "META",
          ...item
        }
      })
    );

    // Store initial CREATED event
    await this.addEvent({
      PK: `REQ#${item.id}`,
      SK: `EVT#${now}`,
      requestId: item.id,
      type: "CREATED",
      actor: "HOUSEHOLD",
      toStatus: "REQUESTED",
      note: `Pickup requested by ${item.householdName} (${item.items.length} items, est. ${item.estimatedWeightKg} kg).`,
      timestamp: now
    });

    return item;
  }

  /**
   * Get request by ID
   */
  async getRequestById(id: string): Promise<RequestMeta | null> {
    const res = await docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `REQ#${id}`,
          SK: "META"
        }
      })
    );
    if (!res.Item) return null;
    const { PK, SK, ...meta } = res.Item;
    return meta as RequestMeta;
  }

  /**
   * Get all events for a request
   */
  async getRequestEvents(id: string): Promise<RequestEvent[]> {
    const res = await docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `REQ#${id}`,
          ":skPrefix": "EVT#"
        }
      })
    );
    return (res.Items || []) as RequestEvent[];
  }

  /**
   * Add an audit trail event
   */
  async addEvent(event: RequestEvent): Promise<void> {
    await docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: event
      })
    );
  }

  /**
   * Fetch open requests (optionally filtered by locality)
   */
  async getOpenRequests(locality?: string): Promise<RequestMeta[]> {
    if (locality) {
      const res = await docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: GSI1_NAME,
          KeyConditionExpression: "GSI1PK = :gsi1pk",
          ExpressionAttributeValues: {
            ":gsi1pk": `OPEN#${locality}`
          }
        })
      );
      return (res.Items || []).map(({ PK, SK, ...item }) => item as RequestMeta);
    } else {
      // If no locality provided, scan GSI1 for all open requests
      const res = await docClient.send(
        new ScanCommand({
          TableName: this.tableName,
          IndexName: GSI1_NAME
        })
      );
      return (res.Items || []).map(({ PK, SK, ...item }) => item as RequestMeta);
    }
  }

  /**
   * Collector accepts multiple requests for a trip.
   * Uses conditional write: must currently be in REQUESTED status.
   */
  async acceptRequests(
    requestIds: string[],
    collectorId: string
  ): Promise<{ acceptedIds: string[]; failedIds: string[] }> {
    const now = new Date().toISOString();
    const acceptedIds: string[] = [];
    const failedIds: string[] = [];

    const collector = SAMPLE_COLLECTORS.find((c) => c.id === collectorId);
    const collectorName = collector?.name || collectorId;

    for (const id of requestIds) {
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: this.tableName,
            Key: {
              PK: `REQ#${id}`,
              SK: "META"
            },
            UpdateExpression:
              "SET #status = :accepted, #collectorId = :cid, #acceptedAt = :now, #updatedAt = :now REMOVE GSI1PK, GSI1SK",
            ConditionExpression: "attribute_exists(PK) AND #status = :requested",
            ExpressionAttributeNames: {
              "#status": "status",
              "#collectorId": "collectorId",
              "#acceptedAt": "acceptedAt",
              "#updatedAt": "updatedAt"
            },
            ExpressionAttributeValues: {
              ":accepted": "ACCEPTED",
              ":requested": "REQUESTED",
              ":cid": collectorId,
              ":now": now
            }
          })
        );

        await this.addEvent({
          PK: `REQ#${id}`,
          SK: `EVT#${now}`,
          requestId: id,
          type: "ACCEPTED",
          actor: `COLLECTOR#${collectorId}`,
          fromStatus: "REQUESTED",
          toStatus: "ACCEPTED",
          note: `Trip accepted by collector ${collectorName}.`,
          timestamp: now
        });

        acceptedIds.push(id);
      } catch (err: unknown) {
        const error = err as { name?: string };
        if (error.name === "ConditionalCheckFailedException") {
          failedIds.push(id);
        } else {
          throw err;
        }
      }
    }

    if (acceptedIds.length === 0 && failedIds.length > 0) {
      throw new ConflictError(
        "None of the selected requests could be accepted. They may have already been accepted by another collector or cancelled."
      );
    }

    return { acceptedIds, failedIds };
  }

  /**
   * Collector confirms pickup with OTP and actual weight
   */
  async confirmPickup(
    requestId: string,
    collectorId: string,
    otp: string,
    actualWeightKg: number
  ): Promise<RequestMeta> {
    const req = await this.getRequestById(requestId);
    if (!req) {
      throw new NotFoundError(`Request ${requestId} not found.`);
    }

    if (req.status !== "ACCEPTED") {
      throw new ConflictError(
        `Cannot pick up request in status ${req.status}. Must be in ACCEPTED status.`
      );
    }

    if (req.collectorId !== collectorId) {
      throw new ConflictError("This request was assigned to a different collector.");
    }

    if (req.pickupOtp !== otp) {
      throw new ValidationError("Invalid 4-digit pickup OTP. Please verify with the household.");
    }

    const now = new Date().toISOString();
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: {
            PK: `REQ#${requestId}`,
            SK: "META"
          },
          UpdateExpression:
            "SET #status = :pickedUp, #actualWeightKg = :weight, #pickedUpAt = :now, #updatedAt = :now",
          ConditionExpression:
            "attribute_exists(PK) AND #status = :accepted AND #collectorId = :cid",
          ExpressionAttributeNames: {
            "#status": "status",
            "#actualWeightKg": "actualWeightKg",
            "#pickedUpAt": "pickedUpAt",
            "#updatedAt": "updatedAt",
            "#collectorId": "collectorId"
          },
          ExpressionAttributeValues: {
            ":pickedUp": "PICKED_UP",
            ":accepted": "ACCEPTED",
            ":weight": actualWeightKg,
            ":cid": collectorId,
            ":now": now
          }
        })
      );

      await this.addEvent({
        PK: `REQ#${requestId}`,
        SK: `EVT#${now}`,
        requestId,
        type: "PICKED_UP",
        actor: `COLLECTOR#${collectorId}`,
        fromStatus: "ACCEPTED",
        toStatus: "PICKED_UP",
        note: `OTP verified. Actual weight recorded: ${actualWeightKg} kg.`,
        timestamp: now
      });

      const updated = await this.getRequestById(requestId);
      return updated!;
    } catch (err: unknown) {
      const error = err as { name?: string };
      if (error.name === "ConditionalCheckFailedException") {
        throw new ConflictError("Status changed concurrently. Could not confirm pickup.");
      }
      throw err;
    }
  }

  /**
   * Collector hands over items to a sample recycler and creates a receipt
   */
  async handoverToRecycler(
    requestId: string,
    collectorId: string,
    recyclerId: string
  ): Promise<{ request: RequestMeta; receipt: ReceiptSnapshot }> {
    const req = await this.getRequestById(requestId);
    if (!req) {
      throw new NotFoundError(`Request ${requestId} not found.`);
    }

    if (req.status !== "PICKED_UP") {
      throw new ConflictError(
        `Cannot handover request in status ${req.status}. Must be in PICKED_UP status.`
      );
    }

    if (req.collectorId !== collectorId) {
      throw new ConflictError("This request was assigned to a different collector.");
    }

    const collector = SAMPLE_COLLECTORS.find((c) => c.id === collectorId);
    const recycler = SAMPLE_RECYCLERS.find((r) => r.id === recyclerId);

    if (!recycler) {
      throw new ValidationError(`Recycler ${recyclerId} not recognized.`);
    }

    const now = new Date().toISOString();
    const receiptId = `RCP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Compile event history for timeline
    const events = await this.getRequestEvents(requestId);
    const statusTimeline = [
      ...events.map((e) => ({
        status: (e.toStatus || e.fromStatus || "REQUESTED") as RequestStatus,
        timestamp: e.timestamp,
        note: e.note
      })),
      {
        status: "HANDED_TO_RECYCLER" as RequestStatus,
        timestamp: now,
        note: `Handed over to ${recycler.name} (${recycler.sampleRegNo}).`
      }
    ];

    // Build receipt snapshot data
    const receiptDraft: Partial<ReceiptSnapshot> = {
      receiptId,
      requestId,
      requestCode: req.code,
      issuedAt: now,
      householdFirstName: extractFirstName(req.householdName),
      maskedPhone: maskPhoneNumber(req.phone),
      locality: req.locality,
      items: req.items,
      actualWeightKg: req.actualWeightKg || req.estimatedWeightKg,
      collectorId,
      collectorName: collector ? `${collector.name} (SAMPLE)` : collectorId,
      recyclerId,
      recyclerName: `${recycler.name} (SAMPLE)`,
      recyclerRegNo: recycler.sampleRegNo,
      statusTimeline
    };

    const { hash: canonicalFingerprint, shortCode } = computeReceiptFingerprint(receiptDraft);

    const receipt: ReceiptSnapshot = {
      ...(receiptDraft as ReceiptSnapshot),
      canonicalFingerprint,
      shortCode,
      isSample: true,
      disclaimer: RECEIPT_DISCLAIMER
    };

    // Store receipt snapshot in DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `RECEIPT#${receiptId}`,
          SK: "META",
          ...receipt
        }
      })
    );

    // Update request state
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: {
            PK: `REQ#${requestId}`,
            SK: "META"
          },
          UpdateExpression:
            "SET #status = :handedOver, #recyclerId = :rid, #handedOverAt = :now, #receiptId = :rcpId, #updatedAt = :now",
          ConditionExpression:
            "attribute_exists(PK) AND #status = :pickedUp AND #collectorId = :cid",
          ExpressionAttributeNames: {
            "#status": "status",
            "#recyclerId": "recyclerId",
            "#handedOverAt": "handedOverAt",
            "#receiptId": "receiptId",
            "#updatedAt": "updatedAt",
            "#collectorId": "collectorId"
          },
          ExpressionAttributeValues: {
            ":handedOver": "HANDED_TO_RECYCLER",
            ":pickedUp": "PICKED_UP",
            ":rid": recyclerId,
            ":rcpId": receiptId,
            ":cid": collectorId,
            ":now": now
          }
        })
      );

      await this.addEvent({
        PK: `REQ#${requestId}`,
        SK: `EVT#${now}`,
        requestId,
        type: "HANDED_OVER",
        actor: `COLLECTOR#${collectorId}`,
        fromStatus: "PICKED_UP",
        toStatus: "HANDED_TO_RECYCLER",
        note: `Handed over to ${recycler.name}. Receipt ${receiptId} generated with fingerprint ${shortCode}.`,
        timestamp: now
      });

      const updated = await this.getRequestById(requestId);
      return { request: updated!, receipt };
    } catch (err: unknown) {
      const error = err as { name?: string };
      if (error.name === "ConditionalCheckFailedException") {
        throw new ConflictError("Status changed concurrently. Could not handover to recycler.");
      }
      throw err;
    }
  }

  /**
   * Cancel request (only allowed from REQUESTED or ACCEPTED)
   */
  async cancelRequest(requestId: string, note?: string): Promise<RequestMeta> {
    const req = await this.getRequestById(requestId);
    if (!req) {
      throw new NotFoundError(`Request ${requestId} not found.`);
    }

    if (req.status !== "REQUESTED" && req.status !== "ACCEPTED") {
      throw new ConflictError(
        `Cannot cancel request in status ${req.status}. Cancellations are only permitted while REQUESTED or ACCEPTED.`
      );
    }

    const now = new Date().toISOString();
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: {
            PK: `REQ#${requestId}`,
            SK: "META"
          },
          UpdateExpression:
            "SET #status = :cancelled, #updatedAt = :now REMOVE GSI1PK, GSI1SK",
          ConditionExpression:
            "attribute_exists(PK) AND (#status = :requested OR #status = :accepted)",
          ExpressionAttributeNames: {
            "#status": "status",
            "#updatedAt": "updatedAt"
          },
          ExpressionAttributeValues: {
            ":cancelled": "CANCELLED",
            ":requested": "REQUESTED",
            ":accepted": "ACCEPTED",
            ":now": now
          }
        })
      );

      await this.addEvent({
        PK: `REQ#${requestId}`,
        SK: `EVT#${now}`,
        requestId,
        type: "CANCELLED",
        actor: "HOUSEHOLD",
        fromStatus: req.status,
        toStatus: "CANCELLED",
        note: note || "Pickup cancelled by household.",
        timestamp: now
      });

      const updated = await this.getRequestById(requestId);
      return updated!;
    } catch (err: unknown) {
      const error = err as { name?: string };
      if (error.name === "ConditionalCheckFailedException") {
        throw new ConflictError("Status changed concurrently. Could not cancel.");
      }
      throw err;
    }
  }

  /**
   * Simulate recycler acknowledging receipt (Demo only)
   */
  async simulateRecyclerAck(requestId: string): Promise<RequestMeta> {
    const req = await this.getRequestById(requestId);
    if (!req) {
      throw new NotFoundError(`Request ${requestId} not found.`);
    }

    if (req.status !== "HANDED_TO_RECYCLER") {
      throw new ConflictError(
        `Cannot acknowledge intake for request in status ${req.status}. Must be in HANDED_TO_RECYCLER status.`
      );
    }

    const now = new Date().toISOString();
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: {
            PK: `REQ#${requestId}`,
            SK: "META"
          },
          UpdateExpression:
            "SET #status = :received, #receivedAt = :now, #updatedAt = :now",
          ConditionExpression:
            "attribute_exists(PK) AND #status = :handedOver",
          ExpressionAttributeNames: {
            "#status": "status",
            "#receivedAt": "receivedAt",
            "#updatedAt": "updatedAt"
          },
          ExpressionAttributeValues: {
            ":received": "RECEIVED_BY_RECYCLER",
            ":handedOver": "HANDED_TO_RECYCLER",
            ":now": now
          }
        })
      );

      await this.addEvent({
        PK: `REQ#${requestId}`,
        SK: `EVT#${now}`,
        requestId,
        type: "RECYCLER_ACK",
        actor: `RECYCLER#${req.recyclerId || "SAMPLE"}`,
        fromStatus: "HANDED_TO_RECYCLER",
        toStatus: "RECEIVED_BY_RECYCLER",
        note: "Authorised recycler confirmed intake at facility (SIMULATED).",
        timestamp: now
      });

      const updated = await this.getRequestById(requestId);
      return updated!;
    } catch (err: unknown) {
      const error = err as { name?: string };
      if (error.name === "ConditionalCheckFailedException") {
        throw new ConflictError("Status changed concurrently. Could not complete recycler ack.");
      }
      throw err;
    }
  }
}

export const requestsRepo = new RequestsRepository();
