/* 아테나 — 백엔드 한국어 데이터 번역 매핑
   policy_id 기반 정책명·설명, 서류·기관·태그·링크 전체 번역
*/

/* ═══════════════════════════════════════════
   1. 정책 번역 (policy_id → {name, description})
═══════════════════════════════════════════ */
const POLICY_TR = {

  en: {
    BOKJIRO_001: {
      name: "National Basic Livelihood Security",
      desc: "Provides livelihood, medical, housing, and education benefits to households below the minimum income/asset standard"
    },
    BOKJIRO_002: {
      name: "Emergency Welfare Support",
      desc: "Immediate assistance for households unable to maintain basic living due to a sudden crisis"
    },
    BOKJIRO_003: {
      name: "Medical Benefits (의료급여)",
      desc: "Significantly reduces out-of-pocket medical expenses for low-income households"
    },
    BOKJIRO_004: {
      name: "Housing Benefit (Rent/Repair)",
      desc: "Covers monthly or deposit rent, or home repair costs, for low-income households"
    },
    BOKJIRO_005: {
      name: "Basic Pension (Elderly)",
      desc: "Monthly pension for seniors aged 65+ in the lowest 70% income bracket"
    },
    BOKJIRO_006: {
      name: "Disability Activity Support",
      desc: "Provides activity assistance, home bathing, and home nursing for people with disabilities who cannot live independently"
    },
    BOKJIRO_007: {
      name: "Disability Pension",
      desc: "Monthly pension to support the livelihoods of severely disabled individuals"
    },
    BOKJIRO_008: {
      name: "Single-Parent Family Support",
      desc: "Child-rearing expenses, school supply costs, and living subsidies for single-parent households"
    },
    BOKJIRO_009: {
      name: "Child Care Voucher (i-Care Service)",
      desc: "Connects and supports childcare workers for households with children aged 12 and under"
    },
    MOEL_001: {
      name: "Youth Employment Support (National Employment Support Program)",
      desc: "Job-seeking allowance and employment services for youth facing employment difficulties"
    },
    MOGEF_001: {
      name: "Career-Interrupted Women's Employment Support (Saeil Center)",
      desc: "Re-employment training and placement for women whose careers were interrupted by pregnancy, childbirth, or childcare"
    },
    MOEL_002: {
      name: "Middle-Aged Employment Support (Senior WorkNet)",
      desc: "Re-employment and career transition support services for people aged 40 and over"
    },
    MSS_001: {
      name: "Small Business Stabilization Fund",
      desc: "Low-interest operating and facility funds for small business owners facing a management crisis"
    },
    MOEL_003: {
      name: "Unemployment Benefits (Job-Seeker Allowance)",
      desc: "Benefits to stabilize livelihoods during the job-seeking period after involuntary unemployment"
    },
    BOKJIRO_010: {
      name: "Senior Jobs & Social Activity Support",
      desc: "Public-service and social-service jobs provided for seniors aged 60 and over"
    },
    NHIS_001: {
      name: "Long-Term Care Insurance for the Elderly",
      desc: "Care services for seniors who cannot live independently due to dementia, stroke, etc."
    },
    SEOUL_001: {
      name: "Seoul Youth Rent Support",
      desc: "Monthly rent subsidy of ₩200,000 (up to 12 months) for young single-person households in Seoul aged 19–39"
    },
    SEOUL_002: {
      name: "Seoul Emergency Welfare Support",
      desc: "Emergency livelihood, medical, and housing support for crisis households in Seoul (more lenient than national standards)"
    },
    GYEONGGI_001: {
      name: "Gyeonggi Youth Basic Income",
      desc: "Quarterly ₩250,000 local currency (₩1,000,000/year) for Gyeonggi residents aged exactly 24"
    },
    GYEONGGI_002: {
      name: "Gyeonggi Emergency Welfare Support",
      desc: "Emergency livelihood, medical, and housing support for crisis households in Gyeonggi Province"
    },
  },

  zh: {
    BOKJIRO_001: {
      name: "国民基础生活保障",
      desc: "对收入·资产低于最低标准的家庭提供生计·医疗·住房·教育补贴"
    },
    BOKJIRO_002: {
      name: "紧急福利支援",
      desc: "对因突发危机无法维持基本生活的家庭提供即时援助"
    },
    BOKJIRO_003: {
      name: "医疗补贴",
      desc: "大幅降低低收入群体的医疗自付费用"
    },
    BOKJIRO_004: {
      name: "住房补贴（租赁·修缮）",
      desc: "支援低收入家庭的月租·押金或住宅修缮费用"
    },
    BOKJIRO_005: {
      name: "基础养老金（老年人）",
      desc: "对收入最低70%的65岁以上老年人每月发放养老金"
    },
    BOKJIRO_006: {
      name: "残障人士活动支援",
      desc: "为独立生活困难的残障人士提供活动辅助、上门沐浴、上门护理"
    },
    BOKJIRO_007: {
      name: "残障人士养老金",
      desc: "为重度残障人士的生活稳定每月发放养老金"
    },
    BOKJIRO_008: {
      name: "单亲家庭支援",
      desc: "为单亲家庭提供育儿费、学用品费、生活补助金"
    },
    BOKJIRO_009: {
      name: "儿童看护券（儿童看护服务）",
      desc: "为12岁以下儿童家庭提供儿童看护员服务"
    },
    MOEL_001: {
      name: "青年就业支援金（国民就业支援制度）",
      desc: "为就业困难青年提供求职活动支援金及就业服务"
    },
    MOGEF_001: {
      name: "职业中断女性就业支援（Saeil中心）",
      desc: "为因妊娠·生育·育儿等导致职业中断的女性提供再就业培训及介绍"
    },
    MOEL_002: {
      name: "中年就业支援（中年WorkNet）",
      desc: "为40岁以上中年群体提供再就业·转职支援服务"
    },
    MSS_001: {
      name: "小微企业经营稳定资金",
      desc: "为陷入经营危机的小微企业主提供低息运营资金·设施资金"
    },
    MOEL_003: {
      name: "失业救济金（求职补贴）",
      desc: "非自愿失业后，在求职期间发放生活稳定补贴"
    },
    BOKJIRO_010: {
      name: "老年人就业及社会活动支援",
      desc: "为60岁以上老年人提供公益活动·社会服务型岗位"
    },
    NHIS_001: {
      name: "老年长期护理保险",
      desc: "为因痴呆·中风等无法独立生活的老年人提供护理服务"
    },
    SEOUL_001: {
      name: "首尔市青年月租支援",
      desc: "对首尔市居住的19~39岁青年单人家庭最多12个月每月补贴20万韩元月租"
    },
    SEOUL_002: {
      name: "首尔型紧急福利支援",
      desc: "对首尔居住的危机家庭提供生计·医疗·住房紧急支援（比中央标准更宽松）"
    },
    GYEONGGI_001: {
      name: "京畿道青年基本收入",
      desc: "对满24岁的京畿道居民每季度发放25万韩元（年100万韩元）地区货币"
    },
    GYEONGGI_002: {
      name: "京畿道紧急福利支援",
      desc: "对京畿道居住的危机家庭提供生计·医疗·住房紧急支援"
    },
  },

  ja: {
    BOKJIRO_001: {
      name: "国民基礎生活保障",
      desc: "所得・財産が最低基準以下の世帯に生計・医療・住居・教育給付を支援"
    },
    BOKJIRO_002: {
      name: "緊急福祉支援",
      desc: "突然の危機により基本生活が困難な世帯に即時支援"
    },
    BOKJIRO_003: {
      name: "医療給付",
      desc: "低所得層の医療費自己負担を大幅に軽減する医療支援"
    },
    BOKJIRO_004: {
      name: "住居給付（賃貸・修繕）",
      desc: "低所得世帯の月額家賃・敷金支援または住宅修繕支援"
    },
    BOKJIRO_005: {
      name: "基礎年金（高齢者）",
      desc: "所得下位70%の65歳以上の高齢者に毎月年金を支給"
    },
    BOKJIRO_006: {
      name: "障害者活動支援",
      desc: "一人で日常生活が困難な障害者に活動補助・訪問入浴・訪問看護を提供"
    },
    BOKJIRO_007: {
      name: "障害年金",
      desc: "重度障害者の生活安定のために毎月年金を支給"
    },
    BOKJIRO_008: {
      name: "ひとり親家族支援",
      desc: "ひとり親家庭に子育て費・学用品費・生活補助金を支援"
    },
    BOKJIRO_009: {
      name: "児童ケアバウチャー（育児サービス）",
      desc: "12歳以下の子どもがいる家庭に育児士を連携・支援"
    },
    MOEL_001: {
      name: "青年就職支援金（国民就職支援制度）",
      desc: "就職が困難な青年に求職活動支援金と就業サービスを提供"
    },
    MOGEF_001: {
      name: "キャリア断絶女性就職支援（セイルセンター）",
      desc: "妊娠・出産・育児等でキャリアが断絶した女性の再就職訓練・あっせん"
    },
    MOEL_002: {
      name: "中高年就職支援（シニアWorkNet）",
      desc: "40歳以上の中高年の再就職・転職支援サービス"
    },
    MSS_001: {
      name: "小規模事業者経営安定資金",
      desc: "経営危機に陥った小規模事業者への低金利運転資金・設備資金支援"
    },
    MOEL_003: {
      name: "失業給付（求職者給付）",
      desc: "非自発的な失職後、求職活動期間中の生活安定のために給付"
    },
    BOKJIRO_010: {
      name: "高齢者雇用・社会活動支援",
      desc: "60歳以上の高齢者に公益活動・社会サービス型の就労機会を提供"
    },
    NHIS_001: {
      name: "高齢者長期療養保険",
      desc: "認知症・脳卒中等で一人では日常生活が困難な高齢者に療養サービスを提供"
    },
    SEOUL_001: {
      name: "ソウル市青年家賃支援",
      desc: "ソウル居住の19〜39歳一人暮らし青年に月20万ウォンを最大12ヶ月支援"
    },
    SEOUL_002: {
      name: "ソウル型緊急福祉支援",
      desc: "ソウル居住の危機世帯に生計・医療・住居緊急支援（中央基準より緩和）"
    },
    GYEONGGI_001: {
      name: "京畿道青年基本所得",
      desc: "満24歳の京畿道居住者に四半期ごとに25万ウォン（年100万ウォン）の地域通貨を支給"
    },
    GYEONGGI_002: {
      name: "京畿道緊急福祉支援",
      desc: "京畿道居住の危機世帯に生計・医療・住居緊急支援"
    },
  },

  vi: {
    BOKJIRO_001: {
      name: "Bảo đảm sinh kế cơ bản quốc gia",
      desc: "Hỗ trợ sinh kế, y tế, nhà ở, giáo dục cho hộ gia đình có thu nhập/tài sản dưới mức tối thiểu"
    },
    BOKJIRO_002: {
      name: "Hỗ trợ phúc lợi khẩn cấp",
      desc: "Hỗ trợ ngay lập tức cho hộ gia đình không thể duy trì cuộc sống do khủng hoảng đột ngột"
    },
    BOKJIRO_003: {
      name: "Trợ cấp y tế",
      desc: "Giảm đáng kể chi phí y tế tự trả cho hộ gia đình thu nhập thấp"
    },
    BOKJIRO_004: {
      name: "Trợ cấp nhà ở (thuê nhà/sửa chữa)",
      desc: "Hỗ trợ tiền thuê nhà hàng tháng hoặc chi phí sửa chữa nhà cho hộ gia đình thu nhập thấp"
    },
    BOKJIRO_005: {
      name: "Lương hưu cơ bản (người cao tuổi)",
      desc: "Lương hưu hàng tháng cho người từ 65 tuổi trở lên thuộc 70% thu nhập thấp nhất"
    },
    BOKJIRO_006: {
      name: "Hỗ trợ hoạt động cho người khuyết tật",
      desc: "Cung cấp hỗ trợ hoạt động, tắm tại nhà, điều dưỡng tại nhà cho người khuyết tật không thể sống độc lập"
    },
    BOKJIRO_007: {
      name: "Lương hưu người khuyết tật",
      desc: "Lương hưu hàng tháng để hỗ trợ cuộc sống cho người khuyết tật nặng"
    },
    BOKJIRO_008: {
      name: "Hỗ trợ gia đình đơn thân",
      desc: "Chi phí nuôi con, dụng cụ học tập, trợ cấp sinh hoạt cho hộ gia đình đơn thân"
    },
    BOKJIRO_009: {
      name: "Phiếu chăm sóc trẻ em (dịch vụ i-Care)",
      desc: "Kết nối và hỗ trợ người trông trẻ cho gia đình có trẻ em từ 12 tuổi trở xuống"
    },
    MOEL_001: {
      name: "Hỗ trợ việc làm thanh niên (Chương trình hỗ trợ tìm việc quốc gia)",
      desc: "Trợ cấp tìm kiếm việc làm và dịch vụ tuyển dụng cho thanh niên gặp khó khăn về việc làm"
    },
    MOGEF_001: {
      name: "Hỗ trợ việc làm phụ nữ gián đoạn sự nghiệp (Trung tâm Saeil)",
      desc: "Đào tạo và giới thiệu việc làm cho phụ nữ bị gián đoạn sự nghiệp do thai sản, sinh đẻ, nuôi con"
    },
    MOEL_002: {
      name: "Hỗ trợ việc làm trung niên (WorkNet trung niên)",
      desc: "Dịch vụ hỗ trợ tái tuyển dụng và chuyển đổi nghề nghiệp cho người từ 40 tuổi trở lên"
    },
    MSS_001: {
      name: "Quỹ ổn định kinh doanh tiểu thương",
      desc: "Vốn vận hành và vốn cơ sở lãi suất thấp cho chủ doanh nghiệp nhỏ đang gặp khủng hoảng"
    },
    MOEL_003: {
      name: "Trợ cấp thất nghiệp",
      desc: "Trợ cấp ổn định cuộc sống trong thời gian tìm kiếm việc làm sau khi mất việc không tự nguyện"
    },
    BOKJIRO_010: {
      name: "Hỗ trợ việc làm và hoạt động xã hội cho người cao tuổi",
      desc: "Cung cấp việc làm hoạt động công ích và dịch vụ xã hội cho người từ 60 tuổi trở lên"
    },
    NHIS_001: {
      name: "Bảo hiểm chăm sóc dài hạn cho người cao tuổi",
      desc: "Dịch vụ chăm sóc cho người cao tuổi không thể sống độc lập do sa sút trí tuệ, đột quỵ, v.v."
    },
    SEOUL_001: {
      name: "Hỗ trợ tiền thuê nhà thanh niên Seoul",
      desc: "Trợ cấp 200.000₩/tháng (tối đa 12 tháng) cho thanh niên 19–39 tuổi sống một mình tại Seoul"
    },
    SEOUL_002: {
      name: "Hỗ trợ phúc lợi khẩn cấp Seoul",
      desc: "Hỗ trợ khẩn cấp sinh kế, y tế, nhà ở cho hộ gia đình khủng hoảng tại Seoul (tiêu chuẩn thoáng hơn trung ương)"
    },
    GYEONGGI_001: {
      name: "Thu nhập cơ bản thanh niên tỉnh Gyeonggi",
      desc: "Cấp tiền địa phương 250.000₩/quý (1.000.000₩/năm) cho cư dân tỉnh Gyeonggi đúng 24 tuổi"
    },
    GYEONGGI_002: {
      name: "Hỗ trợ phúc lợi khẩn cấp tỉnh Gyeonggi",
      desc: "Hỗ trợ khẩn cấp sinh kế, y tế, nhà ở cho hộ gia đình khủng hoảng tại tỉnh Gyeonggi"
    },
  },

  th: {
    BOKJIRO_001: {
      name: "หลักประกันการดำรงชีพขั้นพื้นฐานแห่งชาติ",
      desc: "สนับสนุนการดำรงชีพ การรักษาพยาบาล ที่อยู่อาศัย และการศึกษาแก่ครัวเรือนที่มีรายได้/ทรัพย์สินต่ำกว่ามาตรฐาน"
    },
    BOKJIRO_002: {
      name: "การสนับสนุนสวัสดิการฉุกเฉิน",
      desc: "ความช่วยเหลือทันทีแก่ครัวเรือนที่ไม่สามารถดำรงชีวิตพื้นฐานได้เนื่องจากวิกฤตเฉียบพลัน"
    },
    BOKJIRO_003: {
      name: "สวัสดิการทางการแพทย์",
      desc: "ลดค่าใช้จ่ายทางการแพทย์ที่ต้องชำระเองอย่างมากสำหรับครัวเรือนรายได้น้อย"
    },
    BOKJIRO_004: {
      name: "สวัสดิการที่อยู่อาศัย (เช่า/ซ่อมแซม)",
      desc: "สนับสนุนค่าเช่ารายเดือน/เงินมัดจำ หรือค่าซ่อมแซมบ้านแก่ครัวเรือนรายได้น้อย"
    },
    BOKJIRO_005: {
      name: "เบี้ยยังชีพผู้สูงอายุ",
      desc: "จ่ายเบี้ยยังชีพรายเดือนแก่ผู้สูงอายุ 65 ปีขึ้นไปที่อยู่ใน 70% รายได้ต่ำสุด"
    },
    BOKJIRO_006: {
      name: "การสนับสนุนกิจกรรมผู้พิการ",
      desc: "ให้ความช่วยเหลือกิจกรรม อาบน้ำที่บ้าน และพยาบาลที่บ้านแก่ผู้พิการที่ไม่สามารถใช้ชีวิตอิสระได้"
    },
    BOKJIRO_007: {
      name: "เบี้ยยังชีพผู้พิการ",
      desc: "จ่ายเบี้ยยังชีพรายเดือนเพื่อความมั่นคงในชีวิตของผู้พิการรุนแรง"
    },
    BOKJIRO_008: {
      name: "การสนับสนุนครอบครัวพ่อแม่เลี้ยงเดี่ยว",
      desc: "ค่าเลี้ยงดูบุตร ค่าอุปกรณ์การเรียน และเงินช่วยเหลือการดำรงชีพสำหรับครัวเรือนพ่อแม่เดี่ยว"
    },
    BOKJIRO_009: {
      name: "บัตรกำนัลดูแลเด็ก (บริการ i-Care)",
      desc: "เชื่อมต่อและสนับสนุนผู้ดูแลเด็กสำหรับครัวเรือนที่มีเด็กอายุ 12 ปีหรือน้อยกว่า"
    },
    MOEL_001: {
      name: "เงินสนับสนุนการจ้างงานเยาวชน (โครงการสนับสนุนการจ้างงานแห่งชาติ)",
      desc: "เงินอุดหนุนการหางานและบริการจ้างงานสำหรับเยาวชนที่มีความยากลำบากในการหางาน"
    },
    MOGEF_001: {
      name: "การสนับสนุนการจ้างงานสตรีที่หยุดอาชีพ (ศูนย์ Saeil)",
      desc: "การฝึกอบรมและจัดหางานใหม่สำหรับสตรีที่อาชีพหยุดชะงักเนื่องจากการตั้งครรภ์ คลอดบุตร หรือเลี้ยงดูบุตร"
    },
    MOEL_002: {
      name: "การสนับสนุนการจ้างงานวัยกลางคน (WorkNet วัยกลางคน)",
      desc: "บริการสนับสนุนการจ้างงานใหม่และเปลี่ยนอาชีพสำหรับผู้มีอายุ 40 ปีขึ้นไป"
    },
    MSS_001: {
      name: "กองทุนรักษาเสถียรภาพธุรกิจขนาดเล็ก",
      desc: "เงินทุนหมุนเวียนและเงินทุนสิ่งอำนวยความสะดวกดอกเบี้ยต่ำสำหรับเจ้าของธุรกิจขนาดเล็กที่กำลังประสบวิกฤต"
    },
    MOEL_003: {
      name: "สิทธิประโยชน์การว่างงาน",
      desc: "ผลประโยชน์เพื่อรักษาเสถียรภาพการดำรงชีวิตในช่วงหางานหลังจากการว่างงานโดยไม่ได้สมัครใจ"
    },
    BOKJIRO_010: {
      name: "การสนับสนุนงานและกิจกรรมทางสังคมสำหรับผู้สูงอายุ",
      desc: "จัดหางานกิจกรรมสาธารณประโยชน์และบริการสังคมสำหรับผู้สูงอายุ 60 ปีขึ้นไป"
    },
    NHIS_001: {
      name: "ประกันการดูแลระยะยาวสำหรับผู้สูงอายุ",
      desc: "บริการดูแลสำหรับผู้สูงอายุที่ไม่สามารถใช้ชีวิตอิสระได้เนื่องจากภาวะสมองเสื่อม โรคหลอดเลือดสมอง ฯลฯ"
    },
    SEOUL_001: {
      name: "การสนับสนุนค่าเช่าเยาวชนโซล",
      desc: "เงินอุดหนุนค่าเช่า 200,000 วอน/เดือน (สูงสุด 12 เดือน) สำหรับเยาวชนโสดอายุ 19–39 ปีในโซล"
    },
    SEOUL_002: {
      name: "การสนับสนุนสวัสดิการฉุกเฉินโซล",
      desc: "การสนับสนุนฉุกเฉินด้านการดำรงชีพ การรักษาพยาบาล และที่อยู่อาศัยสำหรับครัวเรือนวิกฤตในโซล (ผ่อนปรนกว่ามาตรฐานกลาง)"
    },
    GYEONGGI_001: {
      name: "รายได้พื้นฐานเยาวชนคยองกี",
      desc: "แจกสกุลเงินท้องถิ่น 250,000 วอน/ไตรมาส (1,000,000 วอน/ปี) แก่ผู้อยู่อาศัยในคยองกีที่อายุพอดี 24 ปี"
    },
    GYEONGGI_002: {
      name: "การสนับสนุนสวัสดิการฉุกเฉินคยองกี",
      desc: "การสนับสนุนฉุกเฉินด้านการดำรงชีพ การรักษาพยาบาล และที่อยู่อาศัยสำหรับครัวเรือนวิกฤตในจังหวัดคยองกี"
    },
  },

  km: {
    BOKJIRO_001: {
      name: "ការធានារ៉ាប់រងជីវភាពជាមូលដ្ឋានជាតិ",
      desc: "ផ្តល់ប្រាក់ឧបត្ថម្ភជីវភាព វេជ្ជសាស្ត្រ លំនៅឋាន និងការអប់រំដល់គ្រួសារដែលមានចំណូល/ទ្រព្យសម្បត្តិក្រោមមាត្រដ្ឋានអប្បបរមា"
    },
    BOKJIRO_002: {
      name: "ការគាំទ្រសុខុមាលភាពបន្ទាន់",
      desc: "ជំនួយភ្លាមៗដល់គ្រួសារដែលមិនអាចរក្សាជីវភាពបានដោយសារវិបត្តិភ្លាមៗ"
    },
    BOKJIRO_003: {
      name: "ប្រាក់ឧបត្ថម្ភវេជ្ជសាស្ត្រ",
      desc: "កាត់បន្ថយការចំណាយព្យាបាលផ្ទាល់ខ្លួនយ៉ាងខ្លាំងសម្រាប់គ្រួសារចំណូលទាប"
    },
    BOKJIRO_004: {
      name: "ប្រាក់ឧបត្ថម្ភលំនៅ (ជួល/ជួសជុល)",
      desc: "ជំនួយថ្លៃជួលប្រចាំខែ ឬថ្លៃជួសជុលផ្ទះសម្រាប់គ្រួសារចំណូលទាប"
    },
    BOKJIRO_005: {
      name: "សោធននិវត្តន៍មូលដ្ឋាន (ចំពោះអ្នកចាស់)",
      desc: "ប្រាក់សោធនប្រចាំខែដល់មនុស្សចាស់អាយុ 65 ឆ្នាំឡើងទៅដែលស្ថិតក្នុង 70% ចំណូលទាបបំផុត"
    },
    BOKJIRO_006: {
      name: "ការគាំទ្រសកម្មភាពពិការ",
      desc: "ផ្តល់ជំនួយសកម្មភាព ងូតទឹកនៅផ្ទះ ការិយាធ្លាគិលានុបដ្ឋាយិកានៅផ្ទះ ដល់ពិការជនដែលមិនអាចរស់នៅដោយឯករាជ្យ"
    },
    BOKJIRO_007: {
      name: "សោធនពិការ",
      desc: "ប្រាក់សោធនប្រចាំខែដើម្បីជំរុញស្ថិរភាពជីវភាពរស់នៅរបស់ពិការកម្រិតធ្ងន់"
    },
    BOKJIRO_008: {
      name: "ការគាំទ្រគ្រួសារឪពុក/ម្តាយតែម្នាក់",
      desc: "ថ្លៃចិញ្ចឹមកូន ថ្លៃសម្ភារៈសិក្សា និងប្រាក់ជំនួយជីវភាព ដល់គ្រួសារឪពុក/ម្តាយតែម្នាក់"
    },
    BOKJIRO_009: {
      name: "គូប៉ុងថែទាំកុមារ (សេវា i-Care)",
      desc: "ភ្ជាប់និងគាំទ្រអ្នកថែទាំកុមារ ដល់គ្រួសារដែលមានកូនអាយុ 12 ឆ្នាំ ឬក្រោម"
    },
    MOEL_001: {
      name: "ប្រាក់ឧបត្ថម្ភការងារយុវជន (កម្មវិធីគាំទ្រការងារជាតិ)",
      desc: "ប្រាក់ឧបត្ថម្ភការស្វែងរកការងារ និងសេវាការងារ ដល់យុវជនដែលមានការលំបាករកការងារ"
    },
    MOGEF_001: {
      name: "ការគាំទ្រការងារស្ត្រីដែលឈប់ពីមុខជំនាញ (មជ្ឈមណ្ឌល Saeil)",
      desc: "ការបណ្តុះបណ្តាលការងារឡើងវិញ និងការណែនាំ ដល់ស្ត្រីដែលបានឈប់ពីអាជីពដោយសារការមានផ្ទៃពោះ ការសម្រាល ឬការថែទាំកូន"
    },
    MOEL_002: {
      name: "ការគាំទ្រការងារអ្នកវ័យកណ្ដាល (WorkNet វ័យកណ្ដាល)",
      desc: "សេវាគាំទ្រការជ្រើសរើសការងារឡើងវិញ និងការផ្លាស់ប្តូរអាជីព ដល់អ្នកអាយុ 40 ឆ្នាំឡើងទៅ"
    },
    MSS_001: {
      name: "មូលនិធិស្ថិរភាពអាជីវកម្មខ្នាតតូច",
      desc: "ប្រាក់ដើម/ប្រាក់ស្ទុះ ការប្រាក់ទាប ដល់ម្ចាស់អាជីវកម្មខ្នាតតូចដែលកំពុងប្រឈមមុខវិបត្តិ"
    },
    MOEL_003: {
      name: "ប្រាក់ឧបត្ថម្ភការបាត់បង់ការងារ",
      desc: "ប្រាក់ឧបត្ថម្ភស្ថិរភាពជីវភាពក្នុងអំឡុងការស្វែងរកការងារ ក្រោយការបាត់បង់ការងារដោយអក្រឹត្យ"
    },
    BOKJIRO_010: {
      name: "ការគាំទ្រការងារ និងសកម្មភាពសង្គមសម្រាប់ចាស់ជរា",
      desc: "ដំណើរការការងារអត្ថប្រយោជន៍សាធារណៈ និងការងារប្រភេទសេវាសង្គម ដល់ចាស់ជរាអាយុ 60 ឆ្នាំឡើងទៅ"
    },
    NHIS_001: {
      name: "ធានារ៉ាប់រងការថែទាំរយៈពេលវែងសម្រាប់ចាស់ជរា",
      desc: "សេវាថែទាំ ដល់ចាស់ជរាដែលមិនអាចរស់នៅដោយឯករាជ្យ ដោយសារជំងឺវង្វេងស្មារតី ជំងឺដាច់សរសៃឈាមខួរក្បាល ជាដើម"
    },
    SEOUL_001: {
      name: "ការគាំទ្រថ្លៃជួលផ្ទះយុវជនទីក្រុងសេអ៊ូល",
      desc: "ប្រាក់ឧបត្ថម្ភ 200,000 វ/ខែ (អតិបរមា 12 ខែ) ដល់យុវជនដែលរស់នៅម្នាក់ឯង អាយុ 19-39 ឆ្នាំ នៅក្រុងសេអ៊ូល"
    },
    SEOUL_002: {
      name: "ការគាំទ្រសុខុមាលភាពបន្ទាន់ប្រភេទសេអ៊ូល",
      desc: "ជំនួយបន្ទាន់ជីវភាព វេជ្ជសាស្ត្រ លំនៅ ដល់គ្រួសារវិបត្តិនៅក្រុងសេអ៊ូល (ខ្ជិះជាងស្ដង់ដារជាតិ)"
    },
    GYEONGGI_001: {
      name: "ប្រាក់ចំណូលមូលដ្ឋានយុវជនខេត្តក្យុងគី",
      desc: "ផ្តល់រូបិយប័ណ្ណក្នុងស្រុក 250,000 វ/ត្រីមាស (1,000,000 វ/ឆ្នាំ) ដល់ប្រជាពលរដ្ឋខេត្តក្យុងគីដែលមានអាយុ 24 ឆ្នាំ"
    },
    GYEONGGI_002: {
      name: "ការគាំទ្រសុខុមាលភាពបន្ទាន់ខេត្តក្យុងគី",
      desc: "ជំនួយបន្ទាន់ជីវភាព វេជ្ជសាស្ត្រ លំនៅ ដល់គ្រួសារវិបត្តិក្នុងខេត្តក្យុងគី"
    },
  },
};


/* ═══════════════════════════════════════════
   2. 용어 번역 (서류·기관·태그·링크명)
═══════════════════════════════════════════ */
const TERM_TR = {
  en: {
    /* 서류 */
    "주민등록등본":         "Resident Registration Copy",
    "가족관계증명서":       "Family Relationship Certificate",
    "소득증명원":           "Income Certificate",
    "재산세 과세증명":      "Property Tax Certificate",
    "금융정보 제공동의서":  "Financial Info Consent Form",
    "장애인 등록증":        "Disability Registration Card",
    "진단서·의사소견서":    "Medical Certificate / Doctor's Opinion",
    "고용보험 이직확인서":  "Employment Insurance Separation Notice",
    "한부모가족 확인서":    "Single-Parent Family Certificate",
    "위기사유 확인서":      "Crisis Reason Verification",
    "임대차계약서":         "Lease Contract",
    "폐업사실증명원":       "Business Closure Certificate",
    "국가유공자 확인서":    "National Merit Certificate",
    /* 기관 */
    "읍·면·동 주민센터":                 "Community Service Center",
    "읍·면·동 주민센터 또는 시·군·구청": "Community Center or District Office",
    "읍·면·동 주민센터 또는 국민연금공단":"Community Center or NPS",
    "읍·면·동 주민센터 또는 노인복지관": "Community Center or Senior Center",
    "아이돌봄서비스 포털":              "i-Care Service Portal",
    "고용복지플러스센터":               "Employment Welfare Plus Center",
    "새일여성인력개발센터":             "Saeil Women's Employment Center",
    "소상공인진흥공단":                 "Small Enterprise Market Service",
    "국민건강보험공단":                 "National Health Insurance Service",
    "서울시 온라인 신청":               "Seoul City Online Application",
    "경기도 온라인 신청":               "Gyeonggi Province Online Application",
    /* 링크 서비스명 */
    "복지로 맞춤서비스 조회":   "Bokjiro Personalized Search",
    "복지로 맞춤서비스":        "Bokjiro Personalized Service",
    "보조금24":                 "Subsidy24",
    "정부24 복지서비스":        "Government24 Welfare",
    "보건복지부":               "Ministry of Health & Welfare",
    "고용노동부 고용서비스":    "Ministry of Employment & Labor",
    "국토교통부 주거복지":      "Ministry of Land & Housing Welfare",
    "교육부 교육급여":          "Ministry of Education Benefits",
    "중소벤처기업부":           "Ministry of SMEs & Startups",
    "정책브리핑(국정과제)":    "Policy Briefing",
    "서울복지포털(wis)":       "Seoul Welfare Portal",
    "서울시 복지재단":          "Seoul Welfare Foundation",
    "서울시 통합포털":          "Seoul City Portal",
    "경기도 복지포털":          "Gyeonggi Welfare Portal",
    "경기복지재단":             "Gyeonggi Welfare Foundation",
    "경기도 일자리재단":        "Gyeonggi Jobs Foundation",
    "여성가족부":               "Ministry of Gender Equality",
    "새일센터(경력단절여성 취업)": "Saeil Center (Career-Interrupted Women)",
    "한국여성인력개발원":       "Korean Women's Development Institute",
    "임신육아종합포털(아이사랑)": "Pregnancy & Childcare Portal",
    "한부모가족 지원(복지로)":  "Single-Parent Family Support",
    "서울 여성복지포털":        "Seoul Women's Welfare Portal",
    "경기 여성비전센터":        "Gyeonggi Women's Vision Center",
    "고용노동부(일자리·육아휴직)":"Ministry of Employment (Jobs & Parental Leave)",
    "국가보훈부":               "Ministry of Patriots & Veterans Affairs",
    "고용보험(육아휴직 신청)":  "Employment Insurance (Parental Leave)",
    "워크넷 중장년 취업":       "WorkNet Middle-Aged Employment",
    "한국장애인고용공단":       "Korea Employment Agency for Disabled",
    "국방부 병역명문가":        "Ministry of National Defense",
    "복지로(모의계산·조회)":    "Bokjiro (Simulation & Inquiry)",
    "국세청 홈택스(환급금)":    "Hometax Tax Refund",
    "정부24 미환급금":          "Government24 Unclaimed Refund",
    "건강보험공단(환급금)":     "Health Insurance Refund",
    "고용보험(미지급금)":       "Employment Insurance Unpaid Amount",
    "소상공인진흥공단":         "Small Enterprise Market Service",
    "금융결제원(휴면계좌)":     "Korea Financial Telecommunications (Dormant Accounts)",
    /* 태그 */
    "생계급여":"Living Allowance","의료급여":"Medical Benefit","주거급여":"Housing Benefit",
    "교육급여":"Education Benefit","수급자":"Benefit Recipient",
    "긴급":"Emergency","위기":"Crisis","즉시지원":"Immediate Support","생계":"Livelihood",
    "병원비":"Hospital Cost","의료비":"Medical Cost","치료비":"Treatment Cost",
    "월세":"Monthly Rent","전세":"Deposit Lease","임차료":"Rental Fee","주거비":"Housing Cost",
    "기초연금":"Basic Pension","노인":"Senior","어르신":"Elderly","연금":"Pension",
    "장애인":"Disability","활동보조":"Activity Assistance","돌봄":"Care","활동지원":"Activity Support",
    "장애인연금":"Disability Pension","중증장애":"Severe Disability",
    "한부모":"Single Parent","양육비":"Child Support","아동":"Children","편부":"Single Father","편모":"Single Mother",
    "아이돌봄":"Child Care","보육":"Childcare",
    "청년":"Youth","취업":"Employment","구직":"Job Search","지원금":"Subsidy",
    "경력단절":"Career Break","여성":"Women","재취업":"Re-employment","새일센터":"Saeil Center",
    "중장년":"Middle-Aged","40대":"40s","50대":"50s","워크넷":"WorkNet",
    "소상공인":"Small Business","자영업":"Self-Employment","폐업":"Business Closure","경영안정":"Business Stability",
    "실업급여":"Unemployment Benefit","구직급여":"Job-Seeker Allowance","실직":"Job Loss","해고":"Layoff",
    "노인일자리":"Senior Jobs","60세":"Age 60+","사회활동":"Social Activity",
    "장기요양":"Long-Term Care","치매":"Dementia","요양":"Care","노인돌봄":"Senior Care",
    "서울":"Seoul","1인가구":"Single Household",
    "경기도":"Gyeonggi","기본소득":"Basic Income","24세":"Age 24","지역화폐":"Local Currency",
    "복지":"Welfare",
    /* 조건 이유 */
    "우선 지원 대상입니다": "You are a priority support target",
    "성별을 선택하시면 정확한 해당 여부를 확인할 수 있습니다":
      "Selecting your gender will confirm exact eligibility",
  },

  zh: {
    "주민등록등본":"户籍证明","가족관계증명서":"家庭关系证明书","소득증명원":"收入证明",
    "재산세 과세증명":"财产税证明","금융정보 제공동의서":"金融信息提供同意书",
    "장애인 등록증":"残障登记证","진단서·의사소견서":"诊断书·医生意见书",
    "고용보험 이직확인서":"就业保险离职确认书","한부모가족 확인서":"单亲家庭确认书",
    "위기사유 확인서":"危机原因确认书","임대차계약서":"租赁合同",
    "폐업사실증명원":"停业证明书","국가유공자 확인서":"国家有功者证明",
    "읍·면·동 주민센터":"社区服务中心","읍·면·동 주민센터 또는 시·군·구청":"社区中心或区办",
    "읍·면·동 주민센터 또는 국민연금공단":"社区中心或国民年金公团",
    "읍·면·동 주민센터 또는 노인복지관":"社区中心或老人福利馆",
    "아이돌봄서비스 포털":"儿童看护服务门户","고용복지플러스센터":"就业福利中心",
    "새일여성인력개발센터":"Saeil女性人力开发中心","소상공인진흥공단":"小微企业振兴公团",
    "국민건강보험공단":"国民健康保险公团","서울시 온라인 신청":"首尔市网上申请",
    "경기도 온라인 신청":"京畿道网上申请",
    "복지로 맞춤서비스 조회":"福祉路个性化服务查询","복지로 맞춤서비스":"福祉路个性化服务",
    "보조금24":"补贴24","정부24 복지서비스":"政府24福利服务","보건복지부":"保健福祉部",
    "고용노동부 고용서비스":"雇佣劳动部","국토교통부 주거복지":"国土交通部住房福利",
    "교육부 교육급여":"教育部教育补贴","중소벤처기업부":"中小企业部",
    "정책브리핑(국정과제)":"政策简报","서울복지포털(wis)":"首尔福利门户",
    "서울시 복지재단":"首尔市福利财团","서울시 통합포털":"首尔市综合门户",
    "경기도 복지포털":"京畿道福利门户","경기복지재단":"京畿福利财团",
    "경기도 일자리재단":"京畿就业财团","여성가족부":"女性家族部",
    "새일센터(경력단절여성 취업)":"Saeil中心(职业中断女性)",
    "한국여성인력개발원":"韩国女性人力开发院","임신육아종합포털(아이사랑)":"妊娠育儿综合门户",
    "한부모가족 지원(복지로)":"单亲家庭支援","서울 여성복지포털":"首尔女性福利门户",
    "경기 여성비전센터":"京畿女性远景中心","고용노동부(일자리·육아휴직)":"雇佣劳动部(工作·育儿假)",
    "국가보훈부":"国家报勋部","고용보험(육아휴직 신청)":"就业保险(育儿假申请)",
    "워크넷 중장년 취업":"WorkNet中年就业","한국장애인고용공단":"韩国残障人就业公团",
    "국방부 병역명문가":"国防部","복지로(모의계산·조회)":"福祉路(模拟计算)",
    "국세청 홈택스(환급금)":"国税厅退款","정부24 미환급금":"政府24未退款",
    "건강보험공단(환급금)":"健康保险退款","고용보험(미지급금)":"就业保险未发款",
    "금융결제원(휴면계좌)":"金融结算院(休眠账户)",
    "생계급여":"生计补贴","의료급여":"医疗补贴","주거급여":"住房补贴","교육급여":"教育补贴",
    "긴급":"紧急","위기":"危机","생계":"生计","병원비":"医疗费","의료비":"医疗费",
    "월세":"月租","전세":"押金租赁","기초연금":"基础养老金","노인":"老人","어르신":"老人",
    "연금":"养老金","장애인":"残障人士","돌봄":"照护","청년":"青年","취업":"就业",
    "경력단절":"职业中断","여성":"女性","재취업":"再就业","중장년":"中年",
    "소상공인":"小微企业","실업급여":"失业救济","장기요양":"长期护理","치매":"痴呆",
    "서울":"首尔","경기도":"京畿道","기본소득":"基本收入","지역화폐":"地区货币",
  },

  ja: {
    "주민등록등본":"住民登録謄本","가족관계증명서":"家族関係証明書","소득증명원":"所得証明書",
    "재산세 과세증명":"固定資産税課税証明","금융정보 제공동의서":"金融情報提供同意書",
    "장애인 등록증":"障害者登録証","진단서·의사소견서":"診断書·医師意見書",
    "고용보험 이직확인서":"雇用保険離職確認書","한부모가족 확인서":"ひとり親家族確認書",
    "위기사유 확인서":"危機事由確認書","임대차계약서":"賃貸借契約書",
    "폐업사실증명원":"廃業事実証明書","국가유공자 확인서":"国家有功者確認書",
    "읍·면·동 주민센터":"行政サービスセンター","읍·면·동 주민센터 또는 시·군·구청":"行政センターまたは区役所",
    "읍·면·동 주민센터 또는 국민연금공단":"行政センターまたは国民年金公団",
    "읍·면·동 주민센터 또는 노인복지관":"行政センターまたは老人福祉館",
    "아이돌봄서비스 포털":"育児サービスポータル","고용복지플러스센터":"雇用福祉プラスセンター",
    "새일여성인력개발센터":"セイル女性人材開発センター","소상공인진흥공단":"小規模事業者振興公団",
    "국민건강보험공단":"国民健康保険公団","서울시 온라인 신청":"ソウル市オンライン申請",
    "경기도 온라인 신청":"京畿道オンライン申請",
    "복지로 맞춤서비스 조회":"福祉ロ맞춤검색","복지로 맞춤서비스":"福祉ロサービス",
    "보조금24":"補助金24","정부24 복지서비스":"政府24福祉サービス","보건복지부":"保健福祉部",
    "고용노동부 고용서비스":"雇用労働部","국토교통부 주거복지":"国土交通部住居福祉",
    "교육부 교육급여":"教育部教育給付","중소벤처기업부":"中小ベンチャー企業部",
    "정책브리핑(국정과제)":"政策ブリーフィング","서울복지포털(wis)":"ソウル福祉ポータル",
    "서울시 복지재단":"ソウル市福祉財団","서울시 통합포털":"ソウル市統合ポータル",
    "경기도 복지포털":"京畿道福祉ポータル","경기복지재단":"京畿福祉財団",
    "경기도 일자리재단":"京畿道雇用財団","여성가족부":"女性家族部",
    "새일센터(경력단절여성 취업)":"セイルセンター(キャリア断絶女性)",
    "한국여성인력개발원":"韓国女性人材開発院","임신육아종합포털(아이사랑)":"妊娠育児総合ポータル",
    "한부모가족 지원(복지로)":"ひとり親家族支援","서울 여성복지포털":"ソウル女性福祉ポータル",
    "경기 여성비전센터":"京畿女性ビジョンセンター","고용노동부(일자리·육아휴직)":"雇用労働部(育児休職)",
    "국가보훈부":"国家報勲部","고용보험(육아휴직 신청)":"雇用保険(育児休職申請)",
    "워크넷 중장년 취업":"WorkNet中高年就職","한국장애인고용공단":"韓国障害者雇用公団",
    "국방부 병역명문가":"国防部","복지로(모의계산·조회)":"福祉ロ(シミュレーション)",
    "국세청 홈택스(환급금)":"国税庁還付金","정부24 미환급금":"政府24未返金",
    "건강보험공단(환급금)":"健康保険還付金","고용보험(미지급금)":"雇用保険未払い金",
    "금융결제원(휴면계좌)":"金融決済院(休眠口座)",
    "생계급여":"生計給付","의료급여":"医療給付","주거급여":"住居給付","교육급여":"教育給付",
    "긴급":"緊急","위기":"危機","생계":"生計","병원비":"医療費","월세":"月額家賃",
    "기초연금":"基礎年金","노인":"高齢者","어르신":"高齢者","연금":"年金",
    "장애인":"障害者","돌봄":"介護","청년":"青年","취업":"就職",
    "경력단절":"キャリア断絶","여성":"女性","재취업":"再就職","중장년":"中高年",
    "소상공인":"小規模事業者","실업급여":"失業給付","장기요양":"長期療養","치매":"認知症",
    "서울":"ソウル","경기도":"京畿道","기본소득":"基本所得","지역화폐":"地域通貨",
  },

  vi: {
    "주민등록등본":"Bản sao đăng ký cư trú","가족관계증명서":"Giấy chứng nhận quan hệ gia đình",
    "소득증명원":"Giấy chứng nhận thu nhập","재산세 과세증명":"Chứng nhận thuế tài sản",
    "금융정보 제공동의서":"Mẫu đồng ý cung cấp thông tin tài chính",
    "장애인 등록증":"Thẻ đăng ký người khuyết tật","진단서·의사소견서":"Giấy chứng nhận y tế / Ý kiến bác sĩ",
    "고용보험 이직확인서":"Xác nhận nghỉ việc bảo hiểm việc làm",
    "한부모가족 확인서":"Giấy xác nhận gia đình đơn thân","위기사유 확인서":"Xác minh lý do khủng hoảng",
    "임대차계약서":"Hợp đồng thuê nhà","폐업사실증명원":"Chứng nhận đóng cửa kinh doanh",
    "읍·면·동 주민센터":"Trung tâm Dịch vụ Cộng đồng",
    "읍·면·동 주민센터 또는 시·군·구청":"Trung tâm cộng đồng hoặc văn phòng quận",
    "읍·면·동 주민센터 또는 국민연금공단":"Trung tâm cộng đồng hoặc NPS",
    "아이돌봄서비스 포털":"Cổng thông tin dịch vụ chăm sóc trẻ",
    "고용복지플러스센터":"Trung tâm phúc lợi việc làm","소상공인진흥공단":"Tổ chức hỗ trợ doanh nghiệp nhỏ",
    "국민건강보험공단":"Cơ quan bảo hiểm y tế quốc gia",
    "서울시 온라인 신청":"Đăng ký trực tuyến Seoul","경기도 온라인 신청":"Đăng ký trực tuyến Gyeonggi",
    "복지로 맞춤서비스 조회":"Tìm kiếm Bokjiro","보조금24":"Trợ cấp24",
    "정부24 복지서비스":"Phúc lợi Chính phủ24","보건복지부":"Bộ Y tế & Phúc lợi",
    "고용노동부 고용서비스":"Bộ Lao động","국토교통부 주거복지":"Phúc lợi nhà ở",
    "교육부 교육급여":"Phúc lợi giáo dục","중소벤처기업부":"Bộ SMEs & Khởi nghiệp",
    "서울복지포털(wis)":"Cổng phúc lợi Seoul","서울시 복지재단":"Quỹ phúc lợi Seoul",
    "서울시 통합포털":"Cổng thông tin Seoul","경기도 복지포털":"Cổng phúc lợi Gyeonggi",
    "경기복지재단":"Quỹ phúc lợi Gyeonggi","경기도 일자리재단":"Quỹ việc làm Gyeonggi",
    "생계급여":"Trợ cấp sinh hoạt","의료급여":"Trợ cấp y tế","주거급여":"Trợ cấp nhà ở",
    "긴급":"Khẩn cấp","위기":"Khủng hoảng","생계":"Sinh kế","병원비":"Viện phí",
    "월세":"Tiền thuê nhà","기초연금":"Lương hưu cơ bản","노인":"Người cao tuổi",
    "연금":"Lương hưu","장애인":"Người khuyết tật","돌봄":"Chăm sóc",
    "청년":"Thanh niên","취업":"Việc làm","경력단절":"Gián đoạn sự nghiệp",
    "여성":"Phụ nữ","중장년":"Trung niên","소상공인":"Tiểu thương",
    "실업급여":"Trợ cấp thất nghiệp","장기요양":"Chăm sóc dài hạn",
    "서울":"Seoul","경기도":"Gyeonggi","기본소득":"Thu nhập cơ bản",
  },

  th: {
    "주민등록등본":"สำเนาทะเบียนบ้าน","가족관계증명서":"ใบรับรองความสัมพันธ์ครอบครัว",
    "소득증명원":"ใบรับรองรายได้","금융정보 제공동의서":"แบบยินยอมให้ข้อมูลทางการเงิน",
    "장애인 등록증":"บัตรลงทะเบียนผู้พิการ","진단서·의사소견서":"ใบรับรองแพทย์",
    "고용보험 이직확인서":"หนังสือยืนยันการลาออกประกันการจ้างงาน",
    "한부모가족 확인서":"หนังสือยืนยันครอบครัวพ่อแม่เลี้ยงเดี่ยว",
    "위기사유 확인서":"หนังสือยืนยันสาเหตุวิกฤต","임대차계약서":"สัญญาเช่า",
    "읍·면·동 주민센터":"ศูนย์บริการชุมชน",
    "읍·면·동 주민센터 또는 시·군·구청":"ศูนย์ชุมชนหรือสำนักงานเขต",
    "아이돌봄서비스 포털":"พอร์ทัลบริการดูแลเด็ก","고용복지플러스센터":"ศูนย์สวัสดิการการจ้างงาน",
    "소상공인진흥공단":"สถาบันส่งเสริมธุรกิจขนาดเล็ก",
    "국민건강보험공단":"บริการประกันสุขภาพแห่งชาติ",
    "서울시 온라인 신청":"สมัครออนไลน์โซล","경기도 온라인 신청":"สมัครออนไลน์คยองกี",
    "복지로 맞춤서비스 조회":"ค้นหา Bokjiro","보조금24":"เงินอุดหนุน24",
    "정부24 복지서비스":"สวัสดิการรัฐบาล24","보건복지부":"กระทรวงสาธารณสุขและสวัสดิการ",
    "고용노동부 고용서비스":"กระทรวงแรงงาน","중소벤처기업부":"กระทรวง SMEs",
    "서울복지포털(wis)":"พอร์ทัลสวัสดิการโซล","서울시 통합포털":"พอร์ทัลโซล",
    "경기도 복지포털":"พอร์ทัลสวัสดิการคยองกี","경기복지재단":"มูลนิธิสวัสดิการคยองกี",
    "생계급여":"เงินช่วยเหลือชีพ","의료급여":"สวัสดิการทางการแพทย์","주거급여":"สวัสดิการที่อยู่",
    "긴급":"ฉุกเฉิน","위기":"วิกฤต","생계":"การดำรงชีพ","병원비":"ค่าโรงพยาบาล",
    "월세":"ค่าเช่ารายเดือน","기초연금":"เบี้ยยังชีพขั้นพื้นฐาน","노인":"ผู้สูงอายุ",
    "연금":"บำนาญ","장애인":"ผู้พิการ","돌봄":"การดูแล","청년":"เยาวชน","취업":"การจ้างงาน",
    "경력단절":"หยุดอาชีพ","여성":"ผู้หญิง","중장년":"วัยกลางคน","소상공인":"ธุรกิจขนาดเล็ก",
    "실업급여":"เงินช่วยเหลือผู้ว่างงาน","장기요양":"การดูแลระยะยาว","치매":"สมองเสื่อม",
    "서울":"โซล","경기도":"คยองกี","기본소득":"รายได้ขั้นพื้นฐาน",
  },

  km: {
    "주민등록등본":"ច្បាប់ចម្លងបញ្ជីអ្នករស់នៅ","가족관계증명서":"វិញ្ញាបនប័ត្រទំនាក់ទំនងគ្រួសារ",
    "소득증명원":"វិញ្ញាបនប័ត្រប្រាក់ចំណូល","금융정보 제공동의서":"ទម្រង់យល់ព្រមព័ត៌មានហិរញ្ញវត្ថុ",
    "장애인 등록증":"អត្តសញ្ញាណប័ណ្ណពិការ","진단서·의사소견서":"ការវិនិច្ឆ័យវេជ្ជបណ្ឌិត",
    "위기사유 확인서":"ការបញ្ជាក់ហេតុផលវិបត្តិ","임대차계약서":"កិច្ចសន្យាជួល",
    "읍·면·동 주민센터":"មជ្ឈមណ្ឌលសេវាសហគមន៍",
    "읍·면·동 주민센터 또는 시·군·구청":"មជ្ឈមណ្ឌលសហគមន៍ ឬការិយាល័យស្រុក",
    "고용복지플러스센터":"មជ្ឈមណ្ឌលសន្តិសុខការងារ",
    "소상공인진흥공단":"ស្ថាប័នជំរុញអាជីវកម្មខ្នាតតូច",
    "국민건강보험공단":"សេវាធានារ៉ាប់រងសុខភាពជាតិ",
    "복지로 맞춤서비스 조회":"ស្វែងរក Bokjiro","보조금24":"ប្រាក់ឧបត្ថម្ភ24",
    "정부24 복지서비스":"រដ្ឋាភិបាល24 សុខុមាលភាព",
    "서울복지포털(wis)":"វិបផតណ៍សុខុមាលភាពសេអ៊ូល","서울시 통합포털":"វិបផតណ៍ក្រុងសេអ៊ូល",
    "경기도 복지포털":"វិបផតណ៍សុខុមាលភាពក្យុងគី",
    "생계급여":"ជំនួយជីវភាព","의료급여":"ជំនួយវេជ្ជសាស្ត្រ","주거급여":"ជំនួយលំនៅ",
    "긴급":"បន្ទាន់","위기":"វិបត្តិ","병원비":"ថ្លៃមន្ទីរពេទ្យ","월세":"ថ្លៃជួលប្រចាំខែ",
    "기초연금":"សោធនមូលដ្ឋាន","노인":"ចាស់ជរា","연금":"សោធន","장애인":"ពិការ",
    "청년":"យុវជន","취업":"ការងារ","여성":"ស្ត្រី","중장년":"វ័យកណ្ដាល",
    "소상공인":"អាជីវកម្មខ្នាតតូច","실업급여":"ប្រាក់ឧបត្ថម្ភការបាត់ការងារ",
    "서울":"សេអ៊ូល","경기도":"ក្យុងគី","기본소득":"ប្រាក់ចំណូលមូលដ្ឋាន",
  },
};


/* ═══════════════════════════════════════════
   3. 번역 헬퍼 함수
═══════════════════════════════════════════ */

/** 정책 번역: policy_id + 필드(name|desc) → 번역 문자열 */
function getPolicyTr(policyId, field) {
  if (!policyId || _currentLang === "ko") return null;
  const langData = POLICY_TR[_currentLang];
  if (!langData) return null;
  const p = langData[policyId];
  if (!p) return null;
  return p[field] || null;
}

/** 일반 용어 번역: 한국어 문자열 → 번역 문자열 */
function getTr(koStr) {
  if (!koStr || _currentLang === "ko") return koStr;
  const langData = TERM_TR[_currentLang];
  if (!langData) return koStr;
  return langData[koStr] || koStr;
}

/** 배열 내 각 항목 번역 */
function trArray(arr) {
  return (arr || []).map(s => getTr(s));
}
