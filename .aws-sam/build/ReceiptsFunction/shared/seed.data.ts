import type { CollectorMeta, RecyclerMeta, RequestMeta, RequestEvent, ReceiptSnapshot } from "./types.js";
import { computeReceiptFingerprint, maskPhoneNumber } from "./crypto.js";
import { RECEIPT_DISCLAIMER } from "./config.js";

export const SAMPLE_COLLECTORS: CollectorMeta[] = [
  {
    id: "COL-01",
    name: "Ramesh Kumar",
    phone: "+91 98112 34567",
    zone: "East & North Zone",
    vehicleType: "E-Rickshaw Cart",
    isSample: true
  },
  {
    id: "COL-02",
    name: "Suresh Yadav",
    phone: "+91 98223 45678",
    zone: "South & Central Zone",
    vehicleType: "Motorcycle Sidecar",
    isSample: true
  },
  {
    id: "COL-03",
    name: "Rajesh Verma",
    phone: "+91 98334 56789",
    zone: "West & Suburban Zone",
    vehicleType: "Tata Ace Mini",
    isSample: true
  }
];

export const SAMPLE_RECYCLERS: RecyclerMeta[] = [
  {
    id: "REC-01",
    name: "EcoRecycle Solutions India",
    zone: "Okhla Industrial Area Ph-II",
    acceptedCategories: ["phone", "laptop", "tablet", "monitor"],
    sampleRegNo: "SAMPLE-REG-0104",
    address: "Plot 42, Okhla Ph-II, New Delhi 110020",
    isSample: true
  },
  {
    id: "REC-02",
    name: "GreenCircuits Refurbishers",
    zone: "Noida Sector 63",
    acceptedCategories: ["phone", "laptop", "tablet", "small_appliance", "cables_chargers"],
    sampleRegNo: "SAMPLE-REG-0218",
    address: "B-12, Sector 63, Noida, UP 201301",
    isSample: true
  },
  {
    id: "REC-03",
    name: "Bharat Heavy Metals & Recyclers",
    zone: "Mayapuri Industrial Area",
    acceptedCategories: ["tv", "monitor", "small_appliance", "cables_chargers", "printer", "other"],
    sampleRegNo: "SAMPLE-REG-0345",
    address: "C-88, Phase 1, Mayapuri, New Delhi 110064",
    isSample: true
  },
  {
    id: "REC-04",
    name: "Apex CleanTech Solutions",
    zone: "Manesar IMT",
    acceptedCategories: [
      "phone",
      "laptop",
      "tablet",
      "monitor",
      "tv",
      "printer",
      "small_appliance",
      "cables_chargers",
      "other"
    ],
    sampleRegNo: "SAMPLE-REG-0499",
    address: "Sector 8, IMT Manesar, Haryana 122051",
    isSample: true
  }
];

export function generateSeedData(): {
  requests: RequestMeta[];
  events: RequestEvent[];
  receipts: ReceiptSnapshot[];
} {
  const now = new Date();
  const pastMinutes = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

  // 1. REQUESTED (Open in Mayur Vihar Phase 1)
  const req1: RequestMeta = {
    id: "req-seed-01",
    code: "KL-7A9B11",
    status: "REQUESTED",
    householdName: "Priya Sharma",
    phone: "9876543210",
    locality: "Mayur Vihar Phase 1",
    landmark: "Near Pocket 1 Community Gate",
    items: [
      { category: "laptop", quantity: 1, hasBattery: true },
      { category: "cables_chargers", quantity: 2, hasBattery: false }
    ],
    pickupDate: now.toISOString().slice(0, 10),
    window: "morning",
    estimatedWeightKg: 3.2,
    pickupOtp: "4821",
    createdAt: pastMinutes(120),
    updatedAt: pastMinutes(120),
    GSI1PK: "OPEN#Mayur Vihar Phase 1",
    GSI1SK: pastMinutes(120)
  };

  const evt1: RequestEvent = {
    PK: "REQ#req-seed-01",
    SK: `EVT#${pastMinutes(120)}`,
    requestId: "req-seed-01",
    type: "CREATED",
    actor: "HOUSEHOLD",
    toStatus: "REQUESTED",
    note: "Pickup requested by Priya Sharma for 3 items (Est: 3.2 kg).",
    timestamp: pastMinutes(120)
  };

  // 2. ACCEPTED (Accepted by Ramesh Kumar, waiting for OTP pickup)
  const req2: RequestMeta = {
    id: "req-seed-02",
    code: "KL-3D4F22",
    status: "ACCEPTED",
    householdName: "Anil Mehra",
    phone: "9810123456",
    locality: "Mayur Vihar Phase 1",
    landmark: "Flat 402, Samachar Apartments",
    items: [
      { category: "monitor", quantity: 1, hasBattery: false },
      { category: "phone", quantity: 2, hasBattery: true }
    ],
    pickupDate: now.toISOString().slice(0, 10),
    window: "afternoon",
    estimatedWeightKg: 4.9,
    pickupOtp: "6392",
    createdAt: pastMinutes(180),
    updatedAt: pastMinutes(60),
    collectorId: "COL-01",
    acceptedAt: pastMinutes(60)
  };

  const evt2a: RequestEvent = {
    PK: "REQ#req-seed-02",
    SK: `EVT#${pastMinutes(180)}`,
    requestId: "req-seed-02",
    type: "CREATED",
    actor: "HOUSEHOLD",
    toStatus: "REQUESTED",
    note: "Pickup requested by Anil Mehra.",
    timestamp: pastMinutes(180)
  };
  const evt2b: RequestEvent = {
    PK: "REQ#req-seed-02",
    SK: `EVT#${pastMinutes(60)}`,
    requestId: "req-seed-02",
    type: "ACCEPTED",
    actor: "COLLECTOR#COL-01",
    fromStatus: "REQUESTED",
    toStatus: "ACCEPTED",
    note: "Trip accepted by Ramesh Kumar (COL-01).",
    timestamp: pastMinutes(60)
  };

  // 3. PICKED_UP (Picked up with actual weight, waiting for recycler handover)
  const req3: RequestMeta = {
    id: "req-seed-03",
    code: "KL-8K2L33",
    status: "PICKED_UP",
    householdName: "Vikram Malhotra",
    phone: "9958123456",
    locality: "Green Park Extension",
    landmark: "Behind Gurudwara Road",
    items: [
      { category: "printer", quantity: 1, hasBattery: false },
      { category: "small_appliance", quantity: 2, hasBattery: false }
    ],
    pickupDate: now.toISOString().slice(0, 10),
    window: "morning",
    estimatedWeightKg: 12.0,
    pickupOtp: "1547",
    createdAt: pastMinutes(240),
    updatedAt: pastMinutes(45),
    collectorId: "COL-02",
    acceptedAt: pastMinutes(90),
    actualWeightKg: 11.8,
    pickedUpAt: pastMinutes(45)
  };

  const evt3a: RequestEvent = {
    PK: "REQ#req-seed-03",
    SK: `EVT#${pastMinutes(240)}`,
    requestId: "req-seed-03",
    type: "CREATED",
    actor: "HOUSEHOLD",
    toStatus: "REQUESTED",
    note: "Pickup requested by Vikram Malhotra.",
    timestamp: pastMinutes(240)
  };
  const evt3b: RequestEvent = {
    PK: "REQ#req-seed-03",
    SK: `EVT#${pastMinutes(90)}`,
    requestId: "req-seed-03",
    type: "ACCEPTED",
    actor: "COLLECTOR#COL-02",
    fromStatus: "REQUESTED",
    toStatus: "ACCEPTED",
    note: "Trip accepted by Suresh Yadav (COL-02).",
    timestamp: pastMinutes(90)
  };
  const evt3c: RequestEvent = {
    PK: "REQ#req-seed-03",
    SK: `EVT#${pastMinutes(45)}`,
    requestId: "req-seed-03",
    type: "PICKED_UP",
    actor: "COLLECTOR#COL-02",
    fromStatus: "ACCEPTED",
    toStatus: "PICKED_UP",
    note: "OTP 1547 verified. Measured actual weight: 11.8 kg.",
    timestamp: pastMinutes(45)
  };

  // 4. HANDED_TO_RECYCLER (Handed over, receipt created, pending acknowledgment)
  const req4ReceiptId = "RCP-77A14B82";
  const req4ReceiptData: Partial<ReceiptSnapshot> = {
    receiptId: req4ReceiptId,
    requestId: "req-seed-04",
    requestCode: "KL-5N9P44",
    issuedAt: pastMinutes(30),
    householdFirstName: "Sunita",
    maskedPhone: maskPhoneNumber("9818987654"),
    locality: "Indirapuram Sector 4",
    items: [
      { category: "tv", quantity: 1, hasBattery: false },
      { category: "cables_chargers", quantity: 4, hasBattery: false }
    ],
    actualWeightKg: 14.2,
    collectorId: "COL-01",
    collectorName: "Ramesh Kumar (SAMPLE)",
    recyclerId: "REC-03",
    recyclerName: "Bharat Heavy Metals & Recyclers (SAMPLE)",
    recyclerRegNo: "SAMPLE-REG-0345",
    statusTimeline: [
      { status: "REQUESTED", timestamp: pastMinutes(300), note: "Request submitted" },
      { status: "ACCEPTED", timestamp: pastMinutes(150), note: "Collector accepted" },
      { status: "PICKED_UP", timestamp: pastMinutes(70), note: "Weighed 14.2 kg" },
      { status: "HANDED_TO_RECYCLER", timestamp: pastMinutes(30), note: "Delivered to recycler yard" }
    ]
  };
  const fp4 = computeReceiptFingerprint(req4ReceiptData);

  const receipt4: ReceiptSnapshot = {
    ...(req4ReceiptData as ReceiptSnapshot),
    canonicalFingerprint: fp4.hash,
    shortCode: fp4.shortCode,
    isSample: true,
    disclaimer: RECEIPT_DISCLAIMER
  };

  const req4: RequestMeta = {
    id: "req-seed-04",
    code: "KL-5N9P44",
    status: "HANDED_TO_RECYCLER",
    householdName: "Sunita Rao",
    phone: "9818987654",
    locality: "Indirapuram Sector 4",
    landmark: "Near Shipra Mall Road",
    items: [
      { category: "tv", quantity: 1, hasBattery: false },
      { category: "cables_chargers", quantity: 4, hasBattery: false }
    ],
    pickupDate: now.toISOString().slice(0, 10),
    window: "morning",
    estimatedWeightKg: 14.0,
    pickupOtp: "3389",
    createdAt: pastMinutes(300),
    updatedAt: pastMinutes(30),
    collectorId: "COL-01",
    acceptedAt: pastMinutes(150),
    actualWeightKg: 14.2,
    pickedUpAt: pastMinutes(70),
    recyclerId: "REC-03",
    handedOverAt: pastMinutes(30),
    receiptId: req4ReceiptId
  };

  const evt4: RequestEvent = {
    PK: "REQ#req-seed-04",
    SK: `EVT#${pastMinutes(30)}`,
    requestId: "req-seed-04",
    type: "HANDED_OVER",
    actor: "COLLECTOR#COL-01",
    fromStatus: "PICKED_UP",
    toStatus: "HANDED_TO_RECYCLER",
    note: `Handed over to REC-03 (Bharat Heavy Metals). Receipt ${req4ReceiptId} generated.`,
    timestamp: pastMinutes(30)
  };

  // 5. RECEIVED_BY_RECYCLER (Fully acknowledged, simulated receipt)
  const req5ReceiptId = "RCP-99B23E11";
  const req5ReceiptData: Partial<ReceiptSnapshot> = {
    receiptId: req5ReceiptId,
    requestId: "req-seed-05",
    requestCode: "KL-2M6Q55",
    issuedAt: pastMinutes(60),
    householdFirstName: "Deepak",
    maskedPhone: maskPhoneNumber("9711223344"),
    locality: "Koramangala 4th Block",
    items: [
      { category: "laptop", quantity: 2, hasBattery: true },
      { category: "tablet", quantity: 1, hasBattery: true }
    ],
    actualWeightKg: 5.1,
    collectorId: "COL-02",
    collectorName: "Suresh Yadav (SAMPLE)",
    recyclerId: "REC-01",
    recyclerName: "EcoRecycle Solutions India (SAMPLE)",
    recyclerRegNo: "SAMPLE-REG-0104",
    statusTimeline: [
      { status: "REQUESTED", timestamp: pastMinutes(360), note: "Request submitted" },
      { status: "ACCEPTED", timestamp: pastMinutes(200), note: "Collector accepted" },
      { status: "PICKED_UP", timestamp: pastMinutes(120), note: "Weighed 5.1 kg" },
      { status: "HANDED_TO_RECYCLER", timestamp: pastMinutes(60), note: "Delivered to facility" },
      { status: "RECEIVED_BY_RECYCLER", timestamp: pastMinutes(10), note: "Facility intake confirmed (SIMULATED)" }
    ]
  };
  const fp5 = computeReceiptFingerprint(req5ReceiptData);

  const receipt5: ReceiptSnapshot = {
    ...(req5ReceiptData as ReceiptSnapshot),
    canonicalFingerprint: fp5.hash,
    shortCode: fp5.shortCode,
    isSample: true,
    disclaimer: RECEIPT_DISCLAIMER
  };

  const req5: RequestMeta = {
    id: "req-seed-05",
    code: "KL-2M6Q55",
    status: "RECEIVED_BY_RECYCLER",
    householdName: "Deepak Joshi",
    phone: "9711223344",
    locality: "Koramangala 4th Block",
    landmark: "Opposite BDA Complex",
    items: [
      { category: "laptop", quantity: 2, hasBattery: true },
      { category: "tablet", quantity: 1, hasBattery: true }
    ],
    pickupDate: now.toISOString().slice(0, 10),
    window: "morning",
    estimatedWeightKg: 4.9,
    pickupOtp: "7820",
    createdAt: pastMinutes(360),
    updatedAt: pastMinutes(10),
    collectorId: "COL-02",
    acceptedAt: pastMinutes(200),
    actualWeightKg: 5.1,
    pickedUpAt: pastMinutes(120),
    recyclerId: "REC-01",
    handedOverAt: pastMinutes(60),
    receiptId: req5ReceiptId,
    receivedAt: pastMinutes(10)
  };

  // 6. CANCELLED (Cancelled while REQUESTED)
  const req6: RequestMeta = {
    id: "req-seed-06",
    code: "KL-9X1Y66",
    status: "CANCELLED",
    householdName: "Rohit Verma",
    phone: "9811002233",
    locality: "Powai Hiranandani",
    landmark: "Cliff Tower B",
    items: [{ category: "phone", quantity: 1, hasBattery: true }],
    pickupDate: now.toISOString().slice(0, 10),
    window: "evening",
    estimatedWeightKg: 0.2,
    pickupOtp: "9012",
    createdAt: pastMinutes(500),
    updatedAt: pastMinutes(480)
  };

  const evt6: RequestEvent = {
    PK: "REQ#req-seed-06",
    SK: `EVT#${pastMinutes(480)}`,
    requestId: "req-seed-06",
    type: "CANCELLED",
    actor: "HOUSEHOLD",
    fromStatus: "REQUESTED",
    toStatus: "CANCELLED",
    note: "Cancelled by household before collector assignment.",
    timestamp: pastMinutes(480)
  };

  return {
    requests: [req1, req2, req3, req4, req5, req6],
    events: [evt1, evt2a, evt2b, evt3a, evt3b, evt3c, evt4, evt6],
    receipts: [receipt4, receipt5]
  };
}
