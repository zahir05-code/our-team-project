"""형태소 분석 모듈 — kiwipiepy 기반 한국어 명사·핵심어 추출.

역할:
  - 명사(NNG·NNP·NNB)·형용사 어간(VA) 추출
  - 인접 명사 결합 → 복합명사 생성 (국민+연금 → 국민연금)
  - 매칭용 '정규화 텍스트' 생성 (원문 + 단일명사 + 복합명사)

사용 예:
  >>> analyze("집이 없어서 너무 힘들어요")["nouns"]
  ['집', '힘들']
  >>> analyze("국민연금을 못 받아요")["compounds"]
  ['국민연금']
"""

from __future__ import annotations
from functools import lru_cache
from kiwipiepy import Kiwi

# ── 싱글톤 Kiwi 인스턴스 ─────────────────────────────────────
@lru_cache(maxsize=1)
def _get_kiwi() -> Kiwi:
    return Kiwi()

# 명사 품사 태그
NOUN_TAGS = {"NNG", "NNP", "NNB"}
# 핵심 의미 품사 (형용사 어간 포함)
CONTENT_TAGS = NOUN_TAGS | {"VA", "XR"}


def analyze(text: str) -> dict:
    """형태소 분석 + 복합명사 생성.

    반환:
        nouns:      단일 명사·핵심어 어간 리스트
        compounds:  인접 명사 2~3개 결합 복합명사 리스트
        normalized: 원문 + 단일명사 + 복합명사 (매칭용 확장 텍스트)
        tokens:     전체 토큰 [{form, tag, start, len}]
    """
    kiwi   = _get_kiwi()
    result = kiwi.analyze(text)
    tokens_raw = result[0][0]

    tokens = [
        {"form": t.form, "tag": str(t.tag), "start": t.start, "len": t.len}
        for t in tokens_raw
    ]

    # ── 단일 핵심어 ───────────────────────────────────────────
    nouns = list(dict.fromkeys(
        t["form"] for t in tokens
        if t["tag"] in CONTENT_TAGS and len(t["form"]) >= 1
    ))

    # ── 복합명사: 인접한 명사 토큰을 위치 기준으로 결합 ──────
    # 원문에서 연속된 명사 토큰이 붙어있으면(start+len == next.start) 결합
    noun_tokens = [t for t in tokens if t["tag"] in NOUN_TAGS]
    compounds: list[str] = []

    i = 0
    while i < len(noun_tokens):
        group = [noun_tokens[i]["form"]]
        j = i + 1
        # 최대 3개까지 연속 결합
        while j < len(noun_tokens) and j - i < 3:
            prev = noun_tokens[j - 1]
            curr = noun_tokens[j]
            # 원문에서 두 토큰이 바로 붙어있을 때 (공백·조사 없음)
            if prev["start"] + prev["len"] == curr["start"]:
                group.append(curr["form"])
                j += 1
            else:
                break
        if len(group) >= 2:
            compounds.append("".join(group))
            # 3개짜리도 2개 조합 포함
            if len(group) == 3:
                compounds.append(group[0] + group[1])
                compounds.append(group[1] + group[2])
        i += 1

    compounds = list(dict.fromkeys(compounds))  # 중복 제거

    # ── 정규화 텍스트 ─────────────────────────────────────────
    normalized = " ".join(filter(None, [
        text,
        " ".join(nouns),
        " ".join(compounds),
    ]))

    return {
        "nouns":      nouns,
        "compounds":  compounds,
        "normalized": normalized,
        "tokens":     tokens,
    }


def normalized_text(text: str) -> str:
    """매칭용 정규화 텍스트 반환 (원문 + 핵심명사 + 복합명사)."""
    return analyze(text)["normalized"]


def extract_nouns(text: str) -> list[str]:
    """명사만 빠르게 추출."""
    r = analyze(text)
    return r["nouns"] + r["compounds"]
