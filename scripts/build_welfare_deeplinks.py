"""
build_welfare_deeplinks.py
──────────────────────────
앱에서 추출한 복지서비스명을 복지로/정부24 공식 서비스명과 매칭해서
검색 페이지가 아니라 해당 복지서비스 상세페이지로 바로 연결하는 JSON 생성.

입력:
  data/extracted_services.json   — 앱 DB에서 추출한 서비스 목록
  data/official_welfare_services.csv — 공식 복지서비스 기준 데이터

출력:
  static/js/welfareDeepLinks.json — 앱 카드 버튼이 사용하는 딥링크 매핑

매칭 우선순위:
  1순위) 완전 일치 (공백·괄호·특수문자 제거 후 비교)
  2순위) 포함 일치 (extracted ⊂ official 또는 official ⊂ extracted)
  3순위) 유사도 매칭 (difflib SequenceMatcher ≥ 0.75)
  fallback) 복지로 통합검색 URL (실제 작동)
"""

import json
import csv
import re
import sys
from pathlib import Path
from difflib import SequenceMatcher

# ── 경로 설정 ──────────────────────────────────────────────
ROOT         = Path(__file__).parent.parent
INPUT_JSON   = ROOT / "data" / "extracted_services.json"
OFFICIAL_CSV = ROOT / "data" / "official_welfare_services.csv"
OUTPUT_JSON  = ROOT / "static" / "js" / "welfareDeepLinks.json"

# 유사도 임계값 (0~1, 높을수록 엄격)
SIMILARITY_THRESHOLD = 0.75

# 복지로 서비스 상세 URL 패턴
BOKJIRO_DETAIL_TPL = (
    "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/"
    "moveTWAT52011M.do?wlfareInfoId={wlf_id}"
)
# 복지로 통합검색 fallback (실제 작동)
BOKJIRO_SEARCH_TPL = (
    "https://www.bokjiro.go.kr/ssis-tbu/search/search.do?query={keyword}"
)


# ── 유틸 ──────────────────────────────────────────────────
def normalize(text: str) -> str:
    """공백·괄호·특수문자 제거, 소문자화"""
    text = re.sub(r"[\s\(\)\[\]\{\}\-·,·/··]", "", text)
    text = re.sub(r"[^\w가-힣]", "", text)
    return text.lower()


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, normalize(a), normalize(b)).ratio()


def bokjiro_detail_url(wlf_id: str) -> str:
    return BOKJIRO_DETAIL_TPL.format(wlf_id=wlf_id)


def bokjiro_search_url(keyword: str) -> str:
    from urllib.parse import quote
    return BOKJIRO_SEARCH_TPL.format(keyword=quote(keyword))


# ── 공식 데이터 로드 ───────────────────────────────────────
def load_official(csv_path: Path) -> list[dict]:
    officials = []
    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # WLF ID → detail_url 자동 생성
            sid = row.get("service_id", "").strip()
            detail = row.get("detail_url", "").strip()
            if not detail and sid.startswith("WLF"):
                detail = bokjiro_detail_url(sid)
                row["detail_url"] = detail
            row["_norm_official"] = normalize(row.get("official_name", ""))
            row["_norm_alias"]    = normalize(row.get("alias", ""))
            officials.append(row)
    return officials


# ── 매칭 로직 ──────────────────────────────────────────────
def find_match(service_name: str, officials: list[dict]) -> tuple[dict | None, str]:
    """
    Returns (matched_official_row, match_type)
    match_type: "exact" | "partial" | "similarity" | None
    """
    norm_name = normalize(service_name)

    # 1순위: 완전 일치
    for off in officials:
        if norm_name == off["_norm_official"] or norm_name == off["_norm_alias"]:
            return off, "exact"

    # 2순위: 포함 일치
    for off in officials:
        on = off["_norm_official"]
        oa = off["_norm_alias"]
        if (norm_name in on or on in norm_name or
                (oa and (norm_name in oa or oa in norm_name))):
            return off, "partial"

    # 3순위: 유사도 매칭
    best_score = 0.0
    best_off   = None
    for off in officials:
        score = max(
            similarity(service_name, off.get("official_name", "")),
            similarity(service_name, off.get("alias", "")) if off.get("alias") else 0,
        )
        if score > best_score:
            best_score = score
            best_off   = off

    if best_score >= SIMILARITY_THRESHOLD:
        return best_off, f"similarity({best_score:.2f})"

    return None, "none"


# ── 결과 빌드 ──────────────────────────────────────────────
def build_deeplinks(extracted: list[dict], officials: list[dict]) -> list[dict]:
    results   = []
    matched   = 0
    unmatched = []

    for svc in extracted:
        name     = svc.get("name", "")
        pid      = svc.get("policy_id", "")
        src_url  = svc.get("apply_url", "")
        source   = svc.get("source", "")

        off, match_type = find_match(name, officials)

        # detailUrl 결정
        if off and off.get("detail_url"):
            detail_url  = off["detail_url"]
            apply_url   = off.get("apply_url", "") or src_url
            source_site = off.get("source_site", "bokjiro")
            matched += 1
        elif src_url and "wlfareInfoId" in src_url:
            # DB에 이미 올바른 URL이 있는 경우
            detail_url  = src_url
            apply_url   = src_url
            source_site = "bokjiro"
            match_type  = "db_url"
            matched += 1
        else:
            # fallback
            detail_url  = bokjiro_search_url(name)
            apply_url   = detail_url
            source_site = "bokjiro-search"
            unmatched.append(name)

        entry = {
            "id":          pid,
            "title":       name,
            "sourceSite":  source_site,
            "detailUrl":   detail_url,
            "applyUrl":    apply_url or detail_url,
            "authority":   svc.get("authority", off.get("authority", "") if off else ""),
            "phone":       svc.get("phone", off.get("phone", "") if off else ""),
            "matchType":   match_type,
            "tags":        svc.get("tags", []),
        }
        results.append(entry)

    # 리포트
    total = len(extracted)
    print(f"\n{'='*55}")
    print(f"  복지서비스 딥링크 빌드 결과")
    print(f"{'='*55}")
    print(f"  총 서비스 수  : {total}개")
    print(f"  매칭 성공     : {matched}개 ({matched/total*100:.0f}%)")
    print(f"  fallback(검색): {len(unmatched)}개")
    if unmatched:
        print(f"\n  [fallback 목록]")
        for n in unmatched:
            print(f"    - {n}")
    print(f"{'='*55}\n")

    return results


# ── 메인 ──────────────────────────────────────────────────
def main():
    # 입력 파일 확인
    if not INPUT_JSON.exists():
        print(f"[오류] 입력 파일 없음: {INPUT_JSON}")
        sys.exit(1)
    if not OFFICIAL_CSV.exists():
        print(f"[오류] 기준 데이터 없음: {OFFICIAL_CSV}")
        sys.exit(1)

    # 로드
    with open(INPUT_JSON, encoding="utf-8") as f:
        extracted = json.load(f)
    officials = load_official(OFFICIAL_CSV)

    print(f"추출된 서비스: {len(extracted)}개 | 공식 기준 데이터: {len(officials)}개")

    # 빌드
    deeplinks = build_deeplinks(extracted, officials)

    # 저장
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(deeplinks, f, ensure_ascii=False, indent=2)

    print(f"저장 완료: {OUTPUT_JSON}")
    print(f"앱에서 /static/js/welfareDeepLinks.json 으로 로드 가능\n")


if __name__ == "__main__":
    main()
