import type { ApiClient, LocalityGroup } from "./apiInterface.js";
import type {
  RequestMeta,
  RequestEvent,
  ReceiptSnapshot,
  RequestStatus
} from "@shared/types.js";
import type { CreateRequestInput } from "@shared/validation.js";
import {
  generateSeedData,
  SAMPLE_COLLECTORS,
  SAMPLE_RECYCLERS
} from "@shared/seed.data.js";
import {
  calculateEstimatedWeightKg,
  calculateIllustrativePayout
} from "@shared/validation.js";
import {
  computeReceiptFingerprint,
  verifyReceiptFingerprint,
  maskPhoneNumber,
  extractFirstName
} from "@shared/crypto.js";
import { APP_NAME, RECEIPT_DISCLAIMER } from "@shared/config.js";

const STORAGE_KEY_REQUESTS = "kabadilink_mock_requests";
const STORAGE_KEY_EVENTS = "kabadilink_mock_events";
const STORAGE_KEY_RECEIPTS = "kabadilink_mock_receipts";

class MockApiClient implements ApiClient {
  private getRequests(): RequestMeta[] {
    const raw = localStorage.getItem(STORAGE_KEY_REQUESTS);
    if (!raw) {
      this.resetToSeed();
      return JSON.parse(localStorage.getItem(STORAGE_KEY_REQUESTS) || "[]");
    }
    return JSON.parse(raw);
  }

  private saveRequests(requests: RequestMeta[]): void {
    localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
  }

  private getEvents(): RequestEvent[] {
    const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
    if (!raw) {
      this.resetToSeed();
      return JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTS) || "[]");
    }
    return JSON.parse(raw);
  }

  private saveEvents(events: RequestEvent[]): void {
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
  }

  private getReceipts(): ReceiptSnapshot[] {
    const raw = localStorage.getItem(STORAGE_KEY_RECEIPTS);
    if (!raw) {
      this.resetToSeed();
      return JSON.parse(localStorage.getItem(STORAGE_KEY_RECEIPTS) || "[]");
    }
    return JSON.parse(raw);
  }

  private saveReceipts(receipts: ReceiptSnapshot[]): void {
    localStorage.setItem(STORAGE_KEY_RECEIPTS, JSON.stringify(receipts));
  }

  private resetToSeed(): void {
    const seed = generateSeedData();
    localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(seed.requests));
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(seed.events));
    localStorage.setItem(STORAGE_KEY_RECEIPTS, JSON.stringify(seed.receipts));
  }

  private addEvent(event: Omit<RequestEvent, "PK" | "SK">): void {
    const events = this.getEvents();
    events.push({
      PK: `REQ#${event.requestId}`,
      SK: `EVT#${event.timestamp}`,
      ...event
    });
    this.saveEvents(events);
  }

  async createRequest(input: CreateRequestInput): Promise<{
    request: RequestMeta;
    pickupOtp: string;
    smsPreview: string;
  }> {
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let code = "KL-";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const id = `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const estimatedWeightKg = calculateEstimatedWeightKg(input.items);

    const newReq: RequestMeta = {
      id,
      code,
      status: "REQUESTED",
      householdName: input.householdName,
      phone: input.phone,
      locality: input.locality,
      landmark: input.landmark || "",
      items: input.items,
      photoKey: input.photoKey,
      pickupDate: input.pickupDate,
      window: input.window,
      estimatedWeightKg,
      pickupOtp,
      createdAt: now,
      updatedAt: now
    };

    const requests = this.getRequests();
    requests.unshift(newReq);
    this.saveRequests(requests);

    this.addEvent({
      requestId: id,
      type: "CREATED",
      actor: "HOUSEHOLD",
      toStatus: "REQUESTED",
      note: `Pickup requested by ${input.householdName} (${input.items.length} items, est. ${estimatedWeightKg} kg).`,
      timestamp: now
    });

    const smsPreview = `[${APP_NAME}] Pickup request ${code} confirmed for ${input.pickupDate} (${input.window}). Your 4-digit pickup OTP is ${pickupOtp}. Do NOT share OTP until collector arrives.`;

    return { request: newReq, pickupOtp, smsPreview };
  }

  async getRequest(id: string, lastFour: string): Promise<{
    request: RequestMeta;
    events: RequestEvent[];
  }> {
    const requests = this.getRequests();
    const req = requests.find((r) => r.id === id || r.code.toUpperCase() === id.toUpperCase());

    if (!req) {
      throw new Error(`Pickup request ${id} was not found.`);
    }

    const clean = req.phone.replace(/\D/g, "");
    if (!clean.endsWith(lastFour)) {
      throw new Error("Verification failed. The last 4 digits do not match the phone number registered with this request.");
    }

    const allEvents = this.getEvents();
    const events = allEvents
      .filter((e) => e.requestId === req.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return { request: req, events };
  }

  async cancelRequest(id: string, note?: string): Promise<{
    message: string;
    request: RequestMeta;
  }> {
    const requests = this.getRequests();
    const index = requests.findIndex((r) => r.id === id || r.code === id);

    if (index === -1) {
      throw new Error(`Request ${id} not found.`);
    }

    const req = requests[index];
    if (req.status !== "REQUESTED" && req.status !== "ACCEPTED") {
      throw new Error(
        `Cannot cancel request in status ${req.status}. Cancellations are only permitted while REQUESTED or ACCEPTED.`
      );
    }

    const now = new Date().toISOString();
    req.status = "CANCELLED";
    req.updatedAt = now;
    requests[index] = req;
    this.saveRequests(requests);

    this.addEvent({
      requestId: req.id,
      type: "CANCELLED",
      actor: "HOUSEHOLD",
      fromStatus: req.status,
      toStatus: "CANCELLED",
      note: note || "Pickup cancelled by household.",
      timestamp: now
    });

    return { message: "Request successfully cancelled.", request: req };
  }

  async getCollectorRequests(locality?: string, collectorId?: string): Promise<{
    localityGroups: LocalityGroup[];
    totalOpenCount: number;
    disclaimer: string;
  }> {
    const requests = this.getRequests();
    const openRequests = requests.filter(
      (r) => r.status === "REQUESTED" && (!locality || r.locality === locality)
    );

    const grouped: Record<string, LocalityGroup> = {};

    for (const req of openRequests) {
      const loc = req.locality;
      if (!grouped[loc]) {
        grouped[loc] = {
          locality: loc,
          requests: [],
          totalEstimatedWeightKg: 0,
          illustrativePayoutEstimate: 0,
          requestCount: 0
        };
      }

      const { pickupOtp, ...safeReq } = req;
      const isAssigned = collectorId && safeReq.collectorId === collectorId && safeReq.status !== "REQUESTED";
      if (!isAssigned) {
        safeReq.phone = maskPhoneNumber(safeReq.phone);
      }

      grouped[loc].requests.push(safeReq as RequestMeta);
      grouped[loc].totalEstimatedWeightKg += req.estimatedWeightKg;
      grouped[loc].illustrativePayoutEstimate += calculateIllustrativePayout(req.items);
      grouped[loc].requestCount += 1;
    }

    const localityGroups = Object.values(grouped).map((g) => ({
      ...g,
      totalEstimatedWeightKg: Math.round(g.totalEstimatedWeightKg * 10) / 10
    }));

    return {
      localityGroups,
      totalOpenCount: openRequests.length,
      disclaimer: "Rates and payout estimates are illustrative, not real market rates."
    };
  }

  async acceptTrip(collectorId: string, requestIds: string[]): Promise<{
    message: string;
    acceptedIds: string[];
    failedIds: string[];
  }> {
    const requests = this.getRequests();
    const now = new Date().toISOString();
    const acceptedIds: string[] = [];
    const failedIds: string[] = [];

    const collector = SAMPLE_COLLECTORS.find((c) => c.id === collectorId);
    const collectorName = collector?.name || collectorId;

    for (const id of requestIds) {
      const req = requests.find((r) => r.id === id);
      if (req && req.status === "REQUESTED") {
        req.status = "ACCEPTED";
        req.collectorId = collectorId;
        req.acceptedAt = now;
        req.updatedAt = now;
        acceptedIds.push(id);

        this.addEvent({
          requestId: id,
          type: "ACCEPTED",
          actor: `COLLECTOR#${collectorId}`,
          fromStatus: "REQUESTED",
          toStatus: "ACCEPTED",
          note: `Trip accepted by collector ${collectorName}.`,
          timestamp: now
        });
      } else {
        failedIds.push(id);
      }
    }

    if (acceptedIds.length === 0 && failedIds.length > 0) {
      throw new Error(
        "None of the selected requests could be accepted. They may have already been accepted by another collector."
      );
    }

    this.saveRequests(requests);
    return {
      message: `Successfully accepted ${acceptedIds.length} request(s) into trip.`,
      acceptedIds,
      failedIds
    };
  }

  async confirmPickup(
    requestId: string,
    collectorId: string,
    otp: string,
    weightKg: number
  ): Promise<{
    message: string;
    request: RequestMeta;
  }> {
    const requests = this.getRequests();
    const req = requests.find((r) => r.id === requestId);

    if (!req) throw new Error(`Request ${requestId} not found.`);
    if (req.status !== "ACCEPTED") {
      throw new Error(`Cannot pick up request in status ${req.status}. Must be ACCEPTED.`);
    }
    if (req.collectorId !== collectorId) {
      throw new Error("This request is assigned to a different collector.");
    }
    if (req.pickupOtp !== otp) {
      throw new Error("Invalid 4-digit pickup OTP. Please verify with the household.");
    }

    const now = new Date().toISOString();
    req.status = "PICKED_UP";
    req.actualWeightKg = weightKg;
    req.pickedUpAt = now;
    req.updatedAt = now;
    this.saveRequests(requests);

    this.addEvent({
      requestId: req.id,
      type: "PICKED_UP",
      actor: `COLLECTOR#${collectorId}`,
      fromStatus: "ACCEPTED",
      toStatus: "PICKED_UP",
      note: `OTP verified. Actual weight recorded: ${weightKg} kg.`,
      timestamp: now
    });

    const { pickupOtp, ...safeReq } = req;
    return {
      message: "Pickup successfully confirmed with OTP verification.",
      request: safeReq as RequestMeta
    };
  }

  async getRecyclers(): Promise<{
    recyclers: typeof SAMPLE_RECYCLERS;
    note: string;
  }> {
    return {
      recyclers: SAMPLE_RECYCLERS,
      note: "All listed recyclers and registration numbers are SAMPLE data."
    };
  }

  async handoverToRecycler(
    requestId: string,
    collectorId: string,
    recyclerId: string
  ): Promise<{
    message: string;
    request: RequestMeta;
    receipt: ReceiptSnapshot;
  }> {
    const requests = this.getRequests();
    const req = requests.find((r) => r.id === requestId);

    if (!req) throw new Error(`Request ${requestId} not found.`);
    if (req.status !== "PICKED_UP") {
      throw new Error(`Cannot handover request in status ${req.status}. Must be in PICKED_UP status.`);
    }

    const collector = SAMPLE_COLLECTORS.find((c) => c.id === collectorId);
    const recycler = SAMPLE_RECYCLERS.find((r) => r.id === recyclerId);
    if (!recycler) throw new Error("Recycler not found.");

    const now = new Date().toISOString();
    const receiptId = `RCP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const allEvents = this.getEvents().filter((e) => e.requestId === req.id);
    const statusTimeline = [
      ...allEvents.map((e) => ({
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

    const receiptDraft: Partial<ReceiptSnapshot> = {
      receiptId,
      requestId: req.id,
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

    const receipts = this.getReceipts();
    receipts.push(receipt);
    this.saveReceipts(receipts);

    req.status = "HANDED_TO_RECYCLER";
    req.recyclerId = recyclerId;
    req.handedOverAt = now;
    req.receiptId = receiptId;
    req.updatedAt = now;
    this.saveRequests(requests);

    this.addEvent({
      requestId: req.id,
      type: "HANDED_OVER",
      actor: `COLLECTOR#${collectorId}`,
      fromStatus: "PICKED_UP",
      toStatus: "HANDED_TO_RECYCLER",
      note: `Handed over to ${recycler.name}. Receipt ${receiptId} generated with fingerprint ${shortCode}.`,
      timestamp: now
    });

    const { pickupOtp, ...safeReq } = req;
    return {
      message: "E-waste successfully handed over to sample recycler. Receipt generated.",
      request: safeReq as RequestMeta,
      receipt
    };
  }

  async getReceipt(receiptId: string): Promise<{ receipt: ReceiptSnapshot }> {
    const receipts = this.getReceipts();
    const receipt = receipts.find((r) => r.receiptId === receiptId);
    if (!receipt) {
      throw new Error(`Receipt ${receiptId} was not found.`);
    }
    return { receipt };
  }

  async verifyReceipt(receiptId: string) {
    const receipts = this.getReceipts();
    const receipt = receipts.find((r) => r.receiptId === receiptId);

    if (!receipt) {
      return {
        found: false,
        message: "Receipt not found in database."
      };
    }

    const { isValid } = verifyReceiptFingerprint(receipt);
    const now = new Date().toISOString();

    return {
      found: true,
      isValid,
      shortCode: receipt.shortCode,
      verifiedAt: now,
      message: isValid
        ? "Fingerprint verified: Receipt data is authentic and unchanged since issue."
        : "Tamper warning: Receipt data does not match original cryptographic fingerprint.",
      publicData: {
        receiptId: receipt.receiptId,
        requestCode: receipt.requestCode,
        issuedAt: receipt.issuedAt,
        householdFirstName: receipt.householdFirstName,
        locality: receipt.locality,
        items: receipt.items,
        actualWeightKg: receipt.actualWeightKg,
        collectorName: receipt.collectorName,
        recyclerName: receipt.recyclerName,
        recyclerRegNo: receipt.recyclerRegNo,
        statusTimeline: receipt.statusTimeline,
        isSample: true as const,
        disclaimer: receipt.disclaimer
      }
    };
  }

  async seedDemo() {
    this.resetToSeed();
    const seed = generateSeedData();
    return {
      message: "Demo data successfully seeded with 6 requests across all lifecycle states.",
      stats: {
        requests: seed.requests.length,
        events: seed.events.length,
        receipts: seed.receipts.length
      }
    };
  }

  async resetDemo() {
    localStorage.removeItem(STORAGE_KEY_REQUESTS);
    localStorage.removeItem(STORAGE_KEY_EVENTS);
    localStorage.removeItem(STORAGE_KEY_RECEIPTS);
    return {
      message: "Database successfully cleared.",
      deletedCount: 0
    };
  }

  async simulateRecyclerAck(requestId: string): Promise<{
    message: string;
    mode: string;
    request: RequestMeta;
  }> {
    const requests = this.getRequests();
    const req = requests.find((r) => r.id === requestId);

    if (!req) throw new Error(`Request ${requestId} not found.`);
    if (req.status !== "HANDED_TO_RECYCLER") {
      throw new Error(`Cannot acknowledge intake for request in status ${req.status}. Must be HANDED_TO_RECYCLER.`);
    }

    const now = new Date().toISOString();
    req.status = "RECEIVED_BY_RECYCLER";
    req.receivedAt = now;
    req.updatedAt = now;
    this.saveRequests(requests);

    this.addEvent({
      requestId: req.id,
      type: "RECYCLER_ACK",
      actor: `RECYCLER#${req.recyclerId || "SAMPLE"}`,
      fromStatus: "HANDED_TO_RECYCLER",
      toStatus: "RECEIVED_BY_RECYCLER",
      note: "Authorised recycler confirmed intake at facility (SIMULATED).",
      timestamp: now
    });

    return {
      message: "Facility intake confirmed (SIMULATED).",
      mode: "SIMULATED",
      request: req
    };
  }
}

export const mockApiClient = new MockApiClient();
