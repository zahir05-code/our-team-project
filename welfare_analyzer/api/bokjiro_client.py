"""복지로(bokjiro.go.kr) Open API 클라이언트 — 포용적 광범위 조회."""

import os
import logging
from dataclasses import dataclass

import requests

from config.settings import WELFARE_API_BASE_URL, REQUEST_TIMEOUT

logger = logging.getLogger(__name__)


@dataclass
class WelfareService:
    service_id:   str
    service_name: str
    target:       str    # 지원 대상
    benefit:      str    # 급여 내용
    apply_url:    str    # 신청 URL
    department:   str    # 소관 부처
    category:     str = ""  # 복지 분류
    match_level:  str = ""  # 매칭 확신도 (확실/가능성/미리보기)
    match_reason: str = ""  # "나에게 해당되는 이유" 설명


class BokjiroClient:
    """복지로 서비스 조회 API — 좁히지 않고 넓게 조회 후 분류."""

    def __init__(self):
        self.api_key = os.getenv("PUBLIC_DATA_API_KEY", "")
        if not self.api_key:
            logger.warning("PUBLIC_DATA_API_KEY 환경변수가 설정되지 않았습니다.")

    def search_by_keyword(
        self,
        keyword: str,
        page: int = 1,
        per_page: int = 30,
    ) -> list[WelfareService]:
        """키워드로 복지 서비스 검색."""
        params = {
            "serviceKey": self.api_key,
            "pageNo":     page,
            "numOfRows":  per_page,
            "srchKeyword": keyword,
            "_type":      "json",
        }
        return self._fetch(params)

    def search_by_lifecycle(
        self,
        life_cycle_code: str,
        page: int = 1,
        per_page: int = 30,
    ) -> list[WelfareService]:
        """생애주기 코드로 복지 서비스 검색.

        주요 코드:
            001: 영유아   002: 아동    003: 청소년
            004: 청년     005: 중장년  006: 노년
            007: 임신·출산
        """
        params = {
            "serviceKey": self.api_key,
            "pageNo":     page,
            "numOfRows":  per_page,
            "lftmCycCd":  life_cycle_code,
            "_type":      "json",
        }
        return self._fetch(params)

    def search_wide(self, keywords: list[str]) -> list[WelfareService]:
        """키워드 목록으로 광범위 조회 — 중복 제거 후 통합 반환.

        포용적 설계 핵심: 좁히지 않고 모든 가능성 포함.
        """
        seen_ids = set()
        all_services = []
        for kw in keywords:
            services = self.search_by_keyword(kw)
            for svc in services:
                if svc.service_id not in seen_ids:
                    seen_ids.add(svc.service_id)
                    all_services.append(svc)
        logger.info("광범위 조회 완료 — 총 %d건", len(all_services))
        return all_services

    def _fetch(self, params: dict) -> list[WelfareService]:
        try:
            resp = requests.get(
                WELFARE_API_BASE_URL,
                params=params,
                timeout=REQUEST_TIMEOUT,
            )
            resp.raise_for_status()
            items = resp.json().get("body", {}).get("items", {}).get("item", [])
            if isinstance(items, dict):
                items = [items]
            return [self._parse(i) for i in items]
        except Exception as e:
            logger.error("복지로 API 오류: %s", e)
            return []

    @staticmethod
    def _parse(item: dict) -> WelfareService:
        return WelfareService(
            service_id=   item.get("servId",     ""),
            service_name= item.get("servNm",     ""),
            target=       item.get("tgtrDtlCn",  ""),
            benefit=      item.get("givBkCn",    ""),
            apply_url=    item.get("aplyMthdCn", ""),
            department=   item.get("jurMnofNm",  ""),
        )
