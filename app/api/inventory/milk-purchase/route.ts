import { requireUser } from "../../../../lib/auth";
import { audit, ensureDatabase, getD1, getReceiptsBucket } from "../../../../lib/db";
import {
  assertSameOrigin,
  integerAmount,
  isoDate,
  jsonError,
  optionalText,
  positiveNumber,
} from "../../../../lib/http";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  let receiptKey = "";
  try {
    assertSameOrigin(request);
    await ensureDatabase();
    const user = await requireUser(request);
    const form = await request.formData();
    const quantity = positiveNumber(form.get("quantity"), "우유 수량");
    const amount = integerAmount(form.get("amount"));
    const movementDate = isoDate(form.get("movementDate"));
    const note = optionalText(form.get("note"), 300);
    const receipt = form.get("receipt");
    if (!(receipt instanceof File) || receipt.size === 0) {
      throw new Error("우유 구매 영수증 사진을 첨부해 주세요.");
    }
    if (!allowedTypes.has(receipt.type)) throw new Error("JPG, PNG, WebP 영수증만 등록할 수 있습니다.");
    if (receipt.size > 1_000_000) throw new Error("최적화된 영수증 파일은 1MB 이하여야 합니다.");

    const db = getD1();
    const milk = await db
      .prepare("SELECT id, name FROM inventory_items WHERE category = 'milk' AND active = 1 LIMIT 1")
      .first<{ id: number; name: string }>();
    if (!milk) throw new Error("우유 재고 품목을 찾을 수 없습니다.");

    const extension = receipt.type === "image/png" ? "png" : receipt.type === "image/webp" ? "webp" : "jpg";
    const [year, month] = movementDate.split("-");
    receiptKey = `receipts/${year}/${month}/${crypto.randomUUID()}.${extension}`;
    const bucket = getReceiptsBucket();
    await bucket.put(receiptKey, await receipt.arrayBuffer(), {
      httpMetadata: { contentType: receipt.type },
      customMetadata: {
        uploadedBy: String(user.id),
        movementDate,
      },
    });

    const [movementResult] = await db.batch([
      db
        .prepare(
        `INSERT INTO inventory_movements
          (item_id, movement_type, quantity, movement_date, note, cost_amount, receipt_key, created_by)
         VALUES (?, 'in', ?, ?, ?, ?, ?, ?)`,
      )
        .bind(milk.id, quantity, movementDate, note, amount, receiptKey, user.id),
      db
        .prepare("UPDATE inventory_items SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(quantity, milk.id),
      db
        .prepare(
          `INSERT INTO finance_transactions
            (kind, category, amount, transaction_date, description, inventory_movement_id, created_by)
           VALUES ('expense', '우유', ?, ?, ?, last_insert_rowid(), ?)`,
        )
        .bind(amount, movementDate, note || `${quantity}팩 구매`, user.id),
    ]);
    const movementId = Number(movementResult.meta.last_row_id);
    await audit(user.id, "milk_purchase", "inventory_movement", String(movementId), `${quantity}팩 · ${amount}원`);
    return Response.json({ id: movementId }, { status: 201 });
  } catch (error) {
    if (receiptKey) {
      try {
        await getReceiptsBucket().delete(receiptKey);
      } catch {
        // A failed cleanup should not hide the original validation/database error.
      }
    }
    return jsonError(error);
  }
}
