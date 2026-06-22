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
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004558",
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
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004564",
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
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004559",
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
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004560",
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
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004571",
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
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00003260",
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
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004573",
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
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004569",
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
        apply_url   = "https://idolbom.go.kr/front/srvcUtztnGuide/srvcApply",
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
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00003245",
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
        apply_url   = "https://saeil.mogef.go.kr",
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
        name        = "중장년 취업지원 (고용24)",
        description = "만 40세 이상 중장년층의 재취업·전직 지원 서비스 (고용24 통합포털)",
        source      = "고용노동부",
        apply_url   = "https://www.work24.go.kr/wk/u/b/1000/seniorChgJobSptSvc.do",
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
        apply_url   = "https://www.semas.or.kr/web/SUB01/030101.kmdc",
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
        apply_url   = "https://www.ei.go.kr/ei/eih/eg/b/ehFrontEIApply.do",
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
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004570",
        age_min     = 60,
        required_situations = [LS.JOB, LS.LIVING_COST],
        required_work       = [WS.UNEMPLOYED, WS.OTHER],
        required_docs = [DocumentType.ID_COPY],
        authority   = "읍·면·동 주민센터 또는 노인복지관",
        phone       = "129",
        tags=["노인일자리", "어르신", "60세", "사회활동"],
    ),

    # ── 16. 장기요양 (노인 돌봄) ─────────────────────────────  [WLF00004565 CSV검증]
    PolicyNode(
        policy_id   = "NHIS_001",
        name        = "노인장기요양보험",
        description = "치매·중풍 등으로 혼자 일상생활이 어려운 어르신에게 요양 서비스 제공",
        source      = "건강보험공단",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004565",
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
        apply_url   = "https://welfare.seoul.go.kr/site/main/content/emergency_welfare",
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
        apply_url   = "https://www.welfare.seoul.kr/web/contents/emergency.lp",
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
        apply_url   = "https://www.gg.go.kr/contents/contents.do?ciIdx=679&menuId=2457",
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
        apply_url   = "https://www.gg.go.kr/contents/contents.do?ciIdx=1447&menuId=3243",
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

    # ════════════════════════════════════════════════════════════
    # 임신 · 출산 · 영유아 (21~25)
    # ════════════════════════════════════════════════════════════

    # ── 21. 아동수당 ─────────────────────────────────────────
    PolicyNode(
        policy_id   = "CHILD_001",
        name        = "아동수당",
        description = "만 8세 미만 아동에게 매월 10만 원 지급 (소득 무관 전 아동)",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004568",
        age_max     = 7,
        required_situations = [LS.LIVING_COST, LS.EDUCATION],
        required_family     = [FS.WITH_CHILDREN, FS.SINGLE_PARENT],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.FAMILY_REGISTER,
        ],
        authority   = "읍·면·동 주민센터 또는 복지로 온라인",
        phone       = "129",
        online_apply= True,
        tags=["아동수당", "아동", "영유아", "0~7세", "월10만원"],
    ),

    # ── 22. 부모급여 ─────────────────────────────────────────
    PolicyNode(
        policy_id   = "CHILD_002",
        name        = "부모급여",
        description = "만 0세 월 100만 원, 만 1세 월 50만 원 현금 지급 (어린이집 미이용 시)",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/search/search.do?query=부모급여",
        age_max     = 1,
        required_situations = [LS.LIVING_COST, LS.EDUCATION],
        required_family     = [FS.WITH_CHILDREN, FS.SINGLE_PARENT],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.FAMILY_REGISTER,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "129",
        online_apply= True,
        tags=["부모급여", "영아", "0세", "1세", "육아"],
    ),

    # ── 23. 첫만남이용권 ─────────────────────────────────────
    PolicyNode(
        policy_id   = "CHILD_003",
        name        = "첫만남이용권 (출산지원금)",
        description = "출생 아동에게 200만 원 바우처 지급 (첫째 200만 원, 둘째 이상 300만 원)",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/search/search.do?query=첫만남이용권",
        age_max     = 0,
        required_situations = [LS.LIVING_COST],
        required_family     = [FS.WITH_CHILDREN],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.FAMILY_REGISTER,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "129",
        online_apply= True,
        tags=["출산지원금", "첫만남", "바우처", "출생", "신생아"],
    ),

    # ── 24. 산모·신생아 건강관리 서비스 ──────────────────────
    PolicyNode(
        policy_id   = "CHILD_004",
        name        = "산모·신생아 건강관리 서비스",
        description = "출산 가정에 산모·신생아 건강관리사를 파견해 산후 회복 지원 (5~25일)",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/search/search.do?query=산모신생아건강관리서비스",
        income_max  = IR.MIDDLE,
        required_situations = [LS.MEDICAL, LS.CARE],
        required_family     = [FS.WITH_CHILDREN],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.FAMILY_REGISTER,
            DocumentType.INCOME_CERT,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "129",
        online_apply= True,
        tags=["산모", "신생아", "산후조리", "건강관리사", "출산"],
    ),

    # ── 25. 가정양육수당 ─────────────────────────────────────
    PolicyNode(
        policy_id   = "CHILD_005",
        name        = "가정양육수당",
        description = "어린이집·유치원을 이용하지 않는 만 0~5세 아동에게 월 10~20만 원 지원",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004567",
        age_max     = 5,
        required_situations = [LS.EDUCATION, LS.LIVING_COST],
        required_family     = [FS.WITH_CHILDREN, FS.SINGLE_PARENT],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.FAMILY_REGISTER,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "129",
        online_apply= True,
        tags=["양육수당", "가정보육", "영유아", "0~5세"],
    ),

    # ════════════════════════════════════════════════════════════
    # 다문화 · 외국인 특화 (26~30) — 이 앱의 핵심 대상
    # ════════════════════════════════════════════════════════════

    # ── 26. 다문화가족 지원센터 ───────────────────────────────
    PolicyNode(
        policy_id   = "MULTI_001",
        name        = "다문화가족 지원센터 서비스",
        description = "결혼이민자·귀화자 가족에게 한국어 교육·통번역·가족상담·자녀 학습 지원",
        source      = "여성가족부",
        apply_url   = "https://www.mogef.go.kr",
        required_situations = [LS.EDUCATION, LS.LIVING_COST, LS.JOB],
        required_docs = [DocumentType.ID_COPY],
        foreigner_only = True,
        authority   = "가까운 다문화가족지원센터",
        phone       = "1577-1366",
        online_apply= False,
        tags=["다문화", "결혼이민자", "외국인", "한국어", "통번역", "다문화센터"],
    ),

    # ── 27. 결혼이민자 취업지원 ──────────────────────────────
    PolicyNode(
        policy_id   = "MULTI_002",
        name        = "결혼이민자 취업 교육 지원",
        description = "결혼이민자의 경제활동 참여를 위한 직업훈련·취업알선·인턴십 프로그램",
        source      = "여성가족부",
        apply_url   = "https://saeil.mogef.go.kr",
        gender      = GS.FEMALE,
        required_situations = [LS.JOB, LS.LIVING_COST],
        required_docs = [DocumentType.ID_COPY],
        foreigner_only = True,
        authority   = "다문화가족지원센터·새일센터",
        phone       = "1577-1366",
        online_apply= False,
        tags=["결혼이민자", "취업", "직업훈련", "다문화", "외국인여성"],
    ),

    # ── 28. 외국인 근로자 의료지원 ───────────────────────────
    PolicyNode(
        policy_id   = "MULTI_003",
        name        = "외국인 근로자 의료지원",
        description = "미등록 외국인 포함 의료사각지대 외국인에게 무료·저비용 진료 서비스 제공",
        source      = "고용노동부·지자체",
        apply_url   = "https://www.moel.go.kr",
        required_situations = [LS.MEDICAL],
        required_docs = [DocumentType.ID_COPY],
        foreigner_only = True,
        authority   = "외국인노동자지원센터 (안산·서울·경기)",
        phone       = "1644-0644",
        online_apply= False,
        tags=["외국인", "외국인근로자", "의료지원", "미등록", "무료진료"],
    ),

    # ── 29. 다문화가족 아동 언어발달 지원 ───────────────────
    PolicyNode(
        policy_id   = "MULTI_004",
        name        = "다문화가족 아동 언어발달 지원",
        description = "다문화 가정 만 12세 이하 아동에게 언어평가·언어교육 무료 제공",
        source      = "여성가족부",
        apply_url   = "https://www.mogef.go.kr",
        age_max     = 12,
        required_situations = [LS.EDUCATION],
        required_family     = [FS.WITH_CHILDREN],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.FAMILY_REGISTER,
        ],
        foreigner_only = True,
        authority   = "다문화가족지원센터",
        phone       = "1577-1366",
        online_apply= False,
        tags=["다문화", "아동", "언어발달", "언어교육", "이중언어"],
    ),

    # ── 30. 이주여성 긴급지원·쉼터 ──────────────────────────
    PolicyNode(
        policy_id   = "MULTI_005",
        name        = "이주여성 긴급지원 및 보호시설",
        description = "가정폭력·성폭력 피해 이주여성에게 긴급 쉼터·법률 지원·통번역 서비스 제공",
        source      = "여성가족부",
        apply_url   = "https://www.mogef.go.kr",
        gender      = GS.FEMALE,
        required_situations = [LS.CRISIS, LS.HOUSING],
        required_docs = [],
        foreigner_only = True,
        authority   = "이주여성긴급지원센터",
        phone       = "1577-1366",
        online_apply= False,
        tags=["이주여성", "가정폭력", "쉼터", "긴급지원", "외국인여성"],
    ),

    # ════════════════════════════════════════════════════════════
    # 에너지 · 문화 · 통신 (31~34)
    # ════════════════════════════════════════════════════════════

    # ── 31. 에너지바우처 ─────────────────────────────────────
    PolicyNode(
        policy_id   = "ENERGY_001",
        name        = "에너지바우처 (냉·난방비 지원)",
        description = "취약계층 가구의 여름·겨울 냉난방비를 바우처로 지원 (연 최대 30만 원)",
        source      = "산업통상자원부",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00010086",
        income_max  = IR.LOW,
        required_situations = [LS.LIVING_COST],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.INCOME_CERT,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "1600-3190",
        online_apply= True,
        tags=["에너지바우처", "냉방비", "난방비", "전기요금", "취약계층"],
    ),

    # ── 32. 문화누리카드 ─────────────────────────────────────
    PolicyNode(
        policy_id   = "CULTURE_001",
        name        = "문화누리카드",
        description = "기초생활수급자·차상위계층에게 연 13만 원 문화·여행·체육 바우처 지급",
        source      = "문화체육관광부",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004574",
        income_max  = IR.LOW,
        required_situations = [LS.LIVING_COST],
        required_docs = [DocumentType.ID_COPY],
        authority   = "읍·면·동 주민센터 또는 온라인",
        phone       = "1544-3412",
        online_apply= True,
        tags=["문화누리카드", "문화바우처", "여행", "체육", "수급자"],
    ),

    # ── 33. 통신요금 감면 ────────────────────────────────────
    PolicyNode(
        policy_id   = "TELECOM_001",
        name        = "저소득층 통신요금 감면",
        description = "기초생활수급자·차상위계층의 이동통신·인터넷 요금 월 최대 26,000원 감면",
        source      = "과학기술정보통신부",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/search/search.do?query=저소득층+통신요금+감면",
        income_max  = IR.LOW,
        required_situations = [LS.LIVING_COST],
        required_docs = [DocumentType.ID_COPY],
        authority   = "각 통신사 또는 읍·면·동 주민센터",
        phone       = "114",
        online_apply= True,
        tags=["통신요금", "감면", "인터넷", "휴대폰", "수급자"],
    ),

    # ── 34. 양곡할인 (쌀 할인) ───────────────────────────────
    PolicyNode(
        policy_id   = "FOOD_001",
        name        = "저소득층 양곡 지원",
        description = "기초생활수급자에게 시중가 50% 할인으로 쌀 구입 지원",
        source      = "농림축산식품부",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/search/search.do?query=저소득층양곡지원",
        income_max  = IR.VERY_LOW,
        required_situations = [LS.LIVING_COST],
        required_docs = [DocumentType.ID_COPY],
        authority   = "읍·면·동 주민센터",
        phone       = "129",
        online_apply= False,
        tags=["양곡", "쌀", "식량지원", "수급자", "식비"],
    ),

    # ════════════════════════════════════════════════════════════
    # 청년 특화 (35~39)
    # ════════════════════════════════════════════════════════════

    # ── 35. 청년도약계좌 ─────────────────────────────────────
    PolicyNode(
        policy_id   = "YOUTH_001",
        name        = "청년도약계좌",
        description = "청년이 매월 40~70만 원 저축 시 정부가 최대 6% 기여금 지원 (5년 만기 약 5,000만 원)",
        source      = "금융위원회",
        apply_url   = "https://www.kinfa.or.kr/product/youthJumpAccount.do",
        age_min     = 19,
        age_max     = 34,
        income_max  = IR.MIDDLE,
        required_situations = [LS.LIVING_COST],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.INCOME_CERT,
        ],
        authority   = "시중 은행 (온라인 신청)",
        phone       = "1397",
        online_apply= True,
        tags=["청년도약계좌", "청년", "저축", "정부지원", "목돈"],
    ),

    # ── 36. 청년내일저축계좌 ─────────────────────────────────
    PolicyNode(
        policy_id   = "YOUTH_002",
        name        = "청년내일저축계좌",
        description = "저소득 청년이 월 10만 원 저축 시 정부가 월 10~30만 원 추가 적립 (3년)",
        source      = "보건복지부",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/search/search.do?query=청년내일저축계좌",
        age_min     = 19,
        age_max     = 34,
        income_max  = IR.MIDDLE_LOW,
        required_situations = [LS.LIVING_COST, LS.JOB],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.INCOME_CERT,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "129",
        online_apply= True,
        tags=["청년내일저축", "청년", "자산형성", "저소득", "저축"],
    ),

    # ── 37. 서울 희망두배 청년통장 ───────────────────────────
    PolicyNode(
        policy_id   = "SEOUL_003",
        name        = "서울 희망두배 청년통장",
        description = "서울 거주 저소득 청년이 2년간 저축 시 시에서 1:1 매칭 지원 (최대 720만 원)",
        source      = "서울시",
        apply_url   = "https://account.welfare.seoul.kr/web/contents/youthBank.lp",
        age_min     = 18,
        age_max     = 34,
        income_max  = IR.MIDDLE_LOW,
        regions     = ["서울특별시"],
        required_situations = [LS.LIVING_COST],
        required_work       = [WS.EMPLOYED, WS.SELF_EMPLOYED, WS.FREELANCE],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.INCOME_CERT,
        ],
        authority   = "서울시 온라인 신청",
        phone       = "120",
        online_apply= True,
        tags=["서울", "청년통장", "자산형성", "희망두배", "저소득청년"],
    ),

    # ── 38. 경기도 청년 면접수당 ─────────────────────────────
    PolicyNode(
        policy_id   = "GYEONGGI_003",
        name        = "경기도 청년 면접수당",
        description = "경기도 거주 청년 구직자에게 면접 1회당 5만 원, 연 최대 3회 지급",
        source      = "경기도",
        apply_url   = "https://www.jobaba.net/fntn/dtl.do?trnsprtNo=33",
        age_min     = 18,
        age_max     = 39,
        regions     = ["경기도"],
        required_situations = [LS.JOB],
        required_work       = [WS.JOB_SEEKING, WS.UNEMPLOYED],
        required_docs = [DocumentType.ID_COPY],
        authority   = "경기도 온라인 신청",
        phone       = "031-120",
        online_apply= True,
        tags=["경기도", "청년", "면접수당", "구직", "취업지원"],
    ),

    # ── 39. 청년 주거급여 분리지급 ───────────────────────────
    PolicyNode(
        policy_id   = "YOUTH_003",
        name        = "청년 주거급여 분리지급",
        description = "주거급여 수급 가구의 청년 자녀(19~30세)가 부모와 별거 시 주거급여 별도 수령 가능",
        source      = "국토교통부",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/search/search.do?query=청년도약계좌",
        age_min     = 19,
        age_max     = 30,
        income_max  = IR.LOW,
        required_situations = [LS.HOUSING, LS.LIVING_COST],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.LEASE_CONTRACT,
            DocumentType.INCOME_CERT,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "1600-0777",
        online_apply= True,
        tags=["청년", "주거급여", "분리지급", "월세", "독립청년"],
    ),

    # ════════════════════════════════════════════════════════════
    # 노인 특화 (40~43)
    # ════════════════════════════════════════════════════════════

    # ── 40. 노인 무료급식 ────────────────────────────────────
    PolicyNode(
        policy_id   = "SENIOR_001",
        name        = "노인 무료급식 지원",
        description = "거동 불편하거나 저소득 독거 어르신에게 경로식당 무료 급식 또는 도시락 배달",
        source      = "복지로",
        apply_url   = "https://www.mohw.go.kr/menu.es?mid=a10712020000",
        age_min     = 60,
        income_max  = IR.LOW,
        required_situations = [LS.LIVING_COST],
        required_family     = [FS.SINGLE],
        required_docs = [DocumentType.ID_COPY],
        authority   = "읍·면·동 주민센터 또는 노인복지관",
        phone       = "129",
        online_apply= False,
        tags=["노인급식", "무료급식", "도시락", "독거노인", "어르신"],
    ),

    # ── 41. 노인 틀니·임플란트 지원 ─────────────────────────
    PolicyNode(
        policy_id   = "SENIOR_002",
        name        = "노인 틀니·임플란트 건강보험 지원",
        description = "만 65세 이상 건강보험 가입자에게 틀니·임플란트 본인부담 30%로 축소 지원",
        source      = "건강보험공단",
        apply_url   = "https://www.nhis.or.kr/nhis/policy/wbhace01900m01.do",
        age_min     = 65,
        required_situations = [LS.MEDICAL],
        required_docs = [DocumentType.ID_COPY],
        authority   = "치과 의료기관",
        phone       = "1577-1000",
        online_apply= False,
        tags=["틀니", "임플란트", "노인치과", "65세", "의료비"],
    ),

    # ── 42. 치매 치료관리비 지원 ─────────────────────────────
    PolicyNode(
        policy_id   = "SENIOR_003",
        name        = "치매 치료관리비 지원",
        description = "치매 진단 어르신에게 월 최대 3만 원 치료비 지원 (저소득 우선)",
        source      = "복지로",
        apply_url   = "https://www.nid.or.kr/info/diction_online1.aspx",
        age_min     = 60,
        income_max  = IR.MIDDLE_LOW,
        required_situations = [LS.MEDICAL, LS.CARE],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.MEDICAL_CERT,
        ],
        authority   = "치매안심센터",
        phone       = "치매상담콜 1899-9988",
        online_apply= False,
        tags=["치매", "치매치료비", "노인", "치매안심센터"],
    ),

    # ── 43. 독거노인 생활관리사 ──────────────────────────────
    PolicyNode(
        policy_id   = "SENIOR_004",
        name        = "독거노인 생활관리사 파견",
        description = "홀로 사는 어르신 가정에 생활관리사가 정기 방문, 안전·건강 확인 및 말벗 서비스",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004572",
        age_min     = 65,
        required_situations = [LS.CARE, LS.LIVING_COST],
        required_family     = [FS.SINGLE],
        required_docs = [DocumentType.ID_COPY],
        authority   = "읍·면·동 주민센터",
        phone       = "129",
        online_apply= False,
        tags=["독거노인", "생활관리사", "방문서비스", "안전확인", "어르신"],
    ),

    # ════════════════════════════════════════════════════════════
    # 장애인 특화 (44~46)
    # ════════════════════════════════════════════════════════════

    # ── 44. 장애아동 재활치료 ────────────────────────────────
    PolicyNode(
        policy_id   = "DISABLED_001",
        name        = "장애아동 재활치료 서비스 (발달재활서비스)",
        description = "만 18세 미만 발달장애 아동에게 언어·인지·행동 재활치료 바우처 지원",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00003124",
        age_max     = 18,
        income_max  = IR.MIDDLE,
        required_situations = [LS.DISABILITY, LS.EDUCATION],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.DISABILITY_CERT,
            DocumentType.INCOME_CERT,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "129",
        online_apply= True,
        tags=["장애아동", "재활치료", "발달장애", "언어치료", "바우처"],
    ),

    # ── 45. 발달장애인 주간활동 서비스 ──────────────────────
    PolicyNode(
        policy_id   = "DISABLED_002",
        name        = "발달장애인 주간활동 서비스",
        description = "성인 발달장애인에게 낮 시간 활동 지원 서비스 제공 (월 100~125시간)",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/search/search.do?query=노인맞춤돌봄서비스",
        age_min     = 18,
        required_situations = [LS.DISABILITY, LS.CARE],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.DISABILITY_CERT,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "129",
        online_apply= True,
        tags=["발달장애", "주간활동", "성인장애인", "돌봄"],
    ),

    # ── 46. 장애인 보조기기 지원 ─────────────────────────────
    PolicyNode(
        policy_id   = "DISABLED_003",
        name        = "장애인 보조기기 지원",
        description = "등록 장애인에게 휠체어·보청기·의수족 등 보조기기 구입비 최대 100% 지원",
        source      = "건강보험공단",
        apply_url   = "https://www.nhis.or.kr/nhis/policy/wbhace02100m01.do",
        required_situations = [LS.DISABILITY, LS.MEDICAL],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.DISABILITY_CERT,
        ],
        authority   = "국민건강보험공단",
        phone       = "1577-1000",
        online_apply= True,
        tags=["보조기기", "휠체어", "보청기", "장애인", "지원"],
    ),

    # ════════════════════════════════════════════════════════════
    # 주거 · 생활 (47~50)
    # ════════════════════════════════════════════════════════════

    # ── 47. 가사간병 방문서비스 ──────────────────────────────
    PolicyNode(
        policy_id   = "CARE_001",
        name        = "가사간병 방문서비스",
        description = "거동 불편 저소득 가구에 가사·간병 도우미 파견 (월 24~40시간, 무료~소액)",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00009830",
        income_max  = IR.MIDDLE_LOW,
        required_situations = [LS.CARE, LS.DISABILITY, LS.MEDICAL],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.INCOME_CERT,
        ],
        authority   = "읍·면·동 주민센터",
        phone       = "129",
        online_apply= True,
        tags=["가사도우미", "간병", "방문서비스", "돌봄", "저소득"],
    ),

    # ── 48. 주거 취약계층 지원 (고시원·쪽방) ─────────────────
    PolicyNode(
        policy_id   = "HOUSING_001",
        name        = "주거 취약계층 주거지원 (LH임대주택)",
        description = "고시원·쪽방 등 비주택 거주자에게 LH 공공임대주택 우선 입주 지원",
        source      = "국토교통부",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/search/search.do?query=주거취약계층주거지원",
        income_max  = IR.LOW,
        required_situations = [LS.HOUSING, LS.LIVING_COST],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.INCOME_CERT,
        ],
        authority   = "LH 콜센터 또는 읍·면·동 주민센터",
        phone       = "1600-1004",
        online_apply= True,
        tags=["공공임대", "LH", "쪽방", "고시원", "주거취약"],
    ),

    # ── 49. 정신건강 지원서비스 ──────────────────────────────
    PolicyNode(
        policy_id   = "MENTAL_001",
        name        = "정신건강 위기상담 및 치료지원",
        description = "우울·불안·자살위기 등 정신건강 문제에 무료 상담·치료비 지원",
        source      = "보건복지부",
        apply_url   = "https://www.gmhc.or.kr",
        income_max  = IR.MIDDLE_LOW,
        required_situations = [LS.MEDICAL, LS.CRISIS],
        required_docs = [DocumentType.ID_COPY],
        authority   = "정신건강복지센터 (지역 내)",
        phone       = "정신건강위기상담전화 1577-0199",
        online_apply= False,
        tags=["정신건강", "우울", "불안", "상담", "자살예방"],
    ),

    # ── 50. 자활급여 (자활근로) ──────────────────────────────
    PolicyNode(
        policy_id   = "WORK_001",
        name        = "자활급여 (자활근로 프로그램)",
        description = "근로능력 있는 기초수급자·차상위계층에게 자활근로 일자리 및 창업 지원",
        source      = "복지로",
        apply_url   = "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004563",
        income_max  = IR.LOW,
        required_situations = [LS.JOB, LS.LIVING_COST],
        required_work       = [WS.UNEMPLOYED, WS.JOB_SEEKING],
        required_docs = [
            DocumentType.ID_COPY,
            DocumentType.INCOME_CERT,
        ],
        authority   = "읍·면·동 주민센터 또는 지역자활센터",
        phone       = "129",
        online_apply= False,
        tags=["자활", "자활근로", "수급자", "일자리", "창업지원"],
    ),
]


def get_all_policies() -> list[PolicyNode]:
    return POLICIES


def get_policy_by_id(policy_id: str) -> PolicyNode | None:
    return next((p for p in POLICIES if p.policy_id == policy_id), None)


def get_policies_by_tag(tag: str) -> list[PolicyNode]:
    """태그로 정책 검색."""
    return [p for p in POLICIES if tag in (p.tags or [])]


def get_policies_by_category(category: str) -> list[PolicyNode]:
    """카테고리별 정책 반환."""
    category_map = {
        "다문화·외국인": ["MULTI_001","MULTI_002","MULTI_003","MULTI_004","MULTI_005"],
        "임신·출산·영유아": ["CHILD_001","CHILD_002","CHILD_003","CHILD_004","CHILD_005"],
        "청년": ["YOUTH_001","YOUTH_002","YOUTH_003","SEOUL_003","GYEONGGI_003","MOEL_001","SEOUL_001"],
        "노인": ["SENIOR_001","SENIOR_002","SENIOR_003","SENIOR_004","BOKJIRO_005","BOKJIRO_010","NHIS_001"],
        "장애인": ["DISABLED_001","DISABLED_002","DISABLED_003","BOKJIRO_006","BOKJIRO_007"],
        "주거": ["HOUSING_001","YOUTH_003","BOKJIRO_004","SEOUL_001"],
        "긴급·위기": ["BOKJIRO_002","SEOUL_002","GYEONGGI_002","MULTI_005","MENTAL_001"],
    }
    ids = category_map.get(category, [])
    return [p for p in POLICIES if p.policy_id in ids]
