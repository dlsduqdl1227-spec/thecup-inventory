"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Role = "admin" | "employee" | "instructor";
type TabKey = "dashboard" | "record" | "inventory" | "finance" | "roasting" | "staff";

type User = {
  id: number;
  name: string;
  role: Role;
  canFinance: boolean;
  canInventory: boolean;
  canRoasting: boolean;
};

type FinanceMonth = {
  year: number;
  month: number;
  revenue: number;
  expense: number;
  profit: number;
  note: string;
  source: string;
};

type InventoryItem = {
  id: number;
  category: "green" | "roasted" | "gusto" | "milk" | "other";
  name: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  lowStock: number;
};

type Movement = {
  id: number;
  movementType: string;
  quantity: number;
  movementDate: string;
  note: string;
  className: string;
  costAmount: number;
  hasReceipt: number;
  receiptArchived: number;
  itemName: string;
  unit: string;
  createdByName: string;
};

type FinanceTransaction = {
  id: number;
  kind: "income" | "expense";
  category: string;
  amount: number;
  transactionDate: string;
  description: string;
  createdByName: string;
};

type RoastPoint = {
  seconds: number;
  beanTemp: number;
  gasPressure: number;
};

type RoastProfile = {
  id: number;
  beanName: string;
  origin: string;
  process: string;
  batchWeight: number;
  chargeTemp: number;
  yellowingSeconds: number;
  firstCrackSeconds: number;
  dropTemp: number;
  totalSeconds: number;
  developmentSeconds: number;
  developmentRatio: number;
  gasNotes: string;
  notes: string;
  createdByName: string;
  points: RoastPoint[];
  ror: {
    drying: number;
    maillard: number;
    development: number;
  };
};

type DashboardData = {
  user: User;
  finance: FinanceMonth[];
  inventory: InventoryItem[];
  movements: Movement[];
  transactions: FinanceTransaction[];
  profiles: Array<Omit<RoastProfile, "points" | "ror">>;
};

type StaffMember = {
  id: number;
  name: string;
  phoneLast4: string;
  role: Role;
  canFinance: number;
  canInventory: number;
  canRoasting: number;
  active: number;
  createdAt: string;
};

type AuditLog = {
  id: number;
  action: string;
  entityType: string;
  detail: string;
  createdAt: string;
  actorName: string | null;
};

const today = currentKoreanDate();
const won = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

const roleLabel: Record<Role, string> = {
  admin: "관리자",
  employee: "정규직원",
  instructor: "시간강사",
};

const categoryLabel: Record<InventoryItem["category"], string> = {
  green: "생두",
  roasted: "더컵 볶은 원두",
  gusto: "구스토 원두",
  milk: "우유",
  other: "기타",
};

const movementLabel: Record<string, string> = {
  in: "입고",
  out: "사용",
  adjust: "실사 조정",
  roast_in: "볶은 원두 입고",
  roast_out: "생두 투입",
};

type PermissionField = "canFinance" | "canInventory" | "canRoasting";

const navItems: Array<{
  key: TabKey;
  label: string;
  short: string;
  permission?: PermissionField;
  adminOnly?: boolean;
}> = [
  { key: "dashboard", label: "매출 대시보드", short: "대시보드", permission: "canFinance" },
  { key: "record", label: "수업 사용 기록", short: "수업 기록" },
  { key: "inventory", label: "재고 관리", short: "재고", permission: "canInventory" },
  { key: "finance", label: "매출 · 비용", short: "매출", permission: "canFinance" },
  { key: "roasting", label: "로스팅 프로파일", short: "로스팅", permission: "canRoasting" },
  { key: "staff", label: "직원 · 권한", short: "직원", adminOnly: true },
];

const permissionOptions: Array<{
  field: PermissionField;
  label: string;
  description: string;
}> = [
  { field: "canFinance", label: "매출", description: "대시보드와 수입·지출" },
  { field: "canInventory", label: "재고", description: "전체 재고와 로스팅 배치" },
  { field: "canRoasting", label: "로스팅", description: "프로파일 열람" },
];

function allowedNavigation(user: User) {
  return navItems.filter((item) => {
    if (item.adminOnly) return user.role === "admin";
    if (!item.permission) return true;
    return user.role === "admin" || user[item.permission];
  });
}

function initialTab(user: User): TabKey {
  return allowedNavigation(user)[0]?.key ?? "record";
}

export function EduSystemApp() {
  const [authState, setAuthState] = useState<{
    loading: boolean;
    bootstrapRequired: boolean;
    user: User | null;
  }>({ loading: true, bootstrapRequired: false, user: null });
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  const loadAuth = useCallback(async () => {
    try {
      const status = await requestJson<{ bootstrapRequired: boolean; user: User | null }>(
        "/api/auth/status",
      );
      setAuthState({ loading: false, ...status });
      if (status.user) setActiveTab(initialTab(status.user));
    } catch (error) {
      setAuthState({ loading: false, bootstrapRequired: false, user: null });
      setToast({ kind: "error", message: errorMessage(error) });
    }
  }, []);

  const refreshData = useCallback(async () => {
    if (!authState.user) return;
    try {
      const nextData = await requestJson<DashboardData>("/api/dashboard");
      setData(nextData);
    } catch (error) {
      setToast({ kind: "error", message: errorMessage(error) });
    }
  }, [authState.user]);

  useEffect(() => {
    // Initial remote session lookup; the state change happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAuth();
  }, [loadAuth]);

  useEffect(() => {
    // Refresh authenticated server data when the signed-in user changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleAuth(endpoint: string, formData: FormData) {
    setBusy(true);
    try {
      const body = Object.fromEntries(formData.entries());
      const result = await requestJson<{ user: User }>(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      setAuthState({ loading: false, bootstrapRequired: false, user: result.user });
      setActiveTab(initialTab(result.user));
      setToast({ kind: "ok", message: `${result.user.name}님, 환영합니다.` });
    } catch (error) {
      setToast({ kind: "error", message: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await requestJson("/api/auth/logout", { method: "POST" });
      setData(null);
      setAuthState((current) => ({ ...current, user: null }));
    } catch (error) {
      setToast({ kind: "error", message: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  if (authState.loading) {
    return (
      <main className="loading-screen" aria-live="polite">
        <BrandMark />
        <div className="loading-line" />
        <p>운영 데이터를 안전하게 불러오는 중입니다.</p>
      </main>
    );
  }

  if (!authState.user) {
    return (
      <>
        <AuthScreen
          bootstrapRequired={authState.bootstrapRequired}
          busy={busy}
          onSubmit={handleAuth}
        />
        {toast && <Toast toast={toast} />}
      </>
    );
  }

  const user = authState.user;
  const allowedNav = allowedNavigation(user);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <BrandMark />
        <div className="sidebar-rule" />
        <nav className="side-nav" aria-label="주요 메뉴">
          {allowedNav.map((item, index) => (
            <button
              type="button"
              key={item.key}
              className={activeTab === item.key ? "nav-item active" : "nav-item"}
              onClick={() => setActiveTab(item.key)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className={`role-dot ${user.role}`} />
          <div>
            <strong>{user.name}</strong>
            <small>{roleLabel[user.role]}</small>
          </div>
          <button type="button" onClick={logout} disabled={busy}>
            로그아웃
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="mobile-header">
          <BrandMark compact />
          <div className="mobile-user">
            <strong>{user.name}</strong>
            <span>{roleLabel[user.role]}</span>
          </div>
        </header>

        {!data ? (
          <section className="page-section loading-panel" aria-live="polite">
            <div className="loading-line" />
            <p>대시보드를 준비하고 있습니다.</p>
          </section>
        ) : (
          <>
            {activeTab === "dashboard" && <DashboardView data={data} />}
            {activeTab === "record" && (
              <RecordView
                data={data}
                onUpdated={refreshData}
                notify={setToast}
              />
            )}
            {activeTab === "inventory" && (
              <InventoryView
                data={data}
                onUpdated={refreshData}
                notify={setToast}
              />
            )}
            {activeTab === "finance" && (
              <FinanceView
                data={data}
                onUpdated={refreshData}
                notify={setToast}
              />
            )}
            {activeTab === "roasting" && (
              <RoastingView user={user} notify={setToast} />
            )}
            {activeTab === "staff" && (
              <StaffView notify={setToast} />
            )}
          </>
        )}
      </main>

      <nav className="bottom-nav" aria-label="모바일 메뉴">
        {allowedNav.map((item) => (
          <button
            type="button"
            key={item.key}
            className={activeTab === item.key ? "active" : ""}
            onClick={() => setActiveTab(item.key)}
          >
            {item.short}
          </button>
        ))}
      </nav>
      {toast && <Toast toast={toast} />}
    </div>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={compact ? "brand-lockup compact" : "brand-lockup"}
      role="img"
      aria-label="더컵에듀와 월간커피 공동 브랜드"
    >
      <span className="brand-logo-crop brand-logo-thecup" aria-hidden="true">
        {/* vinext의 이미지 래퍼 대신 정적 브랜드 자산을 그대로 전달합니다. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/thecup-edu.jpg"
          alt=""
          width={720}
          height={720}
        />
      </span>
      <span className="brand-logo-divider" aria-hidden="true" />
      <span className="brand-logo-crop brand-logo-coffee" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/monthly-coffee.png"
          alt=""
          width={284}
          height={284}
        />
      </span>
    </div>
  );
}

function AuthScreen({
  bootstrapRequired,
  busy,
  onSubmit,
}: {
  bootstrapRequired: boolean;
  busy: boolean;
  onSubmit: (endpoint: string, data: FormData) => Promise<void>;
}) {
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <BrandMark />
        <div className="auth-headline">
          <span>STAFF ACCESS</span>
          <h1>더컵에듀<br />운영 시스템</h1>
          <p>
            이름과 등록된 휴대폰 번호로 로그인하면 담당 업무에 필요한 메뉴만 표시됩니다.
          </p>
        </div>
        <p className="auth-help">계정 등록과 메뉴 권한은 관리자에게 요청하세요.</p>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <span className="eyebrow">{bootstrapRequired ? "FIRST SETUP" : "STAFF SIGN IN"}</span>
          <h2>{bootstrapRequired ? "초기 관리자 등록" : "직원 로그인"}</h2>
          <p>
            {bootstrapRequired
              ? "배포 시 전달받은 초기 관리자 코드와 본인 정보를 입력해 주세요."
              : "관리자가 등록한 이름과 휴대폰 번호로 로그인하세요."}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit(
                bootstrapRequired ? "/api/auth/bootstrap" : "/api/auth/login",
                new FormData(event.currentTarget),
              );
            }}
          >
            <Field label="이름">
              <input name="name" autoComplete="name" placeholder="홍길동" required maxLength={40} />
            </Field>
            <Field label="휴대폰 번호">
              <input
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="010-0000-0000"
                required
              />
            </Field>
            {bootstrapRequired && (
              <Field label="초기 관리자 코드">
                <input
                  name="code"
                  type="password"
                  autoComplete="one-time-code"
                  placeholder="배포 시 전달된 코드"
                  required
                />
              </Field>
            )}
            <button className="primary-button auth-submit" disabled={busy}>
              {busy ? "확인 중…" : bootstrapRequired ? "관리자 등록하고 시작" : "로그인"}
            </button>
          </form>
          <div className="security-note">
            <span>보안</span>
            휴대폰 번호 원문은 저장하지 않으며, 등록된 직원만 접근할 수 있습니다.
          </div>
        </div>
      </section>
    </main>
  );
}

function DashboardView({ data }: { data: DashboardData }) {
  const availableYears = [...new Set(data.finance.map((row) => row.year))].sort((a, b) => b - a);
  const latestYear = availableYears[0] ?? new Date().getFullYear();
  const [year, setYear] = useState(latestYear);
  const rows = data.finance.filter((row) => row.year === year);
  const activeRows = rows.filter((row) => row.revenue !== 0 || row.expense !== 0);
  const totalRevenue = sum(activeRows.map((row) => row.revenue));
  const totalProfit = sum(activeRows.map((row) => row.profit));
  const margin = totalRevenue ? (totalProfit / totalRevenue) * 100 : 0;
  const lastMonth = Math.max(0, ...activeRows.map((row) => row.month));
  const priorRows = data.finance.filter((row) => row.year === year - 1 && row.month <= lastMonth);
  const priorRevenue = sum(priorRows.map((row) => row.revenue));
  const yoy = priorRevenue ? ((totalRevenue - priorRevenue) / priorRevenue) * 100 : null;
  const best = activeRows.reduce<FinanceMonth | null>(
    (current, row) => (!current || row.revenue > current.revenue ? row : current),
    null,
  );
  const lowStock = data.inventory.filter((item) => item.lowStock);

  return (
    <section className="page-section">
      <PageHeader
        eyebrow="MANAGEMENT OVERVIEW"
        title="숫자가 말해주는 오늘의 운영"
        description="CSV 이관 자료와 신규 입력 내역을 합산한 월별 경영 현황입니다."
        action={
          <select value={year} onChange={(event) => setYear(Number(event.target.value))} aria-label="분석 연도">
            {availableYears.map((value) => <option key={value} value={value}>{value}년</option>)}
          </select>
        }
      />

      <div className="kpi-grid">
        <KpiCard label={`${year} 누적 매출`} value={won.format(totalRevenue)} meta={`${activeRows.length}개월 집계`} tone="dark" />
        <KpiCard label="누적 순익" value={won.format(totalProfit)} meta={`순익률 ${margin.toFixed(1)}%`} />
        <KpiCard
          label="전년 동기 대비"
          value={yoy === null ? "비교 없음" : `${yoy >= 0 ? "+" : ""}${yoy.toFixed(1)}%`}
          meta={lastMonth ? `${year - 1}년 1–${lastMonth}월 대비` : "집계 전"}
          tone={yoy !== null && yoy < 0 ? "alert" : "green"}
        />
        <KpiCard label="최고 매출 월" value={best ? `${best.month}월` : "—"} meta={best ? won.format(best.revenue) : "데이터 없음"} />
      </div>

      <div className="dashboard-grid">
        <article className="panel revenue-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">MONTHLY PERFORMANCE</span>
              <h3>월별 매출과 순익</h3>
            </div>
            <div className="chart-legend"><span className="revenue-dot" />매출 <span className="profit-dot" />순익</div>
          </div>
          <FinanceBarChart rows={rows} />
          <div className="chart-footnote">
            {year === 2026 ? "2026년 7월은 7월 24일까지 입력된 CSV 기준입니다." : "원본 CSV의 월별 합계와 순익을 기준으로 집계했습니다."}
          </div>
        </article>

        <article className="panel signal-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">OPERATING SIGNALS</span>
              <h3>지금 확인할 것</h3>
            </div>
          </div>
          <div className="signal-list">
            <div className={lowStock.length ? "signal warn" : "signal good"}>
              <span>재고</span>
              <strong>{lowStock.length ? `${lowStock.length}개 품목 확인 필요` : "적정 수준"}</strong>
              <p>{lowStock.length ? lowStock.map((item) => item.name).join(", ") : "최소 재고선 아래인 품목이 없습니다."}</p>
            </div>
            <div className="signal">
              <span>월평균 매출</span>
              <strong>{activeRows.length ? won.format(totalRevenue / activeRows.length) : "—"}</strong>
              <p>실제 입력이 있는 월만 평균에 포함했습니다.</p>
            </div>
            <div className="signal">
              <span>최근 영수증 반영</span>
              <strong>{data.movements.find((movement) => movement.hasReceipt)?.movementDate ?? "등록 전"}</strong>
              <p>우유 구매 비용은 등록 즉시 월 순익에서 차감됩니다.</p>
            </div>
          </div>
        </article>
      </div>

      <div className="quarter-grid">
        {[1, 2, 3, 4].map((quarter) => {
          const quarterRows = rows.filter((row) => Math.ceil(row.month / 3) === quarter);
          const activeQuarter = quarterRows.filter((row) => row.revenue || row.expense);
          const average = activeQuarter.length ? sum(activeQuarter.map((row) => row.revenue)) / activeQuarter.length : 0;
          return (
            <article className="quarter-card" key={quarter}>
              <span>Q{quarter}</span>
              <strong>{average ? won.format(average) : "집계 전"}</strong>
              <small>월평균 매출 · {activeQuarter.length}/3개월</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FinanceBarChart({ rows }: { rows: FinanceMonth[] }) {
  const max = Math.max(1, ...rows.map((row) => row.revenue));
  return (
    <div className="bar-chart" role="img" aria-label="월별 매출과 순익 막대 그래프">
      {rows.map((row) => {
        const revenueHeight = (row.revenue / max) * 100;
        const profitHeight = (Math.max(0, row.profit) / max) * 100;
        return (
          <div className="bar-column" key={row.month}>
            <div className="bar-stage" title={`${row.month}월 매출 ${won.format(row.revenue)}, 순익 ${won.format(row.profit)}`}>
              <span className="bar revenue" style={{ height: `${revenueHeight}%` }} />
              <span className="bar profit" style={{ height: `${profitHeight}%` }} />
            </div>
            <span className="bar-label">{row.month}</span>
          </div>
        );
      })}
    </div>
  );
}

function RecordView({
  data,
  onUpdated,
  notify,
}: {
  data: DashboardData;
  onUpdated: () => Promise<void>;
  notify: (toast: { kind: "ok" | "error"; message: string }) => void;
}) {
  const [busy, setBusy] = useState<"milk" | "class" | null>(null);
  const beanItems = data.inventory.filter((item) => ["roasted", "gusto"].includes(item.category));
  const instructor = data.user.role === "instructor";

  async function submitMilk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("milk");
    try {
      const form = new FormData(event.currentTarget);
      const source = form.get("receipt");
      if (!(source instanceof File) || !source.size) throw new Error("영수증 사진을 선택해 주세요.");
      const optimized = await optimizeReceipt(source);
      form.set("receipt", optimized, optimized.name);
      const result = await requestJson<{ id: number; archivedReceipts: number }>(
        "/api/inventory/milk-purchase",
        { method: "POST", body: form },
      );
      event.currentTarget.reset();
      await onUpdated();
      notify({
        kind: "ok",
        message: result.archivedReceipts
          ? `우유 구매를 반영하고 오래된 영수증 ${result.archivedReceipts}건을 자동 정리했습니다.`
          : "우유 입고·비용·영수증이 함께 반영됐습니다.",
      });
    } catch (error) {
      notify({ kind: "error", message: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function submitClassUse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("class");
    try {
      const form = new FormData(event.currentTarget);
      await requestJson("/api/inventory/class-use", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      event.currentTarget.reset();
      const dateInput = event.currentTarget.elements.namedItem("movementDate") as HTMLInputElement | null;
      if (dateInput) dateInput.value = today;
      await onUpdated();
      notify({ kind: "ok", message: "수업 사용량이 재고에서 차감됐습니다." });
    } catch (error) {
      notify({ kind: "error", message: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="page-section">
      <PageHeader
        eyebrow={instructor ? "INSTRUCTOR WORKSPACE" : "CLASS CONSUMPTION"}
        title={instructor ? `${data.user.name}님의 수업 기록` : "수업별 사용량 기록"}
        description="우유 구매는 영수증과 비용까지, 수업 사용량은 원두와 우유 재고까지 한 번에 반영됩니다."
      />

      <div className="stock-strip">
        {data.inventory
          .filter((item) => ["milk", "roasted", "gusto"].includes(item.category))
          .map((item) => (
            <div key={item.id}>
              <span>{item.name}</span>
              <strong>{number.format(item.quantity)}<small>{item.unit}</small></strong>
              {item.lowStock ? <em>보충 필요</em> : <em className="ok">사용 가능</em>}
            </div>
          ))}
      </div>

      <div className="form-grid">
        <article className="panel form-panel">
          <div className="form-title">
            <span className="step-number">01</span>
            <div><h3>우유 구매 등록</h3><p>영수증은 긴 변 1,600px 이하로 자동 최적화됩니다.</p></div>
          </div>
          <form onSubmit={submitMilk}>
            <div className="two-columns">
              <Field label="구매일">
                <input name="movementDate" type="date" defaultValue={today} required />
              </Field>
              <Field label="수량 (팩)">
                <input name="quantity" type="number" min="0.1" step="0.1" placeholder="16" required />
              </Field>
            </div>
            <Field label="결제 금액">
              <div className="input-suffix"><input name="amount" type="number" min="1" step="1" placeholder="36800" required /><span>원</span></div>
            </Field>
            <Field label="영수증 사진">
              <label className="file-drop">
                <input
                  name="receipt"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  required
                />
                <span>사진 촬영 또는 파일 선택</span>
                <small>JPG · PNG · WebP / 자동 압축 저장</small>
              </label>
            </Field>
            <Field label="메모 (선택)">
              <input name="note" placeholder="구매처 또는 수업명" maxLength={300} />
            </Field>
            <button className="primary-button" disabled={busy === "milk"}>
              {busy === "milk" ? "이미지 최적화 중…" : "구매 내역 반영"}
            </button>
          </form>
        </article>

        <article className="panel form-panel">
          <div className="form-title">
            <span className="step-number">02</span>
            <div><h3>수업 사용량 기록</h3><p>입력한 수량은 현재 재고에서 바로 차감됩니다.</p></div>
          </div>
          <form onSubmit={submitClassUse}>
            <Field label="수업명">
              <input name="className" placeholder="남부센터 바리스타 오전반" required maxLength={100} />
            </Field>
            <div className="two-columns">
              <Field label="수업일">
                <input name="movementDate" type="date" defaultValue={today} required />
              </Field>
              <Field label="우유 사용 (팩)">
                <input name="milkQuantity" type="number" min="0" step="0.1" defaultValue="0" />
              </Field>
            </div>
            <div className="two-columns">
              <Field label="사용 원두">
                <select name="beanItemId" defaultValue={beanItems[0]?.id ?? ""}>
                  {beanItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </Field>
              <Field label="원두 사용 (g)">
                <input name="beanQuantity" type="number" min="0" step="1" defaultValue="0" />
              </Field>
            </div>
            <Field label="메모 (선택)">
              <input name="note" placeholder="인원, 특이사항" maxLength={300} />
            </Field>
            <button className="primary-button" disabled={busy === "class"}>
              {busy === "class" ? "기록 중…" : "수업 사용량 반영"}
            </button>
          </form>
        </article>
      </div>

      <article className="panel table-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">RECENT ACTIVITY</span><h3>{instructor ? "내 최근 기록" : "최근 수업·구매 기록"}</h3></div>
        </div>
        <MovementTable movements={data.movements.filter((movement) => movement.className || movement.costAmount)} />
      </article>
    </section>
  );
}

function InventoryView({
  data,
  onUpdated,
  notify,
}: {
  data: DashboardData;
  onUpdated: () => Promise<void>;
  notify: (toast: { kind: "ok" | "error"; message: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const greenItems = data.inventory.filter((item) => item.category === "green");
  const roastedItems = data.inventory.filter((item) => item.category === "roasted");

  async function submitJson(event: FormEvent<HTMLFormElement>, endpoint: string, success: string) {
    event.preventDefault();
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      await requestJson(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      event.currentTarget.reset();
      await onUpdated();
      notify({ kind: "ok", message: success });
    } catch (error) {
      notify({ kind: "error", message: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-section">
      <PageHeader
        eyebrow="STOCK CONTROL"
        title="재고 흐름을 한눈에"
        description="볶기 전 생두, 더컵 볶은 원두, 구스토 원두와 우유의 입고·사용량을 관리합니다."
      />

      <div className="inventory-grid">
        {data.inventory.map((item) => (
          <article className={item.lowStock ? "inventory-card low" : "inventory-card"} key={item.id}>
            <span className="category-tag">{categoryLabel[item.category]}</span>
            <h3>{item.name}</h3>
            <strong>{number.format(item.quantity)}<small>{item.unit}</small></strong>
            <div className="stock-meter"><span style={{ width: `${Math.min(100, item.reorderLevel ? (item.quantity / (item.reorderLevel * 2)) * 100 : 100)}%` }} /></div>
            <p>최소 재고 {number.format(item.reorderLevel)}{item.unit}</p>
          </article>
        ))}
      </div>

      <div className="three-panel-grid">
        <article className="panel compact-form-panel">
          <div className="form-title"><span className="step-number">01</span><div><h3>입출고 · 실사</h3><p>일반 재고 변동</p></div></div>
          <form onSubmit={(event) => submitJson(event, "/api/inventory", "재고 변동이 반영됐습니다.")}>
            <input type="hidden" name="action" value="movement" />
            <Field label="품목">
              <select name="itemId" required>{data.inventory.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            </Field>
            <div className="two-columns">
              <Field label="작업">
                <select name="movementType"><option value="in">입고</option><option value="out">사용/출고</option><option value="adjust">실사 수량으로 조정</option></select>
              </Field>
              <Field label="수량">
                <input name="quantity" type="number" min="0.01" step="0.01" required />
              </Field>
            </div>
            <Field label="날짜"><input name="movementDate" type="date" defaultValue={today} required /></Field>
            <Field label="메모"><input name="note" placeholder="입고처, 사용 사유" /></Field>
            <button className="secondary-button" disabled={busy}>재고 반영</button>
          </form>
        </article>

        <article className="panel compact-form-panel">
          <div className="form-title"><span className="step-number">02</span><div><h3>로스팅 배치 등록</h3><p>생두 차감 · 볶은 원두 입고</p></div></div>
          <form onSubmit={(event) => submitJson(event, "/api/inventory/roast", "로스팅 배치 재고가 반영됐습니다.")}>
            <Field label="투입한 생두">
              <select name="greenItemId" required>{greenItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            </Field>
            <Field label="볶은 원두 입고 품목">
              <select name="roastedItemId" required>{roastedItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            </Field>
            <div className="two-columns">
              <Field label="생두 투입량 (kg)"><input name="greenKg" type="number" min="0.01" step="0.01" required /></Field>
              <Field label="볶은 원두 중량 (g)"><input name="outputGrams" type="number" min="1" step="1" required /></Field>
            </div>
            <Field label="날짜"><input name="movementDate" type="date" defaultValue={today} required /></Field>
            <Field label="메모"><input name="note" placeholder="배치 또는 프로파일명" /></Field>
            <button className="secondary-button" disabled={busy}>배치 재고 반영</button>
          </form>
        </article>

        <article className="panel compact-form-panel">
          <div className="form-title"><span className="step-number">03</span><div><h3>새 품목</h3><p>생두 로트 등 추가</p></div></div>
          <form onSubmit={(event) => submitJson(event, "/api/inventory", "새 재고 품목이 추가됐습니다.")}>
            <input type="hidden" name="action" value="create_item" />
            <Field label="품목명"><input name="name" required placeholder="에티오피아 구지 워시드" /></Field>
            <div className="two-columns">
              <Field label="분류">
                <select name="category"><option value="green">생두</option><option value="roasted">더컵 볶은 원두</option><option value="gusto">구스토 원두</option><option value="milk">우유</option><option value="other">기타</option></select>
              </Field>
              <Field label="단위"><input name="unit" required placeholder="kg / g / 팩" /></Field>
            </div>
            <Field label="최소 재고"><input name="reorderLevel" type="number" min="0" step="0.1" defaultValue="0" /></Field>
            <button className="secondary-button" disabled={busy}>품목 추가</button>
          </form>
        </article>
      </div>

      <article className="panel table-panel">
        <div className="panel-heading"><div><span className="eyebrow">STOCK LEDGER</span><h3>최근 재고 기록</h3></div></div>
        <MovementTable movements={data.movements} />
      </article>
    </section>
  );
}

function FinanceView({
  data,
  onUpdated,
  notify,
}: {
  data: DashboardData;
  onUpdated: () => Promise<void>;
  notify: (toast: { kind: "ok" | "error"; message: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<"income" | "expense">("income");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      await requestJson("/api/finance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      event.currentTarget.reset();
      await onUpdated();
      notify({ kind: "ok", message: `${kind === "income" ? "수입" : "지출"} 내역이 월별 지표에 반영됐습니다.` });
    } catch (error) {
      notify({ kind: "error", message: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-section">
      <PageHeader
        eyebrow="REVENUE LEDGER"
        title="매출과 비용, 같은 장부에서"
        description="CSV 기준액 이후 새로 발생한 내역만 입력하세요. 우유 구매 비용은 자동으로 들어옵니다."
      />
      <div className="finance-layout">
        <article className="panel finance-entry">
          <div className="panel-heading"><div><span className="eyebrow">NEW ENTRY</span><h3>수입 · 지출 등록</h3></div></div>
          <form onSubmit={submit}>
            <div className="segmented">
              <label className={kind === "income" ? "active" : ""}><input type="radio" name="kind" value="income" checked={kind === "income"} onChange={() => setKind("income")} />수입</label>
              <label className={kind === "expense" ? "active" : ""}><input type="radio" name="kind" value="expense" checked={kind === "expense"} onChange={() => setKind("expense")} />지출</label>
            </div>
            <div className="two-columns">
              <Field label="날짜"><input name="transactionDate" type="date" defaultValue={today} required /></Field>
              <Field label="분류"><input name="category" placeholder={kind === "income" ? "수강료 / 판매" : "재료비 / 광고비"} required /></Field>
            </div>
            <Field label="금액"><div className="input-suffix"><input name="amount" type="number" min="1" step="1" required /><span>원</span></div></Field>
            <Field label="설명"><textarea name="description" rows={3} placeholder="거래 내용을 간단히 기록하세요." /></Field>
            <button className="primary-button" disabled={busy}>{busy ? "반영 중…" : "장부에 반영"}</button>
          </form>
        </article>

        <article className="panel table-panel finance-ledger">
          <div className="panel-heading">
            <div><span className="eyebrow">RECENT LEDGER</span><h3>최근 입력 내역</h3></div>
            <span className="csv-badge">CSV 2024–2026 이관 완료</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>일자</th><th>구분</th><th>분류</th><th>설명</th><th>금액</th><th>등록자</th></tr></thead>
              <tbody>
                {data.transactions.length ? data.transactions.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.transactionDate}</td>
                    <td><span className={`kind-badge ${entry.kind}`}>{entry.kind === "income" ? "수입" : "지출"}</span></td>
                    <td>{entry.category}</td>
                    <td>{entry.description || "—"}</td>
                    <td className={entry.kind}>{entry.kind === "income" ? "+" : "−"} {won.format(entry.amount)}</td>
                    <td>{entry.createdByName}</td>
                  </tr>
                )) : <tr><td colSpan={6} className="empty-cell">신규 입력 내역이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}

function RoastingView({
  user,
  notify,
}: {
  user: User;
  notify: (toast: { kind: "ok" | "error"; message: string }) => void;
}) {
  const [profiles, setProfiles] = useState<RoastProfile[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<RoastProfile | "new" | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await requestJson<{ profiles: RoastProfile[] }>("/api/roasting");
      setProfiles(result.profiles);
      setSelectedId((current) => current ?? result.profiles[0]?.id ?? null);
    } catch (error) {
      notify({ kind: "error", message: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    // Fetch the protected profile list when this workspace opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const selected = profiles.find((profile) => profile.id === selectedId) ?? null;

  async function deleteProfile(profile: RoastProfile) {
    if (!window.confirm(`${profile.beanName} 프로파일을 삭제할까요?`)) return;
    try {
      await requestJson(`/api/roasting/${profile.id}`, { method: "DELETE" });
      setSelectedId(null);
      await load();
      notify({ kind: "ok", message: "로스팅 프로파일을 삭제했습니다." });
    } catch (error) {
      notify({ kind: "error", message: errorMessage(error) });
    }
  }

  if (editing) {
    return (
      <section className="page-section">
        <RoastProfileForm
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
            notify({ kind: "ok", message: "로스팅 프로파일을 저장했습니다." });
          }}
          notify={notify}
        />
      </section>
    );
  }

  return (
    <section className="page-section">
      <PageHeader
        eyebrow="ROASTING PLAYBOOK"
        title="누구나 같은 맛을 재현하도록"
        description="온도·가스·크랙·디벨롭을 한 곡선으로 기록하고 구간별 평균 ROR을 자동 계산합니다."
        action={user.role === "admin" ? <button className="primary-button small" onClick={() => setEditing("new")}>새 프로파일</button> : undefined}
      />

      {loading ? <div className="panel empty-state">프로파일을 불러오는 중입니다.</div> : profiles.length ? (
        <div className="roast-layout">
          <aside className="profile-list">
            {profiles.map((profile) => (
              <button
                type="button"
                className={selectedId === profile.id ? "profile-card active" : "profile-card"}
                key={profile.id}
                onClick={() => setSelectedId(profile.id)}
              >
                <span>{profile.origin || "ORIGIN"}</span>
                <strong>{profile.beanName}</strong>
                <small>{profile.process || "프로세스 미입력"} · {formatTime(profile.totalSeconds)}</small>
              </button>
            ))}
          </aside>
          {selected && (
            <article className="panel profile-detail">
              <div className="profile-hero">
                <div>
                  <span className="eyebrow">{selected.origin || "ROAST PROFILE"} · {selected.process || "PROCESS"}</span>
                  <h2>{selected.beanName}</h2>
                  <p>{number.format(selected.batchWeight)}kg batch · 작성 {selected.createdByName}</p>
                </div>
                {user.role === "admin" && (
                  <div className="button-row">
                    <button className="ghost-button" onClick={() => setEditing(selected)}>수정</button>
                    <button className="ghost-button danger" onClick={() => void deleteProfile(selected)}>삭제</button>
                  </div>
                )}
              </div>
              <RoastCurve profile={selected} />
              <div className="roast-metrics">
                <Metric label="투입 온도" value={`${selected.chargeTemp}℃`} />
                <Metric label="옐로잉" value={formatTime(selected.yellowingSeconds)} />
                <Metric label="1차 크랙" value={formatTime(selected.firstCrackSeconds)} />
                <Metric label="배출" value={`${formatTime(selected.totalSeconds)} · ${selected.dropTemp}℃`} />
                <Metric label="디벨롭" value={`${formatTime(selected.developmentSeconds)} · ${selected.developmentRatio}%`} accent />
              </div>
              <div className="ror-grid">
                <div><span>건조 구간 평균 ROR</span><strong>{selected.ror.drying}℃/min</strong></div>
                <div><span>마이야르 평균 ROR</span><strong>{selected.ror.maillard}℃/min</strong></div>
                <div><span>디벨롭 평균 ROR</span><strong>{selected.ror.development}℃/min</strong></div>
              </div>
              <div className="profile-notes">
                <div><span>가스 운용</span><p>{selected.gasNotes || "기록 없음"}</p></div>
                <div><span>컵 노트 · 주의사항</span><p>{selected.notes || "기록 없음"}</p></div>
              </div>
            </article>
          )}
        </div>
      ) : (
        <div className="panel empty-state">
          <strong>아직 저장된 로스팅 프로파일이 없습니다.</strong>
          <p>첫 프로파일을 등록하면 온도 곡선과 구간별 ROR이 여기에 표시됩니다.</p>
          {user.role === "admin" && <button className="primary-button small" onClick={() => setEditing("new")}>첫 프로파일 만들기</button>}
        </div>
      )}
    </section>
  );
}

function RoastProfileForm({
  initial,
  onCancel,
  onSaved,
  notify,
}: {
  initial: RoastProfile | null;
  onCancel: () => void;
  onSaved: () => Promise<void>;
  notify: (toast: { kind: "ok" | "error"; message: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [points, setPoints] = useState<RoastPoint[]>(
    initial?.points ?? [
      { seconds: 0, beanTemp: 92, gasPressure: 80 },
      { seconds: 120, beanTemp: 118, gasPressure: 75 },
      { seconds: 300, beanTemp: 154, gasPressure: 55 },
      { seconds: 480, beanTemp: 188, gasPressure: 35 },
      { seconds: 600, beanTemp: 204, gasPressure: 0 },
    ],
  );
  const [totalSeconds, setTotalSeconds] = useState(initial?.totalSeconds ?? 600);

  function updatePoint(index: number, field: keyof RoastPoint, value: number) {
    setPoints((current) => current.map((point, pointIndex) => pointIndex === index ? { ...point, [field]: value } : point));
  }

  function addPoint() {
    const last = points.at(-1) ?? { seconds: totalSeconds, beanTemp: 200, gasPressure: 0 };
    const beforeLast = points.at(-2)?.seconds ?? 0;
    const seconds = Math.round((beforeLast + last.seconds) / 2);
    setPoints([...points.slice(0, -1), { seconds, beanTemp: last.beanTemp - 8, gasPressure: last.gasPressure }, last].sort((a, b) => a.seconds - b.seconds));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const body = {
        ...values,
        id: initial?.id,
        totalSeconds,
        points,
      };
      await requestJson("/api/roasting", {
        method: initial ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      await onSaved();
    } catch (error) {
      notify({ kind: "error", message: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="PROFILE EDITOR"
        title={initial ? "로스팅 프로파일 수정" : "새 로스팅 프로파일"}
        description="초 단위 온도와 가스 압력을 기록하면 배출 후 구간별 ROR과 디벨롭 비율이 자동 계산됩니다."
        action={<button className="ghost-button" onClick={onCancel}>목록으로</button>}
      />
      <form className="panel roast-form" onSubmit={submit}>
        <div className="roast-form-section">
          <span className="section-index">01 / 기본 정보</span>
          <div className="three-columns">
            <Field label="원두명"><input name="beanName" defaultValue={initial?.beanName} required /></Field>
            <Field label="산지"><input name="origin" defaultValue={initial?.origin} placeholder="Ethiopia Guji" /></Field>
            <Field label="프로세스"><input name="process" defaultValue={initial?.process} placeholder="Washed" /></Field>
          </div>
          <div className="three-columns">
            <Field label="배치 중량 (kg)"><input name="batchWeight" type="number" min="0.01" step="0.01" defaultValue={initial?.batchWeight ?? 1} required /></Field>
            <Field label="투입 온도 (℃)"><input name="chargeTemp" type="number" min="1" step="0.1" defaultValue={initial?.chargeTemp ?? 185} required /></Field>
            <Field label="배출 온도 (℃)"><input name="dropTemp" type="number" min="1" step="0.1" defaultValue={initial?.dropTemp ?? 204} required /></Field>
          </div>
        </div>
        <div className="roast-form-section">
          <span className="section-index">02 / 주요 시점</span>
          <div className="three-columns">
            <Field label="옐로잉 시작 (초)"><input name="yellowingSeconds" type="number" min="1" step="1" defaultValue={initial?.yellowingSeconds ?? 300} required /></Field>
            <Field label="1차 크랙 시작 (초)"><input name="firstCrackSeconds" type="number" min="1" step="1" defaultValue={initial?.firstCrackSeconds ?? 480} required /></Field>
            <Field label="배출 / 총 시간 (초)">
              <input
                name="totalSeconds"
                type="number"
                min="1"
                step="1"
                value={totalSeconds}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setTotalSeconds(next);
                  setPoints((current) => current.map((point, index) => index === current.length - 1 ? { ...point, seconds: next } : point));
                }}
                required
              />
            </Field>
          </div>
        </div>
        <div className="roast-form-section">
          <div className="section-heading"><span className="section-index">03 / 온도 · 가스 포인트</span><button type="button" className="ghost-button" onClick={addPoint}>포인트 추가</button></div>
          <div className="point-table">
            <div className="point-row header"><span>시간(초)</span><span>원두 온도(℃)</span><span>가스 압력(%)</span><span /></div>
            {points.map((point, index) => (
              <div className="point-row" key={`${index}-${point.seconds}`}>
                <input type="number" min="0" step="1" value={point.seconds} disabled={index === 0 || index === points.length - 1} onChange={(event) => updatePoint(index, "seconds", Number(event.target.value))} aria-label={`${index + 1}번째 포인트 시간`} />
                <input type="number" min="0" step="0.1" value={point.beanTemp} onChange={(event) => updatePoint(index, "beanTemp", Number(event.target.value))} aria-label={`${index + 1}번째 포인트 온도`} />
                <input type="number" min="0" max="100" step="1" value={point.gasPressure} onChange={(event) => updatePoint(index, "gasPressure", Number(event.target.value))} aria-label={`${index + 1}번째 포인트 가스 압력`} />
                <button type="button" className="remove-point" disabled={points.length <= 3 || index === 0 || index === points.length - 1} onClick={() => setPoints(points.filter((_, pointIndex) => pointIndex !== index))}>삭제</button>
              </div>
            ))}
          </div>
        </div>
        <div className="roast-form-section">
          <span className="section-index">04 / 따라 하기 노트</span>
          <div className="two-columns">
            <Field label="가스 운용 메모"><textarea name="gasNotes" rows={5} defaultValue={initial?.gasNotes} placeholder="예: 투입 80%, 옐로잉 60%, 1차 크랙 직전 35%" /></Field>
            <Field label="컵 노트 · 주의사항"><textarea name="notes" rows={5} defaultValue={initial?.notes} placeholder="배출 기준, 향미, 다음 배치 보정 사항" /></Field>
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="ghost-button" onClick={onCancel}>취소</button>
          <button className="primary-button" disabled={busy}>{busy ? "계산·저장 중…" : "프로파일 저장"}</button>
        </div>
      </form>
    </>
  );
}

function RoastCurve({ profile }: { profile: RoastProfile }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !profile.points.length) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = 320 * dpr;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(dpr, dpr);
      const width = rect.width;
      const height = 320;
      const pad = { left: 46, right: 28, top: 28, bottom: 36 };
      const chartWidth = width - pad.left - pad.right;
      const chartHeight = height - pad.top - pad.bottom;
      const temperatures = profile.points.map((point) => point.beanTemp);
      const minTemp = Math.floor((Math.min(...temperatures) - 10) / 10) * 10;
      const maxTemp = Math.ceil((Math.max(...temperatures) + 10) / 10) * 10;
      const x = (seconds: number) => pad.left + (seconds / profile.totalSeconds) * chartWidth;
      const y = (temp: number) => pad.top + ((maxTemp - temp) / (maxTemp - minTemp)) * chartHeight;
      const yGas = (gas: number) => pad.top + ((100 - gas) / 100) * chartHeight;

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#f5f5f5";
      context.fillRect(0, 0, width, height);
      context.strokeStyle = "#d6d6d6";
      context.lineWidth = 1;
      context.fillStyle = "#6f6f6f";
      context.font = "11px Arial";
      for (let index = 0; index <= 4; index += 1) {
        const gridY = pad.top + (chartHeight / 4) * index;
        context.beginPath();
        context.moveTo(pad.left, gridY);
        context.lineTo(width - pad.right, gridY);
        context.stroke();
        const label = Math.round(maxTemp - ((maxTemp - minTemp) / 4) * index);
        context.fillText(`${label}°`, 8, gridY + 4);
      }

      [
        [profile.yellowingSeconds, "옐로잉"],
        [profile.firstCrackSeconds, "1차 크랙"],
      ].forEach(([seconds, label]) => {
        const markerX = x(Number(seconds));
        context.strokeStyle = "#a6a6a6";
        context.setLineDash([4, 5]);
        context.beginPath();
        context.moveTo(markerX, pad.top);
        context.lineTo(markerX, height - pad.bottom);
        context.stroke();
        context.setLineDash([]);
        context.fillStyle = "#555555";
        context.fillText(String(label), markerX + 5, pad.top + 12);
      });

      context.strokeStyle = "#777777";
      context.lineWidth = 2;
      context.setLineDash([6, 5]);
      context.beginPath();
      profile.points.forEach((point, index) => {
        const pointX = x(point.seconds);
        const pointY = yGas(point.gasPressure);
        if (index === 0) context.moveTo(pointX, pointY);
        else context.lineTo(pointX, pointY);
      });
      context.stroke();
      context.setLineDash([]);

      context.strokeStyle = "#111111";
      context.lineWidth = 3;
      context.beginPath();
      profile.points.forEach((point, index) => {
        const pointX = x(point.seconds);
        const pointY = y(point.beanTemp);
        if (index === 0) context.moveTo(pointX, pointY);
        else context.lineTo(pointX, pointY);
      });
      context.stroke();
      profile.points.forEach((point) => {
        context.beginPath();
        context.fillStyle = "#f5f5f5";
        context.strokeStyle = "#111111";
        context.lineWidth = 2;
        context.arc(x(point.seconds), y(point.beanTemp), 4, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      });

      context.fillStyle = "#6f6f6f";
      for (let seconds = 0; seconds <= profile.totalSeconds; seconds += Math.max(60, Math.round(profile.totalSeconds / 5 / 60) * 60)) {
        context.fillText(formatTime(seconds), x(seconds) - 12, height - 13);
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [profile]);

  return (
    <div className="curve-wrap">
      <div className="curve-legend"><span className="temp-line" />원두 온도 <span className="gas-line" />가스 압력</div>
      <canvas ref={canvasRef} aria-label={`${profile.beanName} 로스팅 온도 및 가스 압력 그래프`} />
    </div>
  );
}

function StaffView({
  notify,
}: {
  notify: (toast: { kind: "ok" | "error"; message: string }) => void;
}) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await requestJson<{ staff: StaffMember[]; audits: AuditLog[] }>("/api/staff");
      setStaff(result.staff);
      setAudits(result.audits);
    } catch (error) {
      notify({ kind: "error", message: errorMessage(error) });
    }
  }, [notify]);

  useEffect(() => {
    // Fetch staff and audit records when the admin workspace opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function addStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await requestJson("/api/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
      });
      event.currentTarget.reset();
      await load();
      notify({ kind: "ok", message: "직원이 등록되어 바로 로그인할 수 있습니다." });
    } catch (error) {
      notify({ kind: "error", message: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function updateStaff(
    member: StaffMember,
    patch: Partial<
      Pick<
        StaffMember,
        "role" | "active" | "canFinance" | "canInventory" | "canRoasting"
      >
    >,
  ) {
    try {
      await requestJson("/api/staff", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: member.id,
          role: patch.role ?? member.role,
          canFinance: Boolean(patch.canFinance ?? member.canFinance),
          canInventory: Boolean(patch.canInventory ?? member.canInventory),
          canRoasting: Boolean(patch.canRoasting ?? member.canRoasting),
          active: Boolean(patch.active ?? member.active),
        }),
      });
      await load();
      notify({ kind: "ok", message: "직원 권한이 변경됐습니다." });
    } catch (error) {
      notify({ kind: "error", message: errorMessage(error) });
    }
  }

  return (
    <section className="page-section">
      <PageHeader
        eyebrow="ACCESS CONTROL"
        title="담당 업무만 선택해서 공개"
        description="수업 사용 기록은 모든 직원에게 제공하고, 매출·재고·로스팅 메뉴는 직원별로 선택합니다."
      />
      <div className="staff-layout">
        <article className="panel staff-form">
          <div className="panel-heading"><div><span className="eyebrow">NEW STAFF</span><h3>직원 등록</h3></div></div>
          <form onSubmit={addStaff}>
            <Field label="이름"><input name="name" required maxLength={40} /></Field>
            <Field label="휴대폰 번호"><input name="phone" type="tel" inputMode="numeric" placeholder="010-0000-0000" required /></Field>
            <Field label="직원 구분">
              <select name="role" defaultValue="instructor">
                <option value="instructor">시간강사</option>
                <option value="employee">정규직원</option>
                <option value="admin">관리자 · 모든 메뉴</option>
              </select>
            </Field>
            <fieldset className="permission-fieldset">
              <legend>추가 메뉴 권한</legend>
              <p>수업 기록은 기본으로 제공됩니다.</p>
              <div className="permission-grid">
                {permissionOptions.map((permission) => (
                  <label className="permission-choice" key={permission.field}>
                    <input name={permission.field} type="checkbox" />
                    <span><strong>{permission.label}</strong><small>{permission.description}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="primary-button" disabled={busy}>{busy ? "등록 중…" : "직원 등록"}</button>
          </form>
        </article>
        <article className="panel staff-list-panel">
          <div className="panel-heading"><div><span className="eyebrow">AUTHORIZED STAFF</span><h3>등록 직원</h3></div><span className="count-badge">{staff.filter((member) => member.active).length}명 사용 중</span></div>
          <div className="staff-list">
            {staff.map((member) => (
              <div className={member.active ? "staff-row" : "staff-row inactive"} key={member.id}>
                <div className="staff-summary">
                  <div className="staff-avatar">{member.name.slice(0, 1)}</div>
                  <div className="staff-identity"><strong>{member.name}</strong><span>휴대폰 끝 4자리 · {member.phoneLast4}</span></div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(member.active)}
                      aria-label={`${member.name} 계정 ${member.active ? "비활성화" : "활성화"}`}
                      onChange={(event) => void updateStaff(member, { active: event.target.checked ? 1 : 0 })}
                    />
                    <span />
                  </label>
                </div>
                <div className="staff-access-controls">
                  <select value={member.role} onChange={(event) => void updateStaff(member, { role: event.target.value as Role })} aria-label={`${member.name} 직원 구분`}>
                    <option value="admin">관리자</option><option value="employee">정규직원</option><option value="instructor">시간강사</option>
                  </select>
                  <div className="staff-permissions" aria-label={`${member.name} 메뉴 권한`}>
                    {permissionOptions.map((permission) => (
                      <label key={permission.field}>
                        <input
                          type="checkbox"
                          checked={member.role === "admin" || Boolean(member[permission.field])}
                          disabled={member.role === "admin"}
                          onChange={(event) => void updateStaff(member, { [permission.field]: event.target.checked ? 1 : 0 })}
                        />
                        <span>{permission.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
      <article className="panel audit-panel">
        <div className="panel-heading"><div><span className="eyebrow">AUDIT TRAIL</span><h3>최근 변경 기록</h3></div></div>
        <div className="audit-list">
          {audits.map((entry) => (
            <div key={entry.id}><span>{formatDateTime(entry.createdAt)}</span><strong>{entry.actorName ?? "시스템"}</strong><p>{auditLabel(entry.action)} · {entry.detail || entry.entityType}</p></div>
          ))}
        </div>
      </article>
    </section>
  );
}

function MovementTable({ movements }: { movements: Movement[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>일자</th><th>품목</th><th>구분</th><th>수량</th><th>수업 / 메모</th><th>비용</th><th>등록자</th><th /></tr></thead>
        <tbody>
          {movements.length ? movements.map((movement) => (
            <tr key={movement.id}>
              <td>{movement.movementDate}</td>
              <td><strong>{movement.itemName}</strong></td>
              <td><span className={`movement-badge ${movement.movementType}`}>{movementLabel[movement.movementType] ?? movement.movementType}</span></td>
              <td className={movement.quantity < 0 ? "expense" : "income"}>{movement.quantity > 0 ? "+" : ""}{number.format(movement.quantity)}{movement.unit}</td>
              <td>{movement.className || movement.note || "—"}</td>
              <td>{movement.costAmount ? won.format(movement.costAmount) : "—"}</td>
              <td>{movement.createdByName}</td>
              <td>{movement.hasReceipt
                ? <a className="receipt-link" href={`/api/receipts/${movement.id}`} target="_blank" rel="noreferrer">영수증</a>
                : movement.receiptArchived
                  ? <span className="receipt-archived">보관 만료</span>
                  : null}</td>
            </tr>
          )) : <tr><td colSpan={8} className="empty-cell">아직 기록이 없습니다.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
      {action && <div className="page-action">{action}</div>}
    </header>
  );
}

function KpiCard({
  label,
  value,
  meta,
  tone = "light",
}: {
  label: string;
  value: string;
  meta: string;
  tone?: "light" | "dark" | "green" | "alert";
}) {
  return <article className={`kpi-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{meta}</small></article>;
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={accent ? "metric accent" : "metric"}><span>{label}</span><strong>{value}</strong></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function Toast({ toast }: { toast: { kind: "ok" | "error"; message: string } }) {
  return <div className={`toast ${toast.kind}`} role="status"><span>{toast.kind === "ok" ? "완료" : "확인"}</span>{toast.message}</div>;
}

async function requestJson<T = { ok: boolean }>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(body.error || "요청을 처리하지 못했습니다.");
  return body;
}

async function optimizeReceipt(source: File): Promise<File> {
  const image = await loadReceiptImage(source);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지를 최적화할 수 없습니다.");
  let maxSide = 1600;
  let quality = 0.8;
  let blob: Blob | null = null;
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image.source, 0, 0, canvas.width, canvas.height);
    blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("이미지 변환에 실패했습니다.")),
        "image/jpeg",
        quality,
      );
    });
    if (blob.size <= 850_000) break;
    maxSide = Math.round(maxSide * 0.82);
    quality = Math.max(0.58, quality - 0.07);
  }
  image.close();
  if (!blob || blob.size > 1_000_000) {
    throw new Error("영수증 이미지를 1MB 이하로 줄일 수 없습니다. 다른 사진을 선택해 주세요.");
  }
  return new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" });
}

async function loadReceiptImage(source: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Some mobile browsers decode camera images only through an HTMLImageElement.
    }
  }

  const objectUrl = URL.createObjectURL(source);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.decoding = "async";
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("이 기기에서 영수증 이미지를 읽을 수 없습니다."));
      element.src = objectUrl;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + Number(value), 0);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.";
}

function currentKoreanDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value.endsWith("Z") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function auditLabel(action: string): string {
  const labels: Record<string, string> = {
    bootstrap_admin: "최초 관리자 등록",
    login: "로그인",
    create_staff: "직원 등록",
    update_staff: "권한 변경",
    create_finance: "장부 입력",
    create_item: "품목 추가",
    inventory_movement: "재고 변동",
    class_consumption: "수업 사용",
    milk_purchase: "우유 구매",
    roast_inventory: "로스팅 배치",
    create_roast_profile: "프로파일 생성",
    update_roast_profile: "프로파일 수정",
    delete_roast_profile: "프로파일 삭제",
  };
  return labels[action] ?? action;
}
