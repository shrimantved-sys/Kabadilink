import { describe, it, expect } from "vitest";
import {
  canonicalJson,
  computeReceiptFingerprint,
  verifyReceiptFingerprint
} from "../../shared/crypto.js";
import type { ReceiptSnapshot } from "../../shared/types.js";
import { RECEIPT_DISCLAIMER } from "../../shared/config.js";

describe("Receipt Cryptographic Fingerprinting & Tamper Verification", () => {
  const sampleReceipt: ReceiptSnapshot = {
    receiptId: "RCP-TEST-001",
    requestId: "req-123",
    requestCode: "KL-AB12CD",
    issuedAt: "2026-10-07T12:00:00.000Z",
    householdFirstName: "Pooja",
    maskedPhone: "+91 ******4321",
    locality: "Mayur Vihar Phase 1",
    items: [
      { category: "laptop", quantity: 1, hasBattery: true },
      { category: "cables_chargers", quantity: 2, hasBattery: false }
    ],
    actualWeightKg: 3.2,
    collectorId: "COL-01",
    collectorName: "Ramesh Kumar (SAMPLE)",
    recyclerId: "REC-01",
    recyclerName: "EcoRecycle Solutions India (SAMPLE)",
    recyclerRegNo: "SAMPLE-REG-0104",
    statusTimeline: [
      { status: "REQUESTED", timestamp: "2026-10-07T10:00:00.000Z", note: "Requested" },
      { status: "ACCEPTED", timestamp: "2026-10-07T10:30:00.000Z", note: "Accepted" },
      { status: "PICKED_UP", timestamp: "2026-10-07T11:15:00.000Z", note: "Weighed 3.2 kg" },
      { status: "HANDED_TO_RECYCLER", timestamp: "2026-10-07T12:00:00.000Z", note: "Handover" }
    ],
    canonicalFingerprint: "",
    shortCode: "",
    isSample: true,
    disclaimer: RECEIPT_DISCLAIMER
  };

  it("should generate deterministic canonical JSON regardless of key order", () => {
    const objA = { b: 2, a: 1, c: { y: "bar", x: "foo" } };
    const objB = { a: 1, c: { x: "foo", y: "bar" }, b: 2 };

    expect(canonicalJson(objA)).toEqual(canonicalJson(objB));
    expect(canonicalJson(objA)).toBe('{"a":1,"b":2,"c":{"x":"foo","y":"bar"}}');
  });

  it("should generate a valid SHA-256 fingerprint and short code format", () => {
    const { hash, shortCode } = computeReceiptFingerprint(sampleReceipt);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(shortCode).toMatch(/^KL-FP-[A-F0-9]{4}-[A-F0-9]{4}$/);
  });

  it("should successfully verify an untampered receipt", () => {
    const { hash, shortCode } = computeReceiptFingerprint(sampleReceipt);
    const validReceipt = {
      ...sampleReceipt,
      canonicalFingerprint: hash,
      shortCode
    };

    const verification = verifyReceiptFingerprint(validReceipt);
    expect(verification.isValid).toBe(true);
    expect(verification.computedHash).toBe(verification.expectedHash);
  });

  it("should flag tampering if actual weight is altered", () => {
    const { hash, shortCode } = computeReceiptFingerprint(sampleReceipt);
    const tamperedReceipt: ReceiptSnapshot = {
      ...sampleReceipt,
      actualWeightKg: 99.9, // Tampered weight
      canonicalFingerprint: hash,
      shortCode
    };

    const verification = verifyReceiptFingerprint(tamperedReceipt);
    expect(verification.isValid).toBe(false);
    expect(verification.computedHash).not.toBe(verification.expectedHash);
  });

  it("should flag tampering if recycler details or items are altered", () => {
    const { hash, shortCode } = computeReceiptFingerprint(sampleReceipt);

    // Alter recycler name
    const tamperedRecycler = {
      ...sampleReceipt,
      recyclerName: "Unauthorised Fraud Recycler",
      canonicalFingerprint: hash,
      shortCode
    };
    expect(verifyReceiptFingerprint(tamperedRecycler).isValid).toBe(false);

    // Alter item quantity
    const tamperedItems = {
      ...sampleReceipt,
      items: [{ category: "laptop" as const, quantity: 5, hasBattery: true }],
      canonicalFingerprint: hash,
      shortCode
    };
    expect(verifyReceiptFingerprint(tamperedItems).isValid).toBe(false);
  });
});
