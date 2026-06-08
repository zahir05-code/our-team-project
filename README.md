# 아테나 복지서비스 (Athena Welfare Service)

> 누구나 자신의 언어로 상황을 말하면, 지금 받을 수 있는 복지 혜택을 3분 안에 알 수 있는 서비스

---

## 프로젝트 문서

| 문서 | 내용 |
|------|------|
| [problem.md](docs/problem.md) | 확정된 문제 정의 |
| [vision.md](docs/vision.md) | 문제를 풀면 만들어질 미래상 |
| [scenario.md](docs/scenario.md) | 이상적 사용자 시나리오 |
| [success.md](docs/success.md) | MVP 성공 기준 (한 문장) |
| [ontology_design.md](docs/ontology_design.md) | 온톨로지 Phase 3 설계 문서 |

---

## 빠른 시작

```bash
# 1. 의존성 설치
pip install -r requirements.txt

# 2. 서버 실행
python run_server.py

# 3. 브라우저 접속
http://localhost:8000
```

---

## 아키텍처

```
입력 (자연어 / 단계별 선택)
        ↓
   nlp/pipeline.py          ← kiwipiepy 형태소 분석, NER, 의도 분류
        ↓
   ontology/                ← 정책 자격 판단 (Phase 3)
   ├─ policy_node.py        ← 정책 단위 데이터 클래스
   ├─ policies_db.py        ← 20개 핵심 정책 데이터
   ├─ condition_engine.py   ← 조건 검증 엔진
   └─ knowledge_graph.py    ← 전체 매칭 실행
        ↓
   api/routers/welfare.py   ← FastAPI 엔드포인트
        ↓
결과: DEFINITE / POSSIBLE / FUTURE 3단계 + 필요 서류 + 신청 URL
```

---

## 법적 준수 원칙

- 개인정보는 **로컬 기기에만 저장** — 외부 서버 전송 없음
- 결과는 **"참고 안내"** — 실제 수급 여부는 담당 기관 심사 후 결정
- 공공 정책 데이터: **공공누리 제1유형** (출처 표시)
- 개인정보보호법·사회보장기본법·표시광고법 준수

---

## 커버리지

- 허용 지역: 서울특별시, 경기도
- 정책 수: 20개 (복지로 10, 고용노동부 3, 서울시 2, 경기도 2, 기타 3)
- 자동 테스트: 47개

---

## 기여 방법

1. `main` 브랜치에서 `feature/기능명` 브랜치 분기
2. 코드 작성 후 `tests/` 테스트 추가
3. Pull Request 생성 → 리뷰 후 머지
4. **정책 데이터 변경 시 반드시 출처·기준일 명기**

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Python 3.11, FastAPI, Pydantic |
| NLP | kiwipiepy (형태소 분석) |
| 온톨로지 | 자체 지식 그래프 (PolicyNode + ConditionEngine) |
| Frontend | Vanilla JS, HTML5, CSS3 |
| DB | SQLite (로컬 전용) |
| Test | pytest |
