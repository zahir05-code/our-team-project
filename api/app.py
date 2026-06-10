"""아테나 복지서비스 FastAPI 앱 — v3.4 (50개 정책 + 자동갱신)."""

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from api.routers import welfare
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일 서빙
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

# 라우터 등록
app.include_router(welfare.router)


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
