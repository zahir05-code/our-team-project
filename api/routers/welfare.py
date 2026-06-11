"""복지서비스 조회 API 라우터."""

import json
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException

from api.schemas import (
    ProfileRequest, ProfileResponse, WelfareResult, ServiceLink,
    NlpRequest, NlpResponse, NlpAnalysis,
    OntologyMatchResult,
)
from chatbot.parser import build_profile
from welfare_analyzer.api.link_connector import build_result_links
from welfare_analyzer.models.user_profile import ALLOWED_REGIONS
from config.settings import REPORT_DRAFT_DIR

# 온톨로지 매칭 (선택적 로드)
try:
    from ontology.knowledge_graph import run_ontology_match as _run_ontology_match
    _ONTOLOGY_AVAILABLE = True
except Exception as _e:
    _ONTOLOGY_AVAILABLE = False
    logging.getLogger(__name__).warning("온톨로지 모듈 로드 실패: %s", _e)


def _get_supabase_policies(profile) -> list[dict]:
    """
    Supabase에서 사용자 프로파일에 맞는 정책 조회.
    실패 시 빈 리스트 반환 (앱 중단 없음).
    """
    try:
        from ontology.welfare_collector import get_policies_from_supabase
        region = getattr(profile, "region", None)
        # 생활상황 → 태그 변환
        situations = getattr(profile, "life_situations", [])
        tags = [s.value if hasattr(s, "value") else str(s) for s in situations]
        income = getattr(profile, "income_range", None)
        income_str = income.value if hasattr(income, "value") else str(income) if income else None

        policies = get_policies_from_supabase(
            region=region,
            tags=tags if tags else None,
            income_level=income_str,
            limit=20,
        )
        return policies
    except Exception as e:
        logging.getLogger(__name__).warning("Supabase 정책 조회 실패 (정적 DB 사용): %s", e)
        return []


def _supabase_to_welfare_result(policies: list[dict]) -> "WelfareResult | None":
    """Supabase 정책 목록 → WelfareResult 변환."""
    if not policies:
        return None
    services = []
    for p in policies:
        name = p.get("name", "")
        url  = p.get("url") or p.get("servDtlLink") or "https://www.bokjiro.go.kr"
        if name:
            services.append(ServiceLink(name=name, url=url))
    if not services:
        return None
    return WelfareResult(section="🗄️ 실시간 DB 추천 정책", services=services)

router = APIRouter(prefix="/welfare", tags=["복지서비스"])
logger = logging.getLogger(__name__)


def _to_answers(req: ProfileRequest) -> dict:
    """ProfileRequest → chatbot answers 딕셔너리 변환."""
    return {
        "age":             str(req.age),
        "region":          req.region,
        "district":        req.district or "",
        "life_situations": req.life_situations,
        "work_status":     req.work_status   or "",
        "family_status":   req.family_status or "",
        "income_range":    req.income_range  or "",
        "gender":          req.gender        or "",
    }


@router.post("/search", response_model=ProfileResponse, summary="맞춤 복지서비스 조회")
async def search_welfare(req: ProfileRequest):
    """사용자 프로파일 기반 맞춤 복지서비스 링크 반환.

    - 허용 지역: 서울특별시, 경기도
    - 결과: 중앙정부 + 지자체 + 환급금 링크
    - Draft: reports/drafts/ 에 자동 저장
    """
    # 지역 검증
    if req.region not in ALLOWED_REGIONS:
        raise HTTPException(
            status_code=400,
            detail=f"허용 지역이 아닙니다. 허용: {sorted(ALLOWED_REGIONS)}"
        )

    try:
        answers = _to_answers(req)
        profile = build_profile(answers)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 링크 생성
    links_dict = build_result_links(profile)

    # 응답 형식 변환
    results = []
    for section, items in links_dict.items():
        results.append(WelfareResult(
            section=section,
            services=[ServiceLink(name=k, url=v) for k, v in items.items()]
        ))

    # Supabase 실시간 정책 추가
    supa_result = _supabase_to_welfare_result(_get_supabase_policies(profile))
    if supa_result:
        results.append(supa_result)

    # 온톨로지 매칭
    ont_dict = {}
    ontology_result = None
    if _ONTOLOGY_AVAILABLE:
        try:
            ont = _run_ontology_match(profile)
            ont_dict = ont.to_dict()
            ontology_result = OntologyMatchResult(**ont_dict)
        except Exception as e:
            import traceback
            logger.error("온톨로지 매칭 실패(search): %s\n%s", e, traceback.format_exc())

    # Draft 저장
    draft_saved = False
    try:
        REPORT_DRAFT_DIR.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        payload = {
            "_meta": {
                "status":     "PENDING_APPROVAL",
                "region":     req.region,
                "district":   req.district,
                "created_at": datetime.now().isoformat(),
            },
            "profile_summary": profile.summary(),
            "results": links_dict,
            "ontology_summary": ont_dict["summary"] if ontology_result else {},
        }
        path = REPORT_DRAFT_DIR / f"api_draft_{ts}.json"
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2),
                        encoding="utf-8")
        draft_saved = True
    except Exception as e:
        logger.error("Draft 저장 실패: %s", e)

    return ProfileResponse(
        summary=profile.summary(),
        region=req.region,
        district=req.district,
        active_sources=[s.value for s in profile.active_sources],
        results=results,
        ontology=ontology_result,
        draft_saved=draft_saved,
        message="맞춤 복지서비스를 찾았습니다.",
    )


@router.post("/nlp-search", response_model=NlpResponse, summary="자연어로 복지서비스 조회")
async def nlp_search_welfare(req: NlpRequest):
    """자연어 문장 입력 → NER + 의도분류 → 맞춤 복지서비스 반환.

    예시 입력: "갑자기 남편이 실직해서 생활비가 너무 부족하고 아이도 있어요. 경기도 수원시 삽니다."
    """
    from nlp.pipeline import run_pipeline

    result = run_pipeline(
        req.text,
        income_range       = req.income_range,
        gender             = req.gender,
        region_override    = req.region_override   or "",
        district_override  = req.district_override or "",
    )
    profile  = result["profile"]
    ner      = result["ner"]
    intent   = result["intent"]
    warnings = result["warnings"]

    # 지역 검증
    if profile.region not in ALLOWED_REGIONS:
        raise HTTPException(
            status_code=400,
            detail=f"허용 지역이 아닙니다. 허용: {sorted(ALLOWED_REGIONS)}"
        )

    # 링크 생성
    links_dict = build_result_links(profile)

    results = []
    for section, items in links_dict.items():
        results.append(WelfareResult(
            section=section,
            services=[ServiceLink(name=k, url=v) for k, v in items.items()]
        ))

    # 온톨로지 매칭
    ont_dict = {}
    ontology_result = None
    if _ONTOLOGY_AVAILABLE:
        try:
            ont = _run_ontology_match(profile)
            ont_dict = ont.to_dict()
            ontology_result = OntologyMatchResult(**ont_dict)
        except Exception as e:
            logger.error("온톨로지 매칭 실패(nlp): %s", e)

    # Draft 저장
    draft_saved = False
    try:
        REPORT_DRAFT_DIR.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        payload = {
            "_meta": {
                "status":     "PENDING_APPROVAL",
                "source":     "NLP",
                "input_text": req.text,
                "region":     profile.region,
                "district":   profile.district,
                "created_at": datetime.now().isoformat(),
            },
            "ner":    ner,
            "intent": {k: (v.value if hasattr(v, "value") else str(v) if v else None)
                       for k, v in intent.items()
                       if k != "life_situations"},
            "life_situations": [s.value for s in intent.get("life_situations", [])],
            "warnings": warnings,
            "profile_summary": profile.summary(),
            "results": links_dict,
            "ontology_summary": ont_dict["summary"] if ontology_result else {},
        }
        path = REPORT_DRAFT_DIR / f"nlp_draft_{ts}.json"
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2),
                        encoding="utf-8")
        draft_saved = True
    except Exception as e:
        logger.error("NLP Draft 저장 실패: %s", e)

    # NlpAnalysis 구성
    analysis = NlpAnalysis(
        age             = ner["age"],
        region          = profile.region,
        district        = profile.district,
        life_situations = [s.value for s in profile.life_situations],
        work_status     = profile.work_status.value   if profile.work_status   else None,
        family_status   = profile.family_status.value if profile.family_status else None,
        confidence      = intent.get("confidence", {}),
        warnings        = warnings,
    )

    return NlpResponse(
        analysis       = analysis,
        summary        = profile.summary(),
        region         = profile.region,
        district       = profile.district,
        active_sources = [s.value for s in profile.active_sources],
        results        = results,
        ontology       = ontology_result,
        draft_saved    = draft_saved,
        needs_region   = result.get("needs_region", False),
        message        = "자연어 분석으로 맞춤 복지서비스를 찾았습니다.",
    )


@router.get("/situations", summary="어려운 점 선택지 목록")
async def get_situations():
    """챗봇 STEP 3 선택지 반환."""
    from welfare_analyzer.models.user_profile import LifeSituation
    return {"situations": [s.value for s in LifeSituation if s.value != "기타"]}


@router.get("/debug/ontology", summary="온톨로지 디버그 (개발용)")
async def debug_ontology():
    """온톨로지 모듈 상태 및 샘플 매칭 결과 반환."""
    import traceback as tb
    result = {"available": _ONTOLOGY_AVAILABLE, "error": None, "match": None}
    if _ONTOLOGY_AVAILABLE:
        try:
            from chatbot.parser import build_profile
            answers = {
                "age": "58", "region": "서울특별시", "district": "노원구",
                "life_situations": ["갑작스러운 위기 상황이에요"],
                "family_status": "혼자 살고 있어요",
                "income_range": "", "gender": "", "work_status": "",
            }
            p = build_profile(answers)
            ont = _run_ontology_match(p)
            d = ont.to_dict()
            result["match"] = d["summary"]
            result["situations"] = [s.value for s in p.life_situations]
        except Exception as e:
            result["error"] = tb.format_exc()
    return result


@router.get("/regions", summary="허용 지역 목록")
async def get_regions():
    """허용 지역 및 시·군·구 목록 반환."""
    from welfare_analyzer.models.user_profile import (
        ALLOWED_SEOUL_DISTRICTS, ALLOWED_GYEONGGI_DISTRICTS
    )
    return {
        "서울특별시": sorted(ALLOWED_SEOUL_DISTRICTS),
        "경기도":     sorted(ALLOWED_GYEONGGI_DISTRICTS),
    }
