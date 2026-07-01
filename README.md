# TheCup Inventory — Cloudflare + GitHub 버전

구글 앱스크립트 재고관리 웹앱을 Cloudflare Workers Static Assets + D1 구조로 재구현한 버전입니다. 프론트엔드는 `public/index.html`, API는 `src/worker.js`, 데이터베이스는 Cloudflare D1 SQLite를 사용합니다.

## 핵심 개선점

- 구글 스프레드시트 의존 제거: D1 데이터베이스에 직접 저장
- 행 번호 삭제 문제 개선: `rowIndex`가 아닌 고유 `id` 기준 삭제
- 수량 오차 개선: kg 소수 계산을 정수 `amount_mkg`로 저장
- 재고 음수 방지: 차감 전 서버에서 현재고 재검증
- GREEN / ROASTED 분리: 같은 품목명과 LOT라도 카테고리별 별도 집계
- LOT 날짜 검증: `26.02.31` 같은 잘못된 날짜 차단
- 유통기한 계산: GREEN +2년, ROASTED +1년
- 품목명·가공방식 기준 통합 재고: 에티오피아처럼 품종/지역/가공이 다른 항목을 무조건 원산지 하나로 합치지 않음
- Basic Auth 지원: `APP_PASSWORD` 등록 시 전체 앱 접속에 아이디/비밀번호 적용
- CSV 내보내기 지원: `/api/export.csv`

## 1. 로컬 준비

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

로컬에서 `APP_PASSWORD`를 비워두면 인증 없이 테스트할 수 있습니다. `.dev.vars`에 비밀번호를 넣으면 브라우저 기본 로그인 창이 뜹니다.

## 2. D1 데이터베이스 생성

```bash
npx wrangler login
npm run db:create
```

명령 실행 후 출력되는 `database_id`를 `wrangler.jsonc`의 `database_id`에 넣습니다.

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "thecup-inventory-db",
    "database_id": "여기에_출력된_ID_입력"
  }
]
```

## 3. 테이블 생성

```bash
npm run db:migrate:remote
```

로컬 테스트용 DB에만 적용하려면 아래 명령을 사용합니다.

```bash
npm run db:migrate:local
```

## 4. 접속 비밀번호 등록

```bash
npx wrangler secret put APP_PASSWORD
```

아이디를 바꾸고 싶다면 아래도 등록합니다. 기본 아이디는 `admin`입니다.

```bash
npx wrangler secret put APP_USER
```

더 강한 사내 접근 제어가 필요하면 Cloudflare Zero Trust Access를 Worker 앞에 붙이는 것을 권장합니다.

## 5. 배포

```bash
npm run deploy
```

## 6. GitHub 연동 운영 방식

1. 이 폴더를 GitHub 새 저장소에 업로드합니다.
2. Cloudflare Dashboard → Workers & Pages → Workers → Create 또는 연결된 Worker 선택
3. GitHub repository를 연결합니다.
4. Build command는 비워두거나 `npm install` 없이 Wrangler 배포 설정을 사용합니다.
5. Cloudflare에서 D1 binding 이름이 `DB`인지 확인합니다.
6. `main = src/worker.js`, static assets directory는 `public` 구조를 유지합니다.

Cloudflare GitHub 연동을 사용하면 GitHub에 push할 때마다 자동으로 배포됩니다.

## 7. 기존 구글시트 데이터 이전

구글시트의 Inventory 시트를 CSV로 내려받은 뒤, 헤더를 아래 중 하나와 맞춥니다.

| 권장 헤더 | 기존 의미 |
|---|---|
| created_at | 기록일 |
| item | 품목명 |
| lot | LOT |
| type | 입고 / 로스팅 등 |
| amount_kg | kg 수량 |
| expiry_date | 유통기한 |
| process | 프로세스 |
| category | GREEN / ROASTED |

변환:

```bash
node scripts/csv-to-seed-sql.mjs ./inventory.csv ./scripts/seed.sql
```

D1에 반영:

```bash
npx wrangler d1 execute thecup-inventory-db --remote --file=./scripts/seed.sql
```

## 8. 파일 구조

```text
public/index.html              # 재고관리 화면
src/worker.js                  # API + 인증 + 정적 파일 서빙
migrations/0001_init.sql       # D1 테이블 생성
scripts/csv-to-seed-sql.mjs    # 기존 CSV → SQL 변환
wrangler.jsonc                 # Cloudflare 배포 설정
```

## 9. 운영 메모

- 차감 기록은 `로스팅` 타입으로 저장됩니다. 필요하면 `출고`, `폐기`, `샘플` 등으로 확장할 수 있습니다.
- 삭제는 실제 DB에서 삭제합니다. 감사 로그가 필요하면 `deleted_at` 방식의 소프트 삭제로 바꾸면 됩니다.
- 수량은 화면에서는 kg로 보이지만 DB에는 0.001kg 단위 정수로 저장됩니다.
