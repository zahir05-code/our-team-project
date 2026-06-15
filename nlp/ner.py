"""개체명 인식 (NER) — 자연어에서 나이·지역·구 추출.

입력 예: "저 40대 경기도 수원시 사는 한부모인데 생활비가 너무 부족해요"
출력:   { age: 40, region: "경기도", district: "수원시" }

나이 인식 패턴:
  "35살", "35세", "30대", "마흔", "서른", "58세 이고", "80세 까지"
  → 첫 번째로 등장하는 나이 숫자를 채택 (오인식 방지)
"""

import re
from welfare_analyzer.models.user_profile import (
    ALLOWED_REGIONS,
    ALLOWED_SEOUL_DISTRICTS,
    ALLOWED_GYEONGGI_DISTRICTS,
)
from nlp.morpheme import analyze as _analyze

# 모든 허용 구·시·군 플랫 목록 (길이 내림차순 → 긴 지명 우선 매칭)
ALL_DISTRICTS = sorted(
    ALLOWED_SEOUL_DISTRICTS | ALLOWED_GYEONGGI_DISTRICTS,
    key=len, reverse=True
)

# ── 한글 나이 단어 ─────────────────────────────────────────────
KOR_AGE: dict[str, int] = {
    "열살":  10, "열다섯": 15,
    "스물":  25, "스무살": 20,
    "서른":  35,
    "마흔":  45,
    "쉰":    55,
    "예순":  65,
    "일흔":  75,
    "여든":  85,
    "아흔":  95,
}

# ── 맥락상 나이가 아닌 숫자 앞에 오는 단어 ──────────────────────
# "80세 까지", "100세 시대" 같은 관용구는 제외
NON_AGE_CONTEXT = re.compile(
    r"(?:까지|시대|넘게|이상|미만|넘어|전후|이하)\s*$"
)


def extract_age(text: str) -> int | None:
    """나이 추출 — 첫 번째로 등장하는 유효한 나이 값 반환.

    패턴 우선순위:
      1) 숫자 + 살/세  (앞 단어 필터로 관용구 제거)
      2) X0대          (30대→35, 60대→65)
      3) 한글 나이 단어
    """
    # 1) 숫자 + 살/세 → 텍스트 전체에서 모두 찾아 첫 번째 유효 값 채택
    for m in re.finditer(r"(\d{1,3})\s*(?:살|세)", text):
        num = int(m.group(1))
        if num < 1 or num > 110:
            continue
        # 뒤에 관용구가 오는지 확인 (e.g. "80세 까지")
        after = text[m.end():m.end() + 10]
        if NON_AGE_CONTEXT.search(after.strip()):
            continue
        return num

    # 2) X0대 → 대표값 (30대→35, 60대→65)
    m = re.search(r"(\d{1,2})0대", text)
    if m:
        base = int(m.group(1))
        if 1 <= base <= 10:
            return base * 10 + 5

    # 3) 한글 나이
    for word, age in KOR_AGE.items():
        if word in text:
            return age

    return None


def extract_region(text: str) -> tuple[str, str]:
    """지역(시·도) 및 구·시·군 추출.

    반환: (region, district)
    허용 지역: 서울특별시, 경기도만 허용.
    구·시·군 감지 시 상위 지역 자동 보완.
    """
    region   = ""
    district = ""

    # ── 구어체·약칭 정규화 ─────────────────────────────────────
    # "서울 살아요", "경기 살아", "서울에 살", "경기에 있어" 등 처리
    REGION_ALIAS: dict[str, list[str]] = {
        "서울특별시": [
            "서울특별시", "서울시", "서울에", "서울에서", "서울 살",
            "서울로", "서울이에요", "서울이야", "서울 거주",
            "서울인데", "서울에 있", "서울 사는", "서울",
        ],
        "경기도": [
            "경기도", "경기에", "경기에서", "경기 살",
            "경기로", "경기이에요", "경기인데", "경기에 있",
            "경기 사는", "경기 거주", "경기",
        ],
    }
    # 길고 구체적인 패턴 먼저 (이중 매칭 방지)
    for reg, patterns in REGION_ALIAS.items():
        if any(p in text for p in patterns):
            region = reg
            break

    # ── 구·시·군 감지 (긴 지명 우선) ───────────────────────────
    for d in ALL_DISTRICTS:
        if d in text:
            district = d
            if not region:
                if d in ALLOWED_SEOUL_DISTRICTS:
                    region = "서울특별시"
                else:
                    region = "경기도"
            break

    # ── 경기도 시·군 직접 언급 → 자동 매핑 ─────────────────────
    # "수원에 살아요", "고양시에 있어요" 처럼 도 이름 없이 시군만 말할 때
    if not district:
        for d in ALL_DISTRICTS:
            # 시/군/구 뒤에 조사가 붙은 형태도 감지 (수원에, 안양에서, 강남구에)
            pattern = re.compile(re.escape(d) + r"(?:에|에서|에서는|으로|는|이|가|을|를)?")
            if pattern.search(text):
                district = d
                if not region:
                    if d in ALLOWED_SEOUL_DISTRICTS:
                        region = "서울특별시"
                    else:
                        region = "경기도"
                break

    return region, district


def run_ner(text: str) -> dict:
    """전체 NER 실행 — 나이·지역·구 추출.

    형태소 분석으로 명사를 먼저 추출한 뒤 원문과 합산해 매칭 정확도 향상.
    """
    # 형태소 분석으로 고유명사(NNP) 추출 → 지역명 감지 보조
    morph      = _analyze(text)
    # NNP(고유명사) + 복합명사를 포함한 확장 텍스트로 지역 재탐색
    ext_text   = text + " " + " ".join(
        t["form"] for t in morph["tokens"] if t["tag"] == "NNP"
    ) + " " + " ".join(morph["compounds"])

    age              = extract_age(text)          # 원문에서 나이 추출 (숫자 패턴)
    region, district = extract_region(ext_text)   # 확장 텍스트로 지역 탐색

    return {
        "age":      age,
        "region":   region,
        "district": district,
    }
