"""PolicyNode — 복지 정책 단위 데이터 클래스.

하나의 PolicyNode = 하나의 복지 서비스
  예) 기초생활수급, 청년취업지원금, 노인기초연금 …
"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum

from welfare_analyzer.models.user_profile import (
    LifeSituation, WorkStatus, FamilyStatus,
    IncomeRange, GenderStatus, AgeGroup,
)


# ── 매칭 등급 ─────────────────────────────────────────────────

class MatchLevel(str, Enum):
    DEFINITE = "✅ 신청 요건 충족 가능성 높음"   # "확정" 표현 제거 → 과장광고 방지
    POSSIBLE = "🔶 해당 가능성 있음"
    FUTURE   = "📌 미리 알아두면 좋아요"
    EXCLUDED = "❌ 해당 없음"


# ── 예외 규칙 ─────────────────────────────────────────────────

class ExceptionType(str, Enum):
    EXCLUSION         = "완전 배제"       # 이 조건이면 무조건 제외
    PARTIAL_EXCLUSION = "부분 배제"       # 특정 하위 조건 제외
    PRIORITY          = "우선 지원"       # 심사 우선
    RELAXED           = "조건 완화"       # 일부 조건 면제
    ADDITIONAL        = "추가 혜택"       # 기본 외 추가 지원


@dataclass
class ExceptionRule:
    type:        ExceptionType
    description: str
    # 예외가 적용되는 조건 — None 이면 항상 적용
    trigger_situation:   LifeSituation | None = None
    trigger_family:      FamilyStatus  | None = None
    trigger_disability:  bool          | None = None   # True=장애인일 때
    age_max_override:    int           | None = None   # 나이 상한 완화


# ── 증빙서류 유형 ─────────────────────────────────────────────

class DocumentType(str, Enum):
    ID_COPY            = "주민등록등본"
    FAMILY_REGISTER    = "가족관계증명서"
    INCOME_CERT        = "소득증명원"
    PROPERTY_CERT      = "재산세 과세증명"
    BANK_CONSENT       = "금융정보 제공동의서"
    DISABILITY_CERT    = "장애인 등록증"
    MEDICAL_CERT       = "진단서·의사소견서"
    UNEMPLOY_CERT      = "고용보험 이직확인서"
    SINGLE_PARENT_CERT = "한부모가족 확인서"
    CRISIS_REASON      = "위기사유 확인서"
    LEASE_CONTRACT     = "임대차계약서"
    BUSINESS_CLOSE     = "폐업사실증명원"
    VETERAN_CERT       = "국가유공자 확인서"


# ── 정책 노드 ─────────────────────────────────────────────────

@dataclass
class PolicyNode:
    """복지 정책 단위 — 조건·예외·증빙·처리기관 포함."""

    # 식별
    policy_id:   str
    name:        str
    description: str
    source:      str          # 복지로 / 보조금24 / 서울 / 경기도
    apply_url:   str

    # ── 대상 조건 (None = 제한 없음) ─────────────────────────
    age_min:      int | None = None
    age_max:      int | None = None
    gender:       GenderStatus = GenderStatus.NONE

    # 소득 — 이 등급 이하여야 해당 (None = 소득 무관)
    income_max:   IncomeRange | None = None

    # 지역 — 빈 리스트 = 전국
    regions:      list[str] = field(default_factory=list)

    # 구·시·군 — 빈 리스트 = 지역 전체 해당 / 값 있으면 해당 구·시·군만
    # 예) ["강남구","서초구"] → 강남·서초 주민만 DEFINITE, 나머지 서울시민 → POSSIBLE
    target_districts: list[str] = field(default_factory=list)

    # 필수 상황 — 하나 이상 일치해야 함 (빈 리스트 = 상황 무관)
    required_situations: list[LifeSituation] = field(default_factory=list)

    # 직업 조건 — 하나 이상 일치 (빈 리스트 = 무관)
    required_work:  list[WorkStatus]   = field(default_factory=list)

    # 가족 조건 — 하나 이상 일치 (빈 리스트 = 무관)
    required_family: list[FamilyStatus] = field(default_factory=list)

    # ── 예외 규칙 ────────────────────────────────────────────
    exceptions: list[ExceptionRule] = field(default_factory=list)

    # ── 증빙서류 ─────────────────────────────────────────────
    required_docs:  list[DocumentType] = field(default_factory=list)
    optional_docs:  list[DocumentType] = field(default_factory=list)

    # ── 처리 기관 ────────────────────────────────────────────
    authority:      str = "읍·면·동 주민센터"
    phone:          str = "129 (복지 콜센터)"
    online_apply:   bool = True

    # ── 외국인·이민자 전용 플래그 ─────────────────────────────
    # True = 결혼이민자·귀화자·외국인 전용 서비스 (한국인에게는 FUTURE로만 노출)
    foreigner_only: bool = False

    # ── 태그 (검색·필터용) ───────────────────────────────────
    tags: list[str] = field(default_factory=list)

    # ── 법적 준수 메타데이터 ─────────────────────────────────
    data_updated:  str  = ""      # 정보 기준일 (YYYY-MM-DD)
    is_verified:   bool = False   # 사람 검수 완료 여부
    disclaimer:    str  = "신청 전 반드시 담당 기관에 확인하시기 바랍니다."
    data_source_license: str = "공공누리 제1유형 (출처표시)"
