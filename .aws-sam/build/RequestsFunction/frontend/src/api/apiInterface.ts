import type {
  RequestMeta,
  RequestEvent,
  CollectorMeta,
  RecyclerMeta,
  ReceiptSnapshot
} from "@shared/types.js";
import type { CreateRequestInput } from "@shared/validation.js";

export interface LocalityGroup {
  locality: string;
  requests: RequestMeta[];
  totalEstimatedWeightKg: number;
  illustrativePayoutEstimate: number;
  requestCount: number;
}

export interface ApiClient {
  createRequest(input: CreateRequestInput): Promise<{
    request: RequestMeta;
    pickupOtp: string;
    smsPreview: string;
  }>;

  getRequest(
    id: string,
    lastFour: string
  ): Promise<{
    request: RequestMeta;
    events: RequestEvent[];
  }>;

  cancelRequest(
    id: string,
    note?: string
  ): Promise<{
    message: string;
    request: RequestMeta;
  }>;

  getCollectorRequests(
    locality?: string,
    collectorId?: string
  ): Promise<{
    localityGroups: LocalityGroup[];
    totalOpenCount: number;
    disclaimer: string;
  }>;

  acceptTrip(
    collectorId: string,
    requestIds: string[]
  ): Promise<{
    message: string;
    acceptedIds: string[];
    failedIds: string[];
  }>;

  confirmPickup(
    requestId: string,
    collectorId: string,
    otp: string,
    weightKg: number
  ): Promise<{
    message: string;
    request: RequestMeta;
  }>;

  getRecyclers(): Promise<{
    recyclers: RecyclerMeta[];
    note: string;
  }>;

  handoverToRecycler(
    requestId: string,
    collectorId: string,
    recyclerId: string
  ): Promise<{
    message: string;
    request: RequestMeta;
    receipt: ReceiptSnapshot;
  }>;

  getReceipt(receiptId: string): Promise<{
    receipt: ReceiptSnapshot;
  }>;

  verifyReceipt(receiptId: string): Promise<{
    found: boolean;
    isValid?: boolean;
    shortCode?: string;
    verifiedAt?: string;
    message?: string;
    publicData?: {
      receiptId: string;
      requestCode: string;
      issuedAt: string;
      householdFirstName: string;
      locality: string;
      items: ReceiptSnapshot["items"];
      actualWeightKg: number;
      collectorName: string;
      recyclerName: string;
      recyclerRegNo: string;
      statusTimeline: ReceiptSnapshot["statusTimeline"];
      isSample: true;
      disclaimer: string;
    };
  }>;

  seedDemo(): Promise<{
    message: string;
    stats: { requests: number; events: number; receipts: number };
  }>;

  resetDemo(): Promise<{
    message: string;
    deletedCount: number;
  }>;

  simulateRecyclerAck(requestId: string): Promise<{
    message: string;
    mode: string;
    request: RequestMeta;
  }>;
}
