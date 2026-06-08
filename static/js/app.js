/* 아테나 복지서비스 앱 로직 */

const TOTAL_STEPS = 8;
let currentStep  = 1;
let currentMode  = "form";   // "form" | "nlp"

const state = {
  age:             "",
  region:          "",
  district:        "",
  life_situations: [],
  work_status:     "",
  family_status:   "",
  gender:          "",
  income_range:    "",
};

const nlpState = {
  income_range:      "",
  gender:            "",
  region_override:   "",
  district_override: "",
};

/* ── 초기화 ── */
window.addEventListener("DOMContentLoaded", () => {
  renderChips("situationChips", SITUATIONS,    true,  "situation");
  renderChips("workChips",      WORK_OPTIONS,  false, "work");
  renderChips("familyChips",    FAMILY_OPTIONS,false, "family");
  renderChips("genderChips",    GENDER_OPTIONS,false, "gender");
  renderChips("incomeChips",    INCOME_OPTIONS,false, "income");
  renderChips("nlpIncomeChips", INCOME_OPTIONS,false, "nlpIncome");
  renderChips("nlpGenderChips", GENDER_OPTIONS,false, "nlpGender");
  updateProgress();
});

/* ── 모드 전환 ── */
function switchMode(mode) {
  currentMode = mode;
  document.getElementById("tabForm").classList.toggle("active", mode === "form");
  document.getElementById("tabNlp").classList.toggle("active",  mode === "nlp");
  document.getElementById("formMode").classList.toggle("hidden", mode !== "form");
  document.getElementById("nlpMode").classList.toggle("hidden",  mode !== "nlp");
  document.getElementById("result").classList.add("hidden");
}

/* ── 칩 렌더링 ── */
function renderChips(containerId, options, multi, key) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  options.forEach(opt => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = opt;
    // 성별 칩에 data-gender 속성 추가 (CSS 색상 분기용)
    if (key === "gender" || key === "nlpGender") {
      const gv = GENDER_VALUE_MAP[opt] || opt;
      chip.dataset.gender = gv;
    }
    chip.onclick = () => toggleChip(chip, opt, multi, key);
    wrap.appendChild(chip);
  });
}

function toggleChip(chip, value, multi, key) {
  if (!multi) {
    document.querySelectorAll(`#${getContainerId(key)} .chip`)
      .forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    if (key === "work")      state.work_status     = value;
    if (key === "family")    state.family_status   = value;
    if (key === "gender")    state.gender          = GENDER_VALUE_MAP[value] || value;
    if (key === "income")    state.income_range    = value;
    if (key === "nlpIncome") nlpState.income_range = value;
    if (key === "nlpGender") nlpState.gender       = GENDER_VALUE_MAP[value] || value;
  } else {
    chip.classList.toggle("active");
    const idx = state.life_situations.indexOf(value);
    if (idx === -1) state.life_situations.push(value);
    else            state.life_situations.splice(idx, 1);
  }
}

function getContainerId(key) {
  return {
    situation: "situationChips",
    work:      "workChips",
    family:    "familyChips",
    gender:    "genderChips",
    income:    "incomeChips",
    nlpIncome: "nlpIncomeChips",
    nlpGender: "nlpGenderChips",
  }[key];
}

/* ── 지역 선택 ── */
function selectRegion(region) {
  state.region   = region;
  state.district = "";
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  event.target.classList.add("active");

  const sel = document.getElementById("districtSelect");
  sel.innerHTML = '<option value="">시·군·구 선택</option>';
  const list = region === "서울특별시" ? SEOUL_DISTRICTS : GYEONGGI_DISTRICTS;
  list.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d; opt.textContent = d;
    sel.appendChild(opt);
  });
  sel.classList.remove("hidden");
  sel.onchange = () => { state.district = sel.value; };
}

/* ── 단계 이동 ── */
function nextStep() {
  if (!validateStep()) return;

  if (currentStep < TOTAL_STEPS) {
    showStep(currentStep + 1);
  } else {
    submitProfile();
  }
}

function prevStep() {
  if (currentStep > 1) showStep(currentStep - 1);
}

function showStep(n) {
  document.getElementById(`step${currentStep}`).classList.add("hidden");
  currentStep = n;
  document.getElementById(`step${currentStep}`).classList.remove("hidden");

  document.getElementById("btnBack").classList.toggle("hidden", currentStep === 1);
  document.getElementById("btnNext").textContent =
    currentStep === TOTAL_STEPS ? "결과 보기 🎯" : "다음 →";
  document.getElementById("progressText").textContent =
    `${currentStep} / ${TOTAL_STEPS}`;
  updateProgress();
}

function updateProgress() {
  const pct = (currentStep / TOTAL_STEPS) * 100;
  document.getElementById("progressBar").style.width = pct + "%";
  document.getElementById("progressText").textContent =
    `${currentStep} / ${TOTAL_STEPS}`;
}

/* ── 체크박스 변경 시 버튼 활성화 ── */
function onPledgeChange() {
  const checked = document.getElementById("pledgeCheck").checked;
  const btn = document.getElementById("btnNext");
  btn.disabled = !checked;
  btn.style.opacity = checked ? "1" : "0.4";
}

/* ── 유효성 검사 ── */
function validateStep() {
  if (currentStep === 1) {
    const v = parseInt(document.getElementById("inputAge").value);
    if (!v || v < 1 || v > 120) {
      alert("나이를 올바르게 입력해 주세요."); return false;
    }
    state.age = String(v);
  }
  if (currentStep === 2) {
    if (!state.region)   { alert("시·도를 선택해 주세요."); return false; }
    if (!state.district) { alert("시·군·구를 선택해 주세요."); return false; }
  }
  if (currentStep === 3 && state.life_situations.length === 0) {
    alert("어려운 점을 하나 이상 선택해 주세요."); return false;
  }
  if (currentStep === 8) {
    if (!document.getElementById("pledgeCheck").checked) {
      alert("확인 체크를 해주셔야 결과를 볼 수 있습니다."); return false;
    }
  }
  return true;
}

/* ── 단계별 API 호출 ── */
async function submitProfile() {
  showLoading();
  try {
    const res = await fetch("/welfare/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        age:             parseInt(state.age),
        region:          state.region,
        district:        state.district,
        life_situations: state.life_situations,
        work_status:     state.work_status   || null,
        family_status:   state.family_status || null,
        gender:          state.gender        || null,
        income_range:    state.income_range  || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "오류가 발생했습니다.");
    }

    const data = await res.json();
    renderResult(data, null);

  } catch (e) {
    alert("오류: " + e.message);
    retry();
  } finally {
    hideLoading();
  }
}

/* ── NLP 지역 보완 선택 ── */
function selectNlpRegion(region, btn) {
  nlpState.region_override   = region;
  nlpState.district_override = "";
  document.querySelectorAll("#nlpRegionWrap .tab-btn")
    .forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  const sel = document.getElementById("nlpDistrictSelect");
  sel.innerHTML = '<option value="">시·군·구 선택 (선택)</option>';
  const list = region === "서울특별시" ? SEOUL_DISTRICTS : GYEONGGI_DISTRICTS;
  list.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d; opt.textContent = d;
    sel.appendChild(opt);
  });
  sel.classList.remove("hidden");
  sel.onchange = () => { nlpState.district_override = sel.value; };
}

/* ── 자연어 NLP API 호출 ── */
async function submitNlp() {
  const text = document.getElementById("nlpText").value.trim();
  if (text.length < 5) {
    alert("상황을 좀 더 자세히 입력해 주세요. (5자 이상)"); return;
  }

  showLoading();
  document.getElementById("nlpMode").classList.add("hidden");

  try {
    const res = await fetch("/welfare/nlp-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text:              text,
        income_range:      nlpState.income_range      || null,
        gender:            nlpState.gender            || null,
        region_override:   nlpState.region_override   || "",
        district_override: nlpState.district_override || "",
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "오류가 발생했습니다.");
    }

    const data = await res.json();

    // 지역 미감지 → 지역 보완 UI 노출 후 재시도 안내
    if (data.needs_region && !nlpState.region_override) {
      hideLoading();
      document.getElementById("nlpMode").classList.remove("hidden");
      document.getElementById("nlpRegionWrap").classList.remove("hidden");
      document.getElementById("nlpMode").scrollIntoView({ behavior: "smooth" });
      return;
    }

    renderResult(data, data.analysis);

  } catch (e) {
    alert("오류: " + e.message);
    document.getElementById("nlpMode").classList.remove("hidden");
  } finally {
    hideLoading();
  }
}

/* ── 로딩 표시 ── */
function showLoading() {
  document.getElementById("cardStep") && document.getElementById("cardStep").classList.add("hidden");
  document.getElementById("btnRow")   && document.getElementById("btnRow").classList.add("hidden");
  document.getElementById("progressWrap") && document.getElementById("progressWrap").classList.add("hidden");
  document.getElementById("loading").classList.remove("hidden");
}
function hideLoading() {
  document.getElementById("loading").classList.add("hidden");
}

/* ── 결과 렌더링 ── */
function renderResult(data, analysis) {
  // OO님 맞춤 제목
  const age  = (analysis && analysis.age) ? analysis.age : (state.age || "");
  const nick = age ? `${age}세 고객님` : "고객님";
  document.getElementById("resultTitle").textContent =
    `🎯 ${nick}께 맞는 혜택을 찾았습니다`;
  document.getElementById("resultSummary").textContent = "";

  const body = document.getElementById("resultBody");
  body.innerHTML = "";

  // NLP 분석 정보 표시
  if (analysis) {
    let analysisHtml = `<div class="nlp-analysis">
      <p class="analysis-title">📊 AI 분석 결과</p>
      <div class="analysis-tags">`;

    if (analysis.age)
      analysisHtml += `<span class="analysis-tag">나이 ${analysis.age}세</span>`;
    if (analysis.region)
      analysisHtml += `<span class="analysis-tag">${analysis.region}</span>`;
    if (analysis.district)
      analysisHtml += `<span class="analysis-tag">${analysis.district}</span>`;
    if (analysis.work_status)
      analysisHtml += `<span class="analysis-tag">${analysis.work_status}</span>`;
    if (analysis.family_status)
      analysisHtml += `<span class="analysis-tag">${analysis.family_status}</span>`;
    (analysis.life_situations || []).forEach(s => {
      analysisHtml += `<span class="analysis-tag">${s}</span>`;
    });

    analysisHtml += `</div>`;
    if (analysis.warnings && analysis.warnings.length) {
      analysis.warnings.forEach(w => {
        analysisHtml += `<div class="nlp-warning">⚠️ ${w}</div>`;
      });
    }
    analysisHtml += `</div>`;
    body.insertAdjacentHTML("beforeend", analysisHtml);
  }

  // 온톨로지 자격 판단 결과
  if (data.ontology && data.ontology.summary.total > 0) {
    const ont = data.ontology;
    const summ = ont.summary;

    let ontHtml = `<div class="ont-section">
      <p class="ont-header">🏛️ 자격 판단 결과
        <span class="ont-badge ont-badge-def">${summ.definite_count}건 요건 충족</span>
        <span class="ont-badge ont-badge-pos">${summ.possible_count}건 가능성</span>
        <span class="ont-badge ont-badge-fut">${summ.future_count}건 미리보기</span>
      </p>
      <div class="ont-disclaimer">
        💙 아래 결과는 입력하신 정보를 바탕으로 한 <strong>맞춤 안내</strong>입니다.
        실제 수급 여부는 담당 기관의 심사를 통해 최종 결정됩니다.<br>
        <span class="disclaimer-legal">
          📌 허위 신청 시 「사회보장기본법」에 따라 불이익이 발생할 수 있습니다.
        </span>
      </div>`;

    // DEFINITE
    if (ont.definite.length) {
      ontHtml += `<div class="ont-group ont-group-def">
        <p class="ont-group-title">✅ 지금 바로 신청 가능 (${ont.definite.length}건)</p>`;
      ont.definite.forEach(p => { ontHtml += renderOntPolicy(p, "def"); });
      ontHtml += `</div>`;
    }

    // POSSIBLE
    if (ont.possible.length) {
      ontHtml += `<div class="ont-group ont-group-pos">
        <p class="ont-group-title">🔶 해당 가능성 있음 (${ont.possible.length}건)</p>`;
      ont.possible.forEach(p => { ontHtml += renderOntPolicy(p, "pos"); });
      ontHtml += `</div>`;
    }

    // FUTURE
    if (ont.future.length) {
      ontHtml += `<div class="ont-group ont-group-fut">
        <p class="ont-group-title">📌 미리 알아두면 좋아요 (${ont.future.length}건)
          <button class="ont-toggle-btn" onclick="toggleFuture(this)">펼치기 ▾</button>
        </p>
        <div class="ont-future-body hidden">`;
      ont.future.forEach(p => { ontHtml += renderOntPolicy(p, "fut"); });
      ontHtml += `</div></div>`;
    }

    ontHtml += `</div>`;
    body.insertAdjacentHTML("beforeend", ontHtml);
  }

  // 기존 링크 섹션 (참고 사이트)
  const hasLinks = data.results && data.results.some(s => s.services.length > 0);
  if (hasLinks) {
    const linkWrap = document.createElement("div");
    linkWrap.className = "link-section-wrap";
    linkWrap.innerHTML = `<p class="link-section-header">🔗 관련 기관 바로가기</p>`;

    data.results.forEach(section => {
      if (!section.services.length) return;
      const icon = SECTION_ICONS[section.section] || "📋";
      const div  = document.createElement("div");
      div.className = "result-section";
      div.innerHTML = `<p class="section-title">${icon} ${section.section}</p>`;
      section.services.forEach(svc => {
        const item = document.createElement("div");
        item.className = "service-item";
        item.innerHTML = `
          <span class="service-name">${svc.name}</span>
          <a class="service-link" href="${svc.url}" target="_blank" rel="noopener">바로가기 →</a>`;
        div.appendChild(item);
      });
      linkWrap.appendChild(div);
    });

    body.appendChild(linkWrap);
  }

  document.getElementById("result").classList.remove("hidden");
  document.getElementById("result").scrollIntoView({ behavior: "smooth" });
}

/* ── 온톨로지 정책 카드 렌더링 ── */
function renderOntPolicy(p, type) {
  const docsHtml = p.required_docs.length
    ? `<div class="ont-docs">📄 필요 서류: ${p.required_docs.join(" · ")}</div>`
    : "";
  const reasonHtml = p.reasons.length
    ? `<div class="ont-reason">${p.reasons.join(" / ")}</div>`
    : "";
  const tagsHtml = p.tags.length
    ? `<div class="ont-tags">${p.tags.map(t => `<span class="ont-tag">${t}</span>`).join("")}</div>`
    : "";

  return `<div class="ont-card ont-card-${type}">
    <div class="ont-card-top">
      <span class="ont-policy-name">${p.name}</span>
      <a class="ont-apply-btn" href="${p.apply_url}" target="_blank" rel="noopener">신청하기 →</a>
    </div>
    <p class="ont-desc">${p.description}</p>
    ${tagsHtml}
    ${docsHtml}
    ${reasonHtml}
    <div class="ont-authority">📞 ${p.authority} · <a class="tel-link" href="tel:${p.phone.replace(/[^0-9]/g,'')}">${p.phone} ☎ 전화하기</a></div>
  </div>`;
}

/* ── FUTURE 섹션 토글 ── */
function toggleFuture(btn) {
  const body = btn.closest(".ont-group-fut").querySelector(".ont-future-body");
  const isHidden = body.classList.toggle("hidden");
  btn.textContent = isHidden ? "펼치기 ▾" : "접기 ▴";
}

/* ── 재조회 ── */
function retry() {
  location.reload();
}

/* ── 선순환 모달 ── */
function openPayForwardModal() {
  document.getElementById("payForwardModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";   // 배경 스크롤 막기
}

function closePayForwardModal() {
  document.getElementById("payForwardModal").classList.add("hidden");
  document.body.style.overflow = "";
}

function closeModalOutside(event) {
  // 오버레이 클릭 시 닫기 (모달 내부 클릭은 닫지 않음)
  if (event.target.id === "payForwardModal") closePayForwardModal();
}

function payForwardAction(type) {
  const urls = {
    community: "https://www.1365.go.kr",          // 자원봉사 포털
    talent:    "https://www.dovol.net",            // 재능기부 매칭
    volunteer: "https://www.1365.go.kr/vols/main.do",  // 동네 봉사
  };
  const url = urls[type];
  if (url) window.open(url, "_blank", "noopener");
  closePayForwardModal();
}
