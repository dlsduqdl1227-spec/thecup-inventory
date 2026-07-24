import { AuthError } from "./auth";

export function jsonError(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.";
  return Response.json({ error: message }, { status: 400 });
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const requestUrl = new URL(request.url);
  if (new URL(origin).host !== requestUrl.host) {
    throw new AuthError("허용되지 않은 요청입니다.", 403);
  }
}

export function textValue(value: unknown, label: string, maxLength = 200): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new Error(`${label}을(를) 입력해 주세요.`);
  if (text.length > maxLength) throw new Error(`${label}이(가) 너무 깁니다.`);
  return text;
}

export function optionalText(value: unknown, maxLength = 1000): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length > maxLength) throw new Error("입력 내용이 너무 깁니다.");
  return text;
}

export function positiveNumber(value: unknown, label: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label}은(는) 0보다 커야 합니다.`);
  }
  return number;
}

export function nonNegativeNumber(value: unknown, label: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${label}은(는) 0 이상이어야 합니다.`);
  }
  return number;
}

export function integerAmount(value: unknown, label = "금액"): number {
  const amount = Math.round(positiveNumber(value, label));
  if (amount > 1000000000) throw new Error(`${label}이(가) 허용 범위를 넘었습니다.`);
  return amount;
}

export function isoDate(value: unknown): string {
  const text = textValue(value, "날짜", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00`))) {
    throw new Error("날짜 형식이 올바르지 않습니다.");
  }
  return text;
}
