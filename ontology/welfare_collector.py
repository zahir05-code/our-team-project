"""복지 정책 데이터 수집기 — 한국사회보장정보원 API → Supabase

API: 한국사회보장정보원_중앙부처복지서비스목록 (data.go.kr)
- 일 100건 호출 제한 → 페이지당 100건, 매일 1페이지씩 수집
- XML 응답 파싱 → Supabase welfare_policies 테이블 upsert
"""

import os
import logging
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# ── API 설정 ──────────────────────────────────────────────
API_BASE = "https://apis.data.go.kr/B554287/NationalWelfareInformationsV001"
LIST_ENDPOINT  = f"{API_BASE}/NationalWelfarelistV001"
DETAIL_ENDPOINT = f"{API_BASE}/NationalWelfaredetailedV001"


def _get_supabase(write=False):
    """
    Supabase 클라이언트 반환.
    write=True → service_role 키 사용 (RLS 우회, 서버 전용)
    write=False → anon 키 사용 (읽기 전용)
    """
    url = os.environ.get("SUPABASE_URL")
    if write:
        key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")
    else:
        key = os.environ.get("SUPABASE_KEY")

    if not url or not key:
        logger.warning("[Collector] SUPABASE_URL 또는 KEY 없음")
        return None
    try:
        from supabase import create_client
        return create_client(url, key)
    except Exception as e:
        logger.error(f"[Collector] Supabase 클라이언트 생성 실패: {e}")
        return None


def _get_api_key() -> Optional[str]:
    return os.environ.get("GOV_WELFARE_API_KEY")


def fetch_policy_list(page: int = 1, per_page: int = 100) -> list[dict]:
    """복지서비스 목록 API 호출 → dict 리스트 반환."""
    api_key = _get_api_key()
    if not api_key:
        logger.warning("[Collector] GOV_WELFARE_API_KEY 없음")
        return []

    # data.go.kr는 serviceKey를 URL에 직접 삽입해야 함 (requests params 사용 시 이중 인코딩 오류)
    url = f"{LIST_ENDPOINT}?serviceKey={api_key}&pageNo={page}&numOfRows={per_page}&srchKeyCode=001"

    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        return _parse_list_xml(resp.text)
    except Exception as e:
        logger.error(f"[Collector] 목록 API 오류 (page={page}): {e}")
        return []


def fetch_policy_detail(service_id: str) -> Optional[dict]:
    """복지서비스 상세 API 호출."""
    api_key = _get_api_key()
    if not api_key:
        return None

    params = {
        "serviceKey": api_key,
        "serviceId": service_id,
    }

    try:
        resp = requests.get(DETAIL_ENDPOINT, params=params, timeout=15)
        resp.raise_for_status()
        items = _parse_detail_xml(resp.text)
        return items[0] if items else None
    except Exception as e:
        logger.error(f"[Collector] 상세 API 오류 ({service_id}): {e}")
        return None


def _parse_list_xml(xml_text: str) -> list[dict]:
    """목록 API XML 파싱 (실제 응답 구조 기준)."""
    policies = []
    try:
        root = ET.fromstring(xml_text)

        # 오류 체크
        result_code = root.findtext("resultCode", "")
        if result_code != "0":
            logger.warning(f"[Collector] API 오류 코드: {result_code} — {root.findtext('resultMessage', '')}")
            return []

        items = root.findall(".//servList")
        for item in items:
            def t(tag):
                el = item.find(tag)
                return el.text.strip() if el is not None and el.text else ""

            policy = {
                "policy_id":     t("servId"),
                "name":          t("servNm"),
                "description":   t("servDgst"),
                "target":        t("lifeArray"),
                "benefit":       t("srvPvsnNm"),
                "how_to_apply":  "Y" if t("onapPsbltYn") == "Y" else "방문/전화 신청",
                "contact":       t("rprsCtadr"),
                "url":           t("servDtlLink"),
                "source":        t("jurMnofNm") or "복지로",
                "category":      t("lifeArray"),
                "tags":          _split_tags(t("intrsThemaArray") + "," + t("lifeArray")),
                "regions":       ["서울특별시", "경기도"],
                "income_levels": _parse_income(t("lifeArray")),
                "deadline":      "",
                "is_active":     True,
            }

            if policy["policy_id"]:
                policies.append(policy)

    except ET.ParseError as e:
        logger.error(f"[Collector] XML 파싱 오류: {e}")
    return policies


def _parse_detail_xml(xml_text: str) -> list[dict]:
    """상세 API XML 파싱 (목록과 동일 구조)."""
    return _parse_list_xml(xml_text)


def _split_tags(raw: str) -> list[str]:
    """쉼표/공백 구분 태그 분리."""
    if not raw:
        return []
    import re
    parts = re.split(r"[,，、\s]+", raw.strip())
    return [p for p in parts if p]


def _parse_regions(sigungu_code: str) -> list[str]:
    """지역코드 → 지역명 변환 (서울/경기 필터)."""
    if not sigungu_code:
        return ["서울특별시", "경기도"]  # 기본: 전국 → 허용 지역 모두 포함

    regions = []
    code = sigungu_code.strip()
    if code.startswith("11"):
        regions.append("서울특별시")
    elif code.startswith("41"):
        regions.append("경기도")
    else:
        # 전국 정책 → 두 지역 모두
        regions = ["서울특별시", "경기도"]
    return regions


def _parse_income(target_text: str) -> list[str]:
    """대상 텍스트에서 소득 수준 추출."""
    levels = []
    if not target_text:
        return ["전체"]
    text = target_text
    if "기초생활" in text or "수급자" in text:
        levels.append("기초생활수급자")
    if "차상위" in text:
        levels.append("차상위계층")
    if "중위소득 50" in text:
        levels.append("중위소득50%이하")
    if "중위소득 75" in text or "중위소득 80" in text:
        levels.append("중위소득75%이하")
    if "중위소득 100" in text:
        levels.append("중위소득100%이하")
    if "전체" in text or "모든" in text or not levels:
        levels.append("전체")
    return list(set(levels))


# ── Supabase 저장 ─────────────────────────────────────────

def upsert_policies(policies: list[dict]) -> tuple[int, int]:
    """
    Supabase welfare_policies에 upsert.
    Returns: (upserted_count, error_count)
    """
    client = _get_supabase(write=True)
    if not client or not policies:
        return 0, 0

    ok = 0
    err = 0
    # 배치 단위 50건씩
    batch_size = 50
    for i in range(0, len(policies), batch_size):
        batch = policies[i:i + batch_size]
        try:
            client.table("welfare_policies").upsert(
                batch,
                on_conflict="policy_id"
            ).execute()
            ok += len(batch)
        except Exception as e:
            logger.error(f"[Collector] upsert 오류 (배치 {i}): {e}")
            err += len(batch)

    return ok, err


def log_update(source: str, total: int, new_count: int, message: str):
    """update_logs 테이블에 수집 결과 기록."""
    client = _get_supabase(write=True)
    if not client:
        return
    try:
        client.table("update_logs").insert({
            "source": source,
            "total_count": total,
            "new_count": new_count,
            "message": message,
        }).execute()
    except Exception as e:
        logger.error(f"[Collector] 로그 기록 실패: {e}")


# ── 서울시 열린데이터 복지서비스 수집 ────────────────────

SEOUL_API_BASE = "http://openapi.seoul.go.kr:8088"

def collect_seoul_welfare(max_items: int = 200) -> dict:
    """
    서울 열린데이터 광장 복지서비스 API → Supabase 저장.
    API: 서울시_복지서비스 (SEOUL_OPEN_DATA_KEY 환경변수 필요)
    키 없으면 graceful skip.
    """
    api_key = os.environ.get("SEOUL_OPEN_DATA_KEY")
    if not api_key:
        logger.info("[Seoul] SEOUL_OPEN_DATA_KEY 없음 → 수집 skip")
        return {"ok": False, "source": "seoul", "count": 0, "message": "API 키 없음"}

    endpoint = f"{SEOUL_API_BASE}/{api_key}/json/WelfareService/1/{max_items}/"
    try:
        resp = requests.get(endpoint, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        rows = data.get("WelfareService", {}).get("row", [])
        if not rows:
            return {"ok": False, "source": "seoul", "count": 0, "message": "응답 데이터 없음"}

        policies = []
        for r in rows:
            name = r.get("SVC_NM", "").strip()
            if not name:
                continue
            policies.append({
                "policy_id":    f"SEOUL_OPEN_{r.get('SVC_ID', name[:10])}",
                "name":         name,
                "description":  r.get("SVC_CONTENT", "")[:500],
                "benefit":      r.get("RPRSN_SVC_CD_NM", ""),
                "how_to_apply": "Y" if r.get("ONLINE_APPLY_YN") == "Y" else "방문/전화 신청",
                "contact":      r.get("DEPT_NM", "서울시"),
                "url":          r.get("SVC_URL") or "https://welfare.seoul.go.kr",
                "source":       "서울특별시",
                "tags":         _split_tags(r.get("LIFEARRAY", "")),
                "regions":      ["서울특별시"],
                "income_levels": ["전체"],
                "is_active":    True,
            })

        ok, err = upsert_policies(policies)
        msg = f"서울시 {ok}건 저장, {err}건 오류"
        log_update("seoul_api", ok + err, ok, msg)
        logger.info(f"[Seoul] {msg}")
        return {"ok": True, "source": "seoul", "count": ok, "message": msg}

    except Exception as e:
        msg = f"서울시 API 오류: {e}"
        logger.error(f"[Seoul] {msg}")
        return {"ok": False, "source": "seoul", "count": 0, "message": msg}


# ── 경기도 복지서비스 수집 ────────────────────────────────

GYEONGGI_API_BASE = "https://data.gg.go.kr/portal/data/service"

def collect_gyeonggi_welfare(max_items: int = 200) -> dict:
    """
    경기데이터드림 마이데이터_복지정보 API → Supabase 저장.
    infId: 8Z6Y0JFIP4J4FPVMQX3C37678851 (마이데이터 통합플랫폼_복지정보)
    키 없으면 graceful skip.
    """
    api_key = os.environ.get("GYEONGGI_OPEN_DATA_KEY")
    if not api_key:
        logger.info("[Gyeonggi] GYEONGGI_OPEN_DATA_KEY 없음 → 수집 skip")
        return {"ok": False, "source": "gyeonggi", "count": 0, "message": "API 키 없음"}

    endpoint = "https://data.gg.go.kr/portal/data/service/selectServicePage.do"
    params = {
        "infId":    "8Z6Y0JFIP4J4FPVMQX3C37678851",
        "infSeq":   "2",
        "key":      api_key,
        "type":     "json",
        "pageNo":   1,
        "numOfRows": max_items,
    }
    try:
        resp = requests.get(endpoint, params=params, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        # 경기데이터드림 응답 구조: {"result": {"featureCollection": {"features": [...]}}}
        features = (data.get("result", {})
                        .get("featureCollection", {})
                        .get("features", []))
        rows = [f.get("properties", {}) for f in features] if features else []

        if not rows:
            return {"ok": False, "source": "gyeonggi", "count": 0, "message": "응답 데이터 없음"}

        policies = []
        for r in rows:
            name = (r.get("WELFAREINFONAME") or r.get("PRCUSR_NM") or "").strip()
            if not name:
                continue
            apply_url = r.get("RCPTURL") or r.get("REFURL") or "https://www.ggwf.or.kr"
            policies.append({
                "policy_id":    f"GG_OPEN_{r.get('WELFAREINFOCODE', name[:10])}",
                "name":         name,
                "description":  (r.get("WELFAREINFODETAILCN") or "")[:500],
                "benefit":      r.get("WELFARECATEGORY") or "",
                "how_to_apply": r.get("APPLYMETHODNM") or "방문/전화 신청",
                "contact":      r.get("CHARGEDEPTPHONENUMBER") or r.get("INSTT_NM") or "경기도",
                "url":          apply_url,
                "source":       "경기도",
                "tags":         _split_tags(r.get("WELFARECATEGORY", "")),
                "regions":      ["경기도"],
                "income_levels": ["전체"],
                "is_active":    True,
            })

        ok, err = upsert_policies(policies)
        msg = f"경기도 {ok}건 저장, {err}건 오류"
        log_update("gyeonggi_api", ok + err, ok, msg)
        logger.info(f"[Gyeonggi] {msg}")
        return {"ok": True, "source": "gyeonggi", "count": ok, "message": msg}

    except Exception as e:
        msg = f"경기도 API 오류: {e}"
        logger.error(f"[Gyeonggi] {msg}")
        return {"ok": False, "source": "gyeonggi", "count": 0, "message": msg}


# ── 전체 주간 수집 (3개 소스 통합) ───────────────────────

def collect_all_weekly() -> dict:
    """
    매주 월요일 새벽 3시 실행 — 3개 소스 동시 수집.
    1. 중앙부처 (정부24 data.go.kr) — 전 페이지 순환
    2. 서울시 (열린데이터광장)
    3. 경기도 (데이터드림)
    키 없는 소스는 자동 skip.
    """
    logger.info("[Weekly] ===== 주간 전체 수집 시작 =====")
    results = {}

    # ① 중앙부처: 10페이지(최대 1,000건) 수집
    central_total = 0
    for page in range(1, 11):
        res = collect_one_page(page=page)
        central_total += res.get("count", 0)
        if not res.get("ok"):
            break
    results["central"] = central_total

    # ② 서울시
    seoul_res = collect_seoul_welfare(max_items=300)
    results["seoul"] = seoul_res.get("count", 0)

    # ③ 경기도
    gg_res = collect_gyeonggi_welfare(max_items=300)
    results["gyeonggi"] = gg_res.get("count", 0)

    total = sum(results.values())
    msg = (f"주간 수집 완료 — 중앙부처 {results['central']}건 / "
           f"서울시 {results['seoul']}건 / 경기도 {results['gyeonggi']}건 / 합계 {total}건")
    logger.info(f"[Weekly] {msg}")
    log_update("weekly_all", total, total, msg)
    return {"ok": True, "total": total, "detail": results, "message": msg}


# ── 메인 수집 실행 ────────────────────────────────────────

def collect_one_page(page: int = 1) -> dict:
    """
    API 1페이지(최대 100건) 수집 → Supabase 저장.
    APScheduler에서 매일 1회 호출.
    """
    logger.info(f"[Collector] 수집 시작 — page={page}")
    start = datetime.now()

    policies = fetch_policy_list(page=page, per_page=100)
    if not policies:
        msg = "API 응답 없음 또는 키 오류"
        log_update("gov_api", 0, 0, msg)
        return {"ok": False, "message": msg, "count": 0}

    ok, err = upsert_policies(policies)
    elapsed = (datetime.now() - start).seconds
    msg = f"page={page} 수집 {ok}건 저장, {err}건 오류 ({elapsed}초)"
    log_update("gov_api", ok + err, ok, msg)
    logger.info(f"[Collector] {msg}")

    return {"ok": True, "message": msg, "count": ok, "page": page}


def get_supabase_policy_count() -> int:
    """Supabase에 저장된 정책 총 개수."""
    client = _get_supabase()
    if not client:
        return 0
    try:
        result = client.table("welfare_policies").select(
            "id", count="exact"
        ).eq("is_active", True).execute()
        return result.count or 0
    except Exception as e:
        logger.error(f"[Collector] 개수 조회 실패: {e}")
        return 0


def get_policies_from_supabase(
    region: str = None,
    tags: list[str] = None,
    income_level: str = None,
    limit: int = 50,
) -> list[dict]:
    """
    Supabase에서 정책 조회.
    정적 DB fallback은 호출부에서 처리.
    """
    client = _get_supabase()
    if not client:
        return []

    try:
        query = client.table("welfare_policies").select("*").eq("is_active", True)

        if region:
            query = query.contains("regions", [region])
        if tags:
            query = query.overlaps("tags", tags)
        if income_level and income_level != "전체":
            query = query.or_(
                f"income_levels.cs.{{{income_level}}},income_levels.cs.{{전체}}"
            )

        result = query.limit(limit).execute()
        return result.data or []
    except Exception as e:
        logger.error(f"[Collector] Supabase 조회 실패: {e}")
        return []
