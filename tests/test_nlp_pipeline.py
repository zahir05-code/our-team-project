"""NLP 파이프라인 자동 테스트.

실행: python -X utf8 tests/test_nlp_pipeline.py
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from nlp.morpheme import analyze, normalized_text
from nlp.ner      import run_ner
from nlp.intent   import run_intent
from nlp.pipeline import run_pipeline
from welfare_analyzer.models.user_profile import (
    LifeSituation, WorkStatus, FamilyStatus
)

PASS = 0
FAIL = 0

def check(name: str, condition: bool, detail: str = ""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  ✅ PASS {name}")
    else:
        FAIL += 1
        print(f"  ❌ FAIL {name}")
        if detail:
            print(f"       → {detail}")


# ══════════════════════════════════════════════════════════
print("\n[1] 형태소 분석 — 복합명사 생성")
# ══════════════════════════════════════════════════════════

r = analyze("국민연금을 얼마 받지 못함")
check("국민연금 복합명사", "국민연금" in r["compounds"],
      f"compounds={r['compounds']}")

r = analyze("뇌병변 장애 있는 분")
check("뇌병변 복합명사", "뇌병변" in r["compounds"],
      f"compounds={r['compounds']}")

r = analyze("학자금대출 갚기 힘들어요")
check("학자금대출 복합명사", "학자금대출" in r["compounds"],
      f"compounds={r['compounds']}")

r = analyze("기초생활수급자입니다")
check("기초생활수급자 복합명사 포함",
      any("기초생활" in c for c in r["compounds"]),
      f"compounds={r['compounds']}")


# ══════════════════════════════════════════════════════════
print("\n[2] 정규화 텍스트 매칭 개선")
# ══════════════════════════════════════════════════════════

norm = normalized_text("집이 없습니다")
check("집이없습니다 → '집 없' 포함", "집" in norm and "없" in norm,
      f"norm={norm[:60]}")

norm = normalized_text("국민연금을 받지 못해요")
check("국민연금 정규화", "국민연금" in norm, f"norm={norm[:80]}")


# ══════════════════════════════════════════════════════════
print("\n[3] NER — 나이·지역·구 추출")
# ══════════════════════════════════════════════════════════

r = run_ner("저 58세이고 경기도 수원시 삽니다")
check("나이 58세",    r["age"] == 58,      f"age={r['age']}")
check("지역 경기도",  r["region"] == "경기도", f"region={r['region']}")
check("구 수원시",    r["district"] == "수원시", f"district={r['district']}")

r = run_ner("은퇴 후 자금이 전무한 58세, 경제활동을 80세 까지 해야해")
check("80세 까지 → 58세만 채택", r["age"] == 58, f"age={r['age']}")

r = run_ner("마흔 살 서울 노원구")
check("마흔→45세",   r["age"] == 45, f"age={r['age']}")
check("노원구 자동 서울 보완", r["region"] == "서울특별시", f"region={r['region']}")

r = run_ner("30대 경기도 고양시 사는 한부모")
check("30대→35세",   r["age"] == 35, f"age={r['age']}")
check("고양시 감지",  r["district"] == "고양시", f"district={r['district']}")


# ══════════════════════════════════════════════════════════
print("\n[4] 의도 분류 — 상황·직업·가족")
# ══════════════════════════════════════════════════════════

r = run_intent("집이 없습니다")
check("집이없습니다→주거",
      LifeSituation.HOUSING in r["life_situations"],
      f"sits={[s.value for s in r['life_situations']]}")

r = run_intent("국민연금 얼마 못 받음")
check("국민연금→생활비",
      LifeSituation.LIVING_COST in r["life_situations"],
      f"sits={[s.value for s in r['life_situations']]}")

r = run_intent("뇌병변 장애가 있어요")
check("뇌병변→장애",
      LifeSituation.DISABILITY in r["life_situations"],
      f"sits={[s.value for s in r['life_situations']]}")

r = run_intent("은퇴 후 경제활동을 해야 해요")
check("은퇴→WorkStatus.OTHER", r["work_status"] == WorkStatus.OTHER,
      f"work={r['work_status']}")

r = run_intent("1인 가족이고 혼자 삽니다")
check("1인가족→SINGLE", r["family_status"] == FamilyStatus.SINGLE,
      f"family={r['family_status']}")

r = run_intent("한부모로 두 아이 혼자 키워요")
check("한부모→SINGLE_PARENT", r["family_status"] == FamilyStatus.SINGLE_PARENT,
      f"family={r['family_status']}")

r = run_intent("학자금대출 갚기 힘들어요")
check("학자금대출→교육비",
      LifeSituation.EDUCATION in r["life_situations"],
      f"sits={[s.value for s in r['life_situations']]}")


# ══════════════════════════════════════════════════════════
print("\n[5] 파이프라인 통합 — 나이대별 실생활 케이스")
# ══════════════════════════════════════════════════════════

CASES = [
    {
        "name":    "58세 은퇴 1인가구 빚·연금 부족",
        "text":    "은퇴 후 자금이 전무한 58세, 1인 가족이고 빚이있다. 국민연금 얼마 못 받음",
        "age":     58,
        "sits":    [LifeSituation.LIVING_COST, LifeSituation.JOB],
        "work":    WorkStatus.OTHER,
        "family":  FamilyStatus.SINGLE,
    },
    {
        "name":    "25세 청년 학자금·전세사기 서울 마포구",
        "text":    "25살 서울 마포구 학자금대출 전세사기 당한 청년 구직중",
        "age":     25,
        "region":  "서울특별시",
        "district":"마포구",
        "sits":    [LifeSituation.LIVING_COST, LifeSituation.HOUSING, LifeSituation.JOB],
    },
    {
        "name":    "45세 경력단절 경기도 고양시",
        "text":    "40대 경기도 고양시 경력단절 재취업 어렵고 생활비 부족",
        "age":     45,
        "region":  "경기도",
        "district":"고양시",
        "sits":    [LifeSituation.LIVING_COST, LifeSituation.JOB],
    },
    {
        "name":    "75세 독거노인 서울 강북구 병원비",
        "text":    "일흔 독거노인 서울 강북구 병원비 치매 검사",
        "age":     75,
        "region":  "서울특별시",
        "district":"강북구",
        "sits":    [LifeSituation.MEDICAL],
        "family":  FamilyStatus.SINGLE,
    },
    {
        "name":    "45세 장애 경기도 성남시 의료비",
        "text":    "뇌병변 장애 있는 45세 경기도 성남시 간병비 의료비 부담",
        "age":     45,
        "region":  "경기도",
        "district":"성남시",
        "sits":    [LifeSituation.MEDICAL, LifeSituation.DISABILITY],
    },
]

for case in CASES:
    r = run_pipeline(case["text"])
    p = r["profile"]
    sits = p.life_situations

    print(f"\n  ▶ {case['name']}")
    if "age" in case:
        check(f"  나이 {case['age']}세", p.age == case["age"], f"age={p.age}")
    if "region" in case:
        check(f"  지역 {case['region']}", p.region == case["region"],
              f"region={p.region}")
    if "district" in case:
        check(f"  구 {case['district']}", p.district == case["district"],
              f"district={p.district}")
    for sit in case.get("sits", []):
        check(f"  상황 [{sit.value}]", sit in sits,
              f"sits={[s.value for s in sits]}")
    if "work" in case:
        check(f"  직업 {case['work'].value}", p.work_status == case["work"],
              f"work={p.work_status}")
    if "family" in case:
        check(f"  가족 {case['family'].value}", p.family_status == case["family"],
              f"family={p.family_status}")


# ══════════════════════════════════════════════════════════
print(f"""
{'=' * 55}
  NLP 테스트 결과: {PASS}개 통과 / {FAIL}개 실패
  {'🎉 전체 통과!' if FAIL == 0 else '⚠️  일부 실패 — 위 항목 확인 필요'}
{'=' * 55}
""")

if FAIL:
    sys.exit(1)
