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


def build_match_reason(profile: UserProfile, policy: PolicyNode, level: MatchLevel) -> str:
    """매칭된 이유를 유저 언어로 생성 — '왜 나에게 맞는지' 한 줄 설명.

    DEFINITE: "✅ 나이(45세) · 소득(중위50%이하) · 생활비 부족 → 지금 신청 가능"
    POSSIBLE: "🔍 나이(67세) · 건강 걱정 해당 → 추가 확인 후 신청"
    FUTURE:   "📌 현재 나이(25세) 조건 미충족 → 향후 해당 가능"
    """
    exc_result = _apply_exceptions(profile, policy)
    parts: list[str] = []

    # 나이 조건 충족 여부
    if policy.age_min is not None or policy.age_max is not None:
        if _age_ok(profile, policy, exc_result):
            lo = policy.age_min or 0
            hi = policy.age_max or 120
            parts.append(f"나이({profile.age}세 / 기준 {lo}~{hi}세)")

    # 소득 조건 충족 여부
    if policy.income_max is not None:
        user_income = getattr(profile, "income_range", None)
        if _income_within(user_income, policy.income_max):
            if user_income and hasattr(user_income, "value"):
                label = user_income.value.replace("중위소득 ", "중위").replace("% 이하", "%이하")
                parts.append(f"소득({label})")

    # 상황 조건 충족 여부
    if policy.required_situations:
        matched = [s for s in policy.required_situations if s in profile.life_situations]
        if matched:
            # 첫 번째 매칭 상황을 짧게 표시
            short = matched[0].value.replace("이 부족해요", "부족").replace("이 걱정돼요", "걱정") \
                                    .replace("이 필요해요", "필요").replace("이 어려워요", "어려움") \
                                    .replace("이 불안정해요", "불안정").replace("이 있어요", "있음") \
                                    .replace("을 돌봐야 해요", "돌봄").replace("상황이에요", "")
            parts.append(f"상황({short.strip()})")

    # 가족 조건 충족 여부
    if policy.required_family and profile.family_status in policy.required_family:
        short = profile.family_status.value.replace("살고 있어요", "").replace("이 있어요", "") \
                                           .replace("를 돌보고 있어요", "돌봄").strip()
        parts.append(f"가족({short})")

    # 직업 조건 충족 여부
    if policy.required_work and profile.work_status in policy.required_work:
        short = profile.work_status.value.replace("에 다니고 있어요", "").replace("을 하고 있어요", "") \
                                         .replace("이에요", "").strip()
        parts.append(f"직업({short})")

    # 우선 지원 대상
    if exc_result == "PRIORITY":
        parts.append("우선지원대상")

    joined = " · ".join(parts) if parts else "기본 자격"

    if level == MatchLevel.DEFINITE:
        return f"✅ {joined} 조건 충족 → 지금 신청 가능"
    elif level == MatchLevel.POSSIBLE:
        return f"🔍 {joined} 해당 → 추가 확인 후 신청"
    elif level == MatchLevel.FUTURE:
        unmet = []
        if policy.age_min is not None or policy.age_max is not None:
            if not _age_ok(profile, policy, exc_result):
                lo = policy.age_min or 0
                hi = policy.age_max or 120
                unmet.append(f"나이({profile.age}세→기준{lo}~{hi}세)")
        if unmet:
            return f"📌 현재 {', '.join(unmet)} 미충족 → 향후 해당 가능"
        return "📌 일부 조건 미충족 → 향후 해당 가능"
    return ""


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
