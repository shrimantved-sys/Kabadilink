import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand
} from "@aws-sdk/lib-dynamodb";
import { docClient } from "../db/client.js";
import {
  RequestsRepository,
  ConflictError,
  ValidationError,
  NotFoundError
} from "../db/requests.repo.js";
import {
  isValidTransition,
  type RequestStatus,
  ALLOWED_STATUS_TRANSITIONS
} from "../../shared/types.js";
import type { RequestMeta } from "../../shared/types.js";

const ddbMock = mockClient(docClient);

describe("Status Machine Transition Rules", () => {
  it("should validate all allowed state transitions correctly", () => {
    // REQUESTED
    expect(isValidTransition("REQUESTED", "ACCEPTED")).toBe(true);
    expect(isValidTransition("REQUESTED", "CANCELLED")).toBe(true);
    expect(isValidTransition("REQUESTED", "PICKED_UP")).toBe(false);
    expect(isValidTransition("REQUESTED", "HANDED_TO_RECYCLER")).toBe(false);
    expect(isValidTransition("REQUESTED", "RECEIVED_BY_RECYCLER")).toBe(false);

    // ACCEPTED
    expect(isValidTransition("ACCEPTED", "PICKED_UP")).toBe(true);
    expect(isValidTransition("ACCEPTED", "CANCELLED")).toBe(true);
    expect(isValidTransition("ACCEPTED", "REQUESTED")).toBe(false);
    expect(isValidTransition("ACCEPTED", "HANDED_TO_RECYCLER")).toBe(false);

    // PICKED_UP
    expect(isValidTransition("PICKED_UP", "HANDED_TO_RECYCLER")).toBe(true);
    expect(isValidTransition("PICKED_UP", "CANCELLED")).toBe(false);
    expect(isValidTransition("PICKED_UP", "ACCEPTED")).toBe(false);

    // HANDED_TO_RECYCLER
    expect(isValidTransition("HANDED_TO_RECYCLER", "RECEIVED_BY_RECYCLER")).toBe(true);
    expect(isValidTransition("HANDED_TO_RECYCLER", "CANCELLED")).toBe(false);

    // Terminal states
    expect(isValidTransition("RECEIVED_BY_RECYCLER", "CANCELLED")).toBe(false);
    expect(isValidTransition("CANCELLED", "REQUESTED")).toBe(false);
  });
});

describe("RequestsRepository Concurrency & State Machine Execution", () => {
  let repo: RequestsRepository;

  beforeEach(() => {
    ddbMock.reset();
    repo = new RequestsRepository();
  });

  const mockBaseRequest: RequestMeta = {
    id: "req-test-99",
    code: "KL-999999",
    status: "REQUESTED",
    householdName: "Rakesh Sharma",
    phone: "9876543210",
    locality: "Mayur Vihar Phase 1",
    landmark: "Tower 2",
    items: [{ category: "laptop", quantity: 1, hasBattery: true }],
    pickupDate: "2026-10-15",
    window: "morning",
    estimatedWeightKg: 2.2,
    pickupOtp: "1234",
    createdAt: "2026-10-07T10:00:00.000Z",
    updatedAt: "2026-10-07T10:00:00.000Z"
  };

  it("should handle double-accept race condition by throwing ConflictError", async () => {
    // Simulate conditional check failed from DynamoDB
    const conditionalCheckFailed = new Error("Conditional check failed");
    conditionalCheckFailed.name = "ConditionalCheckFailedException";

    ddbMock.on(UpdateCommand).rejects(conditionalCheckFailed);

    await expect(
      repo.acceptRequests(["req-test-99"], "COL-01")
    ).rejects.toThrow(ConflictError);
  });

  it("should block pickup confirmation if request is not in ACCEPTED state", async () => {
    // Request is still in REQUESTED state
    ddbMock.on(GetCommand).resolves({
      Item: {
        PK: "REQ#req-test-99",
        SK: "META",
        ...mockBaseRequest,
        status: "REQUESTED"
      }
    });

    await expect(
      repo.confirmPickup("req-test-99", "COL-01", "1234", 2.2)
    ).rejects.toThrow(ConflictError);
  });

  it("should reject pickup if OTP is incorrect", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        PK: "REQ#req-test-99",
        SK: "META",
        ...mockBaseRequest,
        status: "ACCEPTED",
        collectorId: "COL-01"
      }
    });

    await expect(
      repo.confirmPickup("req-test-99", "COL-01", "9999", 2.2) // Wrong OTP
    ).rejects.toThrow(ValidationError);
  });

  it("should block handover if request is not in PICKED_UP state", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        PK: "REQ#req-test-99",
        SK: "META",
        ...mockBaseRequest,
        status: "ACCEPTED",
        collectorId: "COL-01"
      }
    });

    await expect(
      repo.handoverToRecycler("req-test-99", "COL-01", "REC-01")
    ).rejects.toThrow(ConflictError);
  });

  it("should block cancellation if request is already PICKED_UP", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        PK: "REQ#req-test-99",
        SK: "META",
        ...mockBaseRequest,
        status: "PICKED_UP",
        collectorId: "COL-01"
      }
    });

    await expect(
      repo.cancelRequest("req-test-99", "I changed my mind")
    ).rejects.toThrow(ConflictError);
  });
});
