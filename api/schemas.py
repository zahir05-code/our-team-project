"""FastAPI 요청·응답 스키마."""

from pydantic import BaseModel, Field
from typing import Optional


# ── 요청 ────────────────────────────────────────────────────

class ProfileRequest(BaseModel):
    """사용자 프로파일 입력 — 필수 3가지 + 선택."""

    age:    int    = Field(..., ge=0, le=120, description="나이")
    region: str    = Field(..., description="시·도 (서울특별시 | 경기도)")
    district: str  = Field("",  description="시·군·구")

    life_situations: list[str] = Field(
        ..., min_length=1,
        description="어려운 점 (복수 선택)"
    )

    work_status:   Optional[str] = Field(None, description="일하는 상황")
    family_status: Optional[str] = Field(None, description="가족 상황")
    income_range:  Optional[str] = Field(None, description="소득 수준")
    gender:        Optional[str] = Field(None, description="성별 (여성|남성|무관)")


# ── 응답 ────────────────────────────────────────────────────

class ServiceLink(BaseModel):
    name: str
    url:  str


class WelfareResult(BaseModel):
    """복지서비스 결과."""
    section:  str
    services: list[ServiceLink]


class HealthResponse(BaseModel):
    status:  str
    version: str
    regions: list[str]


# ── NLP 자연어 요청·응답 ─────────────────────────────────────

class NlpRequest(BaseModel):
    """자연어 입력 요청."""
    text:              str            = Field(..., min_length=5, description="자연어 상황 설명")
    income_range:      Optional[str] = Field(None, description="소득 수준 (선택)")
    gender:            Optional[str] = Field(None, description="성별 (여성|남성|무관)")
    region_override:   Optional[str] = Field("",   description="지역 미감지 시 보완 입력")
    district_override: Optional[str] = Field("",   description="구·시·군 미감지 시 보완 입력")


class NlpAnalysis(BaseModel):
    """NLP 분석 중간 결과."""
    age:            Optional[int]
    region:         str
    district:       str
    life_situations: list[str]
    work_status:    Optional[str]
    family_status:  Optional[str]
    confidence:     dict
    warnings:       list[str]


# ── 온톨로지 매칭 결과 ──────────────────────────────────────

class OntologyPolicy(BaseModel):
    """단일 정책 온톨로지 매칭 결과."""
    policy_id:     str
    name:          str
    description:   str
    level:         str
    apply_url:     str
    authority:     str
    phone:         str
    required_docs: list[str]
    reasons:       list[str]
    match_reason:  str = ""   # '왜 나에게 맞는지' 한 줄 설명
    tags:          list[str]


class OntologyMatchResult(BaseModel):
    """DEFINITE / POSSIBLE / FUTURE 3단계 결과."""
    definite: list[OntologyPolicy]
    possible: list[OntologyPolicy]
    future:   list[OntologyPolicy]
    summary: dict   # definite_count, possible_count, future_count, total


class SupabasePolicy(BaseModel):
    """Supabase 실시간 DB 정책 카드."""
    policy_id:   str
    name:        str
    description: Optional[str] = ""
    benefit:     Optional[str] = ""
    how_to_apply: Optional[str] = ""
    contact:     Optional[str] = ""
    url:         Optional[str] = ""
    source:      Optional[str] = ""
    tags:        list[str] = []
    online_apply: bool = False


class ProfileResponse(BaseModel):
    """프로파일 조회 응답."""
    summary:      str
    region:       str
    district:     str
    active_sources: list[str]
    results:      list[WelfareResult]
    ontology:     Optional[OntologyMatchResult] = None
    supabase_policies: list[SupabasePolicy] = []
    draft_saved:  bool
    message:      str


class NlpResponse(BaseModel):
    """NLP 자연어 검색 응답."""
    analysis:    NlpAnalysis
    summary:     str
    region:      str
    district:    str
    active_sources: list[str]
    results:     list[WelfareResult]
    ontology:    Optional[OntologyMatchResult] = None
    supabase_policies: list[SupabasePolicy] = []
    draft_saved: bool
    needs_region: bool
    message:     str
