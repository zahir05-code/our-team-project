"""복지 정책 데이터베이스 — 서울·경기 주요 정책 20개.

실제 정책 조건을 최대한 정확하게 반영.
API 키 확보 시 자동 갱신 가능한 구조로 설계.
"""

from ontology.policy_node import (
    PolicyNode, ExceptionRule, ExceptionType, DocumentType
)
from welfare_analyzer.models.user_profile import (
    LifeSituation as LS, WorkStatus as WS,
    FamilyStatus as FS, IncomeRange as IR, GenderStatus as GS,
)

# ════════════════════════════════════════════════════════════
# 중앙정부 정책
# ════════════════════════════════════════════════════════════

POLICIES: list[PolicyNode] = [

    # ── 1. 기초생활수급 ───────────────────────────────────────
    PolicyNode(
        policy_id   = "BOKJIRO_001",
        name        = "국민기초생활수급",
        description = "소득·재산이 최저 기준 이하인 가구에 생계·의료·주거·교육급여 지원",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr",
        income_max  = IR.LOW,                     # 중위소득 30~50% 이하
        required_situations = [LS.LIVING_COST, LS.MEDICAL, LS.HOUSING],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.INCOME_CERT,
            DocumentType.PROPERTY_CERT,
            DocumentType.BANK_CONSENT,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "129",
        online_apply= True,
        exceptions  = [
            ExceptionRule(
                type=ExceptionType.RELAXED,
                description="장애인 가구는 소득 기준 완화 적용",
                trigger_disability=True,
            ),
            ExceptionRule(
                type=ExceptionType.PRIORITY,
                description="위기 상황 가구 우선 심사",
                trigger_situation=LS.CRISIS,
            ),
        ],
        tags=["생계급여", "의료급여", "주거급여", "교육급여", "수급자"],
    ),

    # ── 2. 긴급복지지원 ───────────────────────────────────────
    PolicyNode(
        policy_id   = "BOKJIRO_002",
        name        = "긴급복지지원",
        description = "갑작스러운 위기 상황으로 생계 유지가 어려운 경우 즉시 지원",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr",
        income_max  = IR.MIDDLE_LOW,              # 중위소득 75% 이하
        required_situations = [LS.CRISIS, LS.LIVING_COST],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.CRISIS_REASON,
        ],
        optional_docs = [DocumentType.INCOME_CERT],
        authority   = "읍·면·동 주민센터 또는 시·군·구청",
        phone       = "129",
        online_apply= False,
        exceptions  = [
            ExceptionRule(
                type=ExceptionType.EXCLUSION,
                description="기초생활수급자는 중복 지원 불가",
            ),
        ],
        tags=["긴급", "위기", "즉시지원", "생계"],
    ),

    # ── 3. 의료급여 ──────────────────────────────────────────
    PolicyNode(
        policy_id   = "BOKJIRO_003",
        name        = "의료급여",
        description = "저소득층의 의료비 본인부담을 대폭 줄여주는 의료 지원",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr",
        income_max  = IR.LOW,
        required_situations = [LS.MEDICAL],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.INCOME_CERT,
            DocumentType.MEDICAL_CERT,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "129",
        tags=["병원비", "의료비", "치료비"],
    ),

    # ── 4. 주거급여 ──────────────────────────────────────────
    PolicyNode(
        policy_id   = "BOKJIRO_004",
        name        = "주거급여 (임차·수선)",
        description = "저소득 가구의 월세·전세 임차료 지원 또는 주택 수선 지원",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr",
        income_max  = IR.LOW,
        required_situations = [LS.HOUSING],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.INCOME_CERT,
            DocumentType.LEASE_CONTRACT,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "1600-0777",
        tags=["월세", "전세", "임차료", "주거비"],
    ),

    # ── 5. 노인 기초연금 ─────────────────────────────────────
    PolicyNode(
        policy_id   = "BOKJIRO_005",
        name        = "기초연금",
        description = "만 65세 이상 소득 하위 70% 어르신에게 매월 연금 지급",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr",
        age_min     = 65,
        income_max  = IR.MIDDLE_LOW,
        required_situations = [LS.LIVING_COST],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.BANK_CONSENT,
        ],
        authority   = "읍·면·동 주민센터 또는 국민연금공단",
        phone       = "1355",
        online_apply= True,
        tags=["기초연금", "노인", "어르신", "65세", "연금"],
    ),

    # ── 6. 장애인 활동지원 ───────────────────────────────────
    PolicyNode(
        policy_id   = "BOKJIRO_006",
        name        = "장애인 활동지원",
        description = "혼자 일상생활이 어려운 장애인에게 활동보조·방문목욕·방문간호 제공",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr",
        age_min     = 6,
        age_max     = 65,
        required_situations = [LS.DISABILITY],   # 장애 상황 필수
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.DISABILITY_CERT,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "129",
        tags=["장애인", "활동보조", "돌봄", "활동지원"],
    ),

    # ── 7. 장애인 연금 ───────────────────────────────────────
    PolicyNode(
        policy_id   = "BOKJIRO_007",
        name        = "장애인연금",
        description = "중증 장애인의 생활 안정을 위해 매월 연금 지급",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr",
        age_min     = 18,
        income_max  = IR.MIDDLE_LOW,
        required_situations = [LS.DISABILITY],   # 장애 상황 필수
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.DISABILITY_CERT,
            DocumentType.INCOME_CERT,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "129",
        tags=["장애인연금", "중증장애", "연금"],
    ),

    # ── 8. 한부모가족 지원 ───────────────────────────────────
    PolicyNode(
        policy_id   = "BOKJIRO_008",
        name        = "한부모가족 지원",
        description = "한부모 가정의 아동 양육비·학용품비·생활보조금 지원",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr",
        income_max  = IR.MIDDLE_LOW,
        required_family     = [FS.SINGLE_PARENT],
        required_situations = [LS.LIVING_COST, LS.EDUCATION],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.FAMILY_REGISTER,
            DocumentType.SINGLE_PARENT_CERT,
            DocumentType.INCOME_CERT,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "1644-6621",
        tags=["한부모", "양육비", "아동", "편부", "편모"],
    ),

    # ── 9. 아동 돌봄쿠폰 ─────────────────────────────────────
    PolicyNode(
        policy_id   = "BOKJIRO_009",
        name        = "아동돌봄쿠폰 (아이돌봄서비스)",
        description = "만 12세 이하 아동 가정에 아이돌보미를 연계·지원",
        source      = "복지로",
        apply_url   = "https://www.childcare.go.kr",
        income_max  = IR.MIDDLE,
        required_situations = [LS.EDUCATION],
        required_family     = [FS.WITH_CHILDREN, FS.SINGLE_PARENT],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.FAMILY_REGISTER,
        ],
        authority   = "아이돌봄서비스 포털",
        phone       = "1577-2306",
        online_apply= True,
        tags=["아이돌봄", "보육", "돌봄", "아동"],
    ),

    # ── 10. 청년 취업지원 ────────────────────────────────────
    PolicyNode(
        policy_id   = "MOEL_001",
        name        = "청년 취업지원금 (국민취업지원제도)",
        description = "취업에 어려움이 있는 청년에게 구직활동 지원금 및 취업 서비스 제공",
        source      = "고용노동부",
        apply_url   = "https://www.work.go.kr",
        age_min     = 15,
        age_max     = 34,
        income_max  = IR.MIDDLE_LOW,
        required_situations = [LS.JOB],
        required_work       = [WS.JOB_SEEKING, WS.UNEMPLOYED],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.UNEMPLOY_CERT,
        ],
        authority   = "고용복지플러스센터",
        phone       = "1350",
        online_apply= True,
        exceptions  = [
            ExceptionRule(
                type=ExceptionType.RELAXED,
                description="장애인 청년은 39세까지 신청 가능",
                trigger_disability=True,
                age_max_override=39,
            ),
        ],
        tags=["청년", "취업", "구직", "지원금"],
    ),

    # ── 11. 경력단절여성 취업 지원 ───────────────────────────
    PolicyNode(
        policy_id   = "MOGEF_001",
        name        = "경력단절여성 취업 지원 (새일센터)",
        description = "임신·출산·육아 등으로 경력이 단절된 여성의 재취업 훈련·알선",
        source      = "여성가족부",
        apply_url   = "https://www.saeil.mogef.go.kr",
        gender      = GS.FEMALE,
        required_situations = [LS.JOB],
        required_work       = [WS.JOB_SEEKING, WS.UNEMPLOYED, WS.OTHER],
        required_docs = [DocumentType.ID_COPY],
        authority   = "새일여성인력개발센터",
        phone       = "1544-1199",
        online_apply= True,
        tags=["경력단절", "여성", "재취업", "새일센터"],
    ),

    # ── 12. 중장년 취업지원 ──────────────────────────────────
    PolicyNode(
        policy_id   = "MOEL_002",
        name        = "중장년 취업지원 (장년 워크넷)",
        description = "만 40세 이상 중장년층의 재취업·전직 지원 서비스",
        source      = "고용노동부",
        apply_url   = "https://www.work.go.kr",
        age_min     = 40,
        required_situations = [LS.JOB],
        required_work       = [WS.JOB_SEEKING, WS.UNEMPLOYED, WS.OTHER],
        required_docs = [DocumentType.ID_COPY],
        authority   = "고용복지플러스센터",
        phone       = "1350",
        online_apply= True,
        tags=["중장년", "40대", "50대", "재취업", "워크넷"],
    ),

    # ── 13. 소상공인 지원 ────────────────────────────────────
    PolicyNode(
        policy_id   = "MSS_001",
        name        = "소상공인 경영안정자금",
        description = "경영 위기에 처한 소상공인에게 저금리 운전자금·시설자금 지원",
        source      = "중소벤처기업부",
        apply_url   = "https://www.semas.or.kr",
        required_situations = [LS.BUSINESS, LS.LIVING_COST],
        required_work       = [WS.SMALL_BIZ, WS.SELF_EMPLOYED],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.INCOME_CERT,
        ],
        optional_docs = [DocumentType.BUSINESS_CLOSE],
        authority   = "소상공인진흥공단",
        phone       = "1357",
        online_apply= True,
        tags=["소상공인", "자영업", "폐업", "경영안정"],
    ),

    # ── 14. 실업급여 ─────────────────────────────────────────
    PolicyNode(
        policy_id   = "MOEL_003",
        name        = "실업급여 (구직급여)",
        description = "비자발적 실직 후 구직활동 기간 동안 생활 안정을 위해 급여 지급",
        source      = "고용노동부",
        apply_url   = "https://www.ei.go.kr",
        required_situations = [LS.JOB, LS.LIVING_COST],
        required_work       = [WS.UNEMPLOYED],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.UNEMPLOY_CERT,
        ],
        authority   = "고용복지플러스센터",
        phone       = "1350",
        online_apply= True,
        exceptions  = [
            ExceptionRule(
                type=ExceptionType.EXCLUSION,
                description="자발적 퇴직(자영업자 폐업 등)은 별도 요건 확인 필요",
            ),
        ],
        tags=["실업급여", "구직급여", "실직", "해고"],
    ),

    # ── 15. 노인 일자리 ──────────────────────────────────────
    PolicyNode(
        policy_id   = "BOKJIRO_010",
        name        = "노인 일자리 및 사회활동 지원",
        description = "만 60세 이상 어르신에게 공익활동·사회서비스형 일자리 제공",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr",
        age_min     = 60,
        required_situations = [LS.JOB, LS.LIVING_COST],
        required_work       = [WS.UNEMPLOYED, WS.OTHER],
        required_docs = [DocumentType.ID_COPY],
        authority   = "읍·면·동 주민센터 또는 노인복지관",
        phone       = "129",
        tags=["노인일자리", "어르신", "60세", "사회활동"],
    ),

    # ── 16. 장기요양 (노인 돌봄) ─────────────────────────────
    PolicyNode(
        policy_id   = "NHIS_001",
        name        = "노인장기요양보험",
        description = "치매·중풍 등으로 혼자 일상생활이 어려운 어르신에게 요양 서비스 제공",
        source      = "건강보험공단",
        apply_url   = "https://www.nhis.or.kr",
        age_min     = 65,
        required_situations = [LS.CARE, LS.MEDICAL],
        required_family     = [FS.WITH_ELDERLY, FS.WITH_SICK_FAMILY],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.MEDICAL_CERT,
        ],
        authority   = "국민건강보험공단",
        phone       = "1577-1000",
        online_apply= True,
        tags=["장기요양", "치매", "요양", "노인돌봄"],
    ),

    # ── 17. 서울 청년 월세 지원 ──────────────────────────────
    PolicyNode(
        policy_id   = "SEOUL_001",
        name        = "서울시 청년 월세 지원",
        description = "서울 거주 청년 1인가구에게 월세 20만 원을 최대 12개월 지원",
        source      = "서울시",
        apply_url   = "https://wis.seoul.go.kr",
        age_min     = 19,
        age_max     = 39,
        income_max  = IR.MIDDLE_LOW,
        regions     = ["서울특별시"],
        required_situations = [LS.HOUSING, LS.LIVING_COST],
        required_family     = [FS.SINGLE],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.LEASE_CONTRACT,
            DocumentType.INCOME_CERT,
        ],
        authority   = "서울시 온라인 신청",
        phone       = "120 (다산콜센터)",
        online_apply= True,
        tags=["서울", "청년", "월세", "1인가구"],
    ),

    # ── 18. 서울 복지 긴급지원 ───────────────────────────────
    PolicyNode(
        policy_id   = "SEOUL_002",
        name        = "서울형 긴급복지 지원",
        description = "서울 거주 위기 가구에 생계·의료·주거 긴급 지원 (중앙 기준보다 완화)",
        source      = "서울시",
        apply_url   = "https://wis.seoul.go.kr",
        regions     = ["서울특별시"],
        income_max  = IR.MIDDLE,
        required_situations = [LS.CRISIS, LS.LIVING_COST],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.CRISIS_REASON,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "120",
        online_apply= False,
        tags=["서울", "긴급", "위기", "생계"],
    ),

    # ── 19. 경기도 청년 기본소득 ─────────────────────────────
    PolicyNode(
        policy_id   = "GYEONGGI_001",
        name        = "경기도 청년 기본소득",
        description = "경기도 거주 만 24세 청년에게 분기별 25만 원 (연 100만 원) 지역화폐 지급",
        source      = "경기도",
        apply_url   = "https://www.gg.go.kr",
        age_min     = 24,
        age_max     = 24,
        regions     = ["경기도"],
        required_docs = [DocumentType.ID_COPY],
        authority   = "경기도 온라인 신청",
        phone       = "031-120",
        online_apply= True,
        tags=["경기도", "청년", "기본소득", "24세", "지역화폐"],
    ),

    # ── 20. 경기도 복지 사각지대 발굴 ────────────────────────
    PolicyNode(
        policy_id   = "GYEONGGI_002",
        name        = "경기도 긴급복지 지원",
        description = "경기도 거주 위기 가구 생계·의료·주거 긴급 지원",
        source      = "경기도",
        apply_url   = "https://www.ggwf.or.kr",
        regions     = ["경기도"],
        income_max  = IR.MIDDLE_LOW,
        required_situations = [LS.CRISIS, LS.LIVING_COST],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.CRISIS_REASON,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "031-120",
        tags=["경기도", "긴급", "위기", "복지"],
    ),
]


def get_all_policies() -> list[PolicyNode]:
    return POLICIES


def get_policy_by_id(policy_id: str) -> PolicyNode | None:
    return next((p for p in POLICIES if p.policy_id == policy_id), None)
