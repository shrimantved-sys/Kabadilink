import { describe, it, expect } from "vitest";
import {
  createRequestSchema,
  calculateEstimatedWeightKg,
  calculateIllustrativePayout
} from "../../shared/validation.js";
import { BATTERY_LOOSE_BLOCK_MESSAGE } from "../../shared/config.js";

describe("Household Request Validation & Calculation", () => {
  const baseValidInput = {
    householdName: "Sunita Verma",
    phone: "9876543210",
    locality: "Mayur Vihar Phase 1",
    landmark: "Pocket 1 Community Hall",
    pickupDate: "2026-10-15",
    window: "morning" as const,
    items: [{ category: "printer" as const, quantity: 1, hasBattery: false }],
    dataWipedConfirmed: false
  };

  it("should successfully validate a correct pickup request", () => {
    const result = createRequestSchema.safeParse(baseValidInput);
    expect(result.success).toBe(true);
  });

  it("should strictly block requests containing loose batteries (battery_loose)", () => {
    const inputWithLooseBattery = {
      ...baseValidInput,
      items: [{ category: "battery_loose" as const, quantity: 2, hasBattery: true }]
    };

    const result = createRequestSchema.safeParse(inputWithLooseBattery);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorMsg = result.error.errors.map((e) => e.message).join(" ");
      expect(errorMsg).toContain(BATTERY_LOOSE_BLOCK_MESSAGE);
    }
  });

  it("should enforce data-wiped confirmation for data-bearing items (phone, laptop, tablet)", () => {
    const unconfirmedDataBearing = {
      ...baseValidInput,
      items: [{ category: "laptop" as const, quantity: 1, hasBattery: true }],
      dataWipedConfirmed: false
    };

    const result = createRequestSchema.safeParse(unconfirmedDataBearing);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain(
        "You must confirm that personal data has been wiped"
      );
    }

    // Now with dataWipedConfirmed: true
    const confirmed = {
      ...unconfirmedDataBearing,
      dataWipedConfirmed: true
    };
    const validResult = createRequestSchema.safeParse(confirmed);
    expect(validResult.success).toBe(true);
  });

  it("should enforce item limits (min 1, max 10 items, quantity 1-20)", () => {
    // Empty items
    expect(createRequestSchema.safeParse({ ...baseValidInput, items: [] }).success).toBe(false);

    // Quantity > 20
    expect(
      createRequestSchema.safeParse({
        ...baseValidInput,
        items: [{ category: "tv" as const, quantity: 25, hasBattery: false }]
      }).success).toBe(false);
  });

  it("should correctly calculate estimated weight based on category rates", () => {
    const items = [
      { category: "phone" as const, quantity: 2, hasBattery: true }, // 0.2 * 2 = 0.4 kg
      { category: "laptop" as const, quantity: 1, hasBattery: true }, // 2.2 kg
      { category: "printer" as const, quantity: 1, hasBattery: false } // 6.0 kg
    ];
    // 0.4 + 2.2 + 6.0 = 8.6 kg
    const weight = calculateEstimatedWeightKg(items);
    expect(weight).toBe(8.6);
  });

  it("should calculate illustrative payout estimates", () => {
    const items = [
      { category: "phone" as const, quantity: 2, hasBattery: true }, // 150 * 2 = 300
      { category: "laptop" as const, quantity: 1, hasBattery: true } // 600 * 1 = 600
    ];
    const payout = calculateIllustrativePayout(items);
    expect(payout).toBe(900);
  });
});
