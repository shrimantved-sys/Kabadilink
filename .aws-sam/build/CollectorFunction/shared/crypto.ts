import type { ReceiptSnapshot } from "./types.js";

/**
 * Pure TypeScript implementation of SHA-256 with strong typing.
 */
function sha256(ascii: string): string {
  const maxWord = Math.pow(2, 32);
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let padded = ascii + "\x80";
  while ((padded.length % 64) !== 56) {
    padded += "\x00";
  }

  for (let i = 0; i < padded.length; i++) {
    const j = padded.charCodeAt(i);
    words[i >> 2] = (words[i >> 2] || 0) | (j << (((3 - i) % 4) * 8));
  }
  words[padded.length >> 2] = (asciiBitLength / maxWord) | 0;
  words[(padded.length >> 2) + 1] = asciiBitLength;

  const w: number[] = new Array(64);
  for (let j = 0; j < words.length; j += 16) {
    const subWords = words.slice(j, j + 16);
    const oldHash = [...hash];

    for (let i = 0; i < 64; i++) {
      if (i < 16) {
        w[i] = subWords[i] || 0;
      } else {
        const w15 = w[i - 15];
        const w2 = w[i - 2];
        const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
        const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }

      const a = hash[0],
        e = hash[4];
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & hash[5]) ^ (~e & hash[6]);
      const temp1 = (hash[7] + s1 + ch + k[i] + w[i]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0 + maj) | 0;

      hash = [
        (temp1 + temp2) | 0,
        hash[0],
        hash[1],
        hash[2],
        (hash[3] + temp1) | 0,
        hash[4],
        hash[5],
        hash[6]
      ];
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  let result = "";
  for (let i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += ("0" + byte.toString(16)).slice(-2);
    }
  }

  return result;
}

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

/**
 * Deterministic JSON stringifier with recursively sorted keys
 */
export function canonicalJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => canonicalJson(item)).join(",") + "]";
  }

  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const entries = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  );
  return "{" + entries.join(",") + "}";
}

/**
 * Extract canonical fields specifically designated for receipt verification
 */
export function extractCanonicalReceiptData(receipt: Partial<ReceiptSnapshot>) {
  return {
    actualWeightKg: receipt.actualWeightKg,
    collectorId: receipt.collectorId,
    collectorName: receipt.collectorName,
    householdFirstName: receipt.householdFirstName,
    items: receipt.items?.map((item) => ({
      category: item.category,
      hasBattery: item.hasBattery,
      quantity: item.quantity
    })),
    locality: receipt.locality,
    maskedPhone: receipt.maskedPhone,
    receiptId: receipt.receiptId,
    recyclerName: receipt.recyclerName,
    recyclerRegNo: receipt.recyclerRegNo,
    requestCode: receipt.requestCode,
    statusTimeline: receipt.statusTimeline?.map((t) => ({
      note: t.note,
      status: t.status,
      timestamp: t.timestamp
    }))
  };
}

/**
 * Compute SHA-256 hash across canonical representation
 */
export function computeReceiptFingerprint(receiptData: Partial<ReceiptSnapshot>): {
  hash: string;
  shortCode: string;
} {
  const canonicalData = extractCanonicalReceiptData(receiptData);
  const serialized = canonicalJson(canonicalData);

  const hash = sha256(serialized);
  const prefix = hash.slice(0, 8).toUpperCase();
  const shortCode = `KL-FP-${prefix.slice(0, 4)}-${prefix.slice(4, 8)}`;

  return { hash, shortCode };
}

/**
 * Verify whether the receipt fingerprint matches its current contents
 */
export function verifyReceiptFingerprint(receipt: ReceiptSnapshot): {
  isValid: boolean;
  computedHash: string;
  expectedHash: string;
} {
  const { hash: computedHash } = computeReceiptFingerprint(receipt);
  const expectedHash = receipt.canonicalFingerprint;
  const isValid = computedHash.toLowerCase() === expectedHash.toLowerCase();

  return {
    isValid,
    computedHash,
    expectedHash
  };
}

/**
 * Helper to mask phone numbers, preserving only the last 4 digits
 * e.g. "9876543210" -> "+91 ******3210"
 */
export function maskPhoneNumber(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 4) return "******";
  const lastFour = clean.slice(-4);
  return `+91 ******${lastFour}`;
}

/**
 * Extract household first name from full name
 */
export function extractFirstName(fullName: string): string {
  if (!fullName) return "Resident";
  const trimmed = fullName.trim();
  const first = trimmed.split(/\s+/)[0];
  return first || "Resident";
}
