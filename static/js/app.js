/* 아테나 복지서비스 — 3단계 미니멀 UX (v2.4 다국어) */

/* ── 상태 ── */
const state = {
  age: "", region: "", district: "",
  life_situations: [], family_status: "",
  income_range: "", gender: "",
  // 가족 구성원 카운터 (v3.3)
  family_members: {
    spouse:      0,  // 배우자/파트너
    parent:      0,  // 부모
    child:       0,  // 아동 (0~12세)
    teen:        0,  // 청소년 (13~18세)
    youth:       0,  // 청년 (19~34세)
    middle:      0,  // 중장년 자녀 (35~64세)
    grandparent: 0,  // 조부모 (65세+)
  },
};
const nlpState = {
  income_range: "", gender: "",
  region_override: "", district_override: "",
};

/* ── 초기화 ── */
window.addEventListener("DOMContentLoaded", () => {
  renderSituationGrid();
  renderFamilyComposer();   // 가족 구성원 카운터 렌더링
  renderChips("nlpGenderChips",GENDER_OPTIONS,  false, "nlpGender",T("gender_options"));
  renderChips("nlpIncomeChips",INCOME_OPTIONS,  false, "nlpIncome",T("income_options"));
  loadProfile();  // 저장된 프로필 자동 복원
});

/* ══════════════════════════════════════════════
   중위소득 자동 변환 엔진 (2025년 기준)
   가구원 수별 기준 중위소득 (월, 만원)
══════════════════════════════════════════════ */
const MEDIAN_INCOME = {
  1: 239,   // 1인 가구 약 239만원
  2: 393,   // 2인
  3: 502,   // 3인
  4: 609,   // 4인
  5: 710,   // 5인
};

// 가족 구성원 카운터 → 가구원 수 계산
function estimateHouseholdSize() {
  const m = state.family_members;
  const total = 1 // 본인
    + (m.spouse || 0)
    + (m.parent || 0)
    + (m.child  || 0)
    + (m.teen   || 0)
    + (m.youth  || 0)
    + (m.middle || 0)
    + (m.grandparent || 0);
  return Math.max(1, total);
}

// 가족 구성원 → 복지 API용 텍스트 요약 생성
function fcToStatusString() {
  const m = state.family_members;
  const total = estimateHouseholdSize();
  if (total === 1) return "혼자 살고 있어요";
  const parts = [];
  if (m.spouse)      parts.push("배우자");
  if (m.parent)      parts.push(`부모 ${m.parent}명`);
  if (m.child)       parts.push(`아동 ${m.child}명`);
  if (m.teen)        parts.push(`청소년 ${m.teen}명`);
  if (m.youth)       parts.push(`청년 ${m.youth}명`);
  if (m.middle)      parts.push(`중장년 ${m.middle}명`);
  if (m.grandparent) parts.push(`조부모 ${m.grandparent}명`);
  return parts.length ? parts.join(", ") + " 함께" : `${total}인 가구`;
}

// 소득(만원) + 가구원수 → 중위소득 구간 반환
function calcIncomeRange(incomeMaan, householdSize) {
  const base = MEDIAN_INCOME[Math.min(householdSize, 5)] || 239;
  const ratio = incomeMaan / base; // 중위소득 대비 비율

  if (ratio < 0.3)  return { label: "중위소득 30% 이하 (기초생활수급 대상 가능)",  value: "거의 없어요",           ratio: Math.round(ratio*100), warn: true };
  if (ratio < 0.5)  return { label: `중위소득 약 ${Math.round(ratio*100)}% — 차상위계층 해당 가능`, value: "중위소득 50% 이하",   ratio: Math.round(ratio*100), warn: false };
  if (ratio < 1.0)  return { label: `중위소득 약 ${Math.round(ratio*100)}% — 저소득층 지원 가능`,  value: "중위소득 50~100%",   ratio: Math.round(ratio*100), warn: false };
  if (ratio < 1.5)  return { label: `중위소득 약 ${Math.round(ratio*100)}% — 일반 복지서비스 대상`, value: "중위소득 100~150%",  ratio: Math.round(ratio*100), warn: false };
  return              { label: `중위소득 약 ${Math.round(ratio*100)}% — 일부 서비스 이용 가능`,    value: "중위소득 150% 이상", ratio: Math.round(ratio*100), warn: false };
}

function onIncomeInput() {
  const val = parseInt(document.getElementById("inputIncome").value, 10);
  const resultBox  = document.getElementById("incomeResult");
  const resultText = document.getElementById("incomeResultText");

  if (!val || val <= 0) {
    resultBox.classList.add("hidden");
    state.income_range = "";
    saveProfile();
    return;
  }

  const size   = estimateHouseholdSize();
  const result = calcIncomeRange(val, size);

  resultText.textContent = result.label;
  resultBox.classList.remove("hidden", "warn");
  if (result.warn) resultBox.classList.add("warn");

  // 백엔드 전송용 값 저장
  state.income_range       = result.value;
  state.income_amount_maan = val;   // 실제 입력값도 보관

  saveProfile();  // localStorage 자동 저장
}

/* ══════════════════════════════════════════════
   localStorage — 개인 프로필 저장/복원
══════════════════════════════════════════════ */
const PROFILE_KEY = "athena_profile_v1";

function saveProfile() {
  state.family_status = fcToStatusString(); // 카운터 → 텍스트 동기화
  const profile = {
    region:         state.region,
    district:       state.district,
    age:            state.age,
    family_status:  state.family_status,
    family_members: state.family_members,
    income_range:   state.income_range,
    income_amount:  state.income_amount_maan || "",
    saved_at:       new Date().toISOString(),
  };
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch(e) {}
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);

    // 상태 복원
    if (p.age)           { state.age = p.age; document.getElementById("inputAge").value = p.age; }
    if (p.income_amount) { document.getElementById("inputIncome").value = p.income_amount; }
    if (p.income_range)  { state.income_range = p.income_range; }
    if (p.income_amount) { onIncomeInput(); } // 변환 결과 재표시

    // 지역 복원
    if (p.region === "서울특별시") {
      const btn = document.getElementById("btnSeoul");
      if (btn) pickRegion("서울특별시", btn);
    } else if (p.region === "경기도") {
      const btn = document.getElementById("btnGyeonggi");
      if (btn) pickRegion("경기도", btn);
    }

    // 가족 구성원 카운터 복원
    if (p.family_members) {
      Object.assign(state.family_members, p.family_members);
      renderFamilyComposer(); // UI 재렌더링
    }
    if (p.family_status) state.family_status = p.family_status;
  } catch(e) {}
}

/* ── 상황 그리드 렌더링 ── */
function renderSituationGrid() {
  const grid = document.getElementById("situationGrid");
  if (!grid) return;
  const labels = T("situations");  // 현재 언어 번역 배열
  SITUATIONS.forEach((value, i) => {
    const label = (Array.isArray(labels) && labels[i]) ? labels[i] : value;
    const btn = document.createElement("button");
    btn.className = "sit-card";
    btn.setAttribute("role", "checkbox");
    btn.setAttribute("aria-checked", "false");
    btn.setAttribute("aria-label", label);
    btn.dataset.value = value;   // API 전송용 한국어 값
    btn.innerHTML = `<span class="sit-icon" aria-hidden="true">${SITUATION_ICONS[value] || "📌"}</span>
                     <span class="sit-label">${label}</span>`;
    btn.onclick = () => {
      btn.classList.toggle("active");
      const idx = state.life_situations.indexOf(value);
      if (idx === -1) {
        state.life_situations.push(value);
        btn.setAttribute("aria-checked", "true");
      } else {
        state.life_situations.splice(idx, 1);
        btn.setAttribute("aria-checked", "false");
      }
    };
    grid.appendChild(btn);
  });
}

/* ── 칩 렌더링 ── */
function renderChips(containerId, options, multi, key, translatedLabels) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  options.forEach((opt, i) => {
    const label = (Array.isArray(translatedLabels) && translatedLabels[i]) ? translatedLabels[i] : opt;
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = label;
    chip.setAttribute("role", "radio");
    chip.setAttribute("aria-checked", "false");
    chip.setAttribute("aria-label", label);
    chip.dataset.value = opt;   // API 전송용 한국어 값
    if (key === "nlpGender") chip.dataset.gender = GENDER_VALUE_MAP[opt] || opt;
    chip.onclick = () => toggleChip(chip, opt, multi, key);
    wrap.appendChild(chip);
  });
}

/* ══════════════════════════════════════════════
   가족 구성원 카운터 (v3.3)
══════════════════════════════════════════════ */
// 멤버 타입별 최댓값
const FC_MAX = { spouse:1, parent:2, child:10, teen:10, youth:10, middle:10, grandparent:4 };

// 카운터 렌더링
function renderFamilyComposer() {
  const wrap = document.getElementById("familyComposer");
  if (!wrap) return;

  const rows = [
    { key:"spouse",      icon:"💑",  labelKey:"fc_spouse" },
    { key:"parent",      icon:"👨‍👩‍👦", labelKey:"fc_parent" },
    { key:"child",       icon:"👶",  labelKey:"fc_child"  },
    { key:"teen",        icon:"🧒",  labelKey:"fc_teen"   },
    { key:"youth",       icon:"🧑",  labelKey:"fc_youth"  },
    { key:"middle",      icon:"🧑‍💼", labelKey:"fc_middle" },
    { key:"grandparent", icon:"👴",  labelKey:"fc_grandparent" },
  ];

  wrap.innerHTML = `
    <!-- 본인 (고정) -->
    <div class="fc-row fc-self">
      <span class="fc-icon">👤</span>
      <span class="fc-label" data-i18n="fc_self">${T("fc_self") || "나 (본인)"}</span>
      <div class="fc-counter-fixed"><span class="fc-num-fixed">1</span></div>
    </div>
    ${rows.map(r => `
    <div class="fc-row" id="fc_row_${r.key}">
      <span class="fc-icon">${r.icon}</span>
      <div class="fc-label-wrap">
        <span class="fc-label" data-i18n="${r.labelKey}">${T(r.labelKey) || r.labelKey}</span>
        <span class="fc-hint" data-i18n="${r.labelKey}_hint">${T(r.labelKey+"_hint") || ""}</span>
      </div>
      <div class="fc-counter">
        <button class="fc-btn fc-minus" onclick="fcChange('${r.key}',-1)"
                aria-label="감소" ${state.family_members[r.key] === 0 ? "disabled" : ""}>−</button>
        <span class="fc-num" id="fcn_${r.key}">${state.family_members[r.key]}</span>
        <button class="fc-btn fc-plus" onclick="fcChange('${r.key}',1)"
                aria-label="증가" ${state.family_members[r.key] >= FC_MAX[r.key] ? "disabled" : ""}>+</button>
      </div>
    </div>`).join("")}
    <!-- 합계 -->
    <div class="fc-total-row">
      <span data-i18n="fc_total">${T("fc_total") || "총 가구원 수"}</span>
      <span class="fc-total-num" id="fcTotal">${estimateHouseholdSize()}명</span>
    </div>`;
}

// 카운터 +/- 처리
function fcChange(key, delta) {
  const cur = state.family_members[key] || 0;
  const next = Math.max(0, Math.min(FC_MAX[key], cur + delta));
  if (next === cur) return;
  state.family_members[key] = next;

  // 숫자 업데이트
  const numEl = document.getElementById(`fcn_${key}`);
  if (numEl) numEl.textContent = next;

  // 합계 업데이트
  const totalEl = document.getElementById("fcTotal");
  if (totalEl) totalEl.textContent = estimateHouseholdSize() + "명";

  // 버튼 상태 업데이트
  const row = document.getElementById(`fc_row_${key}`);
  if (row) {
    row.querySelector(".fc-minus").disabled = (next === 0);
    row.querySelector(".fc-plus").disabled  = (next >= FC_MAX[key]);
    row.classList.toggle("fc-active", next > 0);
  }

  saveProfile();
  // 소득 재계산 (가구원수 변경되므로)
  const incEl = document.getElementById("inputIncome");
  if (incEl && incEl.value) onIncomeInput();
}

function toggleChip(chip, value, multi, key) {
  document.querySelectorAll(`#${getContainerId(key)} .chip`)
    .forEach(c => { c.classList.remove("active"); c.setAttribute("aria-checked","false"); });
  chip.classList.add("active");
  chip.setAttribute("aria-checked", "true");
  if (key === "family") {
    state.family_status = value;
    saveProfile();
    // 가족 변경 시 소득 재계산 (가구원수 바뀌므로)
    const incVal = document.getElementById("inputIncome");
    if (incVal && incVal.value) onIncomeInput();
  }
  if (key === "income")    state.income_range       = INCOME_VALUE_MAP[value] || value;
  if (key === "nlpIncome") nlpState.income_range    = INCOME_VALUE_MAP[value] || value;
  if (key === "nlpGender") nlpState.gender = GENDER_VALUE_MAP[value] || value;
}

function getContainerId(key) {
  return { family:"familyChips", income:"incomeChips",
           nlpIncome:"nlpIncomeChips", nlpGender:"nlpGenderChips" }[key];
}

/* ── 지역 선택 ── */
function pickRegion(region, btn) {
  state.region   = region;
  state.district = "";
  document.querySelectorAll(".region-big-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  updateRegionAria(region);

  const sel = document.getElementById("districtSelect");
  sel.innerHTML = `<option value="">${T("district_ph")}</option>`;
  const list = region === "서울특별시" ? SEOUL_DISTRICTS : GYEONGGI_DISTRICTS;
  list.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d; opt.textContent = d;
    sel.appendChild(opt);
  });
  sel.classList.remove("hidden");
  sel.onchange = () => { state.district = sel.value; checkStepA(); };
  checkStepA();
}

function onAgeInput() { checkStepA(); }

function checkStepA() {
  const age = parseInt(document.getElementById("inputAge").value);
  const ok  = state.region && state.district && age >= 1 && age <= 120;
  const btn = document.getElementById("btnA");
  btn.classList.toggle("disabled", !ok);
}

/* ── 단계 이동 ── */
function goToA() {
  show("stepA"); setDot(1);
  document.getElementById("inputCard").scrollIntoView({ behavior: "smooth" });
}

function goToB() {
  const age = parseInt(document.getElementById("inputAge").value);
  if (!state.region)   { alert(T("alert_region")); return; }
  if (!state.district) { alert(T("alert_district")); return; }
  if (!age || age < 1 || age > 120) { alert(T("alert_age")); return; }
  state.age = String(age);
  show("stepB"); setDot(2);
  document.getElementById("inputCard").scrollIntoView({ behavior: "smooth" });
}

function goToC() {
  if (state.life_situations.length === 0) {
    alert(T("alert_situation")); return;
  }
  show("stepC"); setDot(3);
  document.getElementById("inputCard").scrollIntoView({ behavior: "smooth" });
}

function show(stepId) {
  ["stepA","stepB","stepC"].forEach(id => {
    document.getElementById(id).classList.toggle("hidden", id !== stepId);
  });
}

function setDot(n) {
  [1,2,3].forEach(i => {
    document.getElementById(`dot${i}`).classList.toggle("active", i === n);
    document.getElementById(`dot${i}`).classList.toggle("done",   i < n);
  });
  // 진행 표시 업데이트
  const progress = document.getElementById("dotProgress");
  if (progress) {
    progress.setAttribute("aria-valuenow", n);
    progress.setAttribute("aria-label", `3단계 중 ${n}단계 진행 중`);
  }
  // 스크린리더 음성 안내
  const messages = { 1:"1단계: 지역과 나이를 입력해 주세요.", 2:"2단계: 현재 상황을 선택해 주세요.", 3:"3단계: 입력 정보를 확인해 주세요." };
  const el = document.getElementById("stepAnnounce");
  if (el) el.textContent = messages[n] || "";
}

/* ── 지역 버튼 aria-pressed 동기화 ── */
function updateRegionAria(region) {
  document.getElementById("btnSeoul").setAttribute("aria-pressed",  region === "서울특별시" ? "true" : "false");
  document.getElementById("btnGyeonggi").setAttribute("aria-pressed", region === "경기도" ? "true" : "false");
}

/* ── 정직성 서약 — 문장 전체 터치 ── */
let _pledged = false;
function onPledgeToggle() {
  _pledged = !_pledged;
  const confirmBtn = document.getElementById("pledgeConfirmBtn");
  const icon       = document.getElementById("pledgeIcon");
  const btnC       = document.getElementById("btnC");
  confirmBtn.classList.toggle("pledged", _pledged);
  confirmBtn.setAttribute("aria-pressed", _pledged ? "true" : "false");
  icon.textContent = _pledged ? "✔" : "○";
  btnC.classList.toggle("disabled", !_pledged);
}

/* ── 단계별 API 호출 ── */
async function submitProfile() {
  if (!_pledged) {
    alert(T("alert_pledge")); return;
  }
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
        family_status:   state.family_status   || null,
        income_range:    state.income_range    || null,
        gender:          state.gender          || null,
        work_status:     null,
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
    renderResult(await res.json(), null);
  } catch(e) {
    alert("오류: " + e.message);
  } finally {
    hideLoading();
  }
}

/* ── NLP 토글 ── */
function toggleNlp() {
  const panel   = document.getElementById("nlpPanel");
  const card    = document.getElementById("inputCard");
  const entry   = document.getElementById("nlpEntry");
  const isHidden = panel.classList.contains("hidden");
  panel.classList.toggle("hidden", !isHidden);
  card.classList.toggle("hidden",   isHidden);
  entry.classList.toggle("hidden",  isHidden);
  if (isHidden) panel.scrollIntoView({ behavior: "smooth" });
}

/* ── NLP 지역 보완 ── */
function selectNlpRegion(region, btn) {
  nlpState.region_override   = region;
  nlpState.district_override = "";
  document.querySelectorAll("#nlpPanel .region-big-btn")
    .forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const sel = document.getElementById("nlpDistrictSelect");
  sel.innerHTML = `<option value="">${T("nlp_district_ph")}</option>`;
  const list = region === "서울특별시" ? SEOUL_DISTRICTS : GYEONGGI_DISTRICTS;
  list.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d; opt.textContent = d;
    sel.appendChild(opt);
  });
  sel.classList.remove("hidden");
  sel.onchange = () => { nlpState.district_override = sel.value; };
}

/* ── NLP API 호출 ── */
async function submitNlp() {
  const text = document.getElementById("nlpText").value.trim();
  if (text.length < 5) { alert(T("alert_nlp_short")); return; }
  showLoading();
  document.getElementById("nlpPanel").classList.add("hidden");
  try {
    const res = await fetch("/welfare/nlp-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        income_range:      nlpState.income_range      || null,
        gender:            nlpState.gender            || null,
        region_override:   nlpState.region_override   || "",
        district_override: nlpState.district_override || "",
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
    const data = await res.json();
    if (data.needs_region && !nlpState.region_override) {
      hideLoading();
      document.getElementById("nlpPanel").classList.remove("hidden");
      document.getElementById("nlpRegionWrap").classList.remove("hidden");
      document.getElementById("nlpPanel").scrollIntoView({ behavior: "smooth" });
      return;
    }
    renderResult(data, data.analysis);
  } catch(e) {
    alert("오류: " + e.message);
    document.getElementById("nlpPanel").classList.remove("hidden");
  } finally {
    hideLoading();
  }
}

/* ── 로딩 ── */
function showLoading() {
  document.getElementById("inputCard").classList.add("hidden");
  document.getElementById("nlpEntry").classList.add("hidden");
  document.getElementById("loading").classList.remove("hidden");
}
function hideLoading() {
  document.getElementById("loading").classList.add("hidden");
}

/* ── 결과 렌더링 ── */
function renderResult(data, analysis) {
  document.getElementById("inputCard").classList.add("hidden");
  document.getElementById("nlpEntry").classList.add("hidden");

  /* OO님 맞춤 제목 */
  const age  = (analysis && analysis.age) ? analysis.age : (state.age || "");
  document.getElementById("resultTitle").textContent = T("result_title_tpl", age);

  const body = document.getElementById("resultBody");
  body.innerHTML = "";

  /* NLP 분석 태그 */
  if (analysis) {
    let html = `<div class="nlp-analysis"><p class="analysis-title">${T("analysis_title")}</p>
      <div class="analysis-tags">`;
    if (analysis.age)          html += `<span class="analysis-tag">${analysis.age}세</span>`;
    if (analysis.region)       html += `<span class="analysis-tag">${analysis.region}</span>`;
    if (analysis.district)     html += `<span class="analysis-tag">${analysis.district}</span>`;
    if (analysis.work_status)  html += `<span class="analysis-tag">${analysis.work_status}</span>`;
    if (analysis.family_status)html += `<span class="analysis-tag">${analysis.family_status}</span>`;
    (analysis.life_situations||[]).forEach(s =>
      html += `<span class="analysis-tag">${s}</span>`);
    html += `</div>`;
    (analysis.warnings||[]).forEach(w =>
      html += `<div class="nlp-warning">⚠️ ${w}</div>`);
    html += `</div>`;
    body.insertAdjacentHTML("beforeend", html);
  }

  /* 온톨로지 결과 */
  if (data.ontology && data.ontology.summary.total > 0) {
    const ont  = data.ontology;
    const summ = ont.summary;

    let html = `<div class="ont-section">
      <p class="ont-header">${T("ont_qualify")}
        <span class="ont-badge ont-badge-def">${T("ont_definite", summ.definite_count)}</span>
        <span class="ont-badge ont-badge-pos">${T("ont_possible", summ.possible_count)}</span>
        <span class="ont-badge ont-badge-fut">${T("ont_future", summ.future_count)}</span>
      </p>
      <div class="ont-disclaimer">
        ${T("disclaimer")}
        <span class="disclaimer-legal">
          ${T("pledge_legal")}
        </span>
      </div>`;

    if (ont.definite.length) {
      html += `<div class="ont-group ont-group-def">
        <p class="ont-group-title">${T("ont_definite", ont.definite.length)}</p>`;
      ont.definite.forEach(p => html += renderOntPolicy(p, "def"));
      html += `</div>`;
    }
    if (ont.possible.length) {
      html += `<div class="ont-group ont-group-pos">
        <p class="ont-group-title">${T("ont_possible", ont.possible.length)}</p>`;
      ont.possible.forEach(p => html += renderOntPolicy(p, "pos"));
      html += `</div>`;
    }
    if (ont.future.length) {
      html += `<div class="ont-group ont-group-fut">
        <p class="ont-group-title">${T("ont_future", ont.future.length)}
          <button class="ont-toggle-btn" onclick="toggleFuture(this)">${T("ont_expand")}</button>
        </p>
        <div class="ont-future-body hidden">`;
      ont.future.forEach(p => html += renderOntPolicy(p, "fut"));
      html += `</div></div>`;
    }
    html += `</div>`;
    body.insertAdjacentHTML("beforeend", html);
  }

  /* Supabase 실시간 DB 정책 카드 */
  if (data.supabase_policies && data.supabase_policies.length > 0) {
    let html = `<div class="supa-section">
      <p class="supa-header">🗄️ 실시간 DB 추천 정책 <span class="supa-badge">${data.supabase_policies.length}건</span></p>`;
    data.supabase_policies.forEach(p => {
      const tags = (p.tags||[]).map(t=>`<span class="ont-tag">${t}</span>`).join("");
      const benefit = p.benefit ? `<div class="supa-row">💰 <b>혜택</b> ${p.benefit}</div>` : "";
      const contact = p.contact ? `<div class="supa-row">📞 <b>문의</b> ${p.contact}</div>` : "";
      const source  = p.source  ? `<div class="supa-row">🏛️ <b>주관</b> ${p.source}</div>` : "";
      const applyBadge = p.online_apply
        ? `<span class="supa-online-badge">💻 온라인 신청 가능</span>` : "";
      html += `<div class="supa-card">
        <div class="supa-card-top">
          <span class="supa-name">${p.name}</span>
          <a class="supa-apply-btn" href="${p.url}" target="_blank" rel="noopener">바로 신청 →</a>
        </div>
        ${p.description ? `<p class="supa-desc">${p.description}</p>` : ""}
        ${applyBadge}
        ${benefit}${source}${contact}
        ${tags ? `<div class="ont-tags">${tags}</div>` : ""}
      </div>`;
    });
    html += `</div>`;
    body.insertAdjacentHTML("beforeend", html);
  }

  /* 링크 섹션 */
  if (data.results && data.results.some(s => s.services.length > 0)) {
    let html = `<div class="link-section-wrap">
      <p class="link-section-header">${T("link_header")}</p>`;
    data.results.forEach(sec => {
      if (!sec.services.length) return;
      const icon     = SECTION_ICONS[sec.section] || "📋";
      const secNames = T("section_names") || {};
      const secLabel = secNames[sec.section] || sec.section;
      html += `<div class="result-section">
        <p class="section-title">${icon} ${secLabel}</p>`;
      sec.services.forEach(svc =>
        html += `<div class="service-item">
          <span class="service-name">${getTr(svc.name)}</span>
          <a class="service-link" href="${svc.url}" target="_blank" rel="noopener">${T("link_go")}</a>
        </div>`);
      html += `</div>`;
    });
    html += `</div>`;
    body.insertAdjacentHTML("beforeend", html);
  }

  document.getElementById("result").classList.remove("hidden");
  document.getElementById("result").scrollIntoView({ behavior: "smooth" });
}

/* ── 온톨로지 카드 ── */
function renderOntPolicy(p, type) {
  // 번역 적용
  const name  = getPolicyTr(p.policy_id, "name") || p.name;
  const desc  = getPolicyTr(p.policy_id, "desc") || p.description;
  const auth  = getTr(p.authority) || p.authority;
  const trDocs  = p.required_docs.map(d => getTr(d)).join(" · ");
  const trTags  = p.tags.map(t => getTr(t));
  const trReasons = p.reasons.map(r => getTr(r));

  const docs   = p.required_docs.length
    ? `<div class="ont-docs">${T("ont_docs")} ${trDocs}</div>` : "";
  const reason = trReasons.length
    ? `<div class="ont-reason">💡 ${trReasons.join(" / ")}</div>` : "";
  const tags   = trTags.length
    ? `<div class="ont-tags">${trTags.map(t=>`<span class="ont-tag">${t}</span>`).join("")}</div>` : "";
  const deadline = p.deadline
    ? `<div class="ont-deadline">⚠️ ${T("ont_deadline", p.deadline)}</div>`
    : `<div class="ont-deadline calm">${T("ont_open")}</div>`;
  return `<div class="ont-card ont-card-${type}">
    <div class="ont-card-top">
      <span class="ont-policy-name">${name}</span>
      <a class="ont-apply-btn" href="${p.apply_url}" target="_blank" rel="noopener"
         title="${name}">${T("ont_apply")}</a>
    </div>
    <p class="ont-desc">${desc}</p>
    ${deadline}${tags}${docs}${reason}
    <div class="ont-authority">📞 ${auth}${T("ont_authority_sep")}
      <a class="tel-link" href="tel:${p.phone.replace(/[^0-9]/g,'')}">${p.phone} ☎</a>
    </div>
  </div>`;
}

/* ── FUTURE 토글 ── */
function toggleFuture(btn) {
  const body    = btn.closest(".ont-group-fut").querySelector(".ont-future-body");
  const hidden  = body.classList.toggle("hidden");
  btn.textContent = hidden ? T("ont_expand") : T("ont_collapse");
}

/* ── 음성 입력 (Web Speech API) ── */
let _recognition = null;
let _isRecording = false;

function toggleVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("이 브라우저는 음성 입력을 지원하지 않습니다.\nChrome 또는 Edge를 사용해 주세요.");
    return;
  }

  if (_isRecording) {
    _recognition && _recognition.stop();
    return;
  }

  _recognition = new SpeechRecognition();
  _recognition.lang = _currentLang === "ko" ? "ko-KR"
                    : _currentLang === "en" ? "en-US"
                    : _currentLang === "zh" ? "zh-CN"
                    : _currentLang === "ja" ? "ja-JP"
                    : _currentLang === "vi" ? "vi-VN"
                    : _currentLang === "th" ? "th-TH"
                    : "km-KH";
  _recognition.continuous     = false;
  _recognition.interimResults = false;

  _recognition.onstart = () => {
    _isRecording = true;
    const btn = document.getElementById("voiceBtn");
    const status = document.getElementById("voiceStatus");
    btn.classList.add("recording");
    btn.querySelector(".voice-icon").textContent = "⏹";
    btn.querySelector(".voice-label").textContent = T("voice_stop");
    status.classList.remove("hidden");
  };

  _recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    const ta = document.getElementById("nlpText");
    ta.value = ta.value ? ta.value + " " + text : text;
    ta.dispatchEvent(new Event("input"));
  };

  _recognition.onend = () => {
    _isRecording = false;
    const btn = document.getElementById("voiceBtn");
    const status = document.getElementById("voiceStatus");
    btn.classList.remove("recording");
    btn.querySelector(".voice-icon").textContent = "🎤";
    btn.querySelector(".voice-label").textContent = T("voice_start");
    status.classList.add("hidden");
  };

  _recognition.onerror = (e) => {
    _isRecording = false;
    const btn = document.getElementById("voiceBtn");
    btn.classList.remove("recording");
    btn.querySelector(".voice-icon").textContent = "🎤";
    btn.querySelector(".voice-label").textContent = T("voice_start");
    document.getElementById("voiceStatus").classList.add("hidden");
    if (e.error !== "no-speech") alert("음성 인식 오류: " + e.error);
  };

  _recognition.start();
}

/* ── 선순환 모달 ── */
function openPayForwardModal() {
  document.getElementById("payForwardModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function closePayForwardModal() {
  document.getElementById("payForwardModal").classList.add("hidden");
  document.body.style.overflow = "";
}
function closeModalOutside(e) {
  if (e.target.id === "payForwardModal") closePayForwardModal();
}
function payForwardAction(type) {
  const urls = {
    // 💬 따뜻한 응원 → 복지로 공식 홈 (커뮤니티·상담 게시판 접근 가능)
    community: "https://www.bokjiro.go.kr",
    // 🤝 재능나누기 → 나눔포털 (행정안전부 공식 재능나눔 플랫폼)
    talent:    "https://www.nanumkorea.go.kr",
    // 🏡 우리 동네 봉사활동 → 1365 봉사활동 찾기
    volunteer: "https://www.1365.go.kr/vols/main.do",
  };
  if (urls[type]) window.open(urls[type], "_blank", "noopener");
  closePayForwardModal();
}

/* ── 언어 전환 시 동적 UI 재렌더링 ── */
function refreshDynamicUI() {
  // 현재 활성 상태 저장
  const savedSits   = [...state.life_situations];
  const savedFamily = state.family_status;
  const savedIncome = state.income_range;

  // 상황 그리드 재렌더
  const grid = document.getElementById("situationGrid");
  if (grid) {
    grid.innerHTML = "";
    renderSituationGrid();
    grid.querySelectorAll(".sit-card").forEach(btn => {
      if (savedSits.includes(btn.dataset.value)) {
        btn.classList.add("active");
        btn.setAttribute("aria-checked", "true");
      }
    });
  }

  // 칩 재렌더 (가족 칩 제거 → 카운터로 교체됨)
  [
    ["incomeChips",   INCOME_OPTIONS,  "income",   T("income_options")],
    ["nlpGenderChips",GENDER_OPTIONS,  "nlpGender",T("gender_options")],
    ["nlpIncomeChips",INCOME_OPTIONS,  "nlpIncome",T("income_options")],
  ].forEach(([id, opts, key, labels]) => {
    const wrap = document.getElementById(id);
    if (wrap) { wrap.innerHTML = ""; renderChips(id, opts, false, key, labels); }
  });

  // 가족 카운터 레이블 재렌더 (언어 변경 시)
  renderFamilyComposer();

  document.querySelectorAll("#incomeChips .chip").forEach(c => {
    if (c.dataset.value === savedIncome) { c.classList.add("active"); c.setAttribute("aria-checked","true"); }
  });
}

/* ── 재조회 ── */
function retry() { location.reload(); }

/* ══════════════════════════════════════════════
   마이페이지 — localStorage 기반 프로필·저장 결과
   키: athena_profile_v1 (프로필)
       athena_saved_results (저장된 복지 목록)
══════════════════════════════════════════════ */
const SAVED_KEY = "athena_saved_results";

/* ── 마이페이지 열기 ── */
function openMyPage() {
  renderMyProfile();
  renderSavedList();
  const modal = document.getElementById("myPageModal");
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

/* ── 마이페이지 닫기 ── */
function closeMyPage() {
  document.getElementById("myPageModal").classList.add("hidden");
  document.body.style.overflow = "";
}
function closeMyPageOutside(e) {
  if (e.target.id === "myPageModal") closeMyPage();
}

/* ── 내 정보 렌더링 ── */
function renderMyProfile() {
  const grid = document.getElementById("myPageProfile");
  if (!grid) return;
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) {
    grid.innerHTML = `<p style="color:#94a3b8;font-size:0.83rem;padding:8px 0">${T("mypage_no_profile") || "저장된 정보가 없습니다. 조건을 입력하면 자동 저장됩니다."}</p>`;
    return;
  }
  const p = JSON.parse(raw);
  const m = p.family_members || {};
  const memberParts = [];
  if (m.spouse)       memberParts.push(`배우자 ${m.spouse}`);
  if (m.parent)       memberParts.push(`부모 ${m.parent}`);
  if (m.child)        memberParts.push(`아동 ${m.child}`);
  if (m.teen)         memberParts.push(`청소년 ${m.teen}`);
  if (m.youth)        memberParts.push(`청년 ${m.youth}`);
  if (m.middle)       memberParts.push(`중장년 ${m.middle}`);
  if (m.grandparent)  memberParts.push(`조부모 ${m.grandparent}`);
  const totalMem = 1+(m.spouse||0)+(m.parent||0)+(m.child||0)+(m.teen||0)+(m.youth||0)+(m.middle||0)+(m.grandparent||0);
  const familyVal = memberParts.length ? `총 ${totalMem}명 (${memberParts.join(", ")})` : (p.family_status || "-");

  const items = [
    { label: "📍 지역",   value: [p.region, p.district].filter(Boolean).join(" ") || "-" },
    { label: "👤 나이",   value: p.age || "-" },
    { label: "👨‍👩‍👧 가족",  value: familyVal },
    { label: "💰 소득",   value: p.income_amount ? `월 ${p.income_amount}만원` : (p.income_range || "-") },
  ];
  grid.innerHTML = items.map(it => `
    <div class="mypage-profile-item">
      <div class="mypage-profile-label">${it.label}</div>
      <div class="mypage-profile-value">${it.value}</div>
    </div>`).join("");
}

/* ── 저장된 복지 목록 렌더링 ── */
function renderSavedList() {
  const listEl = document.getElementById("myPageSavedList");
  const emptyEl = document.getElementById("myPageEmpty");
  if (!listEl) return;

  const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  if (saved.length === 0) {
    listEl.innerHTML = "";
    if (emptyEl) emptyEl.classList.remove("hidden");
    return;
  }
  if (emptyEl) emptyEl.classList.add("hidden");

  listEl.innerHTML = saved.map((item, idx) => `
    <div class="mypage-saved-card">
      <div class="mypage-saved-card-body">
        <div class="mypage-saved-card-title">${item.title || "-"}</div>
        <div class="mypage-saved-card-desc">${item.desc || ""}</div>
        <div class="mypage-saved-card-date">📅 ${item.saved_at || ""}</div>
      </div>
      <button class="mypage-saved-del" onclick="deleteSavedResult(${idx})" title="삭제">✕</button>
    </div>`).join("");
}

/* ── 개별 저장 항목 삭제 ── */
function deleteSavedResult(idx) {
  const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  saved.splice(idx, 1);
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  renderSavedList();
}

/* ── 현재 결과 마이페이지에 저장 ── */
function saveResultToMyPage() {
  // 현재 결과 카드에서 타이틀/설명 수집
  const cards = document.querySelectorAll("#resultList .result-card, #resultList .policy-card");
  if (cards.length === 0) {
    showToast(T("mypage_no_result") || "저장할 결과가 없습니다.");
    return;
  }

  const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,"0")}.${String(now.getDate()).padStart(2,"0")}`;

  let addedCount = 0;
  cards.forEach(card => {
    const titleEl = card.querySelector(".card-title, .policy-title, h3, h4");
    const descEl  = card.querySelector(".card-desc, .policy-desc, p");
    const title   = titleEl ? titleEl.textContent.trim() : "복지 서비스";
    const desc    = descEl  ? descEl.textContent.trim().slice(0, 80) : "";

    // 중복 체크 (같은 타이틀이면 스킵)
    const alreadyExists = saved.some(s => s.title === title);
    if (!alreadyExists) {
      saved.push({ title, desc, saved_at: dateStr });
      addedCount++;
    }
  });

  localStorage.setItem(SAVED_KEY, JSON.stringify(saved));

  if (addedCount > 0) {
    showToast(`✅ ${addedCount}개 복지 서비스를 마이페이지에 저장했습니다.`);
  } else {
    showToast("이미 저장된 항목입니다.");
  }
}

/* ── 전체 삭제 ── */
function clearMyPage() {
  if (!confirm("저장된 모든 정보를 삭제하시겠습니까?")) return;
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(SAVED_KEY);
  renderMyProfile();
  renderSavedList();
  showToast("🗑 저장 정보가 삭제되었습니다.");
}

/* ── 토스트 알림 ── */
function showToast(msg) {
  let toast = document.getElementById("saveToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "saveToast";
    toast.className = "save-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 2800);
}
