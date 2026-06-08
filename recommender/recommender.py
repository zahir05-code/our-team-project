"""개인 맞춤 복지서비스 추천 엔진 — 3단계 매칭."""

import logging
from welfare_analyzer.api.bokjiro_client import WelfareService
from welfare_analyzer.models.user_profile import (
    UserProfile, LifeSituation, ServiceMatchLevel
)

logger = logging.getLogger(__name__)

# 상황 → 서비스 키워드 매핑 (매칭 판단 기준)
SITUATION_KEYWORDS = {
    LifeSituation.LIVING_COST: ["생계", "기초생활", "긴급복지", "식품", "에너지"],
    LifeSituation.MEDICAL:     ["의료", "건강", "질환", "요양", "재활", "정신"],
    LifeSituation.HOUSING:     ["주거", "임대", "전세", "월세", "주택"],
    LifeSituation.EDUCATION:   ["교육", "장학", "돌봄", "방과후", "아동"],
    LifeSituation.JOB:         ["취업", "고용", "실업", "일자리", "직업훈련"],
    LifeSituation.BUSINESS:    ["소상공인", "자영업", "창업", "폐업", "환급"],
    LifeSituation.CARE:        ["돌봄", "요양", "가족", "보호자"],
    LifeSituation.CRISIS:      ["긴급", "위기", "재난", "응급"],
    LifeSituation.DISABILITY:  ["장애", "희귀", "재활", "보조기기", "활동지원"],
}


def _text(svc: WelfareService) -> str:
    return svc.service_name + " " + svc.target + " " + svc.benefit


def _match_score(svc: WelfareService, profile: UserProfile) -> int:
    """서비스와 프로파일의 매칭 점수 계산 (0~10).

    높을수록 확실한 해당.
    """
    text = _text(svc)
    score = 0

    # 상황 키워드 매칭
    for situation in profile.life_situations:
        for kw in SITUATION_KEYWORDS.get(situation, []):
            if kw in text:
                score += 2

    # 연령 매칭
    age_kw_map = {
        (0, 12):  ["영유아", "아동"],
        (13, 18): ["청소년"],
        (19, 34): ["청년"],
        (35, 59): ["중장년"],
        (60, 150):["노인", "어르신", "고령"],
    }
    for (low, high), kws in age_kw_map.items():
        if low <= profile.age <= high:
            if any(kw in text for kw in kws):
                score += 2

    # 가족 상황 매칭
    from welfare_analyzer.models.user_profile import FamilyStatus
    if profile.family_status == FamilyStatus.SINGLE_PARENT and "한부모" in text:
        score += 2
    if profile.children_count > 0 and any(k in text for k in ["아동", "양육", "자녀"]):
        score += 1
    if profile.is_veteran and "국가유공자" in text:
        score += 3

    # 자영업 매칭
    if profile.is_self_employed() and any(k in text for k in ["소상공인", "자영업"]):
        score += 2

    return score


def classify_services(
    services: list[WelfareService],
    profile: UserProfile,
) -> dict[str, list[WelfareService]]:
    """서비스를 3단계로 분류.

    지금 바로 신청 가능 / 해당 가능성 있음 / 미리 알아두면 좋은 것
    """
    definite = []
    possible = []
    future   = []

    for svc in services:
        score = _match_score(svc, profile)

        # 나에게 해당되는 이유 자동 생성
        reasons = []
        for situation in profile.life_situations:
            for kw in SITUATION_KEYWORDS.get(situation, []):
                if kw in _text(svc):
                    reasons.append(situation.value.split("요")[0])
                    break
        svc.match_reason = ", ".join(set(reasons)) if reasons else "관련 서비스"

        if score >= 4:
            svc.match_level = ServiceMatchLevel.DEFINITE.value
            definite.append(svc)
        elif score >= 1:
            svc.match_level = ServiceMatchLevel.POSSIBLE.value
            possible.append(svc)
        else:
            svc.match_level = ServiceMatchLevel.FUTURE.value
            future.append(svc)

    logger.info(
        "매칭 결과 — 확실: %d건 / 가능성: %d건 / 미리보기: %d건",
        len(definite), len(possible), len(future)
    )
    return {
        ServiceMatchLevel.DEFINITE.value: definite,
        ServiceMatchLevel.POSSIBLE.value: possible,
        ServiceMatchLevel.FUTURE.value:   future,
    }


def build_result_summary(
    result: dict[str, list[WelfareService]],
    profile: UserProfile,
) -> str:
    """결과 요약 텍스트 생성 (Draft 저장 및 화면 출력용)."""
    lines = [f"[{profile.summary()}]", ""]

    for level, services in result.items():
        lines.append(f"▶ {level}  ({len(services)}건)")
        for svc in services[:10]:
            lines.append(f"  • {svc.service_name} — {svc.department}")
            lines.append(f"    이유: {svc.match_reason}")
            if svc.apply_url:
                lines.append(f"    신청: {svc.apply_url}")
        lines.append("")

    return "\n".join(lines)
