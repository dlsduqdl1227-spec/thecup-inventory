import {
  assertLoginAllowed,
  clearLoginFailures,
  createSession,
  normalizePhone,
  phoneHash,
  recordLoginFailure,
  sessionCookie,
} from "../../../../lib/auth";
import { audit, ensureDatabase, getD1, type StaffRole } from "../../../../lib/db";
import { assertSameOrigin, jsonError, textValue } from "../../../../lib/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await ensureDatabase();
    const payload = (await request.json()) as Record<string, unknown>;
    const name = textValue(payload.name, "이름", 40).replace(/\s+/g, " ");
    const phone = normalizePhone(String(payload.phone ?? ""));
    const hashedPhone = await phoneHash(phone);
    const identifierHash = hashedPhone;
    await assertLoginAllowed(identifierHash);

    const user = await getD1()
      .prepare(
        `SELECT id, name, role
         FROM staff
         WHERE name = ? AND phone_hash = ? AND active = 1`,
      )
      .bind(name, hashedPhone)
      .first<{ id: number; name: string; role: StaffRole }>();

    if (!user) {
      await recordLoginFailure(identifierHash);
      return Response.json(
        { error: "등록된 이름과 휴대폰 번호가 일치하지 않습니다." },
        { status: 401 },
      );
    }

    await clearLoginFailures(identifierHash);
    const session = await createSession(user.id);
    await audit(user.id, "login", "session");
    return new Response(JSON.stringify({ user }), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "set-cookie": sessionCookie(session.token, session.expiresAt),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
