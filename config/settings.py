# 프로젝트 전역 설정
# [보안 원칙] API 키, 토큰 등 민감 정보는 반드시 .env 파일에 분리 저장

# ─── 앱 버전 (단일 진실 소스) ────────────────────────────────
# 이 값만 수정하면 git commit 시 아래 파일이 자동 동기화됩니다:
#   static/js/app.js  (1번째 줄 주석)
#   templates/index.html  (?v= 쿼리스트링, CSS + JS 모두)
APP_VERSION = "5.61"

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# ─── 데이터 경로 ───────────────────────────────────────────
RAW_DATA_DIR       = BASE_DIR / "data" / "raw"
PROCESSED_DATA_DIR = BASE_DIR / "data" / "processed"
REPORT_DRAFT_DIR   = BASE_DIR / "reports" / "drafts"


# ─── 복지로 API 설정 ────────────────────────────────────────
WELFARE_API_BASE_URL = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo"
WELFARE_API_KEY      = ""  # .env 에서 주입

# ─── 지자체 API 설정 (주간 자동 수집) ────────────────────────
# Railway 환경변수에서 주입 — 없으면 해당 소스 자동 skip
# SEOUL_OPEN_DATA_KEY   : 서울 열린데이터광장 인증키 (data.seoul.go.kr)
# GYEONGGI_OPEN_DATA_KEY: 경기 데이터드림 인증키 (openapi.gg.go.kr)
# GOV_WELFARE_API_KEY   : 정부24 공공데이터포털 (apis.data.go.kr/B554287/)
SEOUL_API_BASE    = "http://openapi.seoul.go.kr:8088"
GYEONGGI_API_BASE = "https://openapi.gg.go.kr"

# ─── 환급금·지원금 조회 API 목록 (A-4 신규 탑재) ───────────
REFUND_API_SOURCES = {
    "국세청 환급금 조회":
        "https://teht.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/rf/a/b/UTERPAAB99.xml",
    "정부24 미환급금 조회":
        "https://www.gov.kr",
    "금융결제원 휴면계좌 통합조회":
        "https://www.payinfo.or.kr",
    "건강보험공단 환급금 조회":
        "https://www.nhis.or.kr/nhis/policy/wbhaca0200m01.do",
    "고용보험 미지급금 조회":
        "https://www.ei.go.kr",
    "소상공인 지원금 조회":
        "https://www.semas.or.kr",
}

# ─── API 요청 기본값 ────────────────────────────────────────
REQUEST_TIMEOUT = 15    # 초

# ─── 복지 5분류 키워드 (B-3 신규 탑재) ─────────────────────
WELFARE_CATEGORY_KEYWORDS = {
    "생계": [
        "기초생활", "수급자", "생계급여", "긴급복지", "생활비 지원",
        "식품바우처", "푸드뱅크", "에너지바우처",
    ],
    "의료": [
        "의료급여", "건강보험", "본인부담금", "희귀질환", "재난적의료비",
        "정신건강", "치매", "암검진", "의료비 지원",
    ],
    "주거": [
        "주거급여", "임대주택", "전세자금", "월세 지원", "주택바우처",
        "공공임대", "매입임대", "주거안정",
    ],
    "교육": [
        "교육급여", "교육비 지원", "장학금", "학습지원", "방과후",
        "돌봄", "누리과정", "아동수당", "교복비",
    ],
    "보조금·환급금": [
        "보조금", "환급금", "지원금", "소상공인", "자영업자",
        "신규환급", "고용장려금", "창업지원", "바우처",
        "장애인보조금", "농업직불금",
    ],
}

# 전체 통합 키워드 (기존 호환 유지)
WELFARE_KEYWORDS = [kw for kws in WELFARE_CATEGORY_KEYWORDS.values() for kw in kws]

# ─── 자영업자·소상공인 전용 키워드 (A-4 신규 탑재) ─────────
SELF_EMPLOY_KEYWORDS = [
    "소상공인", "자영업자", "폐업지원", "재창업", "사업정리",
    "희망리턴패키지", "노란우산공제", "소상공인 대출",
    "고용장려금", "두루누리", "일자리안정자금",
    "신규환급금", "부가세환급", "세금환급",
]
