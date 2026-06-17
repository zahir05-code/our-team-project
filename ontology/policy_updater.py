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
    매주 월요일 오전 3시(KST) 실행 — 중앙부처 + 서울시 + 경기도 통합 수집.
    API 키가 없는 소스는 graceful skip.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logger.info(f"[Updater] 주간 정책 갱신 시작 — {now}")
    update_status["last_run"] = now

    # ① 3개 소스 통합 주간 수집 (중앙 + 서울 + 경기)
    collected_total = 0
    detail = {}
    try:
        from ontology.welfare_collector import collect_all_weekly, get_supabase_policy_count
        result = collect_all_weekly()
        collected_total = result.get("total", 0)
        detail = result.get("detail", {})
        supa_count = get_supabase_policy_count()
        update_status["supabase_count"] = supa_count
        update_status["source"] = "weekly_all"
        logger.info(f"[Updater] 주간 수집 완료 — Supabase 총 {supa_count}건")
    except Exception as e:
        logger.warning(f"[Updater] 주간 수집 오류: {e}")

    # ② 만료 정책 확인
    expired = check_expired_policies()
    if expired:
        logger.warning(f"[Updater] 만료 정책 {len(expired)}개: {expired}")

    # ③ 상태 기록
    from ontology.policies_db import get_all_policies
    static_count = len(get_all_policies())
    supa_count = update_status.get("supabase_count", 0)
    total = max(static_count, supa_count)

    update_status["last_success"] = now
    update_status["total_policies"] = total
    central = detail.get("central", 0)
    seoul   = detail.get("seoul", 0)
    gg      = detail.get("gyeonggi", 0)
    update_status["message"] = (
        f"주간 수집 완료 — 중앙 {central}건·서울 {seoul}건·경기 {gg}건 "
        f"(Supabase {supa_count}건 + 정적 {static_count}건)"
    )
    logger.info(f"[Updater] {update_status['message']}")


# ── 스케줄러 시작 ────────────────────────────────────────
def start_scheduler():
    """FastAPI startup 시 호출 — 매주 월요일 오전 3시(KST) 주간 수집."""
    global _scheduler
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger

        _scheduler = BackgroundScheduler(timezone="Asia/Seoul")
        _scheduler.add_job(
            run_policy_update,
            trigger=CronTrigger(day_of_week="mon", hour=3, minute=0, timezone="Asia/Seoul"),
            id="policy_update_weekly",
            name="주간 정책 자동 갱신 (중앙+서울+경기)",
            replace_existing=True,
        )
        _scheduler.start()

        # 시작 시 즉시 1회 실행 (최초 배포 또는 재시작 시 데이터 확보)
        run_policy_update()
        logger.info("[Updater] 스케줄러 시작 완료 — 매주 월요일 03:00 KST")

    except Exception as e:
        logger.error(f"[Updater] 스케줄러 시작 실패: {e}")


def stop_scheduler():
    """FastAPI shutdown 시 호출."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown()
        logger.info("[Updater] 스케줄러 종료")
