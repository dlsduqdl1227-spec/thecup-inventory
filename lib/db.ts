import { env } from "cloudflare:workers";

export type StaffRole = "admin" | "employee" | "instructor";

export type SessionUser = {
  id: number;
  name: string;
  role: StaffRole;
};

type MonthlySeed = {
  year: number;
  month: number;
  revenue: number;
  expense: number;
  note?: string;
};

const monthlySeeds: MonthlySeed[] = [
  { year: 2024, month: 1, revenue: 11416000, expense: 388280 },
  { year: 2024, month: 2, revenue: 7211500, expense: 363585 },
  { year: 2024, month: 3, revenue: 7110000, expense: 444405 },
  { year: 2024, month: 4, revenue: 9209000, expense: 412275 },
  { year: 2024, month: 5, revenue: 10649500, expense: 345371 },
  { year: 2024, month: 6, revenue: 9783000, expense: 290670 },
  { year: 2024, month: 7, revenue: 10589000, expense: 199850 },
  { year: 2024, month: 8, revenue: 3074000, expense: 342510 },
  { year: 2024, month: 9, revenue: 7012150, expense: 228370 },
  { year: 2024, month: 10, revenue: 4517500, expense: 221740 },
  { year: 2024, month: 11, revenue: 3484000, expense: 364592 },
  { year: 2024, month: 12, revenue: 8540150, expense: 365734 },
  { year: 2025, month: 1, revenue: 954000, expense: 175035 },
  { year: 2025, month: 2, revenue: 2594500, expense: 476800 },
  { year: 2025, month: 3, revenue: 9315000, expense: 472226 },
  { year: 2025, month: 4, revenue: 6198000, expense: 387420 },
  { year: 2025, month: 5, revenue: 2526000, expense: 328800 },
  { year: 2025, month: 6, revenue: 2910750, expense: 109700, note: "대회 연습·예선 기간" },
  { year: 2025, month: 7, revenue: 3412000, expense: 108000 },
  { year: 2025, month: 8, revenue: 3869000, expense: 187200 },
  { year: 2025, month: 9, revenue: 3408000, expense: 109600 },
  { year: 2025, month: 10, revenue: 7370000, expense: 109600 },
  { year: 2025, month: 11, revenue: 7050000, expense: 73600, note: "카페쇼" },
  { year: 2025, month: 12, revenue: 3593000, expense: 235471 },
  { year: 2026, month: 1, revenue: 2140000, expense: 311488 },
  { year: 2026, month: 2, revenue: 7990000, expense: 110400 },
  { year: 2026, month: 3, revenue: 4915000, expense: 206200 },
  { year: 2026, month: 4, revenue: 5104000, expense: 94500 },
  { year: 2026, month: 5, revenue: 1150000, expense: 37600 },
  { year: 2026, month: 6, revenue: 1120000, expense: 201220, note: "대회 시즌" },
  { year: 2026, month: 7, revenue: 2650000, expense: 46000, note: "7월 24일까지 집계" },
  { year: 2026, month: 8, revenue: 0, expense: 0 },
  { year: 2026, month: 9, revenue: 0, expense: 0 },
  { year: 2026, month: 10, revenue: 0, expense: 0 },
  { year: 2026, month: 11, revenue: 0, expense: 0, note: "카페쇼 예정" },
  { year: 2026, month: 12, revenue: 0, expense: 0 },
];

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone_hash TEXT NOT NULL UNIQUE,
    phone_last4 TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','employee','instructor')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    staff_id INTEGER NOT NULL REFERENCES staff(id),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS monthly_finance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    revenue INTEGER NOT NULL DEFAULT 0,
    baseline_expense INTEGER NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    UNIQUE(year, month)
  )`,
  `CREATE TABLE IF NOT EXISTS finance_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL CHECK(kind IN ('income','expense')),
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    transaction_date TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    inventory_movement_id INTEGER,
    created_by INTEGER NOT NULL REFERENCES staff(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL CHECK(category IN ('green','roasted','gusto','milk','other')),
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    reorder_level REAL NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER REFERENCES staff(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES inventory_items(id),
    movement_type TEXT NOT NULL CHECK(movement_type IN ('in','out','adjust','roast_in','roast_out')),
    quantity REAL NOT NULL,
    movement_date TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    class_name TEXT NOT NULL DEFAULT '',
    cost_amount INTEGER NOT NULL DEFAULT 0,
    receipt_key TEXT,
    created_by INTEGER NOT NULL REFERENCES staff(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS roasting_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bean_name TEXT NOT NULL,
    origin TEXT NOT NULL DEFAULT '',
    process TEXT NOT NULL DEFAULT '',
    batch_weight REAL NOT NULL,
    charge_temp REAL NOT NULL,
    yellowing_seconds INTEGER NOT NULL,
    first_crack_seconds INTEGER NOT NULL,
    drop_temp REAL NOT NULL,
    total_seconds INTEGER NOT NULL,
    development_seconds INTEGER NOT NULL,
    development_ratio REAL NOT NULL,
    gas_notes TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL REFERENCES staff(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS roasting_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL REFERENCES roasting_profiles(id) ON DELETE CASCADE,
    seconds INTEGER NOT NULL,
    bean_temp REAL NOT NULL,
    gas_pressure REAL NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER REFERENCES staff(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL DEFAULT '',
    detail TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    identifier_hash TEXT PRIMARY KEY,
    window_start TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0
  )`,
  "CREATE INDEX IF NOT EXISTS sessions_staff_idx ON sessions(staff_id)",
  "CREATE INDEX IF NOT EXISTS movements_item_date_idx ON inventory_movements(item_id, movement_date)",
  "CREATE INDEX IF NOT EXISTS finance_date_idx ON finance_transactions(transaction_date)",
  "CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_logs(created_at)",
  "CREATE INDEX IF NOT EXISTS roasting_points_profile_idx ON roasting_points(profile_id, seconds)",
];

let initialization: Promise<void> | null = null;

export function getD1(): D1Database {
  const database = (env as unknown as { DB?: D1Database }).DB;
  if (!database) throw new Error("데이터베이스 연결이 준비되지 않았습니다.");
  return database;
}

export function getReceiptsBucket(): R2Bucket {
  const bucket = (env as unknown as { RECEIPTS?: R2Bucket }).RECEIPTS;
  if (!bucket) throw new Error("영수증 저장소 연결이 준비되지 않았습니다.");
  return bucket;
}

export async function ensureDatabase(): Promise<void> {
  if (!initialization) {
    initialization = initializeDatabase().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  await initialization;
}

async function initializeDatabase(): Promise<void> {
  const db = getD1();
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));

  const financeSeedStatements = monthlySeeds.map((row) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO monthly_finance
          (year, month, revenue, baseline_expense, note, source)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        row.year,
        row.month,
        row.revenue,
        row.expense,
        row.note ?? "",
        `더컵에듀 연매출 분석표 KPI - ${row.year}년 연매출.csv`,
      ),
  );

  const inventorySeedStatements = [
    ["milk", "수업용 우유", "팩", 8],
    ["gusto", "구스토 원두", "g", 1000],
    ["roasted", "더컵 로스팅 원두", "g", 1000],
    ["green", "로스팅용 생두", "kg", 5],
  ].map(([category, name, unit, reorder]) =>
    db
      .prepare(
        `INSERT INTO inventory_items (category, name, unit, quantity, reorder_level)
         SELECT ?, ?, ?, 0, ?
         WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE name = ?)`,
      )
      .bind(category, name, unit, reorder, name),
  );

  await db.batch([...financeSeedStatements, ...inventorySeedStatements]);
}

export async function audit(
  actorId: number | null,
  action: string,
  entityType: string,
  entityId = "",
  detail = "",
): Promise<void> {
  const db = getD1();
  await db
    .prepare(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, detail)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(actorId, action, entityType, entityId, detail.slice(0, 500))
    .run();
}
