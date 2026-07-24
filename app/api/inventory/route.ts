import { requireUser } from "../../../lib/auth";
import { audit, ensureDatabase, getD1 } from "../../../lib/db";
import {
  assertSameOrigin,
  isoDate,
  jsonError,
  nonNegativeNumber,
  optionalText,
  positiveNumber,
  textValue,
} from "../../../lib/http";

const categories = ["green", "roasted", "gusto", "milk", "other"];

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await ensureDatabase();
    const user = await requireUser(request, ["admin", "employee"]);
    const payload = (await request.json()) as Record<string, unknown>;
    const action = String(payload.action ?? "");
    const db = getD1();

    if (action === "create_item") {
      const name = textValue(payload.name, "품목명", 80);
      const category = String(payload.category ?? "");
      const unit = textValue(payload.unit, "단위", 10);
      const reorderLevel = nonNegativeNumber(payload.reorderLevel, "최소 재고");
      if (!categories.includes(category)) throw new Error("재고 분류를 선택해 주세요.");
      const result = await db
        .prepare(
          `INSERT INTO inventory_items
            (category, name, unit, quantity, reorder_level, created_by)
           VALUES (?, ?, ?, 0, ?, ?)`,
        )
        .bind(category, name, unit, reorderLevel, user.id)
        .run();
      const id = Number(result.meta.last_row_id);
      await audit(user.id, "create_item", "inventory_item", String(id), name);
      return Response.json({ id }, { status: 201 });
    }

    if (action !== "movement") throw new Error("재고 작업을 선택해 주세요.");
    const itemId = Number(payload.itemId);
    const movementType = String(payload.movementType ?? "");
    const movementDate = isoDate(payload.movementDate);
    const note = optionalText(payload.note, 300);
    if (!Number.isInteger(itemId) || itemId <= 0) throw new Error("품목을 선택해 주세요.");
    if (!["in", "out", "adjust"].includes(movementType)) throw new Error("입고·사용·실사 조정 중 하나를 선택해 주세요.");
    const inputQuantity =
      movementType === "adjust"
        ? nonNegativeNumber(payload.quantity, "실사 수량")
        : positiveNumber(payload.quantity, "수량");

    const item = await db
      .prepare("SELECT id, name, quantity, unit FROM inventory_items WHERE id = ? AND active = 1")
      .bind(itemId)
      .first<{ id: number; name: string; quantity: number; unit: string }>();
    if (!item) throw new Error("재고 품목을 찾을 수 없습니다.");

    let delta = inputQuantity;
    if (movementType === "out") delta = -inputQuantity;
    if (movementType === "adjust") delta = inputQuantity - Number(item.quantity);
    const nextQuantity = Number(item.quantity) + delta;
    if (nextQuantity < 0) throw new Error(`재고가 부족합니다. 현재 ${item.quantity}${item.unit}입니다.`);

    const movement = db
      .prepare(
        `INSERT INTO inventory_movements
          (item_id, movement_type, quantity, movement_date, note, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(itemId, movementType, delta, movementDate, note, user.id);
    const update = db
      .prepare("UPDATE inventory_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(nextQuantity, itemId);
    const [, inserted] = await db.batch([update, movement]);
    const movementId = Number(inserted.meta.last_row_id);
    await audit(user.id, "inventory_movement", "inventory_movement", String(movementId), `${item.name} · ${delta}`);
    return Response.json({ id: movementId, quantity: nextQuantity }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
