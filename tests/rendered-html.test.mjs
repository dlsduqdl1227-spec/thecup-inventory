import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the branded monochrome application instead of the starter preview", async () => {
  const [
    page,
    layout,
    app,
    styles,
    hosting,
    packageJson,
    socialImage,
    thecupLogo,
    coffeeLogo,
  ] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/components/EduSystemApp.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL(".openai/hosting.json", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("public/og.png", root)),
    readFile(new URL("public/brand/thecup-edu.jpg", root)),
    readFile(new URL("public/brand/monthly-coffee.png", root)),
  ]);

  assert.match(page, /EduSystemApp/);
  assert.match(layout, /더컵에듀 시스템/);
  assert.match(layout, /lang="ko"/);
  assert.match(app, /brand\/thecup-edu\.jpg/);
  assert.match(app, /brand\/monthly-coffee\.png/);
  assert.match(app, /수업 사용 기록/);
  assert.match(app, /로스팅 프로파일/);
  assert.match(app, /로스팅\(원두\)/);
  assert.match(app, /새 품목 직접 입고/);
  assert.match(app, /create_item_with_stock/);
  assert.doesNotMatch(app, /더컵 볶은 원두/);
  assert.match(app, /title="매출 내역"/);
  assert.match(app, /\{quarter\}분기/);
  assert.doesNotMatch(app, /숫자가 말해주는 오늘의 운영|Q\{quarter\}/);
  assert.match(app, /직원 전용/);
  assert.doesNotMatch(app, /OPERATIONS, REFINED|개월 매출 이관|단계 권한 분리/);
  assert.match(app, /Asia\/Seoul/);
  assert.match(app, /capture="environment"/);
  assert.doesNotMatch(app, /event\.currentTarget\.reset\(\)/);
  assert.match(styles, /--ink: #111111/);
  assert.match(styles, /\.brand-lockup/);
  assert.match(styles, /\.brand-logo-coffee img/);
  assert.match(styles, /Pretendard Variable/);
  assert.doesNotMatch(styles, /#17483b|#d9613e|#f3f0e7/i);
  assert.doesNotMatch(`${page}\n${layout}\n${app}`, /codex-preview|Your site is taking shape|SkeletonPreview/i);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.equal(socialImage.readUInt32BE(16), 1536);
  assert.equal(socialImage.readUInt32BE(20), 1024);
  assert.equal(thecupLogo.readUInt16BE(0), 0xffd8);
  assert.equal(coffeeLogo.readUInt32BE(16), 284);
  assert.equal(coffeeLogo.readUInt32BE(20), 284);

  const bindings = JSON.parse(hosting);
  assert.equal(bindings.d1, "DB");
  assert.equal(bindings.r2, null);
});

test("migration covers identity, finance, inventory, receipts and roasting", async () => {
  const migration = await readFile(
    new URL("drizzle/0000_mixed_night_nurse.sql", root),
    "utf8",
  );
  for (const table of [
    "staff",
    "sessions",
    "monthly_finance",
    "finance_transactions",
    "inventory_items",
    "inventory_movements",
    "roasting_profiles",
    "roasting_points",
    "audit_logs",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE \\\`${table}\\\``));
  }
  assert.match(migration, /receipt_key/);
  assert.match(migration, /development_ratio/);
  assert.match(migration, /inventory_nonnegative_update/);
});

test("guards critical identity, date and persistence edge cases", async () => {
  const [http, database, auth, bootstrap, staff, finance, inventory, milkPurchase, receiptStorage, roasting, permissionsMigration, legacyMigration, dashboard] = await Promise.all([
    readFile(new URL("lib/http.ts", root), "utf8"),
    readFile(new URL("lib/db.ts", root), "utf8"),
    readFile(new URL("lib/auth.ts", root), "utf8"),
    readFile(new URL("app/api/auth/bootstrap/route.ts", root), "utf8"),
    readFile(new URL("app/api/staff/route.ts", root), "utf8"),
    readFile(new URL("app/api/finance/route.ts", root), "utf8"),
    readFile(new URL("app/api/inventory/route.ts", root), "utf8"),
    readFile(new URL("app/api/inventory/milk-purchase/route.ts", root), "utf8"),
    readFile(new URL("lib/receipt-storage.ts", root), "utf8"),
    readFile(new URL("app/api/roasting/route.ts", root), "utf8"),
    readFile(new URL("drizzle/0001_melted_scalphunter.sql", root), "utf8"),
    readFile(new URL("drizzle/0005_clean_red_skull.sql", root), "utf8"),
    readFile(new URL("app/api/dashboard/route.ts", root), "utf8"),
  ]);

  assert.match(http, /getUTCDate\(\) !== day/);
  assert.match(http, /inventory_quantity_negative/);
  assert.match(database, /CREATE TRIGGER IF NOT EXISTS inventory_nonnegative_update/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS receipt_files/);
  assert.match(auth, /requirePermission/);
  assert.match(bootstrap, /WHERE NOT EXISTS \(SELECT 1 FROM staff\)/);
  assert.match(staff, /마지막 활성 관리자의 권한/);
  assert.match(staff, /can_finance END AS canFinance/);
  assert.match(finance, /requirePermission\(request, "finance"\)/);
  assert.match(inventory, /requirePermission\(request, "inventory"\)/);
  assert.match(inventory, /create_item_with_stock/);
  assert.match(inventory, /initialQuantity/);
  assert.match(inventory, /DELETE FROM inventory_items/);
  assert.match(milkPurchase, /INSERT INTO receipt_files/);
  assert.match(milkPurchase, /makeRoomForReceipt/);
  assert.match(receiptStorage, /receipt_deleted_at = CURRENT_TIMESTAMP/);
  assert.match(receiptStorage, /DELETE FROM receipt_files/);
  assert.match(roasting, /requirePermission\(request, "roasting"\)/);
  assert.match(roasting, /sqlite_sequence WHERE name = 'roasting_profiles'/);
  assert.match(permissionsMigration, /ADD `can_finance`/);
  assert.match(permissionsMigration, /WHERE `role` IN \('admin', 'employee'\)/);
  assert.match(legacyMigration, /ADD `legacy_key`/);
  assert.match(database, /readLegacyInventoryEntries/);
  assert.match(database, /summarizeLegacyInventory/);
  assert.match(dashboard, /legacyInventoryCount/);
  assert.match(dashboard, /기존 재고 기록/);
  assert.match(dashboard, /소비기한/);
  assert.doesNotMatch(dashboard, /`유효 \$\{entry\.expiry_date\}`/);
});
