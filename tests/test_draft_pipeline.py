"""Draft 파이프라인 테스트 — API 키 없이 오프라인 검증."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from welfare_analyzer.models.user_profile import (
    UserProfile, LifeSituation, WorkStatus,
    FamilyStatus, IncomeRange, MasterDataSource,
    validate_region, ALLOWED_GYEONGGI_DISTRICTS,
)
from news_collector.crawlers.base_crawler import (
    BokjiroCrawler, Bojo24Crawler, GyeonggiCrawler,
    GYEONGGI_FILTER_KEYWORDS, GOYANG_FILTER_KEYWORDS,
)
from config.settings import REPORT_DRAFT_DIR

PASS = "✅ PASS"
FAIL = "❌ FAIL"


def test_region_validation():
    """허용 지역(서울·경기) 검증."""
    assert validate_region("서울특별시", "강남구")   == True,  "서울 강남구 허용 실패"
    assert validate_region("서울특별시", "노원구")   == True,  "서울 노원구 허용 실패"
    assert validate_region("경기도", "고양시")       == True,  "경기 고양시 허용 실패"
    assert validate_region("경기도", "수원시")       == True,  "경기 수원시 허용 실패"
    assert validate_region("부산광역시", "해운대구") == False, "부산 차단 실패"
    assert validate_region("대구광역시", "수성구")   == False, "대구 차단 실패"
    print(f"{PASS} 허용 지역(서울·경기) / 차단 지역(부산·대구 등) 검증")


def test_profile_source_injection():
    """서울 → 소스 3개 / 경기도 → 3개 자동 주입."""
    seoul = UserProfile(age=30, region="서울특별시", district="강남구")
    assert len(seoul.active_sources) == 3
    assert MasterDataSource.SEOUL   in seoul.active_sources
    assert MasterDataSource.BOKJIRO in seoul.active_sources
    assert MasterDataSource.BOJO24  in seoul.active_sources
    print(f"{PASS} 서울 소스 3개 주입 (복지로+보조금24+서울시)")

    gyeonggi = UserProfile(age=30, region="경기도", district="고양시")
    assert len(gyeonggi.active_sources) == 3
    assert MasterDataSource.GYEONGGI in gyeonggi.active_sources
    print(f"{PASS} 경기도 소스 3개 주입 (복지로+보조금24+경기도)")


def test_invalid_region_raises():
    """허용 외 지역(부산·대구 등) 입력 시 ValueError 발생."""
    try:
        UserProfile(age=30, region="부산광역시", district="해운대구")
        print(f"{FAIL} 부산 차단 미작동")
    except ValueError:
        print(f"{PASS} 허용 외 지역 차단 (ValueError) — 부산")


def test_goyang_detection():
    """고양시 감지 및 특화 키워드 포함."""
    profile = UserProfile(
        age=40, region="경기도", district="고양시",
        life_situations=[LifeSituation.LIVING_COST],
        work_status=WorkStatus.SELF_EMPLOYED,
    )
    assert profile.is_goyang() == True
    kws = profile.search_keywords()
    assert "고양시" in kws or "고양" in kws
    print(f"{PASS} 고양시 감지 및 특화 키워드 포함")


def test_region_filter_gyeonggi():
    """경기도 프로파일 → 경기 관련 항목만 통과."""
    profile  = UserProfile(age=35, region="경기도", district="수원시",
                           life_situations=[LifeSituation.LIVING_COST])
    crawler  = BokjiroCrawler(profile)

    dummy_items = [
        {"servNm": "경기도 청년 기초생활 지원", "servId": "A001"},
        {"servNm": "서울시 청년 주거급여",       "servId": "B001"},
        {"servNm": "수원시 긴급복지 지원",       "servId": "C001"},
        {"servNm": "부산시 의료급여 지원",       "servId": "D001"},
    ]

    filtered = crawler.filter_by_region(dummy_items)
    ids = [i["servId"] for i in filtered]
    assert "A001" in ids, "경기도 항목 누락"
    assert "C001" in ids, "수원시 항목 누락"
    assert "B001" not in ids, "서울 항목 미차단"
    assert "D001" not in ids, "부산 항목 미차단"
    print(f"{PASS} 경기권 필터 — 경기 {len(filtered)}건 통과 / 외 지역 차단")


def test_draft_file_created():
    """수집 결과가 reports/drafts/ 에 PENDING_APPROVAL 상태로 저장."""
    profile = UserProfile(
        age=45, region="서울특별시", district="강남구",
        life_situations=[LifeSituation.BUSINESS, LifeSituation.LIVING_COST],
        work_status=WorkStatus.SMALL_BIZ,
    )
    crawler   = BokjiroCrawler(profile)
    dummy     = [{"servNm": "고양시 소상공인 긴급지원", "servId": "TEST_001",
                  "_region_matched": True}]
    path      = crawler.save_draft(dummy)

    assert path.exists(), "Draft 파일 미생성"
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["_meta"]["status"]     == "PENDING_APPROVAL"
    assert data["_meta"]["region"]     == "서울특별시"
    assert data["_meta"]["district"]   == "강남구"
    assert data["_meta"]["source"]     == MasterDataSource.BOKJIRO.value
    assert len(data["items"])          == 1
    print(f"{PASS} Draft 파일 생성 확인: {path.name}")
    print(f"     status = {data['_meta']['status']}")
    print(f"     region = {data['_meta']['region']} {data['_meta']['district']}")
    print(f"     items  = {data['_meta']['item_count']}건")
    return path


def test_draft_separation():
    """서울·경기 두 프로파일의 Draft가 각각 분리 저장."""
    import time
    from news_collector.crawlers.base_crawler import SeoulCrawler

    p1 = UserProfile(age=30, region="서울특별시", district="마포구",
                     life_situations=[LifeSituation.JOB])
    p2 = UserProfile(age=50, region="경기도", district="수원시",
                     life_situations=[LifeSituation.HOUSING])

    c1 = SeoulCrawler(p1)
    c2 = GyeonggiCrawler(p2)

    f1 = c1.save_draft([{"servNm": "서울 청년취업지원", "servId": "SEO_001"}])
    time.sleep(1)
    f2 = c2.save_draft([{"servNm": "경기 주거급여",     "servId": "GG_001"}])

    assert f1 != f2, "Draft 파일 충돌"
    assert "seoul"    in f1.name
    assert "gyeonggi" in f2.name
    print(f"{PASS} Draft 분리 저장 확인")
    print(f"     서울 Draft: {f1.name}")
    print(f"     경기 Draft: {f2.name}")


if __name__ == "__main__":
    print("\n" + "=" * 52)
    print("  아테나 Draft 파이프라인 테스트")
    print("=" * 52)

    test_region_validation()
    test_profile_source_injection()
    test_invalid_region_raises()
    test_goyang_detection()
    test_region_filter_gyeonggi()
    test_draft_file_created()
    test_draft_separation()

    print("\n" + "=" * 52)
    print(f"  모든 테스트 통과 — reports/drafts/ 분리 저장 확인")
    print(f"  저장 위치: {REPORT_DRAFT_DIR}")
    print("=" * 52 + "\n")
