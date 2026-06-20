"""아테나 복지서비스 FastAPI 앱 — v3.4 (50개 정책 + 자동갱신)."""

import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from api.routers import welfare
from api.routers import sms
from api.schemas import HealthResponse
from welfare_analyzer.models.user_profile import ALLOWED_REGIONS
from db.models import init_db
from ontology.policy_updater import start_scheduler, stop_scheduler, get_update_status

BASE_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(
    title="아테나 복지서비스 API",
    description="서울·경기 맞춤 복지서비스 조회 및 신청 연결 (50개 정책)",
    version="3.4.0",
)

_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS",
        "https://lingostaredu.app,http://localhost:8000,http://127.0.0.1:8000",
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# 정적 파일 서빙
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

# 라우터 등록
app.include_router(welfare.router)
app.include_router(sms.router)


@app.on_event("startup")
async def startup():
    init_db()
    start_scheduler()   # ← Stage 3: 자동 갱신 스케줄러 시작


@app.on_event("shutdown")
async def shutdown():
    stop_scheduler()


@app.get("/", include_in_schema=False)
async def index():
    """메인 웹 화면."""
    return FileResponse(BASE_DIR / "templates" / "index.html")


@app.get("/health", response_model=HealthResponse, summary="서버 상태 확인")
async def health():
    return HealthResponse(
        status="running",
        version="3.4.0",
        regions=sorted(ALLOWED_REGIONS),
    )


@app.get("/api/policies/status", summary="정책 데이터 갱신 상태")
async def policy_status():
    """정책 DB 현황 및 마지막 갱신 시간 반환."""
    return JSONResponse(get_update_status())


@app.get("/api/db/test", summary="Supabase 연결 진단")
async def db_test():
    """Supabase 연결 상태 및 오류 메시지 반환."""
    import os
    result = {
        "supabase_url": os.environ.get("SUPABASE_URL", "❌ 없음"),
        "supabase_key_set": bool(os.environ.get("SUPABASE_KEY")),
        "service_key_set": bool(os.environ.get("SUPABASE_SERVICE_KEY")),
        "gov_api_key_set": bool(os.environ.get("GOV_WELFARE_API_KEY")),
        "supabase_write_test": "not_run",
        "supabase_read_test": "not_run",
        "error": None,
    }
    try:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL")
        # 읽기 테스트 (anon key)
        anon_key = os.environ.get("SUPABASE_KEY")
        if url and anon_key:
            client = create_client(url, anon_key)
            r = client.table("welfare_policies").select("id", count="exact").limit(1).execute()
            result["supabase_read_test"] = f"✅ 성공 (총 {r.count}건)"
        # 쓰기 테스트 (service key)
        svc_key = os.environ.get("SUPABASE_SERVICE_KEY")
        if url and svc_key:
            client2 = create_client(url, svc_key)
            test_data = {"policy_id": "TEST_001", "name": "진단테스트", "is_active": False}
            client2.table("welfare_policies").upsert(test_data, on_conflict="policy_id").execute()
            result["supabase_write_test"] = "✅ 성공"
            # 테스트 데이터 삭제
            client2.table("welfare_policies").delete().eq("policy_id", "TEST_001").execute()
    except Exception as e:
        result["error"] = str(e)
    return JSONResponse(result)


@app.post("/api/policies/collect", summary="정책 수동 수집 트리거")
async def policy_collect():
    """서울·경기·중앙 정책 즉시 수집 (관리자용)."""
    try:
        from ontology.welfare_collector import collect_all_weekly
        result = collect_all_weekly()
        return JSONResponse({"status": "완료", "result": result})
    except Exception as e:
        return JSONResponse({"status": "오류", "error": str(e)}, status_code=500)


@app.get("/api/policies/count", summary="정책 개수 확인")
async def policy_count():
    """현재 등록된 정책 총 개수."""
    from ontology.policies_db import get_all_policies
    policies = get_all_policies()
    return JSONResponse({
        "total": len(policies),
        "categories": {
            "중앙정부": len([p for p in policies if p.source in ["복지로","고용노동부","여성가족부","금융위원회","보건복지부","산업통상자원부","문화체육관광부","과학기술정보통신부","농림축산식품부","국토교통부","중소벤처기업부","건강보험공단"]]),
            "서울시": len([p for p in policies if "서울" in (p.source or "")]),
            "경기도": len([p for p in policies if "경기" in (p.source or "")]),
            "다문화·외국인": len([p for p in policies if any("다문화" in t or "외국인" in t or "이주" in t for t in (p.tags or []))]),
        }
    })
