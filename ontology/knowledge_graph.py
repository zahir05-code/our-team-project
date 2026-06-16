"""지식 그래프 — 전체 정책 매칭 실행 및 결과 구조화.

사용:
    from ontology.knowledge_graph import run_ontology_match
    result = run_ontology_match(profile)
"""

from __future__ import annotations
from dataclasses import dataclass, field

from welfare_analyzer.models.user_profile import UserProfile
from ontology.policy_node import PolicyNode, MatchLevel, DocumentType
from ontology.condition_engine import match, build_match_reason
from ontology.policies_db import get_all_policies


@dataclass
class PolicyMatchResult:
    """단일 정책 매칭 결과."""
    policy:        PolicyNode
    level:         MatchLevel
    reasons:       list[str]   # 미충족 조건 설명 (POSSIBLE/FUTURE용)
    required_docs: list[str]   # 필요 서류 (한국어 값)
    match_reason:  str = ""    # 충족 이유 — '왜 나에게 맞는지' 한 줄


@dataclass
class OntologyResult:
    """전체 온톨로지 매칭 결과."""
    definite: list[PolicyMatchResult] = field(default_factory=list)
    possible: list[PolicyMatchResult] = field(default_factory=list)
    future:   list[PolicyMatchResult] = field(default_factory=list)

    @property
    def total(self) -> int:
        return len(self.definite) + len(self.possible) + len(self.future)

    def to_dict(self) -> dict:
        """API 응답용 직렬화."""
        def serialize(results: list[PolicyMatchResult]) -> list[dict]:
            return [
                {
                    "policy_id":    r.policy.policy_id,
                    "name":         r.policy.name,
                    "description":  r.policy.description,
                    "level":        r.level.value,
                    "apply_url":    r.policy.apply_url,
                    "authority":    r.policy.authority,
                    "phone":        r.policy.phone,
                    "required_docs": r.required_docs,
                    "reasons":      r.reasons,
                    "match_reason": r.match_reason,
                    "tags":         r.policy.tags,
                }
                for r in results
            ]
        return {
            "definite": serialize(self.definite),
            "possible": serialize(self.possible),
            "future":   serialize(self.future),
            "summary": {
                "definite_count": len(self.definite),
                "possible_count": len(self.possible),
                "future_count":   len(self.future),
                "total":          self.total,
            }
        }


def run_ontology_match(profile: UserProfile) -> OntologyResult:
    """모든 정책을 순회하며 UserProfile에 매칭 등급 산출.

    EXCLUDED는 결과에서 제외.
    각 등급 내에서는 정책명 가나다순 정렬.
    """
    result = OntologyResult()

    for policy in get_all_policies():
        level, reasons = match(profile, policy)

        if level == MatchLevel.EXCLUDED:
            continue

        doc_names    = [d.value for d in policy.required_docs]
        match_reason = build_match_reason(profile, policy, level)

        mr = PolicyMatchResult(
            policy       = policy,
            level        = level,
            reasons      = reasons,
            required_docs= doc_names,
            match_reason = match_reason,
        )

        if level == MatchLevel.DEFINITE:
            result.definite.append(mr)
        elif level == MatchLevel.POSSIBLE:
            result.possible.append(mr)
        elif level == MatchLevel.FUTURE:
            result.future.append(mr)

    # 등급 내 정렬
    result.definite.sort(key=lambda r: r.policy.name)
    result.possible.sort(key=lambda r: r.policy.name)
    result.future.sort(key=lambda r: r.policy.name)

    return result
