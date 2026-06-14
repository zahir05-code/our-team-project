"""중앙정부·지자체 복지서비스 링크 연결 모듈.

API 키 없이 사용자 프로파일 기반으로
복지로(중앙) 및 각 지자체 포털 링크를 자동 생성한다.
"""

from urllib.parse import urlencode
from welfare_analyzer.models.user_profile import UserProfile, LifeSituation, GenderStatus


# ── 중앙정부 링크 ────────────────────────────────────────────

BOKJIRO_BASE = "https://www.bokjiro.go.kr"

# 복지로 생애주기 코드
LIFECYCLE_CODE = {
    (0,  12): "001",   # 영유아·아동
    (13, 18): "002",   # 청소년
    (19, 34): "003",   # 청년
    (35, 59): "004",   # 중장년
    (60, 150):"005",   # 노년
}

# 복지로 서비스 분야 코드
SITUATION_SERVICE_CODE = {
    LifeSituation.LIVING_COST: "001",   # 생활안정
    LifeSituation.MEDICAL:     "002",   # 보건·의료
    LifeSituation.HOUSING:     "003",   # 주거
    LifeSituation.EDUCATION:   "004",   # 교육
    LifeSituation.JOB:         "005",   # 고용·취업
    LifeSituation.BUSINESS:    "006",   # 경제적 지원
    LifeSituation.CARE:        "007",   # 돌봄·서비스
    LifeSituation.CRISIS:      "008",   # 서민금융·법률
    LifeSituation.DISABILITY:  "009",   # 임신·출산 (장애 포함 포괄)
}

# 중앙 부처별 복지 포털 링크 — 메인 또는 안정적인 1단계 하위 URL만 사용
CENTRAL_GOV_LINKS = {
    "보조금24":             "https://www.gov24.go.kr",
    "정부24 복지서비스":    "https://www.gov.kr/portal/welfare/welfareInfo",
    "보건복지부":           "https://www.mohw.go.kr",
    "고용노동부 고용서비스":"https://www.moel.go.kr",
    "국토교통부 주거복지":  "https://www.molit.go.kr",
    "교육부 교육급여":      "https://www.moe.go.kr",
    "중소벤처기업부":       "https://www.mss.go.kr",
    "정책브리핑(국정과제)": "https://www.korea.kr",
}


# ── 지자체 링크 ──────────────────────────────────────────────

LOCAL_GOV_LINKS = {
    "서울특별시": {
        "서울복지포털(wis)": "https://wis.seoul.go.kr",
        "서울시 복지재단":   "https://www.swf.or.kr",
        "서울시 통합포털":   "https://www.seoul.go.kr",
    },
    "경기도": {
        "경기도 복지포털":   "https://www.gg.go.kr",
        "경기복지재단":      "https://www.ggwf.or.kr",
        "경기도 일자리재단": "https://www.gjf.or.kr",
    },
}

# ── 성별 특화 서비스 링크 ────────────────────────────────────

GENDER_LINKS: dict[str, dict] = {
    "여성": {
        "여성가족부":                    "https://www.mogef.go.kr",
        "새일센터(경력단절여성 취업)":   "https://www.saeil.mogef.go.kr",
        "한국여성인력개발원":            "https://www.vocation.or.kr",
        "임신육아종합포털(아이사랑)":    "https://www.childcare.go.kr",
        "한부모가족 지원(복지로)":       "https://www.bokjiro.go.kr",
        "서울 여성복지포털":             "https://wis.seoul.go.kr",
        "경기 여성비전센터":             "https://www.gvision.or.kr",
    },
    "남성": {
        "고용노동부(일자리·육아휴직)":   "https://www.moel.go.kr",
        "국가보훈부":                    "https://www.mpva.go.kr",
        "고용보험(육아휴직 신청)":       "https://www.ei.go.kr",
        "워크넷 중장년 취업":            "https://www.work.go.kr",
        "한국장애인고용공단":            "https://www.kead.or.kr",
        "국방부 병역명문가":             "https://www.mnd.go.kr",
    },
}

# 공통 환급금·지원금 조회 링크
REFUND_LINKS = {
    "복지로(모의계산·조회)":     "https://www.bokjiro.go.kr",
    "국세청 홈택스(환급금)":     "https://www.hometax.go.kr",
    "정부24 미환급금":           "https://www.gov.kr",
    "건강보험공단(환급금)":      "https://www.nhis.or.kr",
    "고용보험(미지급금)":        "https://www.ei.go.kr",
    "소상공인진흥공단":          "https://www.semas.or.kr",
    "금융결제원(휴면계좌)":      "https://www.payinfo.or.kr",
}


# ── 링크 생성 함수 ───────────────────────────────────────────

def get_lifecycle_code(age: int) -> str:
    for (low, high), code in LIFECYCLE_CODE.items():
        if low <= age <= high:
            return code
    return ""


def build_bokjiro_search_url(profile: UserProfile) -> str:
    """사용자 나이 기반 정부24 복지서비스 포털 URL 반환."""
    # 정부24 복지서비스 포털 — GET 접근 가능, 나이 무관 전체 복지서비스 목록
    return "https://www.gov.kr/portal/welfare/welfareInfo"


def build_result_links(profile: UserProfile) -> dict:
    """사용자 프로파일 기반 전체 연결 링크 생성.

    반환:
        {
            "중앙정부": { 서비스명: URL },
            "지자체":   { 서비스명: URL },
            "환급금":   { 서비스명: URL },
        }
    """
    result = {}

    # 중앙정부 링크 — CENTRAL_GOV_LINKS 그대로 사용 (중복 없음)
    central = dict(CENTRAL_GOV_LINKS)
    result["중앙정부"] = central

    # 지자체 링크 — 사용자 지역 기준 (서울·경기만 허용)
    region = profile.region
    if region in LOCAL_GOV_LINKS:
        result["지자체"] = LOCAL_GOV_LINKS[region]

    # 성별 특화 링크 추가
    gender = getattr(profile, "gender", None)
    if gender == GenderStatus.FEMALE:
        result["여성 특화 서비스"] = GENDER_LINKS["여성"]
    elif gender == GenderStatus.MALE:
        result["남성 특화 서비스"] = GENDER_LINKS["남성"]

    # 환급금 링크 — 자영업자이거나 환급금 관심 있는 경우
    if (profile.is_self_employed()
            or profile.has_tax_refund_target
            or LifeSituation.BUSINESS in profile.life_situations):
        result["환급금·지원금"] = REFUND_LINKS

    return result


def format_links_for_display(profile: UserProfile) -> str:
    """결과 링크를 화면 출력용 텍스트로 변환 (Draft 저장용)."""
    links = build_result_links(profile)
    lines = [f"[{profile.summary()}]", "", "=" * 50]

    for section, items in links.items():
        lines.append(f"\n▶ {section}")
        for name, url in items.items():
            lines.append(f"  • {name}")
            lines.append(f"    {url}")

    lines.append("\n" + "=" * 50)
    lines.append("※ 각 링크를 클릭하면 해당 기관 페이지로 직접 이동합니다.")
    return "\n".join(lines)
