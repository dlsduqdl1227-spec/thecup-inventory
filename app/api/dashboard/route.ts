import { requireUser } from "../../../lib/auth";
import { ensureDatabase, getD1 } from "../../../lib/db";
import { jsonError } from "../../../lib/http";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const user = await requireUser(request);
    const db = getD1();

    const finance =
      user.role === "instructor"
        ? { results: [] }
        : await db
            .prepare(
              `SELECT m.year, m.month,
                      m.revenue + COALESCE(SUM(CASE WHEN t.kind = 'income' THEN t.amount ELSE 0 END), 0) AS revenue,
                      m.baseline_expense + COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN t.amount ELSE 0 END), 0) AS expense,
                      m.revenue + COALESCE(SUM(CASE WHEN t.kind = 'income' THEN t.amount ELSE 0 END), 0)
                        - m.baseline_expense
                        - COALESCE(SUM(CASE WHEN t.kind = 'expense' THEN t.amount ELSE 0 END), 0) AS profit,
                      m.note, m.source
               FROM monthly_finance m
               LEFT JOIN finance_transactions t
                 ON CAST(strftime('%Y', t.transaction_date) AS INTEGER) = m.year
                AND CAST(strftime('%m', t.transaction_date) AS INTEGER) = m.month
               GROUP BY m.id
               ORDER BY m.year, m.month`,
            )
            .all();

    const inventory = await db
      .prepare(
        `SELECT id, category, name, unit, quantity, reorder_level AS reorderLevel,
                CASE WHEN quantity <= reorder_level THEN 1 ELSE 0 END AS lowStock
         FROM inventory_items
         WHERE active = 1 ${user.role === "instructor" ? "AND category IN ('milk','roasted','gusto')" : ""}
         ORDER BY category, name`,
      )
      .all();

    const movementSql =
      user.role === "instructor"
        ? `SELECT m.id, m.movement_type AS movementType, m.quantity,
                  m.movement_date AS movementDate, m.note, m.class_name AS className,
                  m.cost_amount AS costAmount, m.receipt_key IS NOT NULL AS hasReceipt,
                  i.name AS itemName, i.unit, s.name AS createdByName
           FROM inventory_movements m
           JOIN inventory_items i ON i.id = m.item_id
           JOIN staff s ON s.id = m.created_by
           WHERE m.created_by = ? AND i.category IN ('milk','roasted','gusto')
           ORDER BY m.id DESC LIMIT 30`
        : `SELECT m.id, m.movement_type AS movementType, m.quantity,
                  m.movement_date AS movementDate, m.note, m.class_name AS className,
                  m.cost_amount AS costAmount, m.receipt_key IS NOT NULL AS hasReceipt,
                  i.name AS itemName, i.unit, s.name AS createdByName
           FROM inventory_movements m
           JOIN inventory_items i ON i.id = m.item_id
           JOIN staff s ON s.id = m.created_by
           ORDER BY m.id DESC LIMIT 60`;
    const movements =
      user.role === "instructor"
        ? await db.prepare(movementSql).bind(user.id).all()
        : await db.prepare(movementSql).all();

    const transactions =
      user.role === "instructor"
        ? { results: [] }
        : await db
            .prepare(
              `SELECT t.id, t.kind, t.category, t.amount,
                      t.transaction_date AS transactionDate, t.description,
                      s.name AS createdByName, t.created_at AS createdAt
               FROM finance_transactions t
               JOIN staff s ON s.id = t.created_by
               ORDER BY t.id DESC LIMIT 40`,
            )
            .all();

    const profiles =
      user.role === "instructor"
        ? { results: [] }
        : await db
            .prepare(
              `SELECT p.id, p.bean_name AS beanName, p.origin, p.process,
                      p.batch_weight AS batchWeight, p.charge_temp AS chargeTemp,
                      p.yellowing_seconds AS yellowingSeconds,
                      p.first_crack_seconds AS firstCrackSeconds,
                      p.drop_temp AS dropTemp, p.total_seconds AS totalSeconds,
                      p.development_seconds AS developmentSeconds,
                      p.development_ratio AS developmentRatio,
                      p.gas_notes AS gasNotes, p.notes, p.created_at AS createdAt,
                      s.name AS createdByName
               FROM roasting_profiles p
               JOIN staff s ON s.id = p.created_by
               ORDER BY p.id DESC`,
            )
            .all();

    return Response.json({
      user,
      finance: finance.results,
      inventory: inventory.results,
      movements: movements.results,
      transactions: transactions.results,
      profiles: profiles.results,
    });
  } catch (error) {
    return jsonError(error);
  }
}
