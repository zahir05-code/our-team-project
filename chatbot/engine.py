"""챗봇 대화 엔진 — 터미널 인터페이스."""

import json
from datetime import datetime
from pathlib import Path

from chatbot.questions import QUESTIONS, QuestionType
from chatbot.parser import build_profile
from welfare_analyzer.api.link_connector import format_links_for_display, build_result_links
from config.settings import REPORT_DRAFT_DIR


DIVIDER = "─" * 52
HEADER  = """
╔══════════════════════════════════════════════════╗
║     아테나 복지서비스 맞춤 안내 시스템           ║
║     모든 분께 해당 복지혜택을 찾아드립니다       ║
╚══════════════════════════════════════════════════╝
"""


def _print_options(options: list[str]) -> None:
    for i, opt in enumerate(options, 1):
        print(f"  {i:2}. {opt}")


def _ask_number(question) -> str:
    while True:
        val = input("  입력 → ").strip()
        if val.isdigit() and int(val) > 0:
            return val
        print("  ⚠ 숫자를 입력해 주세요.")


def _ask_single(question) -> str:
    _print_options(question.options)
    while True:
        val = input("  번호 입력 → ").strip()
        if not val and not question.required:
            return ""
        if val.isdigit():
            idx = int(val) - 1
            if 0 <= idx < len(question.options):
                return question.options[idx]
        print("  ⚠ 올바른 번호를 입력해 주세요.")


def _ask_multi(question) -> list[str]:
    _print_options(question.options)
    while True:
        val = input("  번호 입력 → ").strip()
        if val == "0":
            return question.options  # 전체 선택
        try:
            indices = [int(v.strip()) - 1 for v in val.split(",")]
            selected = [question.options[i] for i in indices
                        if 0 <= i < len(question.options)]
            if selected:
                return selected
        except (ValueError, IndexError):
            pass
        print("  ⚠ 번호를 쉼표로 구분하여 입력해 주세요. (예: 1,3)")


def run_chatbot() -> dict:
    """챗봇 대화 실행 → 복지 링크 결과 반환."""
    print(HEADER)
    answers = {}

    for step, q in enumerate(QUESTIONS, 1):
        print(f"\n[STEP {step}/{len(QUESTIONS)}] {DIVIDER}")
        print(f"  {q.text}")
        if q.hint:
            print(f"  💡 {q.hint}")
        print()

        if q.qtype == QuestionType.NUMBER:
            answers[q.key] = _ask_number(q)

        elif q.qtype == QuestionType.SINGLE:
            answers[q.key] = _ask_single(q)

        elif q.qtype == QuestionType.MULTI:
            answers[q.key] = _ask_multi(q)

    # 프로파일 생성
    print(f"\n{DIVIDER}")
    print("  🔍 맞춤 복지서비스를 찾고 있습니다...")
    print(DIVIDER)

    profile = build_profile(answers)
    links   = build_result_links(profile)
    display = format_links_for_display(profile)

    # 결과 출력
    print(f"\n{'═' * 52}")
    print("  ✅ 아래 링크에서 복지서비스를 확인·신청하세요")
    print(f"{'═' * 52}\n")

    for section, items in links.items():
        print(f"▶ {section}")
        for name, url in items.items():
            print(f"  • {name}")
            print(f"    🔗 {url}")
        print()

    # Draft 저장
    REPORT_DRAFT_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    (REPORT_DRAFT_DIR / f"result_{ts}.txt").write_text(display, encoding="utf-8")
    (REPORT_DRAFT_DIR / f"result_{ts}.json").write_text(
        json.dumps(links, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"{'─' * 52}")
    print(f"  📁 결과 저장 완료: reports/drafts/result_{ts}")
    print(f"{'─' * 52}\n")

    return links
