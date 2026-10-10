import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { ZodError } from "zod";
import { ConflictError, NotFoundError, ValidationError } from "../db/requests.repo.js";

const DEFAULT_CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
};

export function jsonResponse(
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {}
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      ...DEFAULT_CORS_HEADERS,
      ...headers
    },
    body: JSON.stringify(body)
  };
}

export function parseJsonBody<T>(event: APIGatewayProxyEventV2): T {
  if (!event.body) {
    throw new ValidationError("Request body is empty.");
  }

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf-8")
    : event.body;

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new ValidationError("Malformed JSON in request body.");
  }
}

export function handleError(err: unknown): APIGatewayProxyResultV2 {
  console.error("[API Error Handler]", err);

  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    return jsonResponse(400, {
      error: "VALIDATION_ERROR",
      message: message || "Invalid request payload."
    });
  }

  if (err instanceof ValidationError) {
    return jsonResponse(err.statusCode, {
      error: "BAD_REQUEST",
      message: err.message
    });
  }

  if (err instanceof NotFoundError) {
    return jsonResponse(err.statusCode, {
      error: "NOT_FOUND",
      message: err.message
    });
  }

  if (err instanceof ConflictError) {
    return jsonResponse(err.statusCode, {
      error: "CONFLICT",
      message: err.message
    });
  }

  const generalError = err as { statusCode?: number; message?: string };
  const statusCode = generalError.statusCode || 500;
  const message = generalError.message || "An unexpected internal server error occurred.";

  return jsonResponse(statusCode, {
    error: statusCode === 409 ? "CONFLICT" : "INTERNAL_ERROR",
    message
  });
}
