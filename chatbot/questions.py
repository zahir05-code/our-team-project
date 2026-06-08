"""챗봇 질문 정의 — 8단계 대화 흐름."""

from dataclasses import dataclass
from enum import Enum


class QuestionType(str, Enum):
    NUMBER   = "number"    # 숫자 입력
    SINGLE   = "single"    # 단일 선택
    MULTI    = "multi"     # 복수 선택


@dataclass
class Question:
    key:      str
    text:     str
    qtype:    QuestionType
    options:  list[str] = None
    required: bool = True
    hint:     str = ""


QUESTIONS = [
    Question(
        key="age",
        text="나이를 입력해 주세요.",
        qtype=QuestionType.NUMBER,
        hint="숫자만 입력 (예: 35)",
    ),
    Question(
        key="region",
        text="거주하시는 시·도를 선택해 주세요.",
        qtype=QuestionType.SINGLE,
        options=[
            "서울특별시", "부산광역시", "대구광역시", "인천광역시",
            "광주광역시", "대전광역시", "울산광역시", "세종특별자치시",
            "경기도", "강원특별자치도", "충청북도", "충청남도",
            "전라북도", "전라남도", "경상북도", "경상남도", "제주특별자치도",
        ],
    ),
    Question(
        key="life_situations",
        text="지금 가장 어려운 점을 선택해 주세요. (여러 개 선택 가능)",
        qtype=QuestionType.MULTI,
        options=[
            "생활비·식비가 부족해요",
            "병원비·건강이 걱정돼요",
            "주거가 불안정해요",
            "교육비·돌봄이 필요해요",
            "취업·일자리가 필요해요",
            "사업·자영업이 어려워요",
            "가족을 돌봐야 해요",
            "갑작스러운 위기 상황이에요",
            "건강·신체적으로 불편함이 있어요",
        ],
        hint="번호를 쉼표로 구분 (예: 1,3,5) 또는 전체는 0",
    ),
    Question(
        key="work_status",
        text="현재 일하는 상황을 선택해 주세요.",
        qtype=QuestionType.SINGLE,
        options=[
            "직장에 다니고 있어요",
            "자영업·사업을 하고 있어요",
            "소상공인이에요",
            "프리랜서·단기 일을 해요",
            "일자리를 찾고 있어요",
            "현재 일을 쉬고 있어요",
            "학생이에요",
            "농어업에 종사해요",
            "기타",
        ],
        required=False,
        hint="Enter 키를 누르면 건너뜁니다.",
    ),
    Question(
        key="family_status",
        text="가족·돌봄 상황을 선택해 주세요.",
        qtype=QuestionType.SINGLE,
        options=[
            "혼자 살고 있어요",
            "배우자와 둘이 살아요",
            "아이와 함께 살고 있어요",
            "혼자 아이를 키우고 있어요",
            "어르신 가족을 돌보고 있어요",
            "아픈 가족이 있어요",
            "여러 세대가 함께 살아요",
            "기타",
        ],
        required=False,
        hint="Enter 키를 누르면 건너뜁니다.",
    ),
    Question(
        key="income_range",
        text="소득 수준을 선택해 주세요.\n※ 모르시면 1번을 선택하시면 됩니다.",
        qtype=QuestionType.SINGLE,
        options=[
            "잘 모르겠어요 (소득 무관 서비스 우선 안내)",
            "거의 없어요",
            "중위소득 50% 이하",
            "중위소득 50~100%",
            "중위소득 100~150%",
            "중위소득 150% 이상",
        ],
        required=False,
        hint="Enter 키를 누르면 건너뜁니다.",
    ),
]
