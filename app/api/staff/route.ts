import { normalizePhone, phoneHash, requireUser } from "../../../lib/auth";
import { audit, ensureDatabase, getD1, type StaffRole } from "../../../lib/db";
import { assertSameOrigin, jsonError, textValue } from "../../../lib/http";

const allowedRoles: StaffRole[] = ["admin", "employee", "instructor"];

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    await requireUser(request, ["admin"]);
    const staff = await getD1()
      .prepare(
        `SELECT id, name, phone_last4 AS phoneLast4, role, active, created_at AS createdAt
         FROM staff ORDER BY active DESC, role, name`,
      )
      .all();
    const audits = await getD1()
      .prepare(
        `SELECT a.id, a.action, a.entity_type AS entityType, a.detail,
                a.created_at AS createdAt, s.name AS actorName
         FROM audit_logs a LEFT JOIN staff s ON s.id = a.actor_id
         ORDER BY a.id DESC LIMIT 30`,
      )
      .all();
    return Response.json({ staff: staff.results, audits: audits.results });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await ensureDatabase();
    const actor = await requireUser(request, ["admin"]);
    const payload = (await request.json()) as Record<string, unknown>;
    const name = textValue(payload.name, "이름", 40).replace(/\s+/g, " ");
    const phone = normalizePhone(String(payload.phone ?? ""));
    const role = String(payload.role ?? "") as StaffRole;
    if (!allowedRoles.includes(role)) throw new Error("권한을 선택해 주세요.");

    const result = await getD1()
      .prepare(
        `INSERT INTO staff (name, phone_hash, phone_last4, role)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(name, await phoneHash(phone), phone.slice(-4), role)
      .run();
    const id = Number(result.meta.last_row_id);
    await audit(actor.id, "create_staff", "staff", String(id), `${name} · ${role}`);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE")) {
      return Response.json({ error: "이미 등록된 휴대폰 번호입니다." }, { status: 409 });
    }
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    await ensureDatabase();
    const actor = await requireUser(request, ["admin"]);
    const payload = (await request.json()) as Record<string, unknown>;
    const id = Number(payload.id);
    const role = String(payload.role ?? "") as StaffRole;
    const active = payload.active === true ? 1 : 0;
    if (!Number.isInteger(id) || id <= 0) throw new Error("직원을 선택해 주세요.");
    if (!allowedRoles.includes(role)) throw new Error("권한을 선택해 주세요.");
    if (id === actor.id && (!active || role !== "admin")) {
      throw new Error("현재 로그인한 관리자 본인의 권한은 낮추거나 비활성화할 수 없습니다.");
    }

    const db = getD1();
    const target = await db
      .prepare("SELECT role, active FROM staff WHERE id = ?")
      .bind(id)
      .first<{ role: StaffRole; active: number }>();
    if (!target) {
      return Response.json({ error: "변경할 직원을 찾을 수 없습니다." }, { status: 404 });
    }
    if (target.role === "admin" && Boolean(target.active) && (!active || role !== "admin")) {
      const administrators = await db
        .prepare("SELECT COUNT(*) AS count FROM staff WHERE role = 'admin' AND active = 1")
        .first<{ count: number }>();
      if (Number(administrators?.count ?? 0) <= 1) {
        throw new Error("마지막 활성 관리자의 권한은 낮추거나 비활성화할 수 없습니다.");
      }
    }

    await db
      .prepare("UPDATE staff SET role = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(role, active, id)
      .run();
    await audit(actor.id, "update_staff", "staff", String(id), `${role} · active=${active}`);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
