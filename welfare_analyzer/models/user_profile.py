"""사용자 복지 프로파일 모델 — 중앙부처 + 경기권 엄격 제한.

[보안 원칙] 모든 입력값은 로컬 세션에만 존재. 외부 서버 미전송.
[범위 원칙] 서비스 대상 지역 = 중앙부처(전국) + 경기권(경기도·고양시 포함 31개 시·군)만 허용.
"""

from dataclasses import dataclass, field
from enum import Enum


# ── 허용 지역 엄격 화이트리스트 ─────────────────────────────

ALLOWED_REGIONS = {"서울특별시", "경기도"}

ALLOWED_SEOUL_DISTRICTS = {
    "종로구", "중구", "용산구", "성동구", "광진구", "동대문구",
    "중랑구", "성북구", "강북구", "도봉구", "노원구", "은평구",
    "서대문구", "마포구", "양천구", "강서구", "구로구", "금천구",
    "영등포구", "동작구", "관악구", "서초구", "강남구", "송파구",
    "강동구",
}

ALLOWED_GYEONGGI_DISTRICTS = {
    "수원시", "성남시", "의정부시", "안양시", "부천시", "광명시",
    "평택시", "동두천시", "안산시", "고양시", "과천시", "구리시",
    "남양주시", "오산시", "시흥시", "군포시", "의왕시", "하남시",
    "용인시", "파주시", "이천시", "안성시", "김포시", "화성시",
    "광주시", "양주시", "포천시", "여주시",
    "연천군", "가평군", "양평군",
}

# 고양시 특화 — 별도 식별
GOYANG_DISTRICTS = {"덕양구", "일산동구", "일산서구"}


def validate_region(region: str, district: str) -> bool:
    """허용 지역(서울·경기) 여부 검증."""
    if region == "서울특별시":
        return district in ALLOWED_SEOUL_DISTRICTS or district == ""
    if region == "경기도":
        return district in ALLOWED_GYEONGGI_DISTRICTS or district == ""
    return False


# ── Enum 정의 ────────────────────────────────────────────────

class AgeGroup(str, Enum):
    CHILD  = "영유아·아동 (0~12세)"
    TEEN   = "청소년 (13~18세)"
    YOUTH  = "청년 (19~34세)"
    MIDDLE = "중장년 (35~59세)"
    SENIOR = "어르신 (60세 이상)"


class LifeSituation(str, Enum):
    LIVING_COST = "생활비·식비가 부족해요"
    MEDICAL     = "병원비·건강이 걱정돼요"
    HOUSING     = "주거가 불안정해요"
    EDUCATION   = "교육비·돌봄이 필요해요"
    JOB         = "취업·일자리가 필요해요"
    BUSINESS    = "사업·자영업이 어려워요"
    CARE        = "가족을 돌봐야 해요"
    CRISIS      = "갑작스러운 위기 상황이에요"
    DISABILITY  = "건강·신체적으로 불편함이 있어요"
    OTHER       = "기타"


class WorkStatus(str, Enum):
    EMPLOYED      = "직장인"
    SELF_EMPLOYED = "자영업자"
    SMALL_BIZ     = "소상공인"
    FREELANCE     = "프리랜서"
    JOB_SEEKING   = "구직중"
    UNEMPLOYED    = "무직"
    STUDENT       = "학생"
    FARMER        = "농어업인"
    OTHER         = "기타"


class FamilyStatus(str, Enum):
    SINGLE           = "단독가구"
    WITH_SPOUSE      = "부부가구"
    WITH_CHILDREN    = "자녀 있음"
    SINGLE_PARENT    = "한부모가구"
    WITH_ELDERLY     = "노인 돌봄"
    WITH_SICK_FAMILY = "아픈 가족 있음"
    MULTI_GENERATION = "다세대가구"
    OTHER            = "기타"


class IncomeRange(str, Enum):
    UNKNOWN      = "잘 모르겠어요"
    VERY_LOW     = "거의 없어요"
    LOW          = "중위소득 50% 이하"
    MIDDLE_LOW   = "중위소득 50~100%"
    MIDDLE       = "중위소득 100~150%"
    ABOVE_MIDDLE = "중위소득 150% 이상"


class GenderStatus(str, Enum):
    """성별 — 복지서비스 대상 기준 (선택 입력)."""
    FEMALE   = "여성"
    MALE     = "남성"
    NONE     = "무관"   # 선택 안 함 / 성별 무관 서비스만


class ServiceMatchLevel(str, Enum):
    DEFINITE = "지금 바로 신청 가능"
    POSSIBLE = "해당 가능성 있음"
    FUTURE   = "미리 알아두면 좋은 것"


# ── 공공데이터포털 3대 마스터 데이터 식별자 ─────────────────

class MasterDataSource(str, Enum):
    """공공데이터포털 3대 마스터 데이터 — 수집·필터 기준."""
    BOKJIRO  = "복지로_복지서비스목록"          # 보건복지부 / 전국
    BOJO24   = "보조금24_보조금정보"            # 기획재정부 / 전국
    GYEONGGI = "경기도_복지보조금서비스"        # 경기데이터드림 / 경기권
    SEOUL    = "서울시_복지서비스"              # 서울열린데이터광장 / 서울권


# ── UserProfile ──────────────────────────────────────────────

@dataclass
class UserProfile:
    """중앙부처 + 경기권 한정 복지 프로파일.

    region 은 반드시 ALLOWED_REGIONS 내 값이어야 한다.
    district 는 반드시 ALLOWED_GYEONGGI_DISTRICTS 내 값이어야 한다.
    """

    # 필수 입력
    age:    int = 0
    region: str = "전국(중앙부처)"   # "전국(중앙부처)" | "경기도"
    district: str = ""               # 경기도 31개 시·군 중 하나

    life_situations: list[LifeSituation] = field(default_factory=list)

    # 선택 입력
    age_group:     AgeGroup | None = None
    work_status:   WorkStatus      = WorkStatus.OTHER
    family_status: FamilyStatus    = FamilyStatus.OTHER
    income_range:  IncomeRange     = IncomeRange.UNKNOWN
    gender:        GenderStatus    = GenderStatus.NONE

    # 상황 세부
    has_health_difficulty: bool = False
    has_sudden_crisis:     bool = False
    has_care_burden:       bool = False
    children_count:        int  = 0
    is_veteran:            bool = False

    # 자영업·소상공인
    business_years:       int  = 0
    employee_count:       int  = 0
    has_tax_refund_target: bool = False

    # 활성 마스터 데이터 소스
    active_sources: list[MasterDataSource] = field(default_factory=list)

    # 조회 결과 캐시
    matched_definite: list[str] = field(default_factory=list)
    matched_possible: list[str] = field(default_factory=list)
    matched_future:   list[str] = field(default_factory=list)

    def __post_init__(self):
        """지역 유효성 검사 + 마스터 소스 자동 주입."""
        if not validate_region(self.region, self.district):
            raise ValueError(
                f"[범위 초과] '{self.region} {self.district}'는 "
                f"허용 지역(중앙부처·경기권)이 아닙니다."
            )
        self._inject_sources()

    def _inject_sources(self) -> None:
        """지역·상황 기반 마스터 데이터 소스 자동 주입."""
        sources = [MasterDataSource.BOKJIRO, MasterDataSource.BOJO24]
        if self.region == "서울특별시":
            sources.append(MasterDataSource.SEOUL)
        elif self.region == "경기도":
            sources.append(MasterDataSource.GYEONGGI)
        self.active_sources = sources

    def is_goyang(self) -> bool:
        """고양시 거주 여부 (덕양구·일산동구·일산서구)."""
        return self.district == "고양시"

    def is_self_employed(self) -> bool:
        return self.work_status in (WorkStatus.SELF_EMPLOYED, WorkStatus.SMALL_BIZ)

    def derive_age_group(self) -> AgeGroup:
        if self.age <= 12:  return AgeGroup.CHILD
        if self.age <= 18:  return AgeGroup.TEEN
        if self.age <= 34:  return AgeGroup.YOUTH
        if self.age <= 59:  return AgeGroup.MIDDLE
        return AgeGroup.SENIOR

    def search_keywords(self) -> list[str]:
        """프로파일 기반 API 검색 키워드 자동 생성."""
        kw_map = {
            AgeGroup.CHILD:  ["영유아", "아동"],
            AgeGroup.TEEN:   ["청소년"],
            AgeGroup.YOUTH:  ["청년"],
            AgeGroup.MIDDLE: ["중장년"],
            AgeGroup.SENIOR: ["노인", "어르신"],
        }
        sit_map = {
            LifeSituation.LIVING_COST: ["생계", "기초생활", "긴급복지"],
            LifeSituation.MEDICAL:     ["의료", "건강"],
            LifeSituation.HOUSING:     ["주거", "임대"],
            LifeSituation.EDUCATION:   ["교육", "돌봄"],
            LifeSituation.JOB:         ["취업", "고용"],
            LifeSituation.BUSINESS:    ["소상공인", "자영업"],
            LifeSituation.CARE:        ["돌봄", "가족"],
            LifeSituation.CRISIS:      ["긴급", "위기"],
            LifeSituation.DISABILITY:  ["장애", "희귀질환"],
        }
        age_group = self.age_group or self.derive_age_group()
        keywords  = list(kw_map.get(age_group, []))
        for sit in self.life_situations:
            keywords.extend(sit_map.get(sit, []))
        if self.family_status == FamilyStatus.SINGLE_PARENT:
            keywords.append("한부모")
        if self.gender == GenderStatus.FEMALE:
            keywords.extend(["여성", "여성가족", "모성"])
        elif self.gender == GenderStatus.MALE:
            keywords.extend(["남성", "부성"])
        if self.is_veteran:
            keywords.append("국가유공자")
        # 고양시 특화 키워드
        if self.is_goyang():
            keywords.extend(["고양시", "고양"])
        return list(dict.fromkeys(keywords))

    def summary(self) -> str:
        age_group  = (self.age_group or self.derive_age_group()).value
        situations = ", ".join(s.value for s in self.life_situations) or "미선택"
        sources    = ", ".join(s.value for s in self.active_sources)
        gender = self.gender.value if self.gender and self.gender != GenderStatus.NONE else "무관"
        return (
            f"나이: {self.age}세({age_group}) | "
            f"성별: {gender} | "
            f"지역: {self.region} {self.district} | "
            f"어려운점: {situations} | "
            f"직업: {self.work_status.value if self.work_status else '미선택'} | "
            f"소득: {self.income_range.value if self.income_range else '미선택'} | "
            f"마스터소스: [{sources}]"
        )
