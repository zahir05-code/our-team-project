# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

**아테나(Athena)** — 서울·경기 거주자 대상 맞춤 복지서비스 조회 앱  
배포 주소: **https://lingostaredu.app**  
저장소: `https://github.com/zahir05-code/our-team-project.git` (branch: `main`)  
배포 플랫폼: **Railway** (git push → 자동 빌드 배포, `railway.toml` 기준)

---

## 실행 및 배포 명령

```bash
# 로컬 서버 실행
uvicorn api.app:app --reload --port 8000

# 배포 (Railway 자동 빌드)
git add <파일들>
git commit -m "메시지"
git push origin main

# 서버 시작 명령 (railway.toml)
uvicorn api.app:app --host 0.0.0.0 --port $PORT
```

헬스체크: `GET /health`  
Supabase 연결 진단: `GET /api/db/test`  
정책 갱신 상태: `GET /api/policies/status`

---

## 보안 절대 원칙 (위반 불가)

1. **개인정보 로컬 전용** — 사용자 입력값은 브라우저 `localStorage`에만 저장, 외부 서버 미전송
2. **카카오 로그인 없음** — 소셜 로그인 기능 미탑재
3. **허용 지역 서울·경기만** — `ALLOWED_REGIONS = {"서울특별시", "경기도"}` (변경 금지)
4. **Human-in-the-Loop** — 명시적 승인 없이 자율 실행 금지
5. **GitHub 업로드 금지 파일**: `reports/drafts/`, `*.db`, `claudecode.md`, `.env`

---

## 아키텍처

### 전체 흐름
```
브라우저 SPA (Vanilla JS)
  ↕ fetch POST
FastAPI (api/app.py)
  ├─ /welfare/search     ← ProfileRequest → 링크 결과
  ├─ /welfare/nlp-search ← 자연어 → NER → ProfileRequest → 링크 결과
  └─ /welfare/situations, /regions, /debug/ontology
         ↓
  chatbot/parser.py  → UserProfile 생성
  ontology/knowledge_graph.py → 3단계 매칭 (DEFINITE/POSSIBLE/FUTURE)
  welfare_analyzer/api/link_connector.py → 중앙+지자체 링크 생성
  ontology/welfare_collector.py → Supabase 실시간 정책 조회
```

### 핵심 파일 역할

| 파일 | 역할 |
|------|------|
| `api/app.py` | FastAPI 앱, 정적파일 서빙, 스케줄러 시작/종료 |
| `api/routers/welfare.py` | `/welfare/*` 엔드포인트 전부 |
| `api/schemas.py` | Pydantic 요청·응답 모델 전체 |
| `welfare_analyzer/models/user_profile.py` | `UserProfile`, `LifeSituation`, `AgeGroup` Enum, 지역 화이트리스트 |
| `chatbot/parser.py` | 챗봇 answers dict → `UserProfile` 변환 |
| `ontology/knowledge_graph.py` | 정책 온톨로지 매칭 엔진 (DEFINITE/POSSIBLE/FUTURE 3단계) |
| `ontology/policies_db.py` | 정적 정책 DB (Python 내장, 50개+) |
| `ontology/welfare_collector.py` | 정부API(data.go.kr) → XML 파싱 → Supabase upsert |
| `ontology/policy_updater.py` | APScheduler 기반 자동 갱신 (매일 1회) |
| `config/settings.py` | 전역 경로, API URL, 복지 키워드 분류 |

### 프론트엔드 (Vanilla JS SPA)

| 파일 | 버전 | 역할 |
|------|------|------|
| `templates/index.html` | v5.9 | 단일 HTML, 3탭 구조 (맞춤복지 탭 제거) |
| `static/js/app.js` | v5.9 | 전체 앱 로직 |
| `static/js/i18n.js` | v3.4 | 한국어/영어 다국어 |
| `static/css/style.css` | v5.7 | 전체 스타일 |
| `static/js/welfareDeepLinks.json` | — | 복지서비스 직접 URL 딥링크 테이블 (50개) |

**버전 캐시 무효화**: HTML에서 `?v=X.X` 쿼리스트링으로 관리. 파일 수정 시 반드시 버전 올릴 것.

---

## 프론트엔드 구조 (app.js 핵심)

### 3탭 구조 (하단 네비게이션)
```
📅 복지달력  (calendarPanel) — WELFARE_CALENDAR 데이터, 월별 신청 일정
🏛 지역서비스 (localPanel)   — LOCAL_PUBLIC 오프라인 자원 + 복지전문가 조회
🛒 장바구니  (myinfoPanel)   — 저장 혜택 + 신청 현황 추적
```
- 로고(🏛 아테나) 클릭 → `bnavGo('home')` → `resetToHome()` — 맞춤복지 입력 화면으로 복귀
- 맞춤복지(homePanel/main)는 하단 탭 버튼 없이 로고로만 접근

### localStorage 키
```js
PROFILE_KEY = "athena_profile_v1"   // 사용자 프로필
SAVED_KEY   = "athena_saved_results" // 저장된 혜택 장바구니
```

### 결과 카드 2종
- **온톨로지 카드** (`.ont-card`): 정적 DB 매칭 결과, DEFINITE/POSSIBLE/FUTURE 3단계
- **복지로 스타일 카드** (`.bk-card`): Supabase 실시간 정책, 담당부처·제공유형·신청방법·문의처 메타행

### 카드 UI 원칙 (전 탭 통일)
- **선정이유 아코디언 없음** — 제거 완료
- **하단 단독 신청 버튼 없음** — 제거 완료
- **신청 링크 위치**: "신청하기" 아코디언 내부 `.acc-site-link` 파란 버튼
- 적용 탭: 맞춤복지 결과, 복지전문가 조회, 장바구니 상세, 복지달력 상세

### 신청 URL 라우팅 (`buildApplyUrl(p)`) — 4순위
```
0순위: welfareDeepLinks.json 딥링크 테이블 (직접 상세 URL)
1순위: wlfareInfoId 포함 URL → 복지로 서비스 상세 페이지
2순위: SITE_LABELS 기관 전용 URL (nhis, moel, mogef 등)
3순위: 경기도 → ggwf 검색
4순위: bokjiro 통합검색 fallback (최후 수단)
```
- **모든 카드 타입(ont/bk) buildApplyUrl() 통일 적용** (v5.6 ~)

### 딥링크 시스템
```
scripts/build_welfare_deeplinks.py   — 자동 매칭 스크립트
data/extracted_services.json         — 앱 DB 추출 서비스 목록
data/official_welfare_services.csv   — 공식 복지서비스 기준 데이터 (43개)
static/js/welfareDeepLinks.json      — 빌드 결과 (50개 서비스, 직접 URL)
```
매칭 우선순위: 완전일치 → 포함일치 → 유사도(≥0.75) → fallback  
**원칙**: 검색 페이지 URL 금지. 반드시 서비스 상세 페이지 직접 URL 저장.

### 복지달력 상세 시트 (`openCalDetail(idx)`)
카드 클릭 → 앱 내 슬라이드업 시트 (외부 이동 없음)  
각 항목: 지원대상·지원내용·신청방법·신청기간·문의처·직접신청URL  
데이터: `WELFARE_CALENDAR[idx].detail` 객체

---

## Supabase 연동

- **프로젝트 ID**: `nuowdokepbogllresdyo`
- **테이블**: `welfare_policies`
- **환경변수**:
  - `SUPABASE_URL` — 프로젝트 URL
  - `SUPABASE_KEY` — anon key (읽기)
  - `SUPABASE_SERVICE_KEY` — service_role key (쓰기, RLS 우회)
  - `GOV_WELFARE_API_KEY` — 정부24 공공데이터포털 API 키

---

## API 엔드포인트

```
POST /welfare/search          ProfileRequest → ProfileResponse
POST /welfare/nlp-search      NlpRequest → NlpResponse
GET  /welfare/situations      LifeSituation 선택지 목록
GET  /welfare/regions         허용 지역·구 목록
GET  /welfare/debug/ontology  온톨로지 샘플 매칭 (개발용)
GET  /health                  서버 상태
GET  /api/db/test             Supabase 연결 진단
GET  /api/policies/status     정책 갱신 현황
GET  /api/policies/count      정책 개수
```

---

## 주요 데이터 모델

### UserProfile 생성 경로
```
챗봇 answers dict
  → chatbot/parser.py:build_profile()
  → UserProfile(age_group, region, district, life_situations, work_status, family_status, income_range, gender, active_sources, family_members)
```

### LifeSituation (선택지 — 변경 시 프론트와 동기화 필수)
`생활비·식비가 부족해요 / 병원비·건강이 걱정돼요 / 주거가 불안정해요 / 교육비·돌봄이 필요해요 / 취업·일자리가 필요해요 / 갑작스러운 위기 상황이에요 / 노인 돌봄이 필요해요 / 장애·만성질환이 있어요`

### 온톨로지 매칭 결과
- `DEFINITE`: 조건 전부 충족 → 즉시 신청 가능
- `POSSIBLE`: 일부 충족, 확인 필요
- `FUTURE`: 현재 미해당, 향후 해당 가능성

---

## 복지달력 데이터 (`WELFARE_CALENDAR`)

`app.js` 내 상수 배열. 각 항목 구조:
```js
{
  month: 0~12,  // 0=상시
  tag: "표시용 라벨",
  color: "#hex",
  name: "혜택명",
  desc: "한 줄 설명",
  detail: {
    target: "지원 대상",
    benefit: "지원 내용",
    how: "신청 방법",
    period: "신청 기간",
    contact: "문의처",
    applyUrl: "직접 신청 URL",
    applyLabel: "버튼 텍스트",
  }
}
```
**정보 출처 원칙**: 공식 정부 공지·복지로 기준. AI 추측 정보 입력 금지.

---

## 지역서비스 데이터 (`LOCAL_PUBLIC`)

`app.js` 내 상수 객체. 키: `"서울특별시"` / `"경기도"`.  
각 항목: `{ type, name, addr, tel, desc, url, hours }`  
type 분류: `welfare(복지관) / center(주민센터) / meal(무료급식) / health(보건소) / counsel(상담센터)`

---

## 장바구니 (혜택 저장)

```js
// 저장 구조
{
  savedAt: "2026.06.12",
  summary: "서비스명 외 N건",
  count: N,
  items: [{ name, desc, url, policyId, type:"ont"|"bk" }]
}
// 상태 추적
item.status = "none"(미신청) | "pending"(신청예정) | "done"(완료)
```

`saveResultToMyPage()` — 결과 화면 `.ont-card` + `.bk-card` 수집 후 저장  
`openSavedDetail(idx)` — 장바구니 상세 시트 열기 (buildApplyUrl 재적용)

---

## 장바구니 프로필 수정 기능 (v5.7~)

```
장바구니 탭 → "✏️ 정보 수정하기" 버튼 → profileEditModal 하단 시트
수정 항목: 지역(서울/경기) / 시·군·구 / 나이 / 소득구간
저장 → localStorage PROFILE_KEY 즉시 업데이트 → renderMyinfoProfile() 갱신
```
관련 함수: `myinfoEditProfile()`, `pePickRegion()`, `saveEditProfile()`, `closeProfileEdit()`

---

## URL 관리 원칙 (중요)

### 복지서비스 URL 우선순위
1. **복지로 직접 상세**: `moveTWAT52011M.do?wlfareInfoId=WLF00XXXXXX` ← 최우선
2. **기관 공식 사이트 직접 페이지**: nhis.or.kr, mogef.go.kr, moel.go.kr 등 특정 정책 페이지
3. **지자체 공식 사이트**: youth.seoul.go.kr, basicincome.gg.go.kr 등
4. **bokjiro 통합검색 금지**: 검색 결과 페이지도 금지. 반드시 해당 서비스 상세 페이지

### 확인된 작동 URL 패턴
```
복지로 상세: https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00XXXXXX
복지로 검색: https://www.bokjiro.go.kr/ssis-tbu/search/search.do?query=XXX  ← 최후 fallback만
```

### 확인된 작동 기관 URL
| 기관 | URL |
|------|-----|
| 복지로 | bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/... |
| 국민건강보험 | nhis.or.kr/nhis/policy/... |
| 워크넷 | work.go.kr/empInfo/... |
| 고용보험 | ei.go.kr/ei/eih/... |
| 새일센터 | saeil.mogef.go.kr |
| 여성가족부 | mogef.go.kr/mp/pcd/... |
| 서민금융진흥원 | kinfa.or.kr/product/... |
| 소상공인진흥공단 | semas.or.kr/web/... |
| 문화누리카드 | mnuri.kr |
| 에너지바우처 | energyvoucher.or.kr |
| LH공사 | lh.or.kr |
| 중앙치매센터 | nid.or.kr |
| 서울청년포털 | youth.seoul.go.kr |
| 서울복지포털 | welfare.seoul.go.kr |
| 경기도기본소득 | basicincome.gg.go.kr |
| 경기일자리재단 | jobaba.net |
| 서울정신건강 | seoulmentalhealth.kr |
| 경기정신건강 | gmhc.or.kr |
| 아이돌봄 | idolbom.go.kr |

### 사용 금지 URL (연결 불가 확인)
- `www.danuri.go.kr` — ERR_CONNECTION_REFUSED (다누리 포털 접속 불가)
- `www.ggmhc.or.kr` — DNS_NXDOMAIN (오타, 실제: gmhc.or.kr)
- `blutouch.net` — 불안정 (대체: seoulmentalhealth.kr)
- `liveinkorea.kr` — 서비스 종료 (대체: danuri → mogef)
- `bokjiro.go.kr` 홈(/)  — 서비스 첫 페이지, 직접 연결 불가

---

## 수정 시 체크리스트

- JS/CSS 수정 → `index.html`의 `?v=X.X` 버전 올리기 (app.js: v5.9, style.css: v5.7)
- 새 복지 항목 추가 → `WELFARE_CALENDAR` detail 객체 필수 포함
- 딥링크 추가/수정 → `static/js/welfareDeepLinks.json` 직접 편집 (검색 URL 금지)
- 지역 추가 → `welfare_analyzer/models/user_profile.py` ALLOWED 목록 + `api/routers/welfare.py` 검증 동시 수정
- Supabase 정책 구조 변경 → `api/schemas.py:SupabasePolicy` + `ontology/welfare_collector.py` 동시 수정
- 배포: `git push origin main` → Railway 자동 빌드 (1~2분 소요)

---

## 작업 이력 (v5.x)

| 버전 | 주요 변경 |
|------|----------|
| v5.0 | 맞춤복지 하단 탭 제거 → 3탭 네비게이션, 로고 클릭 = 홈 리셋 |
| v5.1 | 선정이유 제거, 하단 신청버튼 제거, 신청링크 아코디언 내부 이동 |
| v5.2 | 딥링크 JSON 시스템 구축 (welfareDeepLinks.json, build_welfare_deeplinks.py) |
| v5.3 | policies_db.py 실제 WLF ID 22개 교체, WELFARE_CALENDAR 가짜 ID 수정 |
| v5.4 | buildApplyUrl 4순위 라우팅, 복지전문가 조회 신설 |
| v5.5 | 경기 정신건강복지센터 URL 수정 (ggmhc→gmhc) |
| v5.6 | 복지전문가 ont카드 buildApplyUrl 우회 버그 수정 |
| v5.7 | API 오류 [object Object] 수정, 장바구니 프로필 인라인 편집 모달 |
| v5.8 | danuri.go.kr 전체 교체, blutouch→seoulmentalhealth |
| v5.9 | 검색 URL 전량 제거 → 서비스별 직접 상세 URL 완전 교체 |
