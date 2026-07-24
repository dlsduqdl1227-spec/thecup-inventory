import { requireUser } from "../../../lib/auth";
import { audit, ensureDatabase, getD1 } from "../../../lib/db";
import {
  assertSameOrigin,
  integerAmount,
  isoDate,
  jsonError,
  optionalText,
  textValue,
} from "../../../lib/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await ensureDatabase();
    const user = await requireUser(request, ["admin", "employee"]);
    const payload = (await request.json()) as Record<string, unknown>;
    const kind = String(payload.kind ?? "");
    if (kind !== "income" && kind !== "expense") throw new Error("수입 또는 지출을 선택해 주세요.");
    const category = textValue(payload.category, "분류", 50);
    const amount = integerAmount(payload.amount);
    const transactionDate = isoDate(payload.transactionDate);
    const description = optionalText(payload.description, 300);

    const result = await getD1()
      .prepare(
        `INSERT INTO finance_transactions
          (kind, category, amount, transaction_date, description, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(kind, category, amount, transactionDate, description, user.id)
      .run();
    const id = Number(result.meta.last_row_id);
    await audit(user.id, "create_finance", "finance_transaction", String(id), `${kind} · ${category} · ${amount}`);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
