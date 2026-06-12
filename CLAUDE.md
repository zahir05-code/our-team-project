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
| `templates/index.html` | v4.0 | 단일 HTML, 4탭 구조 |
| `static/js/app.js` | v4.0 | 전체 앱 로직 |
| `static/js/i18n.js` | v3.4 | 한국어/영어 다국어 |
| `static/css/style.css` | v4.0 | 전체 스타일 |

**버전 캐시 무효화**: HTML에서 `?v=X.X` 쿼리스트링으로 관리. 파일 수정 시 반드시 버전 올릴 것.

---

## 프론트엔드 구조 (app.js 핵심)

### 4탭 구조
```
🎯 맞춤복지 (homePanel)   — 3단계 챗봇 + 결과
📅 복지달력 (calendarPanel) — WELFARE_CALENDAR 데이터
🏛 지역서비스 (localPanel)  — LOCAL_PUBLIC 오프라인 자원
🛒 장바구니 (myinfoPanel)   — 저장 혜택 + 신청 현황 추적
```

### localStorage 키
```js
PROFILE_KEY = "athena_profile_v1"   // 사용자 프로필
SAVED_KEY   = "athena_saved_results" // 저장된 혜택 장바구니
```

### 결과 카드 2종
- **온톨로지 카드** (`.ont-card`): 정적 DB 매칭 결과, DEFINITE/POSSIBLE/FUTURE 3단계
- **복지로 스타일 카드** (`.bk-card`): Supabase 실시간 정책, 담당부처·제공유형·신청방법·문의처 메타행

### 신청 URL 라우팅 (`buildApplyUrl(p)`)
우선순위: `wlfareInfoId` 포함 URL → `policy_id`로 복지로 상세 → 경기도 정책 → 일반 URL → 서비스명 검색 fallback

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

## 수정 시 체크리스트

- JS/CSS 수정 → `index.html`의 `?v=X.X` 버전 올리기
- 새 복지 항목 추가 → `WELFARE_CALENDAR` detail 객체 필수 포함
- 지역 추가 → `welfare_analyzer/models/user_profile.py` ALLOWED 목록 + `api/routers/welfare.py` 검증 동시 수정
- Supabase 정책 구조 변경 → `api/schemas.py:SupabasePolicy` + `ontology/welfare_collector.py` 동시 수정
- 배포: `git push origin main` → Railway 자동 빌드 (1~2분 소요)
