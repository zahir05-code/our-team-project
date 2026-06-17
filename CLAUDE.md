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

## 🚨 에이전트 필수 준수사항 — URL·정책 연결 절대 원칙

> **아테나의 핵심 가치**: 복지로 홈페이지보다 **더 빠르고 더 정확하게** 해당 서비스 신청 페이지로 직접 연결한다.  
> 틀린 정책 연결 = 사용자 신뢰 파괴 = 앱 존재 가치 상실.  
> 이 섹션은 코드 작업 전 반드시 정독할 것.

---

### 1. WLF ID 사용 절대 원칙

| 규칙 | 내용 |
|------|------|
| **검증 필수** | WLF ID를 코드에 쓰기 전 반드시 `data/official_welfare_services.csv` 에서 해당 ID와 서비스명 일치 여부 확인 |
| **추측 금지** | CSV에 없는 WLF ID는 절대 사용 금지. 틀린 ID는 전혀 다른 정책(예: 행려사망자 장제비)으로 연결될 수 있음 |
| **복사·붙여넣기 금지** | 유사 정책에서 ID를 복사해 추측 사용 금지 — 반드시 CSV에서 직접 조회 |
| **대안** | CSV에 ID가 없으면 `bokjiro 키워드검색 URL` 을 fallback으로 사용 (`search.do?query=서비스명`) |

**CSV 확인 방법**:
```bash
grep "서비스명" data/official_welfare_services.csv
```

**검증된 주요 WLF ID (CSV 기준, 43건)**:
```
WLF00004558  국민기초생활보장(생계급여)
WLF00004559  의료급여
WLF00004560  주거급여
WLF00004561  교육급여
WLF00004562  해산·장제급여
WLF00004563  자활급여
WLF00004564  긴급복지지원
WLF00004565  노인장기요양보험         ← NHIS_001
WLF00004566  영유아보육료지원         ← ⚠️ 양곡지원이 아님!
WLF00004567  가정양육수당
WLF00004568  아동수당
WLF00004569  한부모가족지원
WLF00004570  노인일자리및사회활동지원  ← ⚠️ 독거노인관리사가 아님!
WLF00004571  기초연금
WLF00004572  노인맞춤돌봄서비스
WLF00004573  장애인연금
WLF00004574  문화누리카드
WLF00004575  장애수당
WLF00004576  장애아동수당
WLF00004577  임신·출산 진료비지원(국민행복카드)
WLF00004578  청소년특별지원
WLF00009830  가사간병방문지원서비스    ← CARE_001
WLF00010086  에너지바우처
WLF00003124  발달재활서비스           ← DISABLED_001 (미CSV확인 — 주의)
WLF00018636  청년도약계좌
```

---

### 2. 지역별 정책 라우팅 원칙

| 정책 출처 | URL 라우팅 |
|-----------|-----------|
| **중앙부처 정책** | 복지로 WLF 직접 상세 URL (`moveTWAT52011M.do?wlfareInfoId=WLF...`) |
| **서울시 정책** | `youth.seoul.go.kr`, `welfare.seoul.go.kr`, `wis.seoul.go.kr` 등 서울 공식 직접 페이지 |
| **경기도 정책** | `ggwf.or.kr`, `youth.gg.go.kr`, `jobaba.net` 등 경기 공식 직접 페이지 |
| **고용노동부** | `work24.go.kr` (구 워크넷 통합), `ei.go.kr` — ⚠️ `work.go.kr` 서비스 종료, 사용 금지 |
| **건강보험공단** | `nhis.or.kr` 서비스별 직접 경로 |

> ⚠️ 서울 정책에 경기 URL, 경기 정책에 서울 URL 절대 혼용 금지

---

### 3. URL 검증 프로토콜

URL을 새로 추가하거나 변경할 때:

```bash
# 1. HTTP 상태 코드 확인 (200이어야 함)
curl -o /dev/null -s -w "%{http_code}" "URL주소"

# 2. 최종 리다이렉트 목적지 확인
curl -s -o /dev/null -w "%{url_effective}" -L "URL주소"
```

**확인 기준**:
- `200` → 사용 가능
- `301/302` → 최종 URL 확인 후 직접 URL로 교체
- `403/404/5xx` → 사용 금지, 대안 URL 필요
- SSL 오류 → 사용 금지

---

### 4. 절대 금지 사항

```
❌ CSV 미확인 WLF ID 사용
❌ 기관 홈페이지(루트 경로)를 서비스 직접 URL로 사용
   예) nhis.or.kr  →  실제 서비스 경로인 nhis.or.kr/nhis/policy/... 를 써야 함
❌ 정책자료실 문서목록(/pcd/) URL 사용 — 서비스 페이지 아님
❌ search.do / query= 포함 URL을 주 URL로 사용 (fallback에만 허용)
❌ 성평등가족부 내부 경로 (/wm/, /sp/fam/, /mp/) — 개편 후 404
❌ 서비스 A의 WLF ID를 서비스 B에 복사 사용 (노인일자리 ID를 독거노인관리사에 사용 등)
❌ HTTP 미확인 상태로 URL 커밋
❌ 다른 지역 정책을 혼용 (서울 정책에 경기 URL 등)
```

---

### 5. 현재 URL 상태 요약 (v5.31 기준)

| 유형 | 건수 | 설명 |
|------|------|------|
| WLF 직접 링크 (CSV 검증) | 28건 | 가장 신뢰 — 변경 금지 |
| 기관 직접 서비스 페이지 | 8건 | HTTP 200 확인 완료 |
| bokjiro 키워드검색 fallback | 14건 | CSV 미존재 정책, 임시 |

> 14건 bokjiro fallback 정책은 향후 WLF ID CSV 확인 후 직접 링크로 교체 대상

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
| `welfare_analyzer/api/link_connector.py` | 중앙정부/지자체/성별/환급금 링크 카드 생성. `CENTRAL_GOV_LINKS` 정적 dict 사용. ⚠️ `retrieveTwatsa0600List.do`(폐기), `moveTWAP01P00.do`(POST전용) 사용 금지 |

### 프론트엔드 (Vanilla JS SPA)

| 파일 | 버전 | 역할 |
|------|------|------|
| `templates/index.html` | v5.27 | 단일 HTML, 3탭 구조 + 헤더 날씨 위젯 |
| `static/js/app.js` | v5.27 | 전체 앱 로직 |
| `static/js/i18n.js` | v3.4+ | 7개 언어 다국어 (ko/en/zh/ja/vi/th/km) |
| `static/css/style.css` | v5.22 | 전체 스타일 |
| `static/js/welfareDeepLinks.json` | v5.27 | 복지서비스 직접 URL 딥링크 테이블 (50개, 전수검증 완료) |

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
- **신청방법 아코디언 없음** — v5.24에서 제거 완료
- **공식공고문 보기 버튼** (`.official-notice-btn`): 카드 하단 파란 그라데이션 버튼 → `_noticeUrl(p)` 경유 공식 서비스 페이지 직접 이동
- 적용 탭: 맞춤복지 결과, 복지전문가 조회, 장바구니 상세, 복지달력 상세

### 공식공고문 URL 라우팅 (`_noticeUrl(p)`) — 4순위
```
1순위: apply_url에 wlfareInfoId= 포함 → 복지로 서비스 상세 직접 URL (가장 신뢰)
2순위: apply_url이 기관 특정 서비스 직접 URL (홈·차단패턴 제외)
3순위: welfareDeepLinks.json detailUrl (차단패턴 제외)
4순위: buildApplyUrl(p).url fallback
```

**차단 패턴** (코드 레벨 필터 — 절대 노출 불가):
- `/pcd/` — 정책자료실 문서목록 (서비스 상세 아님)
- `search.do` — 검색결과 페이지
- `mogef.go.kr/wm/`, `mogef.go.kr/sp/fam/`, `mogef.go.kr/mp/` — 성평등가족부 개편으로 404 확인

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
| 복지로 | bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF... |
| 국민건강보험 | nhis.or.kr/nhis/policy/wbhace01900m01.do (틀니·임플란트) |
| 국민건강보험 | nhis.or.kr/nhis/policy/wbhace02100m01.do (장애인 보조기기) |
| ~~워크넷~~ | ~~work.go.kr~~ — 서비스 종료 (사용 금지) |
| 고용24 (구 워크넷 통합) | work24.go.kr/cm/main.do |
| 국민취업지원제도 | bokjiro WLF00003245 |
| 고용보험 | ei.go.kr/ei/eih/eg/b/ehFrontEIApply.do |
| 새일센터 | saeil.mogef.go.kr |
| 성평등가족부 홈 | mogef.go.kr (홈페이지만 안전 — 내부 경로 사용 금지) |
| 서민금융진흥원 | kinfa.or.kr/product/youthJumpAccount.do |
| 소상공인진흥공단 | semas.or.kr/web/SUB01/030101.kmdc |
| 문화누리카드 | bokjiro WLF00004574 |
| 에너지바우처 | bokjiro WLF00010086 |
| 아이돌봄 | idolbom.go.kr |
| 중앙치매센터 | nid.or.kr/info/diction_online1.aspx |
| 서울청년포털 | youth.seoul.go.kr/site/main/content/monthlyrent |
| 서울복지포털 | welfare.seoul.go.kr/site/main/content/emergency_welfare |
| 경기도기본소득 | basicincome.gg.go.kr |
| 경기일자리재단 | jobaba.net/fntn/dtl.do?trnsprtNo=33 |
| 서울정신건강 | seoulmentalhealth.kr |
| 경기정신건강 | gmhc.or.kr |
| 발달재활서비스 | bokjiro WLF00003124 |
| 가사간병 방문서비스 | bokjiro WLF00003586 |
| 푸드뱅크·마켓 | foodbank1377.org |
| 경기도 복지재단 | www.ggwf.or.kr |
| 보건복지부 정책 | mohw.go.kr/menu.es?mid=a10712020000 (노인복지) |
| 정부24 복지서비스 | gov.kr/portal/welfare/welfareInfo |
| 보조금24 | gov.kr/portal/rcvfvrInfo |
| 고용노동부 | moel.go.kr (홈페이지) |

### 사용 금지 URL (연결 불가 확인)
- `www.danuri.go.kr` — ERR_CONNECTION_REFUSED (다누리 포털 접속 불가)
- `www.ggmhc.or.kr` — DNS_NXDOMAIN (오타, 실제: gmhc.or.kr)
- `blutouch.net` — 불안정 (대체: seoulmentalhealth.kr)
- `liveinkorea.kr` — 서비스 종료
- `bokjiro.go.kr` 홈(/) — 직접 연결 불가
- `www.foodbank.or.kr` — DNS_NXDOMAIN (대체: foodbank1377.org)
- `www.gov24.kr` — ERR_CONNECTION_REFUSED (대체: gov.kr/portal/rcvfvrInfo)
- `mogef.go.kr/wm/...` — 성평등가족부 개편으로 404 (내부 경로 전체 사용 금지)
- `mogef.go.kr/mp/pcd/...` — 정책자료실 문서목록 (서비스 페이지 아님)
- `mafra.go.kr/sites/...` — 미검증 (대체: bokjiro WLF00004566)
- `www.work.go.kr` 전체 — 워크넷 서비스 2024년 종료 → `www.work24.go.kr` 로 대체 (절대 사용 금지)
- `www.work.go.kr/senior` — 동일 사유 종료 (대체: `www.work24.go.kr/cm/main.do`)

---

## 수정 시 체크리스트

- JS/CSS 수정 → `index.html`의 `?v=X.X` 버전 올리기 (app.js: v5.27, style.css: v5.22)
- 새 복지 항목 추가 → `WELFARE_CALENDAR` detail 객체 필수 포함
- 딥링크 추가/수정 → `static/js/welfareDeepLinks.json` 직접 편집 (검색 URL 금지)
- **URL 수정 원칙**: CLAUDE.md "확인된 작동 URL" 목록에 있는 것만 사용. 추측 금지.
- **mogef 내부 경로 절대 금지**: `/wm/`, `/mp/pcd/`, `/sp/fam/` — 성평등가족부 개편 후 404
- 다국어 키 추가 → `static/js/i18n.js` 7개 언어 동시 추가 필수
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
| v5.10 | welfareDeepLinks.json 추측 WLF ID 3건 교체, LOCAL_BENEFITS 직접 URL 적용, policies_db.py 전체 bokjiro 홈 URL 제거 (50개 정책 모두 직접 서비스 URL) |
| v5.11 | foodbank.or.kr DNS 오류 수정 → foodbank1377.org, 경기도 청년기본소득 URL basicincome.gg.go.kr 교체 |
| v5.12 | 경기도 LOCAL_PUBLIC/LOCAL_BENEFITS 전체 기관별 직접 URL·전화번호 분리, 복지로 맞춤서비스 중복카드 제거(link_connector.py 동적 카드 제거), 빈화면 수정(moveTWAP01P00.do POST전용 → gov.kr 포털로 교체), gov24.go.kr 교체(gov24.kr ERR_CONNECTION_REFUSED), 가사간병·발달재활 socialservice.or.kr 직접 페이지 교체, WLF ID 혼용 오류 전수정(CSV 대조) |
| v5.13 | 경기 무료급식소 URL 수정(WLF00004572 발달장애 혼용 → mohw.go.kr 노인급식), 복지달력 근로장려금 반기신청 month 오류 수정(10월→9월), 딥링크 캐시 버전 갱신(?v=5.13) |
| v5.14 | LOCAL_BENEFITS 제네릭 URL 교체 — 서울 임신출산(WLF00004577 CSV확인), 서울 안심소득·어르신교통비(wis.seoul.go.kr), 경기 어르신교통비 연락처 031-120 통일 |
| v5.15 | 복지달력 7개 항목 추가 — 부모급여·아동수당·한부모가족(상시), 문화누리카드·연말정산신청(2월), 경기청년기본소득2분기(4월), 청년도약계좌(8월) — 빈 달(2·4·8월) 완전 채움 |
| v5.16~v5.21 | 태극기 워터마크 배경 도입, 글래스모피즘 카드 스타일, body::after z-index -1 수정(카드 가림 버그 해결), scene-home/scene-result 분리 |
| v5.22 | 7개 언어 다국어 전면 적용 (ko/en/zh/ja/vi/th/km), i18n.js 전체 키 확장 |
| v5.23 | GLOBAL 탭 언어 bottom sheet 구현, 실시간 언어 전환 + 전 화면 재렌더링 (_refreshCurrentView) |
| v5.24 | 신청방법 아코디언 완전 제거, 공식공고문 보기 버튼 전 카드 타입 적용 (_noticeBtn/_noticeUrl 신설), 헤더 날씨 위젯(Open-Meteo API), 태극기 배경 820×580px 확대·blur 2.5px |
| v5.25 | deeplink WLF ID 오매핑 4건 수정 (FOOD_001→WLF00004566, SENIOR_001 재교체, YOUTH_003→WLF00018636, GYEONGGI_002→ggwf.or.kr), _noticeUrl 우선순위 개선 |
| v5.26 | mogef 정책자료실(/pcd/) URL 차단패턴 추가, MULTI_001·004·005 mogef 내부경로 제거 |
| v5.27 | mogef 내부경로 전체 404 확인 → 성평등가족부 홈페이지로 교체, _noticeUrl 방어코드 강화, deeplink 50건 전수검증 완료 (미검증 0건) |
