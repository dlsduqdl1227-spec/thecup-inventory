import {
  createSession,
  getBootstrapCode,
  normalizePhone,
  phoneHash,
  sessionCookie,
  verifyCode,
} from "../../../../lib/auth";
import { audit, ensureDatabase, getD1 } from "../../../../lib/db";
import { assertSameOrigin, jsonError, textValue } from "../../../../lib/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await ensureDatabase();
    const db = getD1();
    const count = await db.prepare("SELECT COUNT(*) AS count FROM staff").first<{ count: number }>();
    if (Number(count?.count ?? 0) > 0) {
      return Response.json({ error: "초기 관리자 등록이 이미 완료되었습니다." }, { status: 409 });
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const code = textValue(payload.code, "초기 관리자 코드", 100);
    if (!verifyCode(code, getBootstrapCode())) {
      return Response.json({ error: "초기 관리자 코드가 올바르지 않습니다." }, { status: 403 });
    }

    const name = textValue(payload.name, "이름", 40).replace(/\s+/g, " ");
    const phone = normalizePhone(String(payload.phone ?? ""));
    const result = await db
      .prepare(
        `INSERT INTO staff (name, phone_hash, phone_last4, role)
         VALUES (?, ?, ?, 'admin')`,
      )
      .bind(name, await phoneHash(phone), phone.slice(-4))
      .run();
    const staffId = Number(result.meta.last_row_id);
    const session = await createSession(staffId);
    await audit(staffId, "bootstrap_admin", "staff", String(staffId), "최초 관리자 등록");

    return new Response(JSON.stringify({ user: { id: staffId, name, role: "admin" } }), {
      status: 201,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "set-cookie": sessionCookie(session.token, session.expiresAt),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
