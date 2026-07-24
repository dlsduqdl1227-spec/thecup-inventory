export const RECEIPT_STORAGE_LIMIT_BYTES = 8_000_000_000;
export const RECEIPT_STORAGE_TARGET_BYTES = 7_000_000_000;

export type StoredReceiptObject = {
  key: string;
  size: number;
  uploaded: Date | string | number;
};

export type ReceiptCleanupPlan = {
  keys: string[];
  bytesBefore: number;
  bytesReclaimed: number;
  projectedBytes: number;
};

export function planReceiptCleanup(
  objects: StoredReceiptObject[],
  incomingBytes: number,
): ReceiptCleanupPlan {
  if (!Number.isFinite(incomingBytes) || incomingBytes < 0) {
    throw new Error("영수증 파일 크기가 올바르지 않습니다.");
  }

  const bytesBefore = objects.reduce((sum, object) => sum + Math.max(0, object.size), 0);
  if (bytesBefore + incomingBytes <= RECEIPT_STORAGE_LIMIT_BYTES) {
    return {
      keys: [],
      bytesBefore,
      bytesReclaimed: 0,
      projectedBytes: bytesBefore + incomingBytes,
    };
  }

  const oldestFirst = [...objects].sort((left, right) => {
    const dateDifference = new Date(left.uploaded).getTime() - new Date(right.uploaded).getTime();
    return dateDifference || left.key.localeCompare(right.key);
  });
  const keys: string[] = [];
  let bytesReclaimed = 0;

  for (const object of oldestFirst) {
    keys.push(object.key);
    bytesReclaimed += Math.max(0, object.size);
    if (bytesBefore - bytesReclaimed + incomingBytes <= RECEIPT_STORAGE_TARGET_BYTES) break;
  }

  const projectedBytes = bytesBefore - bytesReclaimed + incomingBytes;
  if (projectedBytes > RECEIPT_STORAGE_LIMIT_BYTES) {
    throw new Error("영수증 저장공간을 확보할 수 없습니다. 관리자에게 문의해 주세요.");
  }

  return { keys, bytesBefore, bytesReclaimed, projectedBytes };
}
