"""공공데이터포털 3대 마스터 데이터 수집기 — 경기도·고양시 특화 보조금 필터.

3대 마스터 데이터:
  1. 복지로_복지서비스목록    (보건복지부 / 전국)
  2. 보조금24_보조금정보      (기획재정부 / 전국)
  3. 경기도_복지보조금서비스  (경기데이터드림 / 경기권)

수집 결과는 reports/drafts/ 에 승인 대기 파일로 저장된다.
아테나님의 명시적 승인 전까지 외부 전송·활용 불가.
"""

import os
import json
import logging
import hashlib
import requests
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path

from welfare_analyzer.models.user_profile import (
    UserProfile, MasterDataSource, ALLOWED_GYEONGGI_DISTRICTS
)
from config.settings import REQUEST_TIMEOUT, REPORT_DRAFT_DIR

logger = logging.getLogger(__name__)

# ── 공공데이터포털 3대 마스터 데이터 엔드포인트 ─────────────

MASTER_ENDPOINTS = {
    MasterDataSource.BOKJIRO: (
        "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo"
        "/retrieveWlfareInfo.do"
    ),
    MasterDataSource.BOJO24: (
        "https://api.boje.go.kr/v1/subsidyList"
    ),
    MasterDataSource.GYEONGGI: (
        "https://openapi.gg.go.kr/SocialWelfare"
    ),
    MasterDataSource.SEOUL: (
        "https://data.seoul.go.kr/dataList/OA-15585/S/1/datasetView.do"
    ),
}

# 서울 특화 필터 키워드
SEOUL_FILTER_KEYWORDS = [
    "서울", "서울시", "서울특별시",
    "종로", "중구", "용산", "성동", "광진", "동대문", "중랑",
    "성북", "강북", "도봉", "노원", "은평", "서대문", "마포",
    "양천", "강서", "구로", "금천", "영등포", "동작", "관악",
    "서초", "강남", "송파", "강동",
]

# 경기도·고양시 특화 보조금 필터 키워드
GYEONGGI_FILTER_KEYWORDS = [
    "경기도", "경기", "수원", "성남", "의정부", "안양", "부천",
    "고양", "고양시", "덕양", "일산", "파주", "남양주", "화성",
    "용인", "평택", "안산", "시흥", "군포", "광명", "의왕",
    "하남", "구리", "오산", "과천", "이천", "안성", "김포",
    "양주", "포천", "여주", "연천", "가평", "양평",
]

GOYANG_FILTER_KEYWORDS = [
    "고양시", "고양", "덕양구", "일산동구", "일산서구",
    "일산", "화정", "능곡", "행신", "성사", "원당",
]


def _make_draft_id(source: MasterDataSource, keyword: str) -> str:
    raw = f"{source.value}_{keyword}_{datetime.now().isoformat()}"
    return hashlib.md5(raw.encode()).hexdigest()[:10]


# ── 추상 기반 클래스 ─────────────────────────────────────────

class BaseCrawler(ABC):
    """3대 마스터 데이터 수집기의 공통 기반.

    서브클래스는 fetch_raw() 만 구현하면 된다.
    필터링·저장·승인 대기 파일 생성은 공통 처리.
    """

    def __init__(self, profile: UserProfile):
        self.profile = profile
        self.source  = self._source()
        self.api_key = os.getenv("PUBLIC_DATA_API_KEY", "")
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "AthenaWelfareBot/1.0",
            "Accept":     "application/json",
        })

    @abstractmethod
    def _source(self) -> MasterDataSource:
        """이 수집기가 담당하는 마스터 소스."""

    @abstractmethod
    def fetch_raw(self, keyword: str) -> list[dict]:
        """API 호출 후 원시 항목 목록 반환."""

    # ── 공통 파이프라인 ────────────────────────────────────────

    def filter_by_region(self, items: list[dict]) -> list[dict]:
        """서울·경기 특화 보조금만 솎아낸다."""
        if self.profile.region == "서울특별시":
            keywords = SEOUL_FILTER_KEYWORDS.copy()
        elif self.profile.region == "경기도":
            keywords = GYEONGGI_FILTER_KEYWORDS.copy()
            if self.profile.is_goyang():
                keywords += GOYANG_FILTER_KEYWORDS
        else:
            return items

        result = []
        for item in items:
            text = json.dumps(item, ensure_ascii=False)
            if any(kw in text for kw in keywords):
                item["_region_matched"] = True
                result.append(item)
        logger.info(
            "[%s] 경기권 필터: %d → %d건",
            self.source.value, len(items), len(result)
        )
        return result

    def collect(self) -> list[dict]:
        """키워드별 수집 → 지역 필터 → 중복 제거."""
        keywords = self.profile.search_keywords()
        seen, all_items = set(), []

        for kw in keywords:
            raw = self.fetch_raw(kw)
            for item in raw:
                uid = item.get("servId") or item.get("subsidyId") or json.dumps(item)[:80]
                if uid not in seen:
                    seen.add(uid)
                    item["_source"]  = self.source.value
                    item["_keyword"] = kw
                    all_items.append(item)

        filtered = self.filter_by_region(all_items)
        logger.info("[%s] 최종 수집 %d건", self.source.value, len(filtered))
        return filtered

    def save_draft(self, items: list[dict]) -> Path:
        """수집 결과를 승인 대기 파일로 저장.

        파일명: draft_{source}_{timestamp}.json
        아테나님 승인 전 외부 전송·활용 불가.
        """
        REPORT_DRAFT_DIR.mkdir(parents=True, exist_ok=True)
        ts       = datetime.now().strftime("%Y%m%d_%H%M%S")
        src_slug = self.source.name.lower()
        path     = REPORT_DRAFT_DIR / f"draft_{src_slug}_{ts}.json"

        payload = {
            "_meta": {
                "source":      self.source.value,
                "region":      self.profile.region,
                "district":    self.profile.district,
                "keywords":    self.profile.search_keywords(),
                "item_count":  len(items),
                "created_at":  datetime.now().isoformat(),
                "status":      "PENDING_APPROVAL",   # 아테나님 승인 대기
            },
            "items": items,
        }
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2),
                        encoding="utf-8")
        logger.info("[%s] Draft 저장 → %s", self.source.value, path.name)
        return path

    def run(self) -> Path:
        """수집 → 필터 → Draft 저장 전체 실행."""
        items = self.collect()
        return self.save_draft(items)


# ── 3대 마스터 수집기 구현 ───────────────────────────────────

class BokjiroCrawler(BaseCrawler):
    """복지로 복지서비스목록 수집기 (보건복지부)."""

    def _source(self) -> MasterDataSource:
        return MasterDataSource.BOKJIRO

    def fetch_raw(self, keyword: str) -> list[dict]:
        params = {
            "serviceKey": self.api_key,
            "srchKeyword": keyword,
            "pageNo":     1,
            "numOfRows":  30,
            "_type":      "json",
        }
        try:
            resp = self.session.get(
                MASTER_ENDPOINTS[MasterDataSource.BOKJIRO],
                params=params, timeout=REQUEST_TIMEOUT
            )
            resp.raise_for_status()
            items = (resp.json()
                     .get("body", {})
                     .get("items", {})
                     .get("item", []))
            return [items] if isinstance(items, dict) else items
        except Exception as e:
            logger.error("[복지로] 오류: %s", e)
            return []


class Bojo24Crawler(BaseCrawler):
    """보조금24 보조금정보 수집기 (기획재정부)."""

    def _source(self) -> MasterDataSource:
        return MasterDataSource.BOJO24

    def fetch_raw(self, keyword: str) -> list[dict]:
        params = {
            "serviceKey":  self.api_key,
            "searchWord":  keyword,
            "pageIndex":   1,
            "pageSize":    30,
        }
        try:
            resp = self.session.get(
                MASTER_ENDPOINTS[MasterDataSource.BOJO24],
                params=params, timeout=REQUEST_TIMEOUT
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", data.get("list", []))
        except Exception as e:
            logger.error("[보조금24] 오류: %s", e)
            return []


class GyeonggiCrawler(BaseCrawler):
    """경기도 복지보조금서비스 수집기 (경기데이터드림)."""

    def _source(self) -> MasterDataSource:
        return MasterDataSource.GYEONGGI

    def fetch_raw(self, keyword: str) -> list[dict]:
        gg_key = os.getenv("GYEONGGI_API_KEY", self.api_key)
        params = {
            "KEY":    gg_key,
            "Type":   "json",
            "pIndex": 1,
            "pSize":  30,
        }
        try:
            resp = self.session.get(
                MASTER_ENDPOINTS[MasterDataSource.GYEONGGI],
                params=params, timeout=REQUEST_TIMEOUT
            )
            resp.raise_for_status()
            data = resp.json()
            rows = (data.get("SocialWelfare", [{}])[1]
                    .get("row", []))
            # 키워드 클라이언트 필터 (API 자체 검색 미지원)
            return [r for r in rows if keyword in json.dumps(r, ensure_ascii=False)]
        except Exception as e:
            logger.error("[경기도] 오류: %s", e)
            return []


class SeoulCrawler(BaseCrawler):
    """서울시 복지서비스 수집기 (서울열린데이터광장)."""

    def _source(self) -> MasterDataSource:
        return MasterDataSource.SEOUL

    def fetch_raw(self, keyword: str) -> list[dict]:
        seoul_key = os.getenv("SEOUL_API_KEY", self.api_key)
        api_url = (
            f"http://openapi.seoul.go.kr:8088/{seoul_key}"
            f"/json/SocialWelfareCenter/1/30/"
        )
        try:
            resp = self.session.get(api_url, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            data = resp.json()
            rows = (data.get("SocialWelfareCenter", {})
                        .get("row", []))
            return [r for r in rows if keyword in json.dumps(r, ensure_ascii=False)]
        except Exception as e:
            logger.error("[서울] 오류: %s", e)
            return []


# ── 통합 실행기 ──────────────────────────────────────────────

def run_all_crawlers(profile: UserProfile) -> list[Path]:
    """프로파일 활성 소스에 따라 수집기 일괄 실행 → Draft 경로 목록 반환."""
    crawler_map = {
        MasterDataSource.BOKJIRO:  BokjiroCrawler,
        MasterDataSource.BOJO24:   Bojo24Crawler,
        MasterDataSource.GYEONGGI: GyeonggiCrawler,
        MasterDataSource.SEOUL:    SeoulCrawler,
    }
    draft_paths = []
    for source in profile.active_sources:
        cls  = crawler_map[source]
        path = cls(profile).run()
        draft_paths.append(path)
    return draft_paths
