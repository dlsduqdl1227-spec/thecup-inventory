const STOCK_PRECISION = 1000; // 1kg = 1000 mkg. 소수점 3자리까지 정확하게 보관
const STOCK_EPSILON_MKG = 0;
const DEFAULT_USER = 'admin';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff'
};

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()'
};

export default {
  async fetch(request, env, ctx) {
    try {
      const authResponse = requireBasicAuth(request, env);
      if (authResponse) return authResponse;

      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/')) {
        return withSecurityHeaders(await handleApi(request, env, url));
      }

      const assetResponse = await env.ASSETS.fetch(request);
      return withSecurityHeaders(assetResponse);
    } catch (error) {
      console.error(error);
      const status = Number(error?.status || 500);
      const message = status >= 500 ? '서버 처리 중 오류가 발생했습니다.' : String(error?.message || error);
      return json({ ok: false, error: message }, status);
    }
  }
};

async function handleApi(request, env, url) {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS });

  if (method === 'GET' && pathname === '/api/health') {
    return json({ ok: true, service: 'thecup-inventory', time: new Date().toISOString() });
  }

  if (method === 'GET' && pathname === '/api/dashboard') {
    return json({ ok: true, data: await getDashboard(env.DB) });
  }

  if (method === 'POST' && pathname === '/api/entries') {
    const payload = await readJson(request);
    const result = await recordEntry(env.DB, payload);
    return json({ ok: true, data: result }, 201);
  }

  if (method === 'GET' && pathname === '/api/entries') {
    const item = String(url.searchParams.get('item') || '').trim();
    const lot = String(url.searchParams.get('lot') || '').trim();
    const category = normalizeCategory(url.searchParams.get('category'));
    if (!item || !lot) return json({ ok: false, error: '품목명과 LOT가 필요합니다.' }, 400);
    return json({ ok: true, data: await getEntriesByItem(env.DB, item, lot, category) });
  }

  const deleteMatch = pathname.match(/^\/api\/entries\/([^/]+)$/);
  if (method === 'DELETE' && deleteMatch) {
    await deleteEntry(env.DB, decodeURIComponent(deleteMatch[1]));
    return json({ ok: true });
  }

  if (method === 'GET' && pathname === '/api/presets') {
    return json({ ok: true, data: await loadPresets(env.DB) });
  }

  const presetMatch = pathname.match(/^\/api\/presets\/(GREEN|ROASTED)$/);
  if (method === 'PUT' && presetMatch) {
    const payload = await readJson(request);
    const presets = Array.isArray(payload?.presets) ? payload.presets : [];
    await savePresets(env.DB, presetMatch[1], presets);
    return json({ ok: true });
  }

  if (method === 'GET' && pathname === '/api/export.csv') {
    return exportCsv(env.DB);
  }

  return json({ ok: false, error: '요청한 API를 찾을 수 없습니다.' }, 404);
}

async function getDashboard(db) {
  const { results } = await db.prepare(
    `SELECT id, created_at, item, lot, type, amount_mkg, expiry_date, process, category
       FROM entries
      ORDER BY created_at ASC, id ASC`
  ).all();

  const summary = new Map();
  const today = startOfKstDay(new Date());

  for (const row of results || []) {
    const item = String(row.item || '').trim();
    const lot = String(row.lot || '').trim();
    const category = normalizeCategory(row.category) || 'GREEN';
    if (!item) continue;

    const key = [category, item, lot].join('||');
    if (!summary.has(key)) {
      summary.set(key, {
        name: item,
        lot,
        process: String(row.process || '').trim(),
        category,
        totalMkg: 0,
        lotDate: parseLotDate(lot)
      });
    }

    const itemSummary = summary.get(key);
    if (row.type === '입고' && String(row.process || '').trim()) {
      itemSummary.process = String(row.process || '').trim();
    }
    itemSummary.totalMkg += Number(row.amount_mkg || 0);
  }

  const result = {};
  for (const [key, item] of summary.entries()) {
    if (item.totalMkg <= STOCK_EPSILON_MKG) continue;

    let dDay = '-';
    let lotTimestamp = 9999999999999;
    if (item.lotDate) {
      const expiry = addYearsUtc(item.lotDate, item.category === 'ROASTED' ? 1 : 2);
      dDay = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
      lotTimestamp = item.lotDate.getTime();
    }

    result[key] = {
      name: item.name,
      lot: item.lot,
      process: item.process,
      category: item.category,
      total: mkgToKg(item.totalMkg),
      dDay,
      lotTimestamp
    };
  }
  return result;
}

async function recordEntry(db, payload) {
  const item = String(payload?.item || '').trim();
  const lot = String(payload?.lot || '').trim();
  const type = String(payload?.type || '').trim();
  const process = String(payload?.process || '').trim();
  const category = normalizeCategory(payload?.category) || 'GREEN';
  const amountMkg = kgToMkg(payload?.amount);
  const lotDate = parseLotDate(lot);

  if (!item || !lot || !type || amountMkg === 0) {
    throw badRequest('품목명, LOT, 구분, 수량을 확인하세요.');
  }
  if (!lotDate) {
    throw badRequest('LOT는 YY.MM.DD 형식의 실제 날짜로 입력하세요. 예) 26.06.01');
  }
  if (type === '입고' && amountMkg <= 0) {
    throw badRequest('입고 수량은 0보다 커야 합니다.');
  }
  if (type !== '입고' && amountMkg >= 0) {
    throw badRequest('차감 수량은 0보다 작아야 합니다.');
  }

  if (type !== '입고') {
    const current = await getCurrentStockMkg(db, item, lot, category);
    if (Math.abs(amountMkg) - current > STOCK_EPSILON_MKG) {
      throw badRequest(`현재고(${formatKg(mkgToKg(current))}kg)보다 많이 차감할 수 없습니다.`);
    }
  }

  const expiryDate = type === '입고'
    ? isoDate(addYearsUtc(lotDate, category === 'ROASTED' ? 1 : 2))
    : null;

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await db.prepare(
    `INSERT INTO entries (id, created_at, item, lot, type, amount_mkg, expiry_date, process, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, createdAt, item, lot, type, amountMkg, expiryDate, process, category).run();

  return { id, created_at: createdAt };
}

async function getCurrentStockMkg(db, item, lot, category) {
  const row = await db.prepare(
    `SELECT COALESCE(SUM(amount_mkg), 0) AS total_mkg
       FROM entries
      WHERE item = ? AND lot = ? AND category = ?`
  ).bind(item, lot, category).first();
  return Number(row?.total_mkg || 0);
}

async function getEntriesByItem(db, item, lot, category) {
  const params = [item, lot];
  let where = 'WHERE item = ? AND lot = ?';
  if (category) {
    where += ' AND category = ?';
    params.push(category);
  }

  const { results } = await db.prepare(
    `SELECT id, created_at, item, lot, type, amount_mkg, expiry_date, process, category
       FROM entries
       ${where}
      ORDER BY created_at DESC, id DESC`
  ).bind(...params).all();

  return (results || []).map((row) => ({
    id: row.id,
    date: formatKstDateShort(row.created_at),
    created_at: row.created_at,
    item: row.item,
    lot: row.lot,
    type: row.type,
    amount: mkgToKg(Number(row.amount_mkg || 0)),
    process: row.process || '',
    category: normalizeCategory(row.category) || 'GREEN'
  }));
}

async function deleteEntry(db, id) {
  if (!id) throw badRequest('삭제할 기록 ID가 필요합니다.');
  const existing = await db.prepare('SELECT id FROM entries WHERE id = ?').bind(id).first();
  if (!existing) throw notFound('삭제할 기록을 찾을 수 없습니다.');
  await db.prepare('DELETE FROM entries WHERE id = ?').bind(id).run();
}

async function loadPresets(db) {
  const { results } = await db.prepare('SELECT category, presets_json FROM presets').all();
  const output = { GREEN: [], ROASTED: [] };
  for (const row of results || []) {
    const category = normalizeCategory(row.category);
    if (!category) continue;
    try {
      const parsed = JSON.parse(row.presets_json || '[]');
      output[category] = Array.isArray(parsed) ? sanitizePresets(parsed) : [];
    } catch (_) {
      output[category] = [];
    }
  }
  return output;
}

async function savePresets(db, category, presets) {
  const clean = sanitizePresets(presets);
  await db.prepare(
    `INSERT INTO presets (category, presets_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(category) DO UPDATE SET presets_json = excluded.presets_json, updated_at = excluded.updated_at`
  ).bind(category, JSON.stringify(clean), new Date().toISOString()).run();
}

async function exportCsv(db) {
  const { results } = await db.prepare(
    `SELECT created_at, item, lot, type, amount_mkg, expiry_date, process, category
       FROM entries
      ORDER BY created_at ASC, id ASC`
  ).all();

  const headers = ['created_at', 'item', 'lot', 'type', 'amount_kg', 'expiry_date', 'process', 'category'];
  const lines = [headers.join(',')];
  for (const row of results || []) {
    lines.push([
      row.created_at,
      row.item,
      row.lot,
      row.type,
      mkgToKg(Number(row.amount_mkg || 0)),
      row.expiry_date || '',
      row.process || '',
      row.category
    ].map(csvCell).join(','));
  }

  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="thecup-inventory-${isoDate(new Date())}.csv"`,
      'cache-control': 'no-store'
    }
  });
}

function requireBasicAuth(request, env) {
  const password = String(env.APP_PASSWORD || '').trim();
  if (!password) return null;

  const user = String(env.APP_USER || DEFAULT_USER).trim() || DEFAULT_USER;
  const authorization = request.headers.get('authorization') || '';
  const [scheme, encoded] = authorization.split(' ');
  if (scheme !== 'Basic' || !encoded) return unauthorized();

  let decoded = '';
  try {
    decoded = atob(encoded);
  } catch (_) {
    return unauthorized();
  }

  const colon = decoded.indexOf(':');
  const givenUser = colon >= 0 ? decoded.slice(0, colon) : '';
  const givenPassword = colon >= 0 ? decoded.slice(colon + 1) : '';

  if (safeEqual(givenUser, user) && safeEqual(givenPassword, password)) return null;
  return unauthorized();
}

function unauthorized() {
  return new Response('인증이 필요합니다.', {
    status: 401,
    headers: {
      'www-authenticate': 'Basic realm="TheCup Inventory", charset="UTF-8"',
      ...SECURITY_HEADERS
    }
  });
}

function safeEqual(a, b) {
  const x = String(a);
  const y = String(b);
  if (x.length !== y.length) return false;
  let result = 0;
  for (let i = 0; i < x.length; i += 1) result |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return result === 0;
}

function normalizeCategory(value) {
  return String(value || '').toUpperCase() === 'ROASTED' ? 'ROASTED' :
         String(value || '').toUpperCase() === 'GREEN' ? 'GREEN' : '';
}

function kgToMkg(value) {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return 0;
  const rounded = Math.round(amount * STOCK_PRECISION);
  return Math.abs(rounded) <= STOCK_EPSILON_MKG ? 0 : rounded;
}

function mkgToKg(value) {
  const amount = Number(value || 0) / STOCK_PRECISION;
  return Math.round(amount * STOCK_PRECISION) / STOCK_PRECISION;
}

function formatKg(value) {
  return mkgToKg(kgToMkg(value)).toFixed(1);
}

function parseLotDate(lot) {
  const parts = String(lot || '').trim().split('.');
  if (parts.length !== 3) return null;

  const [yyText, mmText, ddText] = parts;
  if (!/^\d{2}$/.test(yyText) || !/^\d{1,2}$/.test(mmText) || !/^\d{1,2}$/.test(ddText)) return null;

  const yy = Number.parseInt(yyText, 10);
  const mm = Number.parseInt(mmText, 10);
  const dd = Number.parseInt(ddText, 10);
  const d = new Date(Date.UTC(2000 + yy, mm - 1, dd));
  if (d.getUTCFullYear() !== 2000 + yy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
  return d;
}

function addYearsUtc(date, years) {
  const d = new Date(date.getTime());
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d;
}

function startOfKstDay(date) {
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kst = new Date(date.getTime() + kstOffsetMs);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - kstOffsetMs);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatKstDateShort(iso) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return String(kst.getUTCFullYear()).slice(2) + '.' +
    String(kst.getUTCMonth() + 1).padStart(2, '0') + '.' +
    String(kst.getUTCDate()).padStart(2, '0');
}

function sanitizePresets(list) {
  return list
    .map((item) => ({
      name: String(item?.name || '').trim().slice(0, 120),
      process: String(item?.process || '').trim().slice(0, 60)
    }))
    .filter((item) => item.name)
    .slice(0, 80);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (_) {
    throw badRequest('JSON 형식이 올바르지 않습니다.');
  }
}

function csvCell(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  return error;
}
