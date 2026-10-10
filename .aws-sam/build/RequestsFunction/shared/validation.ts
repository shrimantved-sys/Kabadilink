import { z } from "zod";
import {
  LOCALITIES,
  ITEM_CATEGORIES,
  TIME_WINDOWS,
  DATA_BEARING_CATEGORIES,
  BLOCKED_CATEGORIES,
  BATTERY_LOOSE_BLOCK_MESSAGE,
  ESTIMATED_WEIGHT_PER_UNIT_KG,
  ESTIMATED_PAYOUT_RATES_INR
} from "./config.js";
import type { RequestItem } from "./types.js";

// Line item schema
export const requestItemSchema = z
  .object({
    category: z.enum(ITEM_CATEGORIES),
    quantity: z.number().int().min(1, "Quantity must be at least 1").max(20, "Quantity cannot exceed 20"),
    hasBattery: z.boolean()
  })
  .refine(
    (item) => !BLOCKED_CATEGORIES.includes(item.category),
    {
      message: BATTERY_LOOSE_BLOCK_MESSAGE,
      path: ["category"]
    }
  );

// New request submission schema
export const createRequestSchema = z
  .object({
    householdName: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters"),
    phone: z
      .string()
      .trim()
      .regex(
        /^(?:\+91|91)?[6-9]\d{9}$/,
        "Please provide a valid 10-digit Indian mobile number"
      ),
    locality: z.enum(LOCALITIES, {
      errorMap: () => ({ message: "Please select a valid locality from the list" })
    }),
    landmark: z
      .string()
      .trim()
      .max(200, "Landmark notes cannot exceed 200 characters")
      .default(""),
    pickupDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Pickup date must be in YYYY-MM-DD format"),
    window: z.enum(TIME_WINDOWS, {
      errorMap: () => ({ message: "Please choose morning, afternoon, or evening" })
    }),
    photoKey: z.string().optional(),
    items: z
      .array(requestItemSchema)
      .min(1, "At least one item is required")
      .max(10, "A maximum of 10 items can be requested per pickup"),
    dataWipedConfirmed: z.boolean().default(false)
  })
  .superRefine((data, ctx) => {
    // Check if any items are data bearing
    const hasDataBearingItem = data.items.some((item) =>
      DATA_BEARING_CATEGORIES.includes(item.category)
    );

    if (hasDataBearingItem && !data.dataWipedConfirmed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "You must confirm that personal data has been wiped or will be wiped before pickup for phones, laptops, or tablets.",
        path: ["dataWipedConfirmed"]
      });
    }
  });

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

// Collector Accept Schema
export const collectorAcceptSchema = z.object({
  collectorId: z.string().min(1, "Collector ID is required"),
  requestIds: z.array(z.string().min(1)).min(1, "At least one request ID is required to accept trip")
});
export type CollectorAcceptInput = z.infer<typeof collectorAcceptSchema>;

// Collector Pickup Schema
export const collectorPickupSchema = z.object({
  collectorId: z.string().min(1, "Collector ID is required"),
  otp: z.string().regex(/^\d{4}$/, "Pickup OTP must be a 4-digit number"),
  weightKg: z
    .number()
    .min(0.1, "Actual weight must be at least 0.1 kg")
    .max(200, "Actual weight cannot exceed 200 kg")
});
export type CollectorPickupInput = z.infer<typeof collectorPickupSchema>;

// Collector Handover Schema
export const collectorHandoverSchema = z.object({
  collectorId: z.string().min(1, "Collector ID is required"),
  recyclerId: z.string().min(1, "Recycler ID is required")
});
export type CollectorHandoverInput = z.infer<typeof collectorHandoverSchema>;

// Presigned URL Upload Schema
export const presignedUploadSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png"], {
    errorMap: () => ({ message: "Only image/jpeg and image/png are supported" })
  }),
  contentLength: z
    .number()
    .int()
    .min(1, "File cannot be empty")
    .max(3 * 1024 * 1024, "File size cannot exceed 3 MB")
});

/**
 * Calculate total estimated weight for a collection of items
 */
export function calculateEstimatedWeightKg(items: RequestItem[]): number {
  const total = items.reduce((acc, item) => {
    const weightPerUnit = ESTIMATED_WEIGHT_PER_UNIT_KG[item.category] || 1.0;
    return acc + weightPerUnit * item.quantity;
  }, 0);
  return Math.round(total * 10) / 10;
}

/**
 * Calculate illustrative payout estimation for scrap collectors
 */
export function calculateIllustrativePayout(items: RequestItem[]): number {
  return items.reduce((acc, item) => {
    const rateInfo = ESTIMATED_PAYOUT_RATES_INR[item.category] || { rate: 30, unit: "kg" };
    if (rateInfo.unit === "unit") {
      return acc + rateInfo.rate * item.quantity;
    } else {
      const estimatedWeight = (ESTIMATED_WEIGHT_PER_UNIT_KG[item.category] || 1.0) * item.quantity;
      return acc + Math.round(rateInfo.rate * estimatedWeight);
    }
  }, 0);
}
