"""의도 분류 (Intent Classification) — 자연어에서 상황·직업·가족 분류.

나이대별 실생활 언어를 폭넓게 반영한 키워드 사전.
- 20~30대: 청년 취업·학자금·전세사기·월세
- 40~50대: 경력단절·명예퇴직·중장년 재취업
- 60대+:   은퇴·노후·기초연금·독거노인
- 공통:    채무·빚·긴급복지·질환·돌봄

입력: "은퇴 후 58세, 1인 가구, 빚 있고 국민연금 거의 못 받음"
출력: {
    life_situations: ["생활비·식비가 부족해요", "취업·일자리가 필요해요"],
    work_status:     WorkStatus.OTHER,
    family_status:   FamilyStatus.SINGLE,
    confidence:      { ... }
}
"""

from welfare_analyzer.models.user_profile import (
    LifeSituation, WorkStatus, FamilyStatus, GenderStatus
)
from nlp.morpheme import normalized_text as _normalize

# ── 성별 키워드 사전 ──────────────────────────────────────────

GENDER_PATTERNS: dict[GenderStatus, list[str]] = {
    GenderStatus.FEMALE: [
        "여성", "여자", "엄마", "아내", "어머니", "딸",
        "여성분", "여자분", "임신", "출산", "육아",
        "경력단절", "한부모 엄마", "편모", "새일센터",
        "여성가족", "성평등",
    ],
    GenderStatus.MALE: [
        "남성", "남자", "아빠", "남편", "아버지", "아들",
        "남성분", "남자분", "가장", "군필",
        "편부", "한부모 아빠", "보훈",
    ],
}

# ── 상황 의도 키워드 사전 ────────────────────────────────────────

SITUATION_PATTERNS: dict[LifeSituation, list[str]] = {

    LifeSituation.LIVING_COST: [
        # 기본
        "생활비", "식비", "돈이 없", "빈곤", "가난", "먹고 살",
        "생계", "기초생활", "부족", "어렵", "힘들", "못 살",
        "결식", "끼니", "생활이 어",
        # 채무·부채 (나이 무관)
        "빚", "채무", "부채", "대출", "카드빚", "빚이",
        "신용불량", "파산", "채권", "연체",
        # 연금·노후 소득 부족
        "국민연금", "기초연금", "연금", "노령연금", "수급",
        "연금 못", "연금이 적", "연금이 없",
        "노후 자금", "노후 준비", "은퇴 자금", "퇴직금",
        "자금이 없", "자금이 부족", "전무",
        # 청년 주거비
        "월세", "보증금", "전세보증금",
        # 소득 없음
        "수입 없", "소득 없", "벌이 없", "버는 게 없",
        # 긴급
        "긴급", "급전", "당장",
    ],

    LifeSituation.MEDICAL: [
        "병원", "의료", "치료", "수술", "약값", "건강", "질환",
        "아프", "입원", "암", "장기요양", "간병", "재활",
        "희귀", "만성", "정신건강", "우울", "불안",
        "당뇨", "고혈압", "뇌졸중", "심장", "투석",
        "척추", "관절", "통증", "몸이 안 좋", "몸이 나빠",
        # 노인 질환
        "치매", "파킨슨", "낙상", "골절", "노인성",
        # 청년 정신건강
        "번아웃", "공황", "PTSD", "트라우마",
    ],

    LifeSituation.HOUSING: [
        "집", "주거", "전세", "월세", "임대", "이사", "노숙",
        "주택", "쫓겨", "퇴거", "살 곳", "방 없", "집 없",
        "공공임대", "거주", "보증금",
        # 청년 주거 위기
        "전세사기", "역전세", "깡통전세", "빌라", "원룸",
        "고시원", "쪽방", "반지하", "옥탑방",
        # 노인 주거
        "노후 주택", "집이 낡", "집 수리", "주택 개량",
    ],

    LifeSituation.EDUCATION: [
        "교육비", "학비", "학원", "돌봄", "보육", "유치원",
        "학교", "급식", "교복", "아동", "학습", "방과후",
        "장학금", "대학", "입학금",
        # 청년·학자금
        "학자금", "등록금", "학자금 대출", "취업 교육",
        # 직업훈련 (교육 범주)
        "직업훈련", "국비 교육", "국비지원", "기술 배우",
        "자격증",
    ],

    LifeSituation.JOB: [
        "취업", "일자리", "직장", "구직", "실업", "퇴직",
        "백수", "무직", "일을 잃", "해고", "권고사직",
        "직업훈련", "취준", "취업 준비",
        # 은퇴·노후 경제활동
        "은퇴", "노인 일자리", "노인일자리", "시니어 일자리",
        "경제활동", "재취업", "일을 해야", "일해야",
        # 경력단절
        "경력단절", "육아 후 복직", "경단녀",
        # 중장년·명예퇴직
        "명예퇴직", "조기퇴직", "구조조정", "중장년",
        # 청년
        "청년 취업", "첫 직장", "신입",
    ],

    LifeSituation.BUSINESS: [
        "사업", "자영업", "가게", "폐업", "매출", "소상공인",
        "창업", "장사", "가게 문", "적자", "환급금", "지원금",
        # 소상공인 채무 (LIVING_COST와 중복 허용)
        "임대료", "권리금", "폐점", "매장",
    ],

    LifeSituation.CARE: [
        "돌봄", "간병", "부모님", "할머니", "할아버지",
        "노인", "치매", "아픈 가족", "요양", "케어",
        "장애 자녀", "가족을 돌",
        # 추가
        "혼자 사시는 부모", "어르신", "요양원", "요양병원",
        "데이케어", "주간보호",
    ],

    LifeSituation.CRISIS: [
        "갑자기", "위기", "재난", "사고", "긴급", "갑작스",
        "갑작", "뜻밖", "예상치", "갑자기 어려",
        # 추가
        "갑작스러운", "갑자기 실직", "갑자기 아파",
        "화재", "수해", "자연재해", "이혼", "별거",
        "가장이", "혼자 벌", "갑자기 혼자",
    ],

    LifeSituation.DISABILITY: [
        "장애", "불편", "거동", "휠체어", "시각", "청각",
        "지체", "발달", "자폐", "뇌병변", "희귀질환",
        "몸이 불편", "신체적",
        # 추가
        "보청기", "의수", "의족", "재활치료",
        "활동보조", "장애인 활동",
    ],
}

# ── 직업 의도 키워드 사전 ────────────────────────────────────────

WORK_PATTERNS: dict[WorkStatus, list[str]] = {
    WorkStatus.EMPLOYED:      [
        "직장", "회사", "다니고", "샐러리맨", "직원",
        "정규직", "계약직", "공무원", "직장인",
    ],
    WorkStatus.SELF_EMPLOYED: [
        "자영업", "사업", "개인사업", "사장",
        "개인 사업", "사업자",
    ],
    WorkStatus.SMALL_BIZ:     [
        "소상공인", "가게", "점주", "상인",
        "식당", "카페", "편의점",
    ],
    WorkStatus.FREELANCE:     [
        "프리랜서", "프리", "단기", "알바", "파트타임",
        "아르바이트", "일용직", "단기 계약", "플랫폼",
        "배달", "대리운전",
    ],
    WorkStatus.JOB_SEEKING:   [
        "구직", "취준", "취업 준비", "일자리 찾", "백수",
        "취업중", "면접", "취업 활동",
        # 중장년 재취업
        "재취업", "경력단절", "일 찾고",
    ],
    WorkStatus.UNEMPLOYED:    [
        "실직", "해고", "권고사직", "무직", "일을 잃", "쉬고",
        "실업", "퇴직", "일 못 함", "일을 못",
    ],
    WorkStatus.STUDENT:       [
        "학생", "대학생", "고등학생", "중학생", "대학원",
        "취업 준비생", "수험생",
    ],
    WorkStatus.FARMER:        [
        "농업", "농민", "어업", "농어촌", "농사",
        "어민", "임업",
    ],
    WorkStatus.OTHER:         [
        # 은퇴·노후 (WorkStatus에 RETIRED 없으므로 OTHER로 분류)
        "은퇴", "퇴직 후", "노후", "정년", "정년퇴직",
        "은퇴 후", "노인 일자리", "시니어",
        # 육아·가사
        "육아 중", "가사", "전업주부", "육아로",
        # 장애·질병으로 일 못 함
        "일을 할 수 없", "일하기 어려",
    ],
}

# ── 가족 의도 키워드 사전 ────────────────────────────────────────

FAMILY_PATTERNS: dict[FamilyStatus, list[str]] = {
    FamilyStatus.SINGLE: [
        "혼자", "1인", "독거", "싱글",
        "1인 가족", "1인가구", "혼자 살", "혼자 삽니",
        "나 혼자", "독신", "미혼", "1인 세대",
        # 복합어 (형태소 분석으로 생성됨 → 가중치 역할)
        "독거노인", "독거어르신",
    ],
    FamilyStatus.WITH_SPOUSE: [
        "부부", "남편", "아내", "배우자", "둘이",
        "남편과", "아내와", "배우자와", "부부가",
    ],
    FamilyStatus.WITH_CHILDREN: [
        "자녀", "아이", "아들", "딸", "아기", "아기가",
        "자녀가", "아이가", "아들이", "딸이",
        "아이들", "자녀들", "육아",
    ],
    FamilyStatus.SINGLE_PARENT: [
        "한부모", "혼자 키우", "혼자 아이", "편부", "편모",
        "혼자 아이를", "엄마 혼자", "아빠 혼자",
        "혼자 양육",
    ],
    FamilyStatus.WITH_ELDERLY: [
        "부모님", "어머니", "아버지", "노인", "어르신",
        "부모님을 모시", "노부모", "홀어머니", "홀아버지",
        "연로한",
    ],
    FamilyStatus.WITH_SICK_FAMILY: [
        "아픈 가족", "간병", "병간호", "투병",
        "아픈 남편", "아픈 아내", "아픈 부모",
        "투병 중", "간호하고",
    ],
    FamilyStatus.MULTI_GENERATION: [
        "3대", "다세대", "조부모", "조손",
        "손자", "손녀", "손주", "할머니와 살",
    ],
}


def _match_score(text: str, patterns: list[str]) -> int:
    """텍스트에서 패턴 매칭 점수 계산."""
    return sum(1 for p in patterns if p in text)


# 가족 상황 — 우선순위 순서 (구체적일수록 먼저)
_FAMILY_PRIORITY = [
    FamilyStatus.SINGLE_PARENT,     # 한부모 (가장 구체적)
    FamilyStatus.MULTI_GENERATION,
    FamilyStatus.WITH_SICK_FAMILY,
    FamilyStatus.WITH_ELDERLY,
    FamilyStatus.WITH_CHILDREN,
    FamilyStatus.WITH_SPOUSE,
    FamilyStatus.SINGLE,            # 혼자 (가장 일반적 → 마지막)
]


def classify_situations(text: str) -> tuple[list[LifeSituation], dict]:
    """상황 의도 분류 — 복수 반환 + 신뢰도."""
    scores = {
        sit: _match_score(text, patterns)
        for sit, patterns in SITUATION_PATTERNS.items()
    }
    detected   = [sit for sit, s in scores.items() if s >= 1]
    confidence = {sit.value: s for sit, s in scores.items() if s >= 1}
    return detected, confidence


def classify_work(text: str) -> WorkStatus | None:
    """직업 의도 분류 — 최고 점수 반환."""
    scores = {w: _match_score(text, p) for w, p in WORK_PATTERNS.items()}
    best   = max(scores, key=scores.get)
    return best if scores[best] >= 1 else None


def classify_family(text: str) -> FamilyStatus | None:
    """가족 의도 분류 — 우선순위 기반 반환.

    동점 시 더 구체적인(specific) 상태가 우선.
    예) 한부모(SINGLE_PARENT) > 단독가구(SINGLE)
    """
    scores = {f: _match_score(text, p) for f, p in FAMILY_PATTERNS.items()}
    top_score = max(scores.values())
    if top_score < 1:
        return None
    # 동점 시 _FAMILY_PRIORITY 순서로 선택
    for fam in _FAMILY_PRIORITY:
        if scores.get(fam, 0) == top_score:
            return fam
    return max(scores, key=scores.get)


def classify_gender(text: str) -> GenderStatus:
    """성별 의도 분류."""
    scores = {g: _match_score(text, p) for g, p in GENDER_PATTERNS.items()}
    best   = max(scores, key=scores.get)
    return best if scores[best] >= 1 else GenderStatus.NONE


def run_intent(text: str) -> dict:
    """전체 의도 분류 실행.

    형태소 분석으로 정규화된 텍스트에 매칭하여 조사·활용형 문제 해소.
    """
    # 형태소 분석 정규화 텍스트 (원문 + 핵심명사 + 복합명사)
    norm = _normalize(text)

    situations, confidence = classify_situations(norm)
    work   = classify_work(norm)
    family = classify_family(norm)
    gender = classify_gender(norm)

    return {
        "life_situations": situations,
        "work_status":     work,
        "family_status":   family,
        "gender":          gender,
        "confidence":      confidence,
    }
