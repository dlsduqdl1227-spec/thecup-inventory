import { planReceiptCleanup, type StoredReceiptObject } from "./receipt-retention";

const RECEIPT_PREFIX = "receipts/";
const R2_DELETE_BATCH_SIZE = 500;
const D1_UPDATE_BATCH_SIZE = 50;

export type ReceiptCleanupResult = {
  deletedCount: number;
  bytesReclaimed: number;
  projectedBytes: number;
};

export async function makeRoomForReceipt(
  bucket: R2Bucket,
  db: D1Database,
  incomingBytes: number,
): Promise<ReceiptCleanupResult> {
  const objects = await listAllReceipts(bucket);
  const plan = planReceiptCleanup(objects, incomingBytes);

  if (plan.keys.length === 0) {
    return {
      deletedCount: 0,
      bytesReclaimed: 0,
      projectedBytes: plan.projectedBytes,
    };
  }

  for (let index = 0; index < plan.keys.length; index += R2_DELETE_BATCH_SIZE) {
    await bucket.delete(plan.keys.slice(index, index + R2_DELETE_BATCH_SIZE));
  }

  for (let index = 0; index < plan.keys.length; index += D1_UPDATE_BATCH_SIZE) {
    const keys = plan.keys.slice(index, index + D1_UPDATE_BATCH_SIZE);
    await db.batch(
      keys.map((key) =>
        db
          .prepare(
            `UPDATE inventory_movements
             SET receipt_key = NULL, receipt_deleted_at = CURRENT_TIMESTAMP
             WHERE receipt_key = ?`,
          )
          .bind(key),
      ),
    );
  }

  return {
    deletedCount: plan.keys.length,
    bytesReclaimed: plan.bytesReclaimed,
    projectedBytes: plan.projectedBytes,
  };
}

async function listAllReceipts(bucket: R2Bucket): Promise<StoredReceiptObject[]> {
  const objects: StoredReceiptObject[] = [];
  let cursor: string | undefined;

  do {
    const page = await bucket.list({ prefix: RECEIPT_PREFIX, cursor, limit: 1_000 });
    objects.push(
      ...page.objects.map((object) => ({
        key: object.key,
        size: object.size,
        uploaded: object.uploaded,
      })),
    );
    if (page.truncated && !page.cursor) {
      throw new Error("영수증 저장공간 목록을 끝까지 확인할 수 없습니다.");
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return objects;
}
