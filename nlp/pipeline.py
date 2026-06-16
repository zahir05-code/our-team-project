"""NLP 파이프라인 — 자연어 텍스트 → UserProfile 변환.

입력: "저 40대 경기도 수원시 사는 한부모인데 생활비가 너무 부족해요"
출력: UserProfile 객체

흐름:
  1. run_ner(text)    → age, region, district
  2. run_intent(text) → life_situations, work_status, family_status
  3. UserProfile 생성 → validate + source inject
"""

from __future__ import annotations

from nlp.ner    import run_ner
from nlp.intent import run_intent
from welfare_analyzer.models.user_profile import (
    UserProfile, LifeSituation, WorkStatus, FamilyStatus, IncomeRange,
    GenderStatus, ALLOWED_REGIONS,
)

# ── 지역 미감지 시 fallback ────────────────────────────────────
DEFAULT_REGION = "서울특별시"


def _coerce_situations(raw: list) -> list[LifeSituation]:
    """intent 결과(LifeSituation 객체 리스트) → 유효한 값만 반환.

    매칭 결과가 없으면 LIVING_COST 기본값 사용.
    """
    result = []
    for item in raw:
        if isinstance(item, LifeSituation):
            result.append(item)
        else:
            try:
                result.append(LifeSituation(item))
            except ValueError:
                pass
    return result or [LifeSituation.LIVING_COST]


def run_pipeline(
    text: str,
    income_range: str | None = None,
    gender: str | None = None,
    region_override: str = "",
    district_override: str = "",
) -> dict:
    """자연어 텍스트 → 분석 결과 딕셔너리.

    Args:
        text: 사용자 자연어 입력
        income_range: 소득 수준 (UI에서 별도 선택한 경우)
        region_override: 지역 미감지 시 UI에서 보완 입력 (예: "경기도")
        district_override: 구·시·군 미감지 시 UI에서 보완 입력

    반환:
        {
            "profile":  UserProfile,
            "ner":      {age, region, district},
            "intent":   {life_situations, work_status, family_status, confidence},
            "warnings": [str, ...],
            "needs_region": bool  ← True면 지역을 사용자가 보완해야 함
        }
    """
    warnings: list[str] = []

    # ── Step 1: NER ──────────────────────────────────────────────
    ner = run_ner(text)
    age      = ner["age"]
    region   = ner["region"]
    district = ner["district"]

    # UI 보완 값 우선 적용
    if region_override and region_override in ALLOWED_REGIONS:
        region = region_override
    if district_override:
        district = district_override

    # 나이 미감지
    if age is None:
        age = 40
        warnings.append("나이를 인식하지 못해 기본값(40세)을 사용했습니다. 문장에 '58세', '40대' 형태로 나이를 적어주세요.")

    # 지역 미감지
    needs_region = False
    if region not in ALLOWED_REGIONS:
        region       = DEFAULT_REGION
        needs_region = True
        warnings.append(
            "거주 지역(서울특별시 또는 경기도)을 인식하지 못해 서울특별시로 임시 적용했습니다. "
            "정확한 결과를 위해 지역을 문장에 포함해 주세요. (예: '경기도 수원시 삽니다')"
        )

    # ── Step 2: Intent Classification ────────────────────────────
    intent      = run_intent(text)
    situations  = _coerce_situations(intent["life_situations"])
    work_raw    = intent["work_status"]
    family_raw  = intent["family_status"]

    work_status   = work_raw   if isinstance(work_raw,   WorkStatus)   else WorkStatus.OTHER
    family_status = family_raw if isinstance(family_raw, FamilyStatus) else FamilyStatus.OTHER

    # gender 처리: UI 직접 선택 > NLP 감지
    gender_raw = intent.get("gender", GenderStatus.NONE)
    if gender:
        try:
            gender_status = GenderStatus(gender)
        except ValueError:
            gender_status = gender_raw if isinstance(gender_raw, GenderStatus) else GenderStatus.NONE
    else:
        gender_status = gender_raw if isinstance(gender_raw, GenderStatus) else GenderStatus.NONE

    # income_range 처리
    inc = None
    if income_range:
        try:
            inc = IncomeRange(income_range)
        except ValueError:
            warnings.append(f"소득 범위를 인식하지 못했습니다: {income_range}")

    # ── Step 3: UserProfile 생성 ─────────────────────────────────
    profile = UserProfile(
        age             = age,
        region          = region,
        district        = district or "",
        life_situations = situations,
        work_status     = work_status,
        family_status   = family_status,
        income_range    = inc if inc is not None else IncomeRange.UNKNOWN,
        gender          = gender_status,
    )
    # 연령 그룹 자동 파생 (age_group 필드 초기화)
    profile.age_group = profile.derive_age_group()

    return {
        "profile":      profile,
        "ner":          ner,
        "intent":       intent,
        "warnings":     warnings,
        "needs_region": needs_region,
    }
