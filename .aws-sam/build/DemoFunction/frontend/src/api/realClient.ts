import type { ApiClient } from "./apiInterface.js";
import type { CreateRequestInput } from "@shared/validation.js";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {})
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `API request failed with status ${res.status}`);
  }
  return data as T;
}

export const realApiClient: ApiClient = {
  createRequest: (input: CreateRequestInput) =>
    request("/requests", { method: "POST", body: JSON.stringify(input) }),

  getRequest: (id: string, lastFour: string) =>
    request(`/requests/${id}?lastFour=${encodeURIComponent(lastFour)}`),

  cancelRequest: (id: string, note?: string) =>
    request(`/requests/${id}/cancel`, { method: "POST", body: JSON.stringify({ note }) }),

  getCollectorRequests: (locality?: string, collectorId?: string) => {
    const params = new URLSearchParams();
    if (locality) params.append("locality", locality);
    if (collectorId) params.append("collectorId", collectorId);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request(`/collector/requests${qs}`);
  },

  acceptTrip: (collectorId: string, requestIds: string[]) =>
    request("/collector/accept", {
      method: "POST",
      body: JSON.stringify({ collectorId, requestIds })
    }),

  confirmPickup: (requestId: string, collectorId: string, otp: string, weightKg: number) =>
    request(`/collector/requests/${requestId}/pickup`, {
      method: "POST",
      body: JSON.stringify({ collectorId, otp, weightKg })
    }),

  getRecyclers: () => request("/recyclers"),

  handoverToRecycler: (requestId: string, collectorId: string, recyclerId: string) =>
    request(`/collector/requests/${requestId}/handover`, {
      method: "POST",
      body: JSON.stringify({ collectorId, recyclerId })
    }),

  getReceipt: (receiptId: string) => request(`/receipts/${receiptId}`),

  verifyReceipt: (receiptId: string) => request(`/verify/${receiptId}`),

  seedDemo: () => request("/demo/seed", { method: "POST" }),

  resetDemo: () => request("/demo/reset", { method: "POST" }),

  simulateRecyclerAck: (requestId: string) =>
    request(`/demo/recycler-ack/${requestId}`, { method: "POST" })
};
