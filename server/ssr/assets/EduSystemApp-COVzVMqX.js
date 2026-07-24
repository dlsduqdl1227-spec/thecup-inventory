import { a as require_react, o as __toESM, t as require_jsx_runtime } from "../index.js";
//#region app/components/EduSystemApp.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var today = currentKoreanDate();
var won = new Intl.NumberFormat("ko-KR", {
	style: "currency",
	currency: "KRW",
	maximumFractionDigits: 0
});
var number = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });
var roleLabel = {
	admin: "관리자",
	employee: "정규직원",
	instructor: "시간강사"
};
var categoryLabel = {
	green: "생두",
	roasted: "더컵 볶은 원두",
	gusto: "구스토 원두",
	milk: "우유",
	other: "기타"
};
var movementLabel = {
	in: "입고",
	out: "사용",
	adjust: "실사 조정",
	roast_in: "볶은 원두 입고",
	roast_out: "생두 투입"
};
var navItems = [
	{
		key: "dashboard",
		label: "매출 대시보드",
		short: "대시보드",
		permission: "canFinance"
	},
	{
		key: "record",
		label: "수업 사용 기록",
		short: "수업 기록"
	},
	{
		key: "inventory",
		label: "재고 관리",
		short: "재고",
		permission: "canInventory"
	},
	{
		key: "finance",
		label: "매출 · 비용",
		short: "매출",
		permission: "canFinance"
	},
	{
		key: "roasting",
		label: "로스팅 프로파일",
		short: "로스팅",
		permission: "canRoasting"
	},
	{
		key: "staff",
		label: "직원 · 권한",
		short: "직원",
		adminOnly: true
	}
];
var permissionOptions = [
	{
		field: "canFinance",
		label: "매출",
		description: "대시보드와 수입·지출"
	},
	{
		field: "canInventory",
		label: "재고",
		description: "전체 재고와 로스팅 배치"
	},
	{
		field: "canRoasting",
		label: "로스팅",
		description: "프로파일 열람"
	}
];
function allowedNavigation(user) {
	return navItems.filter((item) => {
		if (item.adminOnly) return user.role === "admin";
		if (!item.permission) return true;
		return user.role === "admin" || user[item.permission];
	});
}
function initialTab(user) {
	return allowedNavigation(user)[0]?.key ?? "record";
}
function EduSystemApp() {
	const [authState, setAuthState] = (0, import_react.useState)({
		loading: true,
		bootstrapRequired: false,
		user: null
	});
	const [data, setData] = (0, import_react.useState)(null);
	const [activeTab, setActiveTab] = (0, import_react.useState)("dashboard");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [toast, setToast] = (0, import_react.useState)(null);
	const loadAuth = (0, import_react.useCallback)(async () => {
		try {
			const status = await requestJson("/api/auth/status");
			setAuthState({
				loading: false,
				...status
			});
			if (status.user) setActiveTab(initialTab(status.user));
		} catch (error) {
			setAuthState({
				loading: false,
				bootstrapRequired: false,
				user: null
			});
			setToast({
				kind: "error",
				message: errorMessage(error)
			});
		}
	}, []);
	const refreshData = (0, import_react.useCallback)(async () => {
		if (!authState.user) return;
		try {
			setData(await requestJson("/api/dashboard"));
		} catch (error) {
			setToast({
				kind: "error",
				message: errorMessage(error)
			});
		}
	}, [authState.user]);
	(0, import_react.useEffect)(() => {
		loadAuth();
	}, [loadAuth]);
	(0, import_react.useEffect)(() => {
		refreshData();
	}, [refreshData]);
	(0, import_react.useEffect)(() => {
		if (!toast) return;
		const timer = window.setTimeout(() => setToast(null), 4200);
		return () => window.clearTimeout(timer);
	}, [toast]);
	async function handleAuth(endpoint, formData) {
		setBusy(true);
		try {
			const body = Object.fromEntries(formData.entries());
			const result = await requestJson(endpoint, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body)
			});
			setAuthState({
				loading: false,
				bootstrapRequired: false,
				user: result.user
			});
			setActiveTab(initialTab(result.user));
			setToast({
				kind: "ok",
				message: `${result.user.name}님, 환영합니다.`
			});
		} catch (error) {
			setToast({
				kind: "error",
				message: errorMessage(error)
			});
		} finally {
			setBusy(false);
		}
	}
	async function logout() {
		setBusy(true);
		try {
			await requestJson("/api/auth/logout", { method: "POST" });
			setData(null);
			setAuthState((current) => ({
				...current,
				user: null
			}));
		} catch (error) {
			setToast({
				kind: "error",
				message: errorMessage(error)
			});
		} finally {
			setBusy(false);
		}
	}
	if (authState.loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "loading-screen",
		"aria-live": "polite",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandMark, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "loading-line" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "운영 데이터를 안전하게 불러오는 중입니다." })
		]
	});
	if (!authState.user) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthScreen, {
		bootstrapRequired: authState.bootstrapRequired,
		busy,
		onSubmit: handleAuth
	}), toast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toast, { toast })] });
	const user = authState.user;
	const allowedNav = allowedNavigation(user);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "app-shell",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "sidebar",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandMark, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "sidebar-rule" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						className: "side-nav",
						"aria-label": "주요 메뉴",
						children: allowedNav.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: activeTab === item.key ? "nav-item active" : "nav-item",
							onClick: () => setActiveTab(item.key),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: String(index + 1).padStart(2, "0") }), item.label]
						}, item.key))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sidebar-user",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `role-dot ${user.role}` }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: user.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: roleLabel[user.role] })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: logout,
								disabled: busy,
								children: "로그아웃"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "main-content",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "mobile-header",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandMark, { compact: true }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mobile-user",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: user.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: roleLabel[user.role] })]
					})]
				}), !data ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "page-section loading-panel",
					"aria-live": "polite",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "loading-line" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "대시보드를 준비하고 있습니다." })]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					activeTab === "dashboard" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardView, { data }),
					activeTab === "record" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecordView, {
						data,
						onUpdated: refreshData,
						notify: setToast
					}),
					activeTab === "inventory" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InventoryView, {
						data,
						onUpdated: refreshData,
						notify: setToast
					}),
					activeTab === "finance" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FinanceView, {
						data,
						onUpdated: refreshData,
						notify: setToast
					}),
					activeTab === "roasting" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoastingView, {
						user,
						notify: setToast
					}),
					activeTab === "staff" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StaffView, { notify: setToast })
				] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "bottom-nav",
				"aria-label": "모바일 메뉴",
				children: allowedNav.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: activeTab === item.key ? "active" : "",
					onClick: () => setActiveTab(item.key),
					children: item.short
				}, item.key))
			}),
			toast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toast, { toast })
		]
	});
}
function BrandMark({ compact = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: compact ? "brand-lockup compact" : "brand-lockup",
		role: "img",
		"aria-label": "더컵에듀와 월간커피 공동 브랜드",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "brand-logo-crop brand-logo-thecup",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: "/brand/thecup-edu.jpg",
					alt: "",
					width: 720,
					height: 720
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "brand-logo-divider",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "brand-logo-crop brand-logo-coffee",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: "/brand/monthly-coffee.png",
					alt: "",
					width: 284,
					height: 284
				})
			})
		]
	});
}
function AuthScreen({ bootstrapRequired, busy, onSubmit }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "auth-layout",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "auth-story",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandMark, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "auth-headline",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "STAFF ACCESS" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
							"더컵에듀",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							"운영 시스템"
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "이름과 등록된 휴대폰 번호로 로그인하면 담당 업무에 필요한 메뉴만 표시됩니다." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "auth-help",
					children: "계정 등록과 메뉴 권한은 관리자에게 요청하세요."
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "auth-panel",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "auth-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "eyebrow",
						children: bootstrapRequired ? "FIRST SETUP" : "STAFF SIGN IN"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: bootstrapRequired ? "초기 관리자 등록" : "직원 로그인" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: bootstrapRequired ? "배포 시 전달받은 초기 관리자 코드와 본인 정보를 입력해 주세요." : "관리자가 등록한 이름과 휴대폰 번호로 로그인하세요." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: (event) => {
							event.preventDefault();
							onSubmit(bootstrapRequired ? "/api/auth/bootstrap" : "/api/auth/login", new FormData(event.currentTarget));
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "이름",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "name",
									autoComplete: "name",
									placeholder: "홍길동",
									required: true,
									maxLength: 40
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "휴대폰 번호",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "phone",
									type: "tel",
									inputMode: "numeric",
									autoComplete: "tel",
									placeholder: "010-0000-0000",
									required: true
								})
							}),
							bootstrapRequired && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "초기 관리자 코드",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "code",
									type: "password",
									autoComplete: "one-time-code",
									placeholder: "배포 시 전달된 코드",
									required: true
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "primary-button auth-submit",
								disabled: busy,
								children: busy ? "확인 중…" : bootstrapRequired ? "관리자 등록하고 시작" : "로그인"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "security-note",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "보안" }), "휴대폰 번호 원문은 저장하지 않으며, 등록된 직원만 접근할 수 있습니다."]
					})
				]
			})
		})]
	});
}
function DashboardView({ data }) {
	const availableYears = [...new Set(data.finance.map((row) => row.year))].sort((a, b) => b - a);
	const [year, setYear] = (0, import_react.useState)(availableYears[0] ?? (/* @__PURE__ */ new Date()).getFullYear());
	const rows = data.finance.filter((row) => row.year === year);
	const activeRows = rows.filter((row) => row.revenue !== 0 || row.expense !== 0);
	const totalRevenue = sum(activeRows.map((row) => row.revenue));
	const totalProfit = sum(activeRows.map((row) => row.profit));
	const margin = totalRevenue ? totalProfit / totalRevenue * 100 : 0;
	const lastMonth = Math.max(0, ...activeRows.map((row) => row.month));
	const priorRevenue = sum(data.finance.filter((row) => row.year === year - 1 && row.month <= lastMonth).map((row) => row.revenue));
	const yoy = priorRevenue ? (totalRevenue - priorRevenue) / priorRevenue * 100 : null;
	const best = activeRows.reduce((current, row) => !current || row.revenue > current.revenue ? row : current, null);
	const lowStock = data.inventory.filter((item) => item.lowStock);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "page-section",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				eyebrow: "MANAGEMENT OVERVIEW",
				title: "숫자가 말해주는 오늘의 운영",
				description: "CSV 이관 자료와 신규 입력 내역을 합산한 월별 경영 현황입니다.",
				action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					value: year,
					onChange: (event) => setYear(Number(event.target.value)),
					"aria-label": "분석 연도",
					children: availableYears.map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
						value,
						children: [value, "년"]
					}, value))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "kpi-grid",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KpiCard, {
						label: `${year} 누적 매출`,
						value: won.format(totalRevenue),
						meta: `${activeRows.length}개월 집계`,
						tone: "dark"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KpiCard, {
						label: "누적 순익",
						value: won.format(totalProfit),
						meta: `순익률 ${margin.toFixed(1)}%`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KpiCard, {
						label: "전년 동기 대비",
						value: yoy === null ? "비교 없음" : `${yoy >= 0 ? "+" : ""}${yoy.toFixed(1)}%`,
						meta: lastMonth ? `${year - 1}년 1–${lastMonth}월 대비` : "집계 전",
						tone: yoy !== null && yoy < 0 ? "alert" : "green"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KpiCard, {
						label: "최고 매출 월",
						value: best ? `${best.month}월` : "—",
						meta: best ? won.format(best.revenue) : "데이터 없음"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "dashboard-grid",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "panel revenue-panel",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "panel-heading",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "eyebrow",
								children: "MONTHLY PERFORMANCE"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "월별 매출과 순익" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "chart-legend",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "revenue-dot" }),
									"매출 ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "profit-dot" }),
									"순익"
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FinanceBarChart, { rows }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "chart-footnote",
							children: year === 2026 ? "2026년 7월은 7월 24일까지 입력된 CSV 기준입니다." : "원본 CSV의 월별 합계와 순익을 기준으로 집계했습니다."
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "panel signal-panel",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "panel-heading",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "eyebrow",
							children: "OPERATING SIGNALS"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "지금 확인할 것" })] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "signal-list",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: lowStock.length ? "signal warn" : "signal good",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "재고" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: lowStock.length ? `${lowStock.length}개 품목 확인 필요` : "적정 수준" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: lowStock.length ? lowStock.map((item) => item.name).join(", ") : "최소 재고선 아래인 품목이 없습니다." })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "signal",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "월평균 매출" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: activeRows.length ? won.format(totalRevenue / activeRows.length) : "—" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "실제 입력이 있는 월만 평균에 포함했습니다." })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "signal",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "최근 영수증 반영" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: data.movements.find((movement) => movement.hasReceipt)?.movementDate ?? "등록 전" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "우유 구매 비용은 등록 즉시 월 순익에서 차감됩니다." })
								]
							})
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "quarter-grid",
				children: [
					1,
					2,
					3,
					4
				].map((quarter) => {
					const activeQuarter = rows.filter((row) => Math.ceil(row.month / 3) === quarter).filter((row) => row.revenue || row.expense);
					const average = activeQuarter.length ? sum(activeQuarter.map((row) => row.revenue)) / activeQuarter.length : 0;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "quarter-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Q", quarter] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: average ? won.format(average) : "집계 전" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
								"월평균 매출 · ",
								activeQuarter.length,
								"/3개월"
							] })
						]
					}, quarter);
				})
			})
		]
	});
}
function FinanceBarChart({ rows }) {
	const max = Math.max(1, ...rows.map((row) => row.revenue));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "bar-chart",
		role: "img",
		"aria-label": "월별 매출과 순익 막대 그래프",
		children: rows.map((row) => {
			const revenueHeight = row.revenue / max * 100;
			const profitHeight = Math.max(0, row.profit) / max * 100;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bar-column",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "bar-stage",
					title: `${row.month}월 매출 ${won.format(row.revenue)}, 순익 ${won.format(row.profit)}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "bar revenue",
						style: { height: `${revenueHeight}%` }
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "bar profit",
						style: { height: `${profitHeight}%` }
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "bar-label",
					children: row.month
				})]
			}, row.month);
		})
	});
}
function RecordView({ data, onUpdated, notify }) {
	const [busy, setBusy] = (0, import_react.useState)(null);
	const beanItems = data.inventory.filter((item) => ["roasted", "gusto"].includes(item.category));
	const instructor = data.user.role === "instructor";
	async function submitMilk(event) {
		event.preventDefault();
		setBusy("milk");
		try {
			const form = new FormData(event.currentTarget);
			const source = form.get("receipt");
			if (!(source instanceof File) || !source.size) throw new Error("영수증 사진을 선택해 주세요.");
			const optimized = await optimizeReceipt(source);
			form.set("receipt", optimized, optimized.name);
			await requestJson("/api/inventory/milk-purchase", {
				method: "POST",
				body: form
			});
			event.currentTarget.reset();
			await onUpdated();
			notify({
				kind: "ok",
				message: "우유 입고·비용·영수증이 함께 반영됐습니다."
			});
		} catch (error) {
			notify({
				kind: "error",
				message: errorMessage(error)
			});
		} finally {
			setBusy(null);
		}
	}
	async function submitClassUse(event) {
		event.preventDefault();
		setBusy("class");
		try {
			const form = new FormData(event.currentTarget);
			await requestJson("/api/inventory/class-use", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(Object.fromEntries(form.entries()))
			});
			event.currentTarget.reset();
			const dateInput = event.currentTarget.elements.namedItem("movementDate");
			if (dateInput) dateInput.value = today;
			await onUpdated();
			notify({
				kind: "ok",
				message: "수업 사용량이 재고에서 차감됐습니다."
			});
		} catch (error) {
			notify({
				kind: "error",
				message: errorMessage(error)
			});
		} finally {
			setBusy(null);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "page-section",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				eyebrow: instructor ? "INSTRUCTOR WORKSPACE" : "CLASS CONSUMPTION",
				title: instructor ? `${data.user.name}님의 수업 기록` : "수업별 사용량 기록",
				description: "우유 구매는 영수증과 비용까지, 수업 사용량은 원두와 우유 재고까지 한 번에 반영됩니다."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "stock-strip",
				children: data.inventory.filter((item) => [
					"milk",
					"roasted",
					"gusto"
				].includes(item.category)).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.name }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [number.format(item.quantity), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item.unit })] }),
					item.lowStock ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: "보충 필요" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", {
						className: "ok",
						children: "사용 가능"
					})
				] }, item.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "form-grid",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "panel form-panel",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "form-title",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "step-number",
							children: "01"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "우유 구매 등록" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "영수증은 긴 변 1,600px 이하로 자동 최적화됩니다." })] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: submitMilk,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "two-columns",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "구매일",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										name: "movementDate",
										type: "date",
										defaultValue: today,
										required: true
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "수량 (팩)",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										name: "quantity",
										type: "number",
										min: "0.1",
										step: "0.1",
										placeholder: "16",
										required: true
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "결제 금액",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "input-suffix",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										name: "amount",
										type: "number",
										min: "1",
										step: "1",
										placeholder: "36800",
										required: true
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "원" })]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "영수증 사진",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "file-drop",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											name: "receipt",
											type: "file",
											accept: "image/*",
											capture: "environment",
											required: true
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "사진 촬영 또는 파일 선택" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "JPG · PNG · WebP / 자동 압축 저장" })
									]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "메모 (선택)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "note",
									placeholder: "구매처 또는 수업명",
									maxLength: 300
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "primary-button",
								disabled: busy === "milk",
								children: busy === "milk" ? "이미지 최적화 중…" : "구매 내역 반영"
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "panel form-panel",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "form-title",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "step-number",
							children: "02"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "수업 사용량 기록" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "입력한 수량은 현재 재고에서 바로 차감됩니다." })] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: submitClassUse,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "수업명",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "className",
									placeholder: "남부센터 바리스타 오전반",
									required: true,
									maxLength: 100
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "two-columns",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "수업일",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										name: "movementDate",
										type: "date",
										defaultValue: today,
										required: true
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "우유 사용 (팩)",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										name: "milkQuantity",
										type: "number",
										min: "0",
										step: "0.1",
										defaultValue: "0"
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "two-columns",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "사용 원두",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										name: "beanItemId",
										defaultValue: beanItems[0]?.id ?? "",
										children: beanItems.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: item.id,
											children: item.name
										}, item.id))
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "원두 사용 (g)",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										name: "beanQuantity",
										type: "number",
										min: "0",
										step: "1",
										defaultValue: "0"
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "메모 (선택)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "note",
									placeholder: "인원, 특이사항",
									maxLength: 300
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "primary-button",
								disabled: busy === "class",
								children: busy === "class" ? "기록 중…" : "수업 사용량 반영"
							})
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "panel table-panel",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "panel-heading",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "eyebrow",
						children: "RECENT ACTIVITY"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: instructor ? "내 최근 기록" : "최근 수업·구매 기록" })] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MovementTable, { movements: data.movements.filter((movement) => movement.className || movement.costAmount) })]
			})
		]
	});
}
function InventoryView({ data, onUpdated, notify }) {
	const [busy, setBusy] = (0, import_react.useState)(false);
	const greenItems = data.inventory.filter((item) => item.category === "green");
	const roastedItems = data.inventory.filter((item) => item.category === "roasted");
	async function submitJson(event, endpoint, success) {
		event.preventDefault();
		setBusy(true);
		try {
			const form = new FormData(event.currentTarget);
			await requestJson(endpoint, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(Object.fromEntries(form.entries()))
			});
			event.currentTarget.reset();
			await onUpdated();
			notify({
				kind: "ok",
				message: success
			});
		} catch (error) {
			notify({
				kind: "error",
				message: errorMessage(error)
			});
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "page-section",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				eyebrow: "STOCK CONTROL",
				title: "재고 흐름을 한눈에",
				description: "볶기 전 생두, 더컵 볶은 원두, 구스토 원두와 우유의 입고·사용량을 관리합니다."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "inventory-grid",
				children: data.inventory.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: item.lowStock ? "inventory-card low" : "inventory-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "category-tag",
							children: categoryLabel[item.category]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: item.name }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [number.format(item.quantity), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item.unit })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "stock-meter",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: `${Math.min(100, item.reorderLevel ? item.quantity / (item.reorderLevel * 2) * 100 : 100)}%` } })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
							"최소 재고 ",
							number.format(item.reorderLevel),
							item.unit
						] })
					]
				}, item.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "three-panel-grid",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "panel compact-form-panel",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "form-title",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "step-number",
								children: "01"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "입출고 · 실사" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "일반 재고 변동" })] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: (event) => submitJson(event, "/api/inventory", "재고 변동이 반영됐습니다."),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "hidden",
									name: "action",
									value: "movement"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "품목",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										name: "itemId",
										required: true,
										children: data.inventory.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: item.id,
											children: item.name
										}, item.id))
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "two-columns",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
										label: "작업",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
											name: "movementType",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "in",
													children: "입고"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "out",
													children: "사용/출고"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "adjust",
													children: "실사 수량으로 조정"
												})
											]
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
										label: "수량",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											name: "quantity",
											type: "number",
											min: "0.01",
											step: "0.01",
											required: true
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "날짜",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										name: "movementDate",
										type: "date",
										defaultValue: today,
										required: true
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "메모",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										name: "note",
										placeholder: "입고처, 사용 사유"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "secondary-button",
									disabled: busy,
									children: "재고 반영"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "panel compact-form-panel",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "form-title",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "step-number",
								children: "02"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "로스팅 배치 등록" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "생두 차감 · 볶은 원두 입고" })] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: (event) => submitJson(event, "/api/inventory/roast", "로스팅 배치 재고가 반영됐습니다."),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "투입한 생두",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										name: "greenItemId",
										required: true,
										children: greenItems.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: item.id,
											children: item.name
										}, item.id))
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "볶은 원두 입고 품목",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										name: "roastedItemId",
										required: true,
										children: roastedItems.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: item.id,
											children: item.name
										}, item.id))
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "two-columns",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
										label: "생두 투입량 (kg)",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											name: "greenKg",
											type: "number",
											min: "0.01",
											step: "0.01",
											required: true
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
										label: "볶은 원두 중량 (g)",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											name: "outputGrams",
											type: "number",
											min: "1",
											step: "1",
											required: true
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "날짜",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										name: "movementDate",
										type: "date",
										defaultValue: today,
										required: true
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "메모",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										name: "note",
										placeholder: "배치 또는 프로파일명"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "secondary-button",
									disabled: busy,
									children: "배치 재고 반영"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "panel compact-form-panel",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "form-title",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "step-number",
								children: "03"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "새 품목" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "생두 로트 등 추가" })] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: (event) => submitJson(event, "/api/inventory", "새 재고 품목이 추가됐습니다."),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "hidden",
									name: "action",
									value: "create_item"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "품목명",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										name: "name",
										required: true,
										placeholder: "에티오피아 구지 워시드"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "two-columns",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
										label: "분류",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
											name: "category",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "green",
													children: "생두"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "roasted",
													children: "더컵 볶은 원두"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "gusto",
													children: "구스토 원두"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "milk",
													children: "우유"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "other",
													children: "기타"
												})
											]
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
										label: "단위",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											name: "unit",
											required: true,
											placeholder: "kg / g / 팩"
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "최소 재고",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										name: "reorderLevel",
										type: "number",
										min: "0",
										step: "0.1",
										defaultValue: "0"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "secondary-button",
									disabled: busy,
									children: "품목 추가"
								})
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "panel table-panel",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "panel-heading",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "eyebrow",
						children: "STOCK LEDGER"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "최근 재고 기록" })] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MovementTable, { movements: data.movements })]
			})
		]
	});
}
function FinanceView({ data, onUpdated, notify }) {
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [kind, setKind] = (0, import_react.useState)("income");
	async function submit(event) {
		event.preventDefault();
		setBusy(true);
		try {
			const form = new FormData(event.currentTarget);
			await requestJson("/api/finance", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(Object.fromEntries(form.entries()))
			});
			event.currentTarget.reset();
			await onUpdated();
			notify({
				kind: "ok",
				message: `${kind === "income" ? "수입" : "지출"} 내역이 월별 지표에 반영됐습니다.`
			});
		} catch (error) {
			notify({
				kind: "error",
				message: errorMessage(error)
			});
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "page-section",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			eyebrow: "REVENUE LEDGER",
			title: "매출과 비용, 같은 장부에서",
			description: "CSV 기준액 이후 새로 발생한 내역만 입력하세요. 우유 구매 비용은 자동으로 들어옵니다."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "finance-layout",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "panel finance-entry",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "panel-heading",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "eyebrow",
						children: "NEW ENTRY"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "수입 · 지출 등록" })] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: submit,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "segmented",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: kind === "income" ? "active" : "",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "radio",
									name: "kind",
									value: "income",
									checked: kind === "income",
									onChange: () => setKind("income")
								}), "수입"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: kind === "expense" ? "active" : "",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "radio",
									name: "kind",
									value: "expense",
									checked: kind === "expense",
									onChange: () => setKind("expense")
								}), "지출"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "two-columns",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "날짜",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "transactionDate",
									type: "date",
									defaultValue: today,
									required: true
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "분류",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "category",
									placeholder: kind === "income" ? "수강료 / 판매" : "재료비 / 광고비",
									required: true
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "금액",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "input-suffix",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "amount",
									type: "number",
									min: "1",
									step: "1",
									required: true
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "원" })]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "설명",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								name: "description",
								rows: 3,
								placeholder: "거래 내용을 간단히 기록하세요."
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "primary-button",
							disabled: busy,
							children: busy ? "반영 중…" : "장부에 반영"
						})
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "panel table-panel finance-ledger",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "panel-heading",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "eyebrow",
						children: "RECENT LEDGER"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "최근 입력 내역" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "csv-badge",
						children: "CSV 2024–2026 이관 완료"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "table-wrap",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "일자" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "구분" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "분류" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "설명" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "금액" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "등록자" })
					] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: data.transactions.length ? data.transactions.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: entry.transactionDate }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `kind-badge ${entry.kind}`,
							children: entry.kind === "income" ? "수입" : "지출"
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: entry.category }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: entry.description || "—" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
							className: entry.kind,
							children: [
								entry.kind === "income" ? "+" : "−",
								" ",
								won.format(entry.amount)
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: entry.createdByName })
					] }, entry.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						colSpan: 6,
						className: "empty-cell",
						children: "신규 입력 내역이 없습니다."
					}) }) })] })
				})]
			})]
		})]
	});
}
function RoastingView({ user, notify }) {
	const [profiles, setProfiles] = (0, import_react.useState)([]);
	const [selectedId, setSelectedId] = (0, import_react.useState)(null);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const load = (0, import_react.useCallback)(async () => {
		try {
			const result = await requestJson("/api/roasting");
			setProfiles(result.profiles);
			setSelectedId((current) => current ?? result.profiles[0]?.id ?? null);
		} catch (error) {
			notify({
				kind: "error",
				message: errorMessage(error)
			});
		} finally {
			setLoading(false);
		}
	}, [notify]);
	(0, import_react.useEffect)(() => {
		load();
	}, [load]);
	const selected = profiles.find((profile) => profile.id === selectedId) ?? null;
	async function deleteProfile(profile) {
		if (!window.confirm(`${profile.beanName} 프로파일을 삭제할까요?`)) return;
		try {
			await requestJson(`/api/roasting/${profile.id}`, { method: "DELETE" });
			setSelectedId(null);
			await load();
			notify({
				kind: "ok",
				message: "로스팅 프로파일을 삭제했습니다."
			});
		} catch (error) {
			notify({
				kind: "error",
				message: errorMessage(error)
			});
		}
	}
	if (editing) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "page-section",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoastProfileForm, {
			initial: editing === "new" ? null : editing,
			onCancel: () => setEditing(null),
			onSaved: async () => {
				setEditing(null);
				await load();
				notify({
					kind: "ok",
					message: "로스팅 프로파일을 저장했습니다."
				});
			},
			notify
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "page-section",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			eyebrow: "ROASTING PLAYBOOK",
			title: "누구나 같은 맛을 재현하도록",
			description: "온도·가스·크랙·디벨롭을 한 곡선으로 기록하고 구간별 평균 ROR을 자동 계산합니다.",
			action: user.role === "admin" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "primary-button small",
				onClick: () => setEditing("new"),
				children: "새 프로파일"
			}) : void 0
		}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "panel empty-state",
			children: "프로파일을 불러오는 중입니다."
		}) : profiles.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "roast-layout",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
				className: "profile-list",
				children: profiles.map((profile) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: selectedId === profile.id ? "profile-card active" : "profile-card",
					onClick: () => setSelectedId(profile.id),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: profile.origin || "ORIGIN" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: profile.beanName }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
							profile.process || "프로세스 미입력",
							" · ",
							formatTime(profile.totalSeconds)
						] })
					]
				}, profile.id))
			}), selected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "panel profile-detail",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "profile-hero",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "eyebrow",
								children: [
									selected.origin || "ROAST PROFILE",
									" · ",
									selected.process || "PROCESS"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: selected.beanName }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								number.format(selected.batchWeight),
								"kg batch · 작성 ",
								selected.createdByName
							] })
						] }), user.role === "admin" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "button-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "ghost-button",
								onClick: () => setEditing(selected),
								children: "수정"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "ghost-button danger",
								onClick: () => void deleteProfile(selected),
								children: "삭제"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoastCurve, { profile: selected }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "roast-metrics",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "투입 온도",
								value: `${selected.chargeTemp}℃`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "옐로잉",
								value: formatTime(selected.yellowingSeconds)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "1차 크랙",
								value: formatTime(selected.firstCrackSeconds)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "배출",
								value: `${formatTime(selected.totalSeconds)} · ${selected.dropTemp}℃`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "디벨롭",
								value: `${formatTime(selected.developmentSeconds)} · ${selected.developmentRatio}%`,
								accent: true
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ror-grid",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "건조 구간 평균 ROR" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [selected.ror.drying, "℃/min"] })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "마이야르 평균 ROR" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [selected.ror.maillard, "℃/min"] })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "디벨롭 평균 ROR" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [selected.ror.development, "℃/min"] })] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "profile-notes",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "가스 운용" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: selected.gasNotes || "기록 없음" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "컵 노트 · 주의사항" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: selected.notes || "기록 없음" })] })]
					})
				]
			})]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "panel empty-state",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "아직 저장된 로스팅 프로파일이 없습니다." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "첫 프로파일을 등록하면 온도 곡선과 구간별 ROR이 여기에 표시됩니다." }),
				user.role === "admin" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "primary-button small",
					onClick: () => setEditing("new"),
					children: "첫 프로파일 만들기"
				})
			]
		})]
	});
}
function RoastProfileForm({ initial, onCancel, onSaved, notify }) {
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [points, setPoints] = (0, import_react.useState)(initial?.points ?? [
		{
			seconds: 0,
			beanTemp: 92,
			gasPressure: 80
		},
		{
			seconds: 120,
			beanTemp: 118,
			gasPressure: 75
		},
		{
			seconds: 300,
			beanTemp: 154,
			gasPressure: 55
		},
		{
			seconds: 480,
			beanTemp: 188,
			gasPressure: 35
		},
		{
			seconds: 600,
			beanTemp: 204,
			gasPressure: 0
		}
	]);
	const [totalSeconds, setTotalSeconds] = (0, import_react.useState)(initial?.totalSeconds ?? 600);
	function updatePoint(index, field, value) {
		setPoints((current) => current.map((point, pointIndex) => pointIndex === index ? {
			...point,
			[field]: value
		} : point));
	}
	function addPoint() {
		const last = points.at(-1) ?? {
			seconds: totalSeconds,
			beanTemp: 200,
			gasPressure: 0
		};
		const beforeLast = points.at(-2)?.seconds ?? 0;
		const seconds = Math.round((beforeLast + last.seconds) / 2);
		setPoints([
			...points.slice(0, -1),
			{
				seconds,
				beanTemp: last.beanTemp - 8,
				gasPressure: last.gasPressure
			},
			last
		].sort((a, b) => a.seconds - b.seconds));
	}
	async function submit(event) {
		event.preventDefault();
		setBusy(true);
		try {
			const body = {
				...Object.fromEntries(new FormData(event.currentTarget).entries()),
				id: initial?.id,
				totalSeconds,
				points
			};
			await requestJson("/api/roasting", {
				method: initial ? "PATCH" : "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body)
			});
			await onSaved();
		} catch (error) {
			notify({
				kind: "error",
				message: errorMessage(error)
			});
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
		eyebrow: "PROFILE EDITOR",
		title: initial ? "로스팅 프로파일 수정" : "새 로스팅 프로파일",
		description: "초 단위 온도와 가스 압력을 기록하면 배출 후 구간별 ROR과 디벨롭 비율이 자동 계산됩니다.",
		action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: "ghost-button",
			onClick: onCancel,
			children: "목록으로"
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "panel roast-form",
		onSubmit: submit,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "roast-form-section",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "section-index",
						children: "01 / 기본 정보"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "three-columns",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "원두명",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "beanName",
									defaultValue: initial?.beanName,
									required: true
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "산지",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "origin",
									defaultValue: initial?.origin,
									placeholder: "Ethiopia Guji"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "프로세스",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "process",
									defaultValue: initial?.process,
									placeholder: "Washed"
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "three-columns",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "배치 중량 (kg)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "batchWeight",
									type: "number",
									min: "0.01",
									step: "0.01",
									defaultValue: initial?.batchWeight ?? 1,
									required: true
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "투입 온도 (℃)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "chargeTemp",
									type: "number",
									min: "1",
									step: "0.1",
									defaultValue: initial?.chargeTemp ?? 185,
									required: true
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "배출 온도 (℃)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "dropTemp",
									type: "number",
									min: "1",
									step: "0.1",
									defaultValue: initial?.dropTemp ?? 204,
									required: true
								})
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "roast-form-section",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "section-index",
					children: "02 / 주요 시점"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "three-columns",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "옐로잉 시작 (초)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								name: "yellowingSeconds",
								type: "number",
								min: "1",
								step: "1",
								defaultValue: initial?.yellowingSeconds ?? 300,
								required: true
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "1차 크랙 시작 (초)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								name: "firstCrackSeconds",
								type: "number",
								min: "1",
								step: "1",
								defaultValue: initial?.firstCrackSeconds ?? 480,
								required: true
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "배출 / 총 시간 (초)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								name: "totalSeconds",
								type: "number",
								min: "1",
								step: "1",
								value: totalSeconds,
								onChange: (event) => {
									const next = Number(event.target.value);
									setTotalSeconds(next);
									setPoints((current) => current.map((point, index) => index === current.length - 1 ? {
										...point,
										seconds: next
									} : point));
								},
								required: true
							})
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "roast-form-section",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "section-heading",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "section-index",
						children: "03 / 온도 · 가스 포인트"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "ghost-button",
						onClick: addPoint,
						children: "포인트 추가"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "point-table",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "point-row header",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "시간(초)" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "원두 온도(℃)" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "가스 압력(%)" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
						]
					}), points.map((point, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "point-row",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "number",
								min: "0",
								step: "1",
								value: point.seconds,
								disabled: index === 0 || index === points.length - 1,
								onChange: (event) => updatePoint(index, "seconds", Number(event.target.value)),
								"aria-label": `${index + 1}번째 포인트 시간`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "number",
								min: "0",
								step: "0.1",
								value: point.beanTemp,
								onChange: (event) => updatePoint(index, "beanTemp", Number(event.target.value)),
								"aria-label": `${index + 1}번째 포인트 온도`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "number",
								min: "0",
								max: "100",
								step: "1",
								value: point.gasPressure,
								onChange: (event) => updatePoint(index, "gasPressure", Number(event.target.value)),
								"aria-label": `${index + 1}번째 포인트 가스 압력`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "remove-point",
								disabled: points.length <= 3 || index === 0 || index === points.length - 1,
								onClick: () => setPoints(points.filter((_, pointIndex) => pointIndex !== index)),
								children: "삭제"
							})
						]
					}, `${index}-${point.seconds}`))]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "roast-form-section",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "section-index",
					children: "04 / 따라 하기 노트"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "two-columns",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "가스 운용 메모",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							name: "gasNotes",
							rows: 5,
							defaultValue: initial?.gasNotes,
							placeholder: "예: 투입 80%, 옐로잉 60%, 1차 크랙 직전 35%"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "컵 노트 · 주의사항",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							name: "notes",
							rows: 5,
							defaultValue: initial?.notes,
							placeholder: "배출 기준, 향미, 다음 배치 보정 사항"
						})
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "form-actions",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "ghost-button",
					onClick: onCancel,
					children: "취소"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "primary-button",
					disabled: busy,
					children: busy ? "계산·저장 중…" : "프로파일 저장"
				})]
			})
		]
	})] });
}
function RoastCurve({ profile }) {
	const canvasRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
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
			const pad = {
				left: 46,
				right: 28,
				top: 28,
				bottom: 36
			};
			const chartWidth = width - pad.left - pad.right;
			const chartHeight = height - pad.top - pad.bottom;
			const temperatures = profile.points.map((point) => point.beanTemp);
			const minTemp = Math.floor((Math.min(...temperatures) - 10) / 10) * 10;
			const maxTemp = Math.ceil((Math.max(...temperatures) + 10) / 10) * 10;
			const x = (seconds) => pad.left + seconds / profile.totalSeconds * chartWidth;
			const y = (temp) => pad.top + (maxTemp - temp) / (maxTemp - minTemp) * chartHeight;
			const yGas = (gas) => pad.top + (100 - gas) / 100 * chartHeight;
			context.clearRect(0, 0, width, height);
			context.fillStyle = "#f5f5f5";
			context.fillRect(0, 0, width, height);
			context.strokeStyle = "#d6d6d6";
			context.lineWidth = 1;
			context.fillStyle = "#6f6f6f";
			context.font = "11px Arial";
			for (let index = 0; index <= 4; index += 1) {
				const gridY = pad.top + chartHeight / 4 * index;
				context.beginPath();
				context.moveTo(pad.left, gridY);
				context.lineTo(width - pad.right, gridY);
				context.stroke();
				const label = Math.round(maxTemp - (maxTemp - minTemp) / 4 * index);
				context.fillText(`${label}°`, 8, gridY + 4);
			}
			[[profile.yellowingSeconds, "옐로잉"], [profile.firstCrackSeconds, "1차 크랙"]].forEach(([seconds, label]) => {
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
			for (let seconds = 0; seconds <= profile.totalSeconds; seconds += Math.max(60, Math.round(profile.totalSeconds / 5 / 60) * 60)) context.fillText(formatTime(seconds), x(seconds) - 12, height - 13);
		};
		draw();
		const observer = new ResizeObserver(draw);
		observer.observe(canvas);
		return () => observer.disconnect();
	}, [profile]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "curve-wrap",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "curve-legend",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "temp-line" }),
				"원두 온도 ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "gas-line" }),
				"가스 압력"
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
			ref: canvasRef,
			"aria-label": `${profile.beanName} 로스팅 온도 및 가스 압력 그래프`
		})]
	});
}
function StaffView({ notify }) {
	const [staff, setStaff] = (0, import_react.useState)([]);
	const [audits, setAudits] = (0, import_react.useState)([]);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const load = (0, import_react.useCallback)(async () => {
		try {
			const result = await requestJson("/api/staff");
			setStaff(result.staff);
			setAudits(result.audits);
		} catch (error) {
			notify({
				kind: "error",
				message: errorMessage(error)
			});
		}
	}, [notify]);
	(0, import_react.useEffect)(() => {
		load();
	}, [load]);
	async function addStaff(event) {
		event.preventDefault();
		setBusy(true);
		try {
			await requestJson("/api/staff", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries()))
			});
			event.currentTarget.reset();
			await load();
			notify({
				kind: "ok",
				message: "직원이 등록되어 바로 로그인할 수 있습니다."
			});
		} catch (error) {
			notify({
				kind: "error",
				message: errorMessage(error)
			});
		} finally {
			setBusy(false);
		}
	}
	async function updateStaff(member, patch) {
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
					active: Boolean(patch.active ?? member.active)
				})
			});
			await load();
			notify({
				kind: "ok",
				message: "직원 권한이 변경됐습니다."
			});
		} catch (error) {
			notify({
				kind: "error",
				message: errorMessage(error)
			});
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "page-section",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				eyebrow: "ACCESS CONTROL",
				title: "담당 업무만 선택해서 공개",
				description: "수업 사용 기록은 모든 직원에게 제공하고, 매출·재고·로스팅 메뉴는 직원별로 선택합니다."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "staff-layout",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "panel staff-form",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "panel-heading",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "eyebrow",
							children: "NEW STAFF"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "직원 등록" })] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: addStaff,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "이름",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "name",
									required: true,
									maxLength: 40
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "휴대폰 번호",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "phone",
									type: "tel",
									inputMode: "numeric",
									placeholder: "010-0000-0000",
									required: true
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "직원 구분",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									name: "role",
									defaultValue: "instructor",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "instructor",
											children: "시간강사"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "employee",
											children: "정규직원"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "admin",
											children: "관리자 · 모든 메뉴"
										})
									]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
								className: "permission-fieldset",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", { children: "추가 메뉴 권한" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "수업 기록은 기본으로 제공됩니다." }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "permission-grid",
										children: permissionOptions.map((permission) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "permission-choice",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												name: permission.field,
												type: "checkbox"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: permission.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: permission.description })] })]
										}, permission.field))
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "primary-button",
								disabled: busy,
								children: busy ? "등록 중…" : "직원 등록"
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "panel staff-list-panel",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "panel-heading",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "eyebrow",
							children: "AUTHORIZED STAFF"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "등록 직원" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "count-badge",
							children: [staff.filter((member) => member.active).length, "명 사용 중"]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "staff-list",
						children: staff.map((member) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: member.active ? "staff-row" : "staff-row inactive",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "staff-summary",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "staff-avatar",
										children: member.name.slice(0, 1)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "staff-identity",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: member.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["휴대폰 끝 4자리 · ", member.phoneLast4] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "toggle",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: Boolean(member.active),
											"aria-label": `${member.name} 계정 ${member.active ? "비활성화" : "활성화"}`,
											onChange: (event) => void updateStaff(member, { active: event.target.checked ? 1 : 0 })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})]
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "staff-access-controls",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: member.role,
									onChange: (event) => void updateStaff(member, { role: event.target.value }),
									"aria-label": `${member.name} 직원 구분`,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "admin",
											children: "관리자"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "employee",
											children: "정규직원"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "instructor",
											children: "시간강사"
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "staff-permissions",
									"aria-label": `${member.name} 메뉴 권한`,
									children: permissionOptions.map((permission) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: member.role === "admin" || Boolean(member[permission.field]),
										disabled: member.role === "admin",
										onChange: (event) => void updateStaff(member, { [permission.field]: event.target.checked ? 1 : 0 })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: permission.label })] }, permission.field))
								})]
							})]
						}, member.id))
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "panel audit-panel",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "panel-heading",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "eyebrow",
						children: "AUDIT TRAIL"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "최근 변경 기록" })] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "audit-list",
					children: audits.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatDateTime(entry.createdAt) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: entry.actorName ?? "시스템" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
							auditLabel(entry.action),
							" · ",
							entry.detail || entry.entityType
						] })
					] }, entry.id))
				})]
			})
		]
	});
}
function MovementTable({ movements }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "table-wrap",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "일자" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "품목" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "구분" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "수량" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "수업 / 메모" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "비용" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "등록자" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {})
		] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: movements.length ? movements.map((movement) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: movement.movementDate }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: movement.itemName }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: `movement-badge ${movement.movementType}`,
				children: movementLabel[movement.movementType] ?? movement.movementType
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
				className: movement.quantity < 0 ? "expense" : "income",
				children: [
					movement.quantity > 0 ? "+" : "",
					number.format(movement.quantity),
					movement.unit
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: movement.className || movement.note || "—" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: movement.costAmount ? won.format(movement.costAmount) : "—" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: movement.createdByName }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: movement.hasReceipt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				className: "receipt-link",
				href: `/api/receipts/${movement.id}`,
				target: "_blank",
				rel: "noreferrer",
				children: "영수증"
			}) : null })
		] }, movement.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
			colSpan: 8,
			className: "empty-cell",
			children: "아직 기록이 없습니다."
		}) }) })] })
	});
}
function PageHeader({ eyebrow, title, description, action }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "page-header",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "eyebrow",
				children: eyebrow
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: title }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: description })
		] }), action && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "page-action",
			children: action
		})]
	});
}
function KpiCard({ label, value, meta, tone = "light" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: `kpi-card ${tone}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: value }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: meta })
		]
	});
}
function Metric({ label, value, accent = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: accent ? "metric accent" : "metric",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: value })]
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "field",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), children]
	});
}
function Toast({ toast }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `toast ${toast.kind}`,
		role: "status",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: toast.kind === "ok" ? "완료" : "확인" }), toast.message]
	});
}
async function requestJson(url, init) {
	const response = await fetch(url, init);
	const body = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(body.error || "요청을 처리하지 못했습니다.");
	return body;
}
async function optimizeReceipt(source) {
	const image = await loadReceiptImage(source);
	const canvas = document.createElement("canvas");
	const context = canvas.getContext("2d");
	if (!context) throw new Error("이미지를 최적화할 수 없습니다.");
	let maxSide = 1600;
	let quality = .8;
	let blob = null;
	for (let attempt = 0; attempt < 7; attempt += 1) {
		const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
		canvas.width = Math.max(1, Math.round(image.width * scale));
		canvas.height = Math.max(1, Math.round(image.height * scale));
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = "#ffffff";
		context.fillRect(0, 0, canvas.width, canvas.height);
		context.drawImage(image.source, 0, 0, canvas.width, canvas.height);
		blob = await new Promise((resolve, reject) => {
			canvas.toBlob((result) => result ? resolve(result) : reject(/* @__PURE__ */ new Error("이미지 변환에 실패했습니다.")), "image/jpeg", quality);
		});
		if (blob.size <= 85e4) break;
		maxSide = Math.round(maxSide * .82);
		quality = Math.max(.58, quality - .07);
	}
	image.close();
	if (!blob || blob.size > 1e6) throw new Error("영수증 이미지를 1MB 이하로 줄일 수 없습니다. 다른 사진을 선택해 주세요.");
	return new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" });
}
async function loadReceiptImage(source) {
	if (typeof createImageBitmap === "function") try {
		const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
		return {
			source: bitmap,
			width: bitmap.width,
			height: bitmap.height,
			close: () => bitmap.close()
		};
	} catch {}
	const objectUrl = URL.createObjectURL(source);
	try {
		const image = await new Promise((resolve, reject) => {
			const element = new Image();
			element.decoding = "async";
			element.onload = () => resolve(element);
			element.onerror = () => reject(/* @__PURE__ */ new Error("이 기기에서 영수증 이미지를 읽을 수 없습니다."));
			element.src = objectUrl;
		});
		return {
			source: image,
			width: image.naturalWidth,
			height: image.naturalHeight,
			close: () => URL.revokeObjectURL(objectUrl)
		};
	} catch (error) {
		URL.revokeObjectURL(objectUrl);
		throw error;
	}
}
function sum(values) {
	return values.reduce((total, value) => total + Number(value), 0);
}
function errorMessage(error) {
	return error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.";
}
function currentKoreanDate() {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Seoul",
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).formatToParts(/* @__PURE__ */ new Date());
	const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
	return `${values.year}-${values.month}-${values.day}`;
}
function formatTime(seconds) {
	return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}
function formatDateTime(value) {
	const date = new Date(value.endsWith("Z") ? value : `${value.replace(" ", "T")}Z`);
	return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ko-KR", {
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit"
	}).format(date);
}
function auditLabel(action) {
	return {
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
		delete_roast_profile: "프로파일 삭제"
	}[action] ?? action;
}
//#endregion
export { EduSystemApp };
