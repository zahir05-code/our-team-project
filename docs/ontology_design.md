# 아테나 복지서비스 온톨로지 설계 문서

> **버전**: v1.0 | **작성일**: 2026-06-08  
> **목적**: 현재 키워드 매칭 기반 NLP 파이프라인을 **규칙 기반 지식 그래프**로 발전시키기 위한 설계 기준  
> **원칙**: 기존 코드(`nlp/`, `welfare_analyzer/`) 무변경 — 온톨로지는 **독립 레이어**로 추가

---

## 1. 도메인 분석 (Domain Analysis)

### 1-1. 서비스 범위

```
[복지 도메인]
├── 중앙부처 복지     ← 복지로, 보조금24, 정부24
├── 서울특별시 복지   ← 서울복지포털, 서울복지재단
├── 경기도 복지       ← 경기복지재단, 경기도 일자리재단
└── 성별 특화 복지    ← 여성가족부(여성), 고용노동부(남성)
```

### 1-2. 핵심 도메인 개념

| 개념 | 정의 | 예시 |
|------|------|------|
| **정책(Policy)** | 정부가 제공하는 복지 서비스 단위 | 기초생활수급, 긴급복지지원 |
| **조건(Condition)** | 정책 수혜 자격 요건 | 나이 ≤ 18, 소득 ≤ 중위50% |
| **예외(Exception)** | 일반 조건에서 면제되는 특수 규정 | 장애인은 나이 무관 |
| **증빙서류(Evidence)** | 신청 시 필요한 서류 | 주민등록등본, 소득증명 |
| **처리기관(Authority)** | 신청·처리 담당 기관 | 주민센터, 복지로 온라인 |
| **생애주기(LifeCycle)** | 나이 기반 대상 구분 | 영유아·청소년·청년·중장년·어르신 |

---

## 2. 주체(Subject) / 객체(Object) 분석

### 2-1. 주체 (서비스를 받는 사람)

```
UserProfile (주체)
├── 인구통계
│   ├── age          : int           (나이)
│   ├── gender       : 여성|남성|무관
│   └── age_group    : 생애주기 Enum
│
├── 지역
│   ├── region       : 서울특별시|경기도
│   └── district     : 구·시·군
│
├── 경제 상태
│   ├── income_range : 소득 수준 Enum
│   └── work_status  : 직업 상태 Enum
│
├── 가족 구성
│   └── family_status: 가족 형태 Enum
│
└── 어려운 점 (복수)
    └── life_situations: List[LifeSituation]
```

### 2-2. 객체 (복지 정책 노드)

```
PolicyNode (객체)
├── 식별자
│   ├── policy_id    : str   (고유 ID)
│   ├── name         : str   (정책명)
│   └── source       : MasterDataSource
│
├── 대상 조건
│   ├── age_min      : int | None
│   ├── age_max      : int | None
│   ├── gender       : 여성|남성|무관
│   ├── income_max   : IncomeRange | None
│   ├── region       : List[str]      (허용 지역)
│   └── situations   : List[LifeSituation]
│
├── 예외 조건
│   ├── disability_exempt : bool   (장애인 조건 면제)
│   ├── crisis_priority   : bool   (위기 상황 즉시 지원)
│   └── exceptions        : List[ExceptionRule]
│
├── 필요 증빙
│   └── required_docs : List[DocumentType]
│
└── 처리 정보
    ├── authority     : str   (담당 기관)
    ├── apply_url     : str   (신청 링크)
    └── deadline      : str | None
```

---

## 3. 지식 그래프 연결 체계

### 3-1. 노드 유형과 엣지 관계

```
[UserProfile] ──(HAS_SITUATION)──▶ [LifeSituation]
     │                                      │
     │                                (TRIGGERS)
     │                                      ▼
     └──────(MATCHES)──────────────▶ [PolicyNode]
                                           │
                          ┌────────────────┼──────────────────┐
                          ▼                ▼                  ▼
                   [Condition]       [Exception]         [Evidence]
                          │                                    │
                          └────────(PROCESSED_BY)─────▶ [Authority]
```

### 3-2. 정책-조건 연결 예시

```yaml
# 예시: 긴급복지지원
policy:
  id: "BOKJIRO_CRISIS_001"
  name: "긴급복지지원"
  source: "복지로"

conditions:
  - age_min: 0
    age_max: 999         # 나이 무관
  - income_max: "중위소득 75% 이하"
  - situations: ["갑작스러운 위기 상황이에요", "생활비·식비가 부족해요"]
  - region: ["서울특별시", "경기도"]

exceptions:
  - rule: "이미 기초수급자인 경우 중복 지원 불가"
    type: "EXCLUSION"
  - rule: "외국인 단독 세대 제외 (단, 한국인 배우자 동거 시 허용)"
    type: "PARTIAL_EXCLUSION"

required_docs:
  - "주민등록등본"
  - "소득·재산 신고서"
  - "위기사유 확인서"

authority:
  name: "읍·면·동 주민센터"
  apply_url: "https://www.bokjiro.go.kr"
  online_apply: true
```

---

## 4. 조건(Condition) 규칙 체계

### 4-1. 조건 유형 분류

| 유형 | 설명 | 예시 |
|------|------|------|
| **RANGE** | 범위 조건 | 나이 19~34세, 소득 50% 이하 |
| **ENUM** | 열거형 조건 | 지역=서울, 직업=무직 |
| **BOOL** | 참/거짓 조건 | 장애 여부, 한부모 여부 |
| **COMPOSITE** | AND/OR 복합 조건 | (무직 OR 구직중) AND 소득 50% 이하 |
| **EXCLUSIVE** | 배제 조건 | 기초수급자이면 제외 |

### 4-2. 조건 우선순위 (매칭 점수 계산)

```
점수 = Σ (조건별 가중치 × 매칭 여부)

가중치 기준:
  - DEFINITE  : 모든 필수 조건 충족           → 즉시 신청 가능
  - POSSIBLE  : 필수 조건 70% 이상 충족        → 가능성 있음
  - FUTURE    : 현재 조건 미충족·나이 도달 예정 → 미리 알아두기
```

---

## 5. 예외(Exception) 처리 체계

### 5-1. 예외 유형

```python
class ExceptionType(Enum):
    EXCLUSION          = "완전 배제"        # 이 조건이면 무조건 제외
    PARTIAL_EXCLUSION  = "부분 배제"        # 특정 하위 조건만 제외
    PRIORITY           = "우선 지원"        # 이 조건이면 심사 우선
    RELAXED            = "조건 완화"        # 일부 조건 면제
    ADDITIONAL         = "추가 지원"        # 기본 외 추가 혜택
```

### 5-2. 적용 예시

| 정책 | 일반 조건 | 예외 적용 | 결과 |
|------|-----------|-----------|------|
| 청년 취업지원금 | 나이 19~34세 | 장애인은 39세까지 허용 (`RELAXED`) | 35세 장애인 → 신청 가능 |
| 기초생활수급 | 소득 30% 이하 | 독거노인 소득 기준 별도 산정 (`RELAXED`) | 독거노인 우대 |
| 긴급복지지원 | 소득 75% 이하 | 기초수급자 중복 불가 (`EXCLUSION`) | 기초수급자 제외 |
| 한부모 지원 | 한부모가구 | 위기가족 즉시 지원 (`PRIORITY`) | 위기 한부모 우선 처리 |

---

## 6. 필요 증빙서류(Evidence) 체계

### 6-1. 서류 유형 분류

```python
class DocumentType(Enum):
    # 기본 신분 증명
    ID_COPY              = "주민등록등본"
    FAMILY_REGISTER      = "가족관계증명서"
    
    # 소득·재산 증명
    INCOME_CERT          = "소득증명원"
    PROPERTY_CERT        = "재산세 과세증명"
    BANK_STATEMENT       = "금융정보 동의서"
    
    # 상황별 증명
    DISABILITY_CERT      = "장애인 등록증"
    MEDICAL_CERT         = "진단서·소견서"
    UNEMPLOY_CERT        = "고용보험 이직확인서"
    SINGLE_PARENT_CERT   = "한부모가족 확인서"
    CRISIS_REASON        = "위기사유 확인서"
    
    # 주거 관련
    LEASE_CONTRACT       = "임대차계약서"
    EVICTION_NOTICE      = "퇴거명령서"
```

### 6-2. 정책별 필수 서류 매핑 (예시)

| 정책 | 필수 서류 | 선택 서류 |
|------|-----------|-----------|
| 기초생활수급 | 등본, 소득증명, 재산세 | 의료진단서 |
| 긴급복지지원 | 등본, 위기사유확인서 | 소득증명 |
| 한부모 지원 | 등본, 한부모확인서 | 소득증명 |
| 청년 취업지원 | 등본, 고용보험이직확인서 | - |
| 장애인 지원 | 등본, 장애인등록증 | 진단서 |

---

## 7. 처리권한(Authority) 체계

### 7-1. 기관 계층 구조

```
[신청 경로]
├── 온라인
│   ├── 복지로 (www.bokjiro.go.kr)         ← 가장 포괄적
│   ├── 정부24 (www.gov.kr)
│   └── 보조금24 (www.gov24.kr)
│
├── 방문
│   ├── 읍·면·동 주민센터                  ← 1차 접수
│   ├── 시·군·구청 복지과                  ← 심사·결정
│   └── 고용복지플러스센터                 ← 취업·실업급여
│
└── 전화
    ├── 복지 콜센터 129
    ├── 고용노동부 1350
    └── 여성가족부 1366 (여성 긴급상담)
```

### 7-2. 처리 흐름

```
사용자 입력
    ↓
[NLP 파이프라인]  ← 현재 구현 완료
    ↓
[온톨로지 매칭]   ← 다음 구현 단계
    ├── 정책 후보 추출 (PolicyNode)
    ├── 조건 검증 (Condition)
    ├── 예외 적용 (Exception)
    └── 매칭 등급 산정 (DEFINITE/POSSIBLE/FUTURE)
    ↓
[결과 출력]
    ├── 신청 링크 (apply_url)
    ├── 필요 서류 목록 (required_docs)
    └── 담당 기관 안내 (authority)
```

---

## 8. 구현 로드맵 (코드 꼬임 방지 원칙)

### 8-1. 단계별 구현 계획

```
Phase 1 (완료) ✅
  nlp/ner.py          — 나이·지역 추출
  nlp/intent.py       — 상황·직업·가족·성별 분류
  nlp/morpheme.py     — 형태소 분석 (kiwipiepy)
  nlp/pipeline.py     — 통합 파이프라인

Phase 2 (완료) ✅
  welfare_analyzer/models/user_profile.py  — UserProfile + GenderStatus
  welfare_analyzer/api/link_connector.py   — 링크 생성

Phase 3 (다음 단계) 🔜
  ontology/
  ├── __init__.py
  ├── policy_node.py       — PolicyNode 데이터 클래스
  ├── condition_engine.py  — 조건 검증 엔진
  ├── exception_handler.py — 예외 처리
  ├── evidence_mapper.py   — 증빙서류 매핑
  └── knowledge_graph.py   — 전체 지식 그래프

Phase 4 (API 연동) 🔜
  api/routers/welfare.py 에 온톨로지 매칭 결과 통합
  → 기존 link_connector 결과와 병합 (기존 코드 무변경)
```

### 8-2. 코드 꼬임 방지 규칙

> **황금 규칙**: 온톨로지 레이어는 기존 코드를 **절대 수정하지 않는다**

```python
# ✅ 올바른 방식 — 독립 레이어로 추가
from nlp.pipeline import run_pipeline          # 기존 코드 그대로
from ontology.knowledge_graph import match     # 신규 레이어 추가

def search_welfare(req):
    nlp_result  = run_pipeline(req.text)       # 기존
    onto_result = match(nlp_result["profile"]) # 신규 (기존 결과 활용)
    return merge(nlp_result, onto_result)      # 병합

# ❌ 잘못된 방식 — 기존 파일 내부 수정
# nlp/pipeline.py 안에 온톨로지 코드를 직접 삽입 → 충돌 위험
```

---

## 9. Git 브랜치 전략 (Gemini 제안 보완)

```bash
# Gemini 제안 (위험) ❌
git push origin main   # 검증 없이 main 직접 푸시

# 권장 방식 ✅
git checkout -b feature/ontology-design   # 문서 전용 브랜치
git add docs/ontology_design.md
git commit -m "docs: 온톨로지 설계 문서 추가 (Phase 3 준비)"
git push origin feature/ontology-design
# → main 병합은 검토 후 결정
```

---

## 10. 용어 사전 (Glossary)

| 한국어 | 영어 | 설명 |
|--------|------|------|
| 온톨로지 | Ontology | 도메인 지식을 개념·관계로 형식화한 구조 |
| 지식 그래프 | Knowledge Graph | 노드(개념)와 엣지(관계)로 구성된 그래프 DB |
| 정책 노드 | Policy Node | 복지 서비스 단위를 나타내는 그래프 노드 |
| 조건 엔진 | Condition Engine | 사용자 프로파일과 정책 조건을 비교하는 모듈 |
| 매칭 등급 | Match Level | DEFINITE / POSSIBLE / FUTURE 3단계 |
| 생애주기 | Life Cycle | 나이 기반 서비스 대상 구분 단위 |

---

*본 문서는 아테나 복지서비스 앱의 Phase 3 구현을 위한 설계 기준입니다.*  
*실제 정책 데이터는 복지로 API 연동 시 자동 주입됩니다.*
