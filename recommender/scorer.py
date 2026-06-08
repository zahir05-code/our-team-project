"""기사 중복 제거 및 중요도 점수화."""

import re
from db.models import Article
from config.settings import WELFARE_CATEGORY_KEYWORDS, SELF_EMPLOY_KEYWORDS


def deduplicate(articles: list[Article]) -> list[Article]:
    """article_id 기준 중복 제거."""
    seen = set()
    result = []
    for a in articles:
        if a.article_id not in seen:
            seen.add(a.article_id)
            result.append(a)
    return result


def score_importance(article: Article) -> float:
    """기사 중요도 점수 산출 (0.0 ~ 1.0).

    기준:
    - 복지 키워드 포함 수 (가중치 높음)
    - 자영업·소상공인 키워드 포함 여부
    - 제목 길이 (너무 짧으면 감점)
    - 본문 길이 (충분한 내용 여부)
    """
    text = (article.title + " " + article.content)
    score = 0.0

    # 복지 키워드 매칭
    welfare_hits = sum(
        1 for kws in WELFARE_CATEGORY_KEYWORDS.values() for kw in kws if kw in text
    )
    score += min(welfare_hits * 0.08, 0.5)

    # 자영업 키워드
    if any(kw in text for kw in SELF_EMPLOY_KEYWORDS):
        score += 0.1

    # 제목 길이
    title_len = len(article.title)
    if title_len >= 15:
        score += 0.15
    elif title_len < 8:
        score -= 0.1

    # 본문 길이
    content_len = len(article.content)
    if content_len >= 300:
        score += 0.2
    elif content_len >= 100:
        score += 0.1

    return round(min(max(score, 0.0), 1.0), 3)


def score_all(articles: list[Article]) -> list[Article]:
    """전체 기사 점수화 후 내림차순 정렬."""
    for a in articles:
        a.importance_score = score_importance(a)
    return sorted(articles, key=lambda a: a.importance_score, reverse=True)
