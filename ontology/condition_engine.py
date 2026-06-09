"""조건 검증 엔진 — UserProfile × PolicyNode → MatchLevel.

핵심 로직:
  1. 예외 규칙 우선 적용 (EXCLUSION 확인)
  2. 필수 조건 점수 계산
  3. 매칭 등급 산정 (DEFINITE / POSSIBLE / FUTURE / EXCLUDED)
"""

from __future__ import annotations
from welfare_analyzer.models.user_profile import (
    UserProfile, IncomeRange, GenderStatus, LifeSituation,
)
from ontology.policy_node import (
    PolicyNode, MatchLevel, ExceptionType,
)

# 소득 등급 순서 (낮을수록 인덱스 작음)
_INCOME_ORDER = [
    IncomeRange.VERY_LOW,
    IncomeRange.LOW,
    IncomeRange.MIDDLE_LOW,
    IncomeRange.MIDDLE,
    IncomeRange.ABOVE_MIDDLE,
    IncomeRange.UNKNOWN,
]


def _income_within(user: IncomeRange | None, limit: IncomeRange | None) -> bool:
    """사용자 소득이 정책 한도 이하인지 확인."""
    if limit is None:
        return True                          # 정책이 소득 무관
    if user is None or user == IncomeRange.UNKNOWN:
        return True                          # 소득 모름 → 일단 허용 (POSSIBLE 처리)
    try:
        return _INCOME_ORDER.index(user) <= _INCOME_ORDER.index(limit)
    except ValueError:
        return True


def _has_disability(profile: UserProfile) -> bool:
    from welfare_analyzer.models.user_profile import LifeSituation
    return LifeSituation.DISABILITY in profile.life_situations


def _apply_exceptions(profile: UserProfile, policy: PolicyNode) -> str | None:
    """예외 규칙 적용.

    반환:
        "EXCLUDED"  — 해당 없음으로 강제 처리
        "RELAXED"   — 조건 완화 적용 (age_max 등 변경됨, 원본 불변)
        None        — 예외 없음
    """
    for exc in policy.exceptions:
        triggered = False

        if exc.trigger_disability is not None:
            triggered = (_has_disability(profile) == exc.trigger_disability)
        elif exc.trigger_situation:
            triggered = exc.trigger_situation in profile.life_situations
        elif exc.trigger_family:
            triggered = profile.family_status == exc.trigger_family
        else:
            triggered = True   # 항상 적용

        if not triggered:
            continue

        if exc.type == ExceptionType.EXCLUSION:
            return "EXCLUDED"
        if exc.type == ExceptionType.RELAXED:
            return "RELAXED"
        if exc.type == ExceptionType.PRIORITY:
            return "PRIORITY"

    return None


def _age_ok(profile: UserProfile, policy: PolicyNode,
            exc_result: str | None) -> bool:
    """나이 조건 확인 — 예외에 의한 완화 반영."""
    age_max = policy.age_max
    # 장애인 나이 완화 예외 적용
    if exc_result == "RELAXED" and _has_disability(profile):
        for exc in policy.exceptions:
            if exc.age_max_override is not None and exc.trigger_disability:
                age_max = exc.age_max_override
                break

    if policy.age_min is not None and profile.age < policy.age_min:
        return False
    if age_max is not None and profile.age > age_max:
        return False
    return True


def match(profile: UserProfile, policy: PolicyNode) -> tuple[MatchLevel, list[str]]:
    """단일 정책에 대한 매칭 등급 계산.

    반환:
        (MatchLevel, [미충족 조건 설명 리스트])
    """
    reasons: list[str] = []

    # ── 1. 예외 규칙 먼저 확인 ─────────────────────────────
    exc_result = _apply_exceptions(profile, policy)
    if exc_result == "EXCLUDED":
        return MatchLevel.EXCLUDED, ["예외 조건으로 제외됨"]

    # ── 2. 지역 조건 ───────────────────────────────────────
    if policy.regions and profile.region not in policy.regions:
        return MatchLevel.EXCLUDED, [f"지역 조건 불일치 ({policy.regions})"]

    # ── 3. 성별 조건 ───────────────────────────────────────
    # 정책이 성별 특화인데 사용자 성별 불일치 → 제외
    # 사용자가 성별 미선택(NONE)이면 제외하지 않고 POSSIBLE로 강등 (아래 처리)
    gender_unverified = False
    if policy.gender not in (GenderStatus.NONE,):
        if profile.gender == GenderStatus.NONE:
            gender_unverified = True   # 성별 미확인 → POSSIBLE 강등
        elif profile.gender != policy.gender:
            return MatchLevel.EXCLUDED, ["성별 조건 불일치"]

    # ── 4. 조건별 점수 계산 ───────────────────────────────
    total_conditions = 0
    met_conditions   = 0

    # 나이
    if policy.age_min is not None or policy.age_max is not None:
        total_conditions += 1
        if _age_ok(profile, policy, exc_result):
            met_conditions += 1
        else:
            lo = policy.age_min or 0
            hi = policy.age_max or 120
            reasons.append(f"나이 조건: {lo}~{hi}세 (현재 {profile.age}세)")

    # 소득
    if policy.income_max is not None:
        total_conditions += 1
        user_income = profile.income_range if hasattr(profile, "income_range") else None
        if _income_within(user_income, policy.income_max):
            met_conditions += 1
        else:
            reasons.append(f"소득 조건: {policy.income_max.value} 이하 필요")

    # 상황 (하나라도 일치하면 OK)
    if policy.required_situations:
        total_conditions += 1
        if any(s in profile.life_situations for s in policy.required_situations):
            met_conditions += 1
        else:
            needed = [s.value for s in policy.required_situations]
            needed_str = ", ".join(f"'{v}'" for v in needed)
            reasons.append(f"{needed_str} 조건을 추가하면 해당될 수 있어요")

    # 직업 (하나라도 일치하면 OK)
    if policy.required_work:
        total_conditions += 1
        if profile.work_status in policy.required_work:
            met_conditions += 1
        else:
            needed = [w.value for w in policy.required_work]
            needed_str = ", ".join(f"'{v}'" for v in needed)
            reasons.append(f"{needed_str} 직업 조건을 추가하면 해당될 수 있어요")

    # 가족 (하나라도 일치하면 OK)
    if policy.required_family:
        total_conditions += 1
        if profile.family_status in policy.required_family:
            met_conditions += 1
        else:
            needed = [f.value for f in policy.required_family]
            needed_str = ", ".join(f"'{v}'" for v in needed)
            reasons.append(f"{needed_str} 가족 조건을 추가하면 해당될 수 있어요")

    # ── 5. 등급 산정 ──────────────────────────────────────
    if total_conditions == 0:
        # 조건 없는 정책 → 모두 해당 가능
        return MatchLevel.POSSIBLE, []

    ratio = met_conditions / total_conditions

    if ratio == 1.0:
        # 성별 미확인 정책은 DEFINITE → POSSIBLE 강등
        if gender_unverified:
            level   = MatchLevel.POSSIBLE
            reasons = ["성별을 선택하시면 정확한 해당 여부를 확인할 수 있습니다"]
        else:
            level   = MatchLevel.DEFINITE
            if exc_result == "PRIORITY":
                reasons = ["우선 지원 대상입니다"]
    elif ratio >= 0.6:
        level = MatchLevel.POSSIBLE
    elif ratio >= 0.3:
        level = MatchLevel.FUTURE
    else:
        level = MatchLevel.EXCLUDED

    return level, reasons
