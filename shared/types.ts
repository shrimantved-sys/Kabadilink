import type { Locality, ItemCategory, TimeWindow } from "./config.js";

export type RequestStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "PICKED_UP"
  | "HANDED_TO_RECYCLER"
  | "RECEIVED_BY_RECYCLER"
  | "CANCELLED";

export const ALLOWED_STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  REQUESTED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["HANDED_TO_RECYCLER"],
  HANDED_TO_RECYCLER: ["RECEIVED_BY_RECYCLER"],
  RECEIVED_BY_RECYCLER: [],
  CANCELLED: []
};

export function isValidTransition(from: RequestStatus, to: RequestStatus): boolean {
  return ALLOWED_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface RequestItem {
  category: ItemCategory;
  quantity: number; // 1 to 20
  hasBattery: boolean;
}

export interface RequestMeta {
  id: string; // e.g., uuid or nanoid
  code: string; // KL-XXXXXX
  status: RequestStatus;
  householdName: string;
  phone: string; // E.164 or 10-digit, masked on public / early collector views
  locality: Locality;
  landmark: string; // max 200 chars
  items: RequestItem[];
  photoKey?: string;
  pickupDate: string; // YYYY-MM-DD
  window: TimeWindow;
  estimatedWeightKg: number;
  pickupOtp: string; // 4 digits, never returned to collector
  createdAt: string; // ISO
  updatedAt: string; // ISO
  
  // Progression fields
  collectorId?: string;
  acceptedAt?: string;
  actualWeightKg?: number; // 0.1 to 200 kg
  pickedUpAt?: string;
  recyclerId?: string;
  handedOverAt?: string;
  receiptId?: string;
  receivedAt?: string; // set during simulated recycler ack
  
  // GSI1 sparse index attributes (present only while REQUESTED)
  GSI1PK?: string; // OPEN#<locality>
  GSI1SK?: string; // <createdAt>
}

export interface RequestEvent {
  PK: string; // REQ#<id>
  SK: string; // EVT#<isoTimestamp>
  requestId: string;
  type: "CREATED" | "ACCEPTED" | "PICKED_UP" | "HANDED_OVER" | "RECYCLER_ACK" | "CANCELLED" | "NOTE";
  actor: string; // "HOUSEHOLD", "COLLECTOR#<id>", "RECYCLER#<id>", "DEMO_SYSTEM"
  fromStatus?: RequestStatus;
  toStatus?: RequestStatus;
  note: string;
  timestamp: string;
}

export interface CollectorMeta {
  id: string; // e.g. COL-01
  name: string;
  phone: string;
  zone: string;
  vehicleType: string;
  isSample: true;
}

export interface RecyclerMeta {
  id: string; // e.g. REC-01
  name: string;
  zone: string;
  acceptedCategories: ItemCategory[];
  sampleRegNo: string; // e.g. SAMPLE-0001
  address: string;
  isSample: true;
}

export interface ReceiptSnapshot {
  receiptId: string;
  requestId: string;
  requestCode: string;
  issuedAt: string;
  householdFirstName: string;
  maskedPhone: string; // e.g., +91 ******8492
  locality: string;
  items: RequestItem[];
  actualWeightKg: number;
  collectorId: string;
  collectorName: string;
  recyclerId: string;
  recyclerName: string;
  recyclerRegNo: string;
  statusTimeline: Array<{ status: RequestStatus; timestamp: string; note: string }>;
  canonicalFingerprint: string; // 64-char hex SHA-256
  shortCode: string; // e.g. KL-FP-XXXX-XXXX
  isSample: true;
  disclaimer: string;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
}
