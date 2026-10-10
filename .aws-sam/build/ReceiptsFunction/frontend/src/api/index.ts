import { realApiClient } from "./realClient.js";
import { mockApiClient } from "./mockClient.js";
import type { ApiClient } from "./apiInterface.js";

const isRealApiConfigured = Boolean(
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim().length > 0
);

export const api: ApiClient = isRealApiConfigured ? realApiClient : mockApiClient;

export const isMockMode = !isRealApiConfigured;
