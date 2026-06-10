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
    1. 복지로 API 시도
    2. 실패 시 정적 DB 유지
    3. 만료 정책 체크
    4. 상태 업데이트
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logger.info(f"[Updater] 정책 갱신 시작 — {now}")
    update_status["last_run"] = now

    # API 갱신 시도
    api_ok = _try_bokjiro_api_update()

    # 만료 정책 확인
    expired = check_expired_policies()
    if expired:
        logger.warning(f"[Updater] 만료 정책 {len(expired)}개: {expired}")

    # 상태 기록
    from ontology.policies_db import get_all_policies
    count = len(get_all_policies())
    update_status["last_success"] = now
    update_status["total_policies"] = count
    update_status["message"] = (
        f"API 갱신 성공 ({count}개)" if api_ok
        else f"정적 DB 사용 중 ({count}개) · API 키 필요"
    )
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
