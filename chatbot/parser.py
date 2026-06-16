"""사용자 답변을 UserProfile 로 변환하는 파서."""

from welfare_analyzer.models.user_profile import (
    UserProfile, LifeSituation, WorkStatus, FamilyStatus, IncomeRange, GenderStatus
)

_SITUATION_MAP = {
    "생활비·식비가 부족해요":          LifeSituation.LIVING_COST,
    "병원비·건강이 걱정돼요":           LifeSituation.MEDICAL,
    "주거가 불안정해요":                LifeSituation.HOUSING,
    "교육비·돌봄이 필요해요":           LifeSituation.EDUCATION,
    "취업·일자리가 필요해요":           LifeSituation.JOB,
    "사업·자영업이 어려워요":           LifeSituation.BUSINESS,
    "가족을 돌봐야 해요":               LifeSituation.CARE,
    "갑작스러운 위기 상황이에요":       LifeSituation.CRISIS,
    "건강·신체적으로 불편함이 있어요":  LifeSituation.DISABILITY,
}

_WORK_MAP = {
    "직장에 다니고 있어요":      WorkStatus.EMPLOYED,
    "자영업·사업을 하고 있어요":  WorkStatus.SELF_EMPLOYED,
    "소상공인이에요":             WorkStatus.SMALL_BIZ,
    "프리랜서·단기 일을 해요":   WorkStatus.FREELANCE,
    "일자리를 찾고 있어요":       WorkStatus.JOB_SEEKING,
    "현재 일을 쉬고 있어요":     WorkStatus.UNEMPLOYED,
    "학생이에요":                 WorkStatus.STUDENT,
    "농어업에 종사해요":          WorkStatus.FARMER,
    "기타":                       WorkStatus.OTHER,
}

_FAMILY_MAP = {
    "혼자 살고 있어요":           FamilyStatus.SINGLE,
    "배우자와 둘이 살아요":       FamilyStatus.WITH_SPOUSE,
    "아이와 함께 살고 있어요":    FamilyStatus.WITH_CHILDREN,
    "혼자 아이를 키우고 있어요":  FamilyStatus.SINGLE_PARENT,
    "어르신 가족을 돌보고 있어요": FamilyStatus.WITH_ELDERLY,
    "아픈 가족이 있어요":         FamilyStatus.WITH_SICK_FAMILY,
    "여러 세대가 함께 살아요":    FamilyStatus.MULTI_GENERATION,
    "기타":                       FamilyStatus.OTHER,
}

_GENDER_MAP = {
    "여성":  GenderStatus.FEMALE,
    "남성":  GenderStatus.MALE,
    "무관":  GenderStatus.NONE,
}

_INCOME_MAP = {
    "잘 모르겠어요 (소득 무관 서비스 우선 안내)": IncomeRange.UNKNOWN,
    "거의 없어요":        IncomeRange.VERY_LOW,
    "중위소득 50% 이하":  IncomeRange.LOW,
    "중위소득 50~100%":   IncomeRange.MIDDLE_LOW,
    "중위소득 100~150%":  IncomeRange.MIDDLE,
    "중위소득 150% 이상": IncomeRange.ABOVE_MIDDLE,
}


# ── enum value 역방향 맵 (API에서 enum.value 로 직접 전송할 때 처리) ───
_SITUATION_VAL_MAP = {s.value: s for s in LifeSituation}
_WORK_VAL_MAP      = {s.value: s for s in WorkStatus}
_FAMILY_VAL_MAP    = {s.value: s for s in FamilyStatus}
_INCOME_VAL_MAP    = {s.value: s for s in IncomeRange}
_GENDER_VAL_MAP    = {s.value: s for s in GenderStatus}


def _resolve_situation(s: str) -> LifeSituation | None:
    """UI 레이블 또는 enum value 중 하나로 LifeSituation 반환."""
    return _SITUATION_MAP.get(s) or _SITUATION_VAL_MAP.get(s)


def build_profile(answers: dict) -> UserProfile:
    """챗봇 답변 딕셔너리 → UserProfile 변환.

    UI 레이블(챗봇 흐름)과 enum value(API 직접 호출) 모두 지원.
    """
    # ① 나이: 빈 문자열·None 안전 처리
    raw_age = answers.get("age", 0)
    try:
        age = int(raw_age) if str(raw_age).strip() else 0
    except (ValueError, TypeError):
        age = 0

    # ② 지역: 빈 문자열·None → 기본값 서울특별시
    region   = (answers.get("region") or "서울특별시").strip() or "서울특별시"
    district = answers.get("district", "") or ""

    situations = answers.get("life_situations", [])
    life_situations = [r for s in situations if (r := _resolve_situation(s))]

    work   = answers.get("work_status", "")
    family = answers.get("family_status", "")
    income = answers.get("income_range", "")
    gender = answers.get("gender", "")

    work_status   = _WORK_MAP.get(work)   or _WORK_VAL_MAP.get(work,   WorkStatus.OTHER)
    family_status = _FAMILY_MAP.get(family) or _FAMILY_VAL_MAP.get(family, FamilyStatus.OTHER)
    income_range  = _INCOME_MAP.get(income) or _INCOME_VAL_MAP.get(income, IncomeRange.UNKNOWN)
    gender_status = _GENDER_MAP.get(gender) or _GENDER_VAL_MAP.get(gender, GenderStatus.NONE)

    profile = UserProfile(
        age=age,
        region=region,
        district=district,
        life_situations=life_situations,
        work_status=work_status,
        family_status=family_status,
        income_range=income_range,
        gender=gender_status,
    )

    # 자동 파생
    profile.has_tax_refund_target = profile.is_self_employed()
    profile.has_care_burden = family_status in (
        FamilyStatus.WITH_ELDERLY,
        FamilyStatus.WITH_SICK_FAMILY,
        FamilyStatus.SINGLE_PARENT,
    )

    return profile
