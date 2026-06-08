"""DB 모델 정의 — SQLite 기반 (로컬 전용, 개인정보 외부 미전송)."""

import sqlite3
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "athena_news.db"


class SourceCategory(str, Enum):
    CENTRAL    = "중앙일간지"
    ECONOMY    = "경제전문지"
    LOCAL      = "지방지"
    GOVERNMENT = "지자체기관지"
    PUBLIC     = "정부공공기관"
    EDUCATION  = "교육기관"
    AI_TECH    = "AI기술전문"
    OVERSEAS   = "해외뉴스"


# ── 데이터 클래스 ──────────────────────────────────────────

@dataclass
class NewsSource:
    source_id:    str
    source_name:  str
    category:     SourceCategory
    region:       str = ""          # 지역 (지방지·지자체용)
    rss_url:      str = ""
    homepage_url: str = ""
    language:     str = "ko"


@dataclass
class Article:
    article_id:       str
    title:            str
    content:          str
    summary:          str = ""
    source_id:        str = ""
    category:         str = ""
    tags:             list[str] = field(default_factory=list)
    published_at:     str = ""
    importance_score: float = 0.0
    url:              str = ""


@dataclass
class UserInterest:
    user_id:              str
    keywords:             list[str] = field(default_factory=list)
    preferred_categories: list[str] = field(default_factory=list)
    preferred_regions:    list[str] = field(default_factory=list)


# ── DB 초기화 ──────────────────────────────────────────────

def init_db() -> None:
    """테이블이 없으면 생성."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS news_source (
            source_id    TEXT PRIMARY KEY,
            source_name  TEXT NOT NULL,
            category     TEXT NOT NULL,
            region       TEXT DEFAULT '',
            rss_url      TEXT DEFAULT '',
            homepage_url TEXT DEFAULT '',
            language     TEXT DEFAULT 'ko'
        );

        CREATE TABLE IF NOT EXISTS article (
            article_id       TEXT PRIMARY KEY,
            title            TEXT NOT NULL,
            content          TEXT,
            summary          TEXT DEFAULT '',
            source_id        TEXT,
            category         TEXT DEFAULT '',
            tags             TEXT DEFAULT '',
            published_at     TEXT DEFAULT '',
            importance_score REAL DEFAULT 0.0,
            url              TEXT DEFAULT '',
            FOREIGN KEY (source_id) REFERENCES news_source(source_id)
        );

        CREATE TABLE IF NOT EXISTS user_interest (
            user_id              TEXT PRIMARY KEY,
            keywords             TEXT DEFAULT '',
            preferred_categories TEXT DEFAULT '',
            preferred_regions    TEXT DEFAULT ''
        );
    """)
    con.commit()
    con.close()
