"""아테나 복지서비스 FastAPI 앱."""

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from api.routers import welfare
from api.schemas import HealthResponse
from welfare_analyzer.models.user_profile import ALLOWED_REGIONS
from db.models import init_db

BASE_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(
    title="아테나 복지서비스 API",
    description="서울·경기 맞춤 복지서비스 조회 및 신청 연결",
    version="1.0.0",
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


@app.get("/", include_in_schema=False)
async def index():
    """메인 웹 화면."""
    return FileResponse(BASE_DIR / "templates" / "index.html")


@app.get("/health", response_model=HealthResponse, summary="서버 상태 확인")
async def health():
    return HealthResponse(
        status="running",
        version="1.0.0",
        regions=sorted(ALLOWED_REGIONS),
    )
