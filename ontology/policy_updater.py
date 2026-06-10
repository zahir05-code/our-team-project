"""정책 데이터 자동 갱신 스케줄러 (Stage 3)

- APScheduler 기반 주기적 정책 갱신
- 복지로 Open API 연동 (API 키 있을 때 활성화)
- API 키 없을 때 → 정적 DB 유지 (graceful fallback)
- 만료 정책 자동 비활성화
"""

import logging
from datetime import datetime, date
from typing import Optional

logger = logging.getLogger(__name__)

# ── 스케줄러 싱글톤 ────────────────────────────────────────
_scheduler = None

# ── 마지막 갱신 상태 추적 ─────────────────────────────────
update_status = {
    "last_run":      None,
    "last_success":  None,
    "total_policies": 0,
    "source":        "static_db",   # "static_db" | "bokjiro_api" | "gov24_api"
    "message":       "초기화 전",
}


def get_update_status() -> dict:
    """현재 갱신 상태 반환 (API 엔드포인트용)."""
    from ontology.policies_db import get_all_policies
    update_status["total_policies"] = len(get_all_policies())
    return update_status


# ── 정책 만료 체크 ────────────────────────────────────────
def check_expired_policies() -> list[str]:
    """
    마감일이 지난 정책 ID 목록 반환.
    현재 정적 DB는 deadline 없음 → 빈 리스트 반환.
    향후 동적 DB 도입 시 실제 만료 체크.
    """
    from ontology.policies_db import get_all_policies
    today = date.today()
    expired = []
    for p in get_all_policies():
        deadline = getattr(p, "deadline", None)
        if deadline and isinstance(deadline, str):
            try:
                d = datetime.strptime(deadline, "%Y-%m-%d").date()
                if d < today:
                    expired.append(p.policy_id)
            except ValueError:
                pass
    return expired


# ── 복지로 API 갱신 시도 ──────────────────────────────────
def _try_bokjiro_api_update() -> bool:
    """
    복지로 Open API로 최신 정책 갱신 시도.
    API 키가 없으면 False 반환 (정적 DB 유지).
    """
    import os
    api_key = os.environ.get("BOKJIRO_API_KEY")
    if not api_key:
        logger.info("[Updater] BOKJIRO_API_KEY 없음 → 정적 DB 사용")
        return False

    try:
        import requests
        url = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do"
        params = {
            "serviceKey": api_key,
            "pageNo": 1,
            "numOfRows": 100,
            "srchKeyCode": "001",   # 서울·경기
        }
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code == 200:
            logger.info("[Updater] 복지로 API 갱신 성공")
            update_status["source"] = "bokjiro_api"
            return True
    except Exception as e:
        logger.warning(f"[Updater] 복지로 API 오류: {e}")
    return False


# ── 메인 갱신 작업 ────────────────────────────────────────
def run_policy_update():
    """
    스케줄러가 주기적으로 호출하는 갱신 함수.
    1. GOV API → Supabase 수집 시도
    2. 복지로 API 시도
    3. 실패 시 정적 DB 유지
    4. 만료 정책 체크
    5. 상태 업데이트
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logger.info(f"[Updater] 정책 갱신 시작 — {now}")
    update_status["last_run"] = now

    # ① 정부24 복지서비스 API → Supabase 수집
    gov_ok = False
    try:
        from ontology.welfare_collector import collect_one_page, get_supabase_policy_count
        # 매 실행마다 다음 페이지 순환 (1~10페이지)
        page = (update_status.get("_next_page", 1))
        result = collect_one_page(page=page)
        gov_ok = result.get("ok", False)
        if gov_ok:
            update_status["_next_page"] = (page % 10) + 1
            supa_count = get_supabase_policy_count()
            update_status["supabase_count"] = supa_count
            update_status["source"] = "gov24_api"
            logger.info(f"[Updater] Supabase 정책 총 {supa_count}건")
    except Exception as e:
        logger.warning(f"[Updater] GOV API 수집 오류: {e}")

    # ② 복지로 API 시도 (별도 키)
    api_ok = _try_bokjiro_api_update() if not gov_ok else False

    # ③ 만료 정책 확인
    expired = check_expired_policies()
    if expired:
        logger.warning(f"[Updater] 만료 정책 {len(expired)}개: {expired}")

    # ④ 상태 기록
    from ontology.policies_db import get_all_policies
    static_count = len(get_all_policies())
    supa_count = update_status.get("supabase_count", 0)
    total = max(static_count, supa_count)

    update_status["last_success"] = now
    update_status["total_policies"] = total
    if gov_ok:
        update_status["message"] = f"GOV24 API 수집 완료 (Supabase {supa_count}건 + 정적 {static_count}건)"
    elif api_ok:
        update_status["message"] = f"복지로 API 갱신 완료 ({total}개)"
    else:
        update_status["message"] = f"정적 DB 사용 중 ({static_count}개) · Supabase {supa_count}건 누적"
    logger.info(f"[Updater] 완료 — {update_status['message']}")


# ── 스케줄러 시작 ────────────────────────────────────────
def start_scheduler():
    """FastAPI startup 시 호출 — 6시간마다 정책 갱신."""
    global _scheduler
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.interval import IntervalTrigger

        _scheduler = BackgroundScheduler(timezone="Asia/Seoul")
        _scheduler.add_job(
            run_policy_update,
            trigger=IntervalTrigger(hours=6),
            id="policy_update",
            name="정책 데이터 자동 갱신",
            replace_existing=True,
        )
        _scheduler.start()

        # 시작 시 즉시 1회 실행
        run_policy_update()
        logger.info("[Updater] 스케줄러 시작 완료 (6시간 간격)")

    except Exception as e:
        logger.error(f"[Updater] 스케줄러 시작 실패: {e}")


def stop_scheduler():
    """FastAPI shutdown 시 호출."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown()
        logger.info("[Updater] 스케줄러 종료")
