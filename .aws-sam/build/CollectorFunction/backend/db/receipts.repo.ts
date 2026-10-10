import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./client.js";
import { TABLE_NAME } from "../../shared/config.js";
import type { ReceiptSnapshot } from "../../shared/types.js";
import { verifyReceiptFingerprint } from "../../shared/crypto.js";

export class ReceiptsRepository {
  private tableName = TABLE_NAME;

  /**
   * Fetch complete receipt by ID
   */
  async getReceiptById(receiptId: string): Promise<ReceiptSnapshot | null> {
    const res = await docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `RECEIPT#${receiptId}`,
          SK: "META"
        }
      })
    );

    if (!res.Item) return null;
    const { PK, SK, ...receipt } = res.Item;
    return receipt as ReceiptSnapshot;
  }

  /**
   * Verify receipt fingerprint and return public verification summary
   */
  async verifyReceipt(receiptId: string): Promise<{
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
  }> {
    const receipt = await this.getReceiptById(receiptId);
    if (!receipt) {
      return {
        found: false,
        message: "Receipt not found in database."
      };
    }

    const { isValid, computedHash, expectedHash } = verifyReceiptFingerprint(receipt);
    const now = new Date().toISOString();

    return {
      found: true,
      isValid,
      shortCode: receipt.shortCode,
      verifiedAt: now,
      message: isValid
        ? "Fingerprint verified: Receipt data is authentic and unchanged since issue."
        : "Tamper warning: Receipt data does not match original cryptographic fingerprint.",
      publicData: {
        receiptId: receipt.receiptId,
        requestCode: receipt.requestCode,
        issuedAt: receipt.issuedAt,
        householdFirstName: receipt.householdFirstName,
        locality: receipt.locality,
        items: receipt.items,
        actualWeightKg: receipt.actualWeightKg,
        collectorName: receipt.collectorName,
        recyclerName: receipt.recyclerName,
        recyclerRegNo: receipt.recyclerRegNo,
        statusTimeline: receipt.statusTimeline,
        isSample: true,
        disclaimer: receipt.disclaimer
      }
    };
  }
}

export const receiptsRepo = new ReceiptsRepository();
