"""아테나 복지 정보 시스템 — 메인 진입점."""

import logging
from db.models import init_db
from chatbot.engine import run_chatbot

logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)


if __name__ == "__main__":
    init_db()
    run_chatbot()
