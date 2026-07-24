import { requireUser } from "../../../../lib/auth";
import { ensureDatabase, getD1, getReceiptsBucket } from "../../../../lib/db";
import { jsonError } from "../../../../lib/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureDatabase();
    const user = await requireUser(request);
    const { id } = await context.params;
    const movementId = Number(id);
    if (!Number.isInteger(movementId) || movementId <= 0) throw new Error("영수증 번호가 올바르지 않습니다.");
    const movement = await getD1()
      .prepare("SELECT receipt_key AS receiptKey, created_by AS createdBy FROM inventory_movements WHERE id = ?")
      .bind(movementId)
      .first<{ receiptKey: string | null; createdBy: number }>();
    if (!movement?.receiptKey) return Response.json({ error: "영수증을 찾을 수 없습니다." }, { status: 404 });
    if (
      movement.createdBy !== user.id &&
      !user.canInventory &&
      !user.canFinance
    ) {
      return Response.json({ error: "본인이 등록한 영수증만 볼 수 있습니다." }, { status: 403 });
    }

    const object = await getReceiptsBucket().get(movement.receiptKey);
    if (!object) return Response.json({ error: "영수증 파일을 찾을 수 없습니다." }, { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("content-disposition", `inline; filename="receipt-${movementId}"`);
    headers.set("cache-control", "private, max-age=300");
    return new Response(object.body, { headers });
  } catch (error) {
    return jsonError(error);
  }
}
