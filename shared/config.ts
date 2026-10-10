/**
 * KabadiLink - Central Configuration
 * All core project constants, pricing estimates, localities, and categories are defined here.
 */

export const APP_NAME = "KabadiLink";

export const APP_DESCRIPTION =
  "Connecting households, informal scrap collectors (kabadiwalas), and authorised e-waste recyclers with a verified paper trail.";

export const PROTOTYPE_BANNER =
  "PROTOTYPE - Recyclers and registration numbers are SAMPLE data. Not an official CPCB or EPR document.";

export const RECEIPT_DISCLAIMER =
  "Prototype receipt. Not an official CPCB or EPR document. Recycler details are sample data.";

// 8 Fictional Indian Urban Localities
export const LOCALITIES = [
  "Mayur Vihar Phase 1",
  "Green Park Extension",
  "Indirapuram Sector 4",
  "Koramangala 4th Block",
  "Powai Hiranandani",
  "Salt Lake Sector V",
  "Banjara Hills Road 12",
  "Anna Nagar West"
] as const;

export type Locality = (typeof LOCALITIES)[number];

// Supported Line Item Categories
export const ITEM_CATEGORIES = [
  "phone",
  "laptop",
  "tablet",
  "monitor",
  "tv",
  "printer",
  "small_appliance",
  "cables_chargers",
  "battery_loose",
  "other"
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

// Categories that require personal data wipe confirmation
export const DATA_BEARING_CATEGORIES: ItemCategory[] = ["phone", "laptop", "tablet"];

// Categories that are strictly blocked from pickup
export const BLOCKED_CATEGORIES: ItemCategory[] = ["battery_loose"];

export const BATTERY_LOOSE_BLOCK_MESSAGE =
  "Loose batteries are not accepted in this prototype. Please take them to an authorised battery collection point or hazardous waste depository.";

// Illustrative weights (in kg) per unit for calculation
export const ESTIMATED_WEIGHT_PER_UNIT_KG: Record<ItemCategory, number> = {
  phone: 0.2,
  laptop: 2.2,
  tablet: 0.5,
  monitor: 4.5,
  tv: 12.0,
  printer: 6.0,
  small_appliance: 3.0,
  cables_chargers: 0.5,
  battery_loose: 0.0,
  other: 2.0
};

// Illustrative payout rates (INR) for display to collector (labelled illustrative)
export const ESTIMATED_PAYOUT_RATES_INR: Record<ItemCategory, { rate: number; unit: "unit" | "kg" }> = {
  phone: { rate: 150, unit: "unit" },
  laptop: { rate: 600, unit: "unit" },
  tablet: { rate: 250, unit: "unit" },
  monitor: { rate: 200, unit: "unit" },
  tv: { rate: 400, unit: "unit" },
  printer: { rate: 250, unit: "unit" },
  small_appliance: { rate: 50, unit: "kg" },
  cables_chargers: { rate: 40, unit: "kg" },
  battery_loose: { rate: 0, unit: "unit" },
  other: { rate: 30, unit: "kg" }
};

export const TIME_WINDOWS = ["morning", "afternoon", "evening"] as const;
export type TimeWindow = (typeof TIME_WINDOWS)[number];

export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  morning: "Morning (09:00 AM - 12:00 PM)",
  afternoon: "Afternoon (12:00 PM - 04:00 PM)",
  evening: "Evening (04:00 PM - 07:00 PM)"
};

const getEnv = (key: string, fallback = ""): string => {
  if (typeof process !== "undefined" && process.env && process.env[key] !== undefined) {
    return process.env[key] as string;
  }
  return fallback;
};

// DynamoDB Table & GSI Names
export const TABLE_NAME = getEnv("TABLE_NAME", "kabadilink");
export const GSI1_NAME = "GSI1";
export const PHOTOS_BUCKET = getEnv("PHOTOS_BUCKET", "kabadilink-photos");
export const SNS_TOPIC_ARN = getEnv("SNS_TOPIC_ARN", "");
export const DEMO_MODE =
  typeof process !== "undefined" && process.env
    ? process.env.DEMO_MODE === "true" || process.env.DEMO_MODE === undefined
    : true;

