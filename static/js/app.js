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

  const members = [
    { key:"spouse",      icon:"💑",  label:"배우자·파트너", hint:"" },
    { key:"parent",      icon:"👨‍👩‍👧", label:"부모",         hint:"최대 2명" },
    { key:"child",       icon:"👶",  label:"아동 자녀",     hint:"0~12세" },
    { key:"teen",        icon:"🧒",  label:"청소년 자녀",   hint:"13~18세" },
    { key:"youth",       icon:"🧑",  label:"청년 자녀",     hint:"19~34세" },
    { key:"middle",      icon:"🧑‍💼", label:"중장년 자녀",   hint:"35~64세" },
    { key:"grandparent", icon:"👴",  label:"조부모",        hint:"65세 이상" },
  ];

  const total = estimateHouseholdSize();

  wrap.innerHTML = `
    <div class="fc2-header">
      <div class="fc2-total-wrap">
        <span class="fc2-total-label">총 가구원</span>
        <span class="fc2-total-num" id="fcTotal">${total}</span>
        <span class="fc2-total-unit">명</span>
      </div>
      <div class="fc2-self-chip">👤 나 (본인) 1명</div>
    </div>
    <div class="fc2-grid">
      ${members.map(m => {
        const val = state.family_members[m.key] || 0;
        const active = val > 0;
        const isOne = FC_MAX[m.key] === 1; // 배우자는 토글만
        return `<div class="fc2-card ${active ? "fc2-card--active" : ""}"
                     id="fc2_${m.key}"
                     onclick="fcToggle('${m.key}', ${isOne})"
                     role="button" tabindex="0">
          <div class="fc2-icon">${m.icon}</div>
          <div class="fc2-text">
            <div class="fc2-name">${m.label}</div>
            ${m.hint ? `<div class="fc2-hint">${m.hint}</div>` : ""}
          </div>
          <div class="fc2-right">
            ${active && !isOne ? `
            <div class="fc2-ctrl" onclick="event.stopPropagation()">
              <button class="fc2-btn fc2-minus" onclick="fcChange('${m.key}',-1)"
                ${val <= 1 ? "disabled" : ""}>−</button>
              <span class="fc2-num" id="fcn_${m.key}">${val}</span>
              <button class="fc2-btn fc2-plus" onclick="fcChange('${m.key}',1)"
                ${val >= FC_MAX[m.key] ? "disabled" : ""}>+</button>
            </div>` : active && isOne ? `
            <div class="fc2-selected-badge">1명</div>` : `
            <div class="fc2-check" style="display:none"></div>`}
          </div>
        </div>`;
      }).join("")}
    </div>`;
}

// 카드 토글 (탭으로 선택/해제)
function fcToggle(key, isOne) {
  const cur = state.family_members[key] || 0;
  if (cur > 0) {
    // 선택 해제 → 0으로
    state.family_members[key] = 0;
  } else {
    // 선택 → 1로 시작
    state.family_members[key] = 1;
  }
  // 총계 업데이트 후 리렌더
  const totalEl = document.getElementById("fcTotal");
  if (totalEl) totalEl.textContent = estimateHouseholdSize();
  renderFamilyComposer();
  saveProfile();
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
  const card = document.getElementById(`fc2_${key}`);
  if (card) {
    card.querySelector(".fc2-minus").disabled = (next === 0);
    card.querySelector(".fc2-plus").disabled  = (next >= FC_MAX[key]);
    card.classList.toggle("fc2-card--active", next > 0);
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
  // 힌트 텍스트 업데이트
  const hint = document.getElementById("stepAHint");
  if (hint) {
    if (!state.region)        hint.textContent = "👆 서울 또는 경기를 선택해 주세요";
    else if (!state.district) hint.textContent = "👆 시·군·구를 선택해 주세요";
    else if (!age || age < 1) hint.textContent = "👆 나이를 입력해 주세요";
    else                      hint.textContent = "";
  }
}

/* ── 단계 이동 ── */
function goToA() {
  show("stepA"); setDot(1);
  document.getElementById("inputCard").scrollIntoView({ behavior: "smooth" });
}

function goToB() {
  const age = parseInt(document.getElementById("inputAge").value);
  if (!state.region)             { showToast("📍 서울 또는 경기를 먼저 선택해 주세요"); _shakeHint(); return; }
  if (!state.district)           { showToast("📍 시·군·구를 선택해 주세요"); _shakeHint(); return; }
  if (!age || age < 1 || age > 120) { showToast("✏️ 나이를 올바르게 입력해 주세요 (1~120)"); _shakeHint(); return; }
  state.age = String(age);
  show("stepB"); setDot(2);
  document.getElementById("inputCard").scrollIntoView({ behavior: "smooth" });
}
function _shakeHint() {
  const hint = document.getElementById("stepAHint");
  if (!hint) return;
  hint.classList.remove("hint-shake");
  void hint.offsetWidth; // reflow
  hint.classList.add("hint-shake");
}

function goToC() {
  // stepB+C 통합: stepC는 더 이상 별도 단계 없음 — 하위호환 유지
  show("stepB"); setDot(2);
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

  /* Supabase 실시간 DB 정책 카드 — 복지로 스타일 */
  if (data.supabase_policies && data.supabase_policies.length > 0) {
    _lastSupaPolicies = data.supabase_policies; // 필터용 저장
    body.insertAdjacentHTML("beforeend",
      `<div class="supa-section" id="supaSection">${renderSupaCards(data.supabase_policies)}</div>`);
    initResultFilter(data.supabase_policies);
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

  // 하단 탭 — 내결과 활성화 + 배지
  document.querySelectorAll(".bnav-tab").forEach(t => t.classList.remove("active"));
  const resultTab = document.getElementById("bnav-result");
  if (resultTab) resultTab.classList.add("active");
  const totalCards = (data.ontology ? (data.ontology.summary?.total || 0) : 0)
                   + (data.supabase_policies ? data.supabase_policies.length : 0);
  updateResultBadge(totalCards);
}

/* ══════════════════════════════════════
   복지로 스타일 카드 렌더링 + 필터
══════════════════════════════════════ */
let _lastSupaPolicies = [];
let _activeFilterTag = "";

// 카테고리 정의
const FILTER_CATS = {
  lifecycle: ["임신·출산","영유아","아동","청소년","청년","중장년","노년","임산부"],
  household: ["저소득","장애인","한부모","조손","다자녀","다문화","탈북민","보훈"],
  topic:     ["신체건강","정신건강","생활지원","주거","일자리","문화","여가","안전","위기",
               "보육","교육","입양","위탁","서민금융","법률","에너지","돌봄"],
};

function renderSupaCards(policies) {
  if (!policies || !policies.length) return "";
  let html = `<p class="supa-header">📋 맞춤 복지서비스 <span class="supa-badge">${policies.length}건</span></p>`;
  policies.forEach(p => {
    const tags = (p.tags||[]).map(t=>`<span class="bk-tag">${t}</span>`).join("");
    const online = p.online_apply ? `<span class="bk-online-badge">💻 온라인 신청</span>` : "";
    html += `<div class="bk-card" data-tags="${(p.tags||[]).join(",")}">
      <div class="bk-card-head">
        <div class="bk-name">${p.name}</div>
        ${online}
      </div>
      ${p.description ? `<p class="bk-desc">${p.description}</p>` : ""}
      <div class="bk-meta">
        ${p.source  ? `<div class="bk-meta-row"><span class="bk-meta-label">담당부처</span><span class="bk-meta-val">${p.source}</span></div>` : ""}
        ${p.benefit ? `<div class="bk-meta-row"><span class="bk-meta-label">제공유형</span><span class="bk-meta-val">${p.benefit}</span></div>` : ""}
        ${p.how_to_apply && p.how_to_apply !== "Y" && p.how_to_apply !== "N"
            ? `<div class="bk-meta-row"><span class="bk-meta-label">신청방법</span><span class="bk-meta-val">${p.how_to_apply}</span></div>` : ""}
        ${p.contact ? `<div class="bk-meta-row"><span class="bk-meta-label">문의처</span><span class="bk-meta-val">${p.contact}</span></div>` : ""}
      </div>
      ${tags ? `<div class="bk-tags">${tags}</div>` : ""}
      <a class="bk-detail-btn" href="${p.url||'https://www.bokjiro.go.kr'}" target="_blank" rel="noopener">자세히 보기</a>
    </div>`;
  });
  return html;
}

function initResultFilter(policies) {
  const wrap = document.getElementById("resultFilterWrap");
  if (!wrap) return;
  wrap.classList.remove("hidden");
}

function rfilterTab(btn, cat) {
  document.querySelectorAll(".rfilter-tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  _activeFilterTag = "";

  const chipsEl = document.getElementById("rfilterChips");
  if (cat === "all") {
    chipsEl.classList.add("hidden");
    chipsEl.innerHTML = "";
    _applyFilter("");
    return;
  }

  const chips = FILTER_CATS[cat] || [];
  chipsEl.innerHTML = chips.map(c =>
    `<button class="rfilter-chip" onclick="rfilterChip(this,'${c}')">${c}</button>`
  ).join("") + `<button class="rfilter-chip rfilter-chip--reset" onclick="rfilterChip(this,'')">전체보기</button>`;
  chipsEl.classList.remove("hidden");
}

function rfilterChip(btn, tag) {
  document.querySelectorAll(".rfilter-chip").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  _activeFilterTag = tag;
  _applyFilter(tag);
}

function _applyFilter(tag) {
  document.querySelectorAll(".bk-card").forEach(card => {
    if (!tag) { card.style.display = ""; return; }
    const cardTags = (card.dataset.tags || "").toLowerCase();
    card.style.display = cardTags.includes(tag.toLowerCase()) ? "" : "none";
  });
  // ont-card도 태그 기반 필터
  document.querySelectorAll(".ont-card").forEach(card => {
    if (!tag) { card.style.display = ""; return; }
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(tag.toLowerCase()) ? "" : "none";
  });
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

/* ══════════════════════════════════════
   하단 탭 네비게이션 (v3.4)
══════════════════════════════════════ */

// 현재 활성 탭
let _currentTab = "home";

function bnavGo(tab) {
  _currentTab = tab;

  // 탭 버튼 활성화
  document.querySelectorAll(".bnav-tab").forEach(t => t.classList.remove("active"));
  const activeTab = document.getElementById("bnav-" + tab);
  if (activeTab) activeTab.classList.add("active");

  // 패널 전환
  const main = document.querySelector(".main");
  const calPanel  = document.getElementById("calendarPanel");
  const locPanel  = document.getElementById("localPanel");

  const myinfoPanel = document.getElementById("myinfoPanel");
  const nbrPanel    = document.getElementById("neighborPanel");

  if (tab === "home") {
    if (main) main.classList.remove("hidden");
    calPanel && calPanel.classList.add("hidden");
    locPanel && locPanel.classList.add("hidden");
    myinfoPanel && myinfoPanel.classList.add("hidden");
    nbrPanel && nbrPanel.classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });

  } else if (tab === "calendar") {
    if (main) main.classList.add("hidden");
    calPanel && calPanel.classList.remove("hidden");
    locPanel && locPanel.classList.add("hidden");
    myinfoPanel && myinfoPanel.classList.add("hidden");
    nbrPanel && nbrPanel.classList.add("hidden");
    renderCalendar();
    window.scrollTo({ top: 0, behavior: "smooth" });

  } else if (tab === "local") {
    if (main) main.classList.add("hidden");
    calPanel && calPanel.classList.add("hidden");
    locPanel && locPanel.classList.remove("hidden");
    myinfoPanel && myinfoPanel.classList.add("hidden");
    nbrPanel && nbrPanel.classList.add("hidden");
    renderLocal("서울특별시");
    window.scrollTo({ top: 0, behavior: "smooth" });

  } else if (tab === "myinfo") {
    if (main) main.classList.add("hidden");
    calPanel && calPanel.classList.add("hidden");
    locPanel && locPanel.classList.add("hidden");
    myinfoPanel && myinfoPanel.classList.remove("hidden");
    nbrPanel && nbrPanel.classList.add("hidden");
    renderMyinfoPanel();
    window.scrollTo({ top: 0, behavior: "smooth" });

  } else if (tab === "neighbor") {
    if (main) main.classList.add("hidden");
    calPanel && calPanel.classList.add("hidden");
    locPanel && locPanel.classList.add("hidden");
    myinfoPanel && myinfoPanel.classList.add("hidden");
    nbrPanel && nbrPanel.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function updateResultBadge(count) {
  // v3.4: 결과 배지 제거 (복지달력 배지로 대체)
}

/* ══════════════════════════════════════
   📅 복지달력 — 연간 주요 복지 일정
══════════════════════════════════════ */

const WELFARE_CALENDAR = [
  // 상시
  { month:0,  name:"기초생활수급자 급여", desc:"매월 20일 지급 (생계·의료·주거·교육급여)", tag:"상시", color:"#16a34a", url:"https://www.bokjiro.go.kr" },
  { month:0,  name:"장애인연금·수당", desc:"매월 20일 지급, 중증장애인 대상", tag:"상시", color:"#16a34a", url:"https://www.bokjiro.go.kr" },
  // 1월
  { month:1,  name:"근로·자녀장려금 반기 지급", desc:"하반기분 1월 지급 (국세청 신청)", tag:"1월", color:"#2563eb", url:"https://www.nts.go.kr" },
  // 3월
  { month:3,  name:"청년내일저축계좌 모집", desc:"소득 50% 이하 청년, 3년 적립 시 정부 매칭", tag:"3월", color:"#7c3aed", url:"https://www.bokjiro.go.kr" },
  { month:3,  name:"에너지바우처 신청", desc:"취약계층 냉·난방 비용 지원", tag:"3월", color:"#ea580c", url:"https://www.energyv.or.kr" },
  // 5월
  { month:5,  name:"근로·자녀장려금 정기 신청", desc:"5월 1일~31일, 홈택스 신청", tag:"5월", color:"#2563eb", url:"https://www.hometax.go.kr" },
  // 6월
  { month:6,  name:"서울 청년수당 모집", desc:"서울 거주 만 19~34세, 월 50만원 6개월", tag:"6월", color:"#0891b2", url:"https://youth.seoul.go.kr" },
  // 7월
  { month:7,  name:"에너지바우처 하계 지원", desc:"여름철 전기요금 지원, 자동 차감", tag:"7월", color:"#ea580c", url:"https://www.energyv.or.kr" },
  { month:7,  name:"기초연금 인상 적용", desc:"매년 물가상승률 반영 인상", tag:"7월", color:"#16a34a", url:"https://www.bokjiro.go.kr" },
  // 9월
  { month:9,  name:"청년도약계좌 모집", desc:"월 70만원 납입 시 정부 기여금 지원", tag:"9월", color:"#7c3aed", url:"https://www.kinfa.or.kr" },
  // 10월
  { month:10, name:"근로·자녀장려금 반기 신청", desc:"상반기분 10월 신청, 12월 지급", tag:"10월", color:"#2563eb", url:"https://www.hometax.go.kr" },
  { month:10, name:"에너지바우처 동계 신청", desc:"겨울철 난방비 지원 신청 시작", tag:"10월", color:"#ea580c", url:"https://www.energyv.or.kr" },
  // 11월
  { month:11, name:"경기도 청년기본소득 신청", desc:"경기도 거주 만 24세, 분기별 25만원", tag:"11월", color:"#0891b2", url:"https://www.gg.go.kr" },
  // 12월
  { month:12, name:"연말정산 미리보기 시작", desc:"국세청 홈택스, 연말정산 간소화 서비스", tag:"12월", color:"#dc2626", url:"https://www.hometax.go.kr" },
];

function renderCalendar() {
  const body = document.getElementById("calendarBody");
  if (!body) return;

  const now = new Date();
  const thisMonth = now.getMonth() + 1;

  // 이번 달 + 다음 달 + 상시 우선 정렬
  const sorted = [...WELFARE_CALENDAR].sort((a, b) => {
    const scoreA = a.month === 0 ? 99 : a.month >= thisMonth ? a.month - thisMonth : a.month + 12 - thisMonth;
    const scoreB = b.month === 0 ? 99 : b.month >= thisMonth ? b.month - thisMonth : b.month + 12 - thisMonth;
    return scoreA - scoreB;
  });

  // 달력 배지 (이번 달 항목 수)
  const thisMonthCount = WELFARE_CALENDAR.filter(e => e.month === thisMonth).length;
  const calBadge = document.getElementById("calBadge");
  if (calBadge && thisMonthCount > 0) {
    calBadge.textContent = thisMonthCount;
    calBadge.classList.remove("hidden");
  }

  let html = "";
  let lastMonth = -1;

  sorted.forEach(ev => {
    const monthLabel = ev.month === 0 ? "🔄 상시 진행" : `${ev.month}월`;
    if (ev.month !== lastMonth) {
      const isNow = ev.month === thisMonth;
      html += `<div class="cal-month-header ${isNow ? "cal-now" : ""}">
        ${isNow ? "📍 이번 달 — " : ""}${monthLabel}
        ${isNow ? '<span class="cal-now-badge">지금 신청!</span>' : ""}
      </div>`;
      lastMonth = ev.month;
    }
    html += `<div class="cal-card">
      <div class="cal-card-top">
        <span class="cal-tag" style="background:${ev.color}20;color:${ev.color}">${ev.tag}</span>
        <a class="cal-link-btn" href="${ev.url}" target="_blank" rel="noopener">자세히 →</a>
      </div>
      <p class="cal-name">${ev.name}</p>
      <p class="cal-desc">${ev.desc}</p>
    </div>`;
  });

  body.innerHTML = html;
}

/* ══════════════════════════════════════
   📍 우리동네 — 지역별 맞춤 혜택
══════════════════════════════════════ */

const LOCAL_BENEFITS = {
  "서울특별시": [
    { name:"서울시 청년수당", desc:"만 19~34세 미취업 청년, 월 50만원 × 6개월", contact:"02-2133-5186", url:"https://youth.seoul.go.kr", tag:"청년" },
    { name:"서울시 안심소득 시범사업", desc:"기준 중위소득 85% 이하 가구, 부족분의 절반 지원", contact:"02-120", url:"https://www.seoul.go.kr", tag:"저소득" },
    { name:"서울형 긴급복지 지원", desc:"위기 가구 생계·의료·주거비 신속 지원", contact:"주민센터", url:"https://www.bokjiro.go.kr", tag:"긴급" },
    { name:"서울 희망두배 청년통장", desc:"월 10~15만원 저축 시 서울시 동일 금액 매칭", contact:"02-2133-7395", url:"https://www.seoul.go.kr", tag:"청년" },
    { name:"서울 임신출산 의료비 지원", desc:"임산부 1인당 100만원 국민행복카드 지원", contact:"02-120", url:"https://www.seoul.go.kr", tag:"임신·출산" },
    { name:"어르신 교통비 지원 (65세↑)", desc:"서울 거주 만 65세 이상, 연 10만원 교통카드 충전", contact:"주민센터", url:"https://www.seoul.go.kr", tag:"노인" },
  ],
  "경기도": [
    { name:"경기도 청년기본소득", desc:"경기도 거주 만 24세, 분기 25만원 (연 100만원)", contact:"031-120", url:"https://www.gg.go.kr", tag:"청년" },
    { name:"경기도 산후조리 지원금", desc:"출산 가정 산후조리비 최대 100만원 지원", contact:"031-8008-2114", url:"https://www.gg.go.kr", tag:"임신·출산" },
    { name:"경기도 무한돌봄 긴급복지", desc:"위기 가구 생계·의료·주거비 신속 지원", contact:"031-120", url:"https://www.gg.go.kr", tag:"긴급" },
    { name:"경기도 청년 노동자 통장", desc:"중소기업 재직 청년, 2년 저축 시 최대 1,080만원", contact:"031-120", url:"https://www.gg.go.kr", tag:"청년" },
    { name:"경기도 어르신 교통비 지원", desc:"만 65세 이상, 연 12만원 교통카드 충전", contact:"주민센터", url:"https://www.gg.go.kr", tag:"노인" },
    { name:"경기도 장애인 이동지원", desc:"장애인 콜택시·이동 차량 무료 이용", contact:"031-120", url:"https://www.gg.go.kr", tag:"장애인" },
  ]
};

let _localRegion = "서울특별시";

function localFilter(region) {
  _localRegion = region;
  document.querySelectorAll(".local-region-btn").forEach(b => {
    b.classList.toggle("active", b.textContent.includes(region === "서울특별시" ? "서울" : "경기"));
  });
  renderLocal(region);
}

function renderLocal(region) {
  const body = document.getElementById("localBody");
  if (!body) return;

  const list = LOCAL_BENEFITS[region] || [];
  const tagColors = { "청년":"#7c3aed", "저소득":"#16a34a", "긴급":"#dc2626", "임신·출산":"#db2777", "노인":"#ea580c", "장애인":"#2563eb" };

  let html = `<p class="local-count">${region} 맞춤 혜택 <b>${list.length}건</b></p>`;
  list.forEach(b => {
    const color = tagColors[b.tag] || "#6b7280";
    html += `<div class="cal-card">
      <div class="cal-card-top">
        <span class="cal-tag" style="background:${color}20;color:${color}">${b.tag}</span>
        <a class="cal-link-btn" href="${b.url}" target="_blank" rel="noopener">신청하기 →</a>
      </div>
      <p class="cal-name">${b.name}</p>
      <p class="cal-desc">${b.desc}</p>
      <p class="cal-contact">📞 ${b.contact}</p>
    </div>`;
  });
  body.innerHTML = html;
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

/* ── 내정보 패널 렌더링 ── */
function renderMyinfoPanel() {
  renderMyinfoProfile();
  renderWalletSummary();
  renderMyinfoSaved();
}

function renderMyinfoProfile() {
  const el = document.getElementById("myinfoProfile");
  if (!el) return;
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) {
    el.innerHTML = `<p class="myinfo-empty">저장된 프로필이 없습니다.<br>조건 입력 후 자동 저장됩니다.</p>`;
    return;
  }
  const p = JSON.parse(raw);
  const m = p.family_members || {};
  const members = [
    m.spouse && `배우자 ${m.spouse}명`, m.parent && `부모 ${m.parent}명`,
    m.child && `아동 ${m.child}명`, m.teen && `청소년 ${m.teen}명`,
    m.youth && `청년 ${m.youth}명`, m.middle && `중장년 ${m.middle}명`,
    m.grandparent && `조부모 ${m.grandparent}명`
  ].filter(Boolean);

  el.innerHTML = `
    <div class="myinfo-row"><span class="myinfo-label">📍 지역</span><span class="myinfo-val">${p.region||""} ${p.district||""}</span></div>
    <div class="myinfo-row"><span class="myinfo-label">🎂 나이</span><span class="myinfo-val">${p.age||""}세</span></div>
    <div class="myinfo-row"><span class="myinfo-label">👥 가구</span><span class="myinfo-val">${members.length ? members.join(", ") : "1인 가구"}</span></div>
    <div class="myinfo-row"><span class="myinfo-label">💰 소득</span><span class="myinfo-val">${p.income_range||"미입력"}</span></div>`;
}

/* ── 지갑 요약 배지 ── */
function renderWalletSummary() {
  const el = document.getElementById("walletSummary");
  if (!el) return;
  const list = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  if (!list.length) { el.innerHTML = ""; return; }

  // 전체 항목별 상태 집계
  let total = 0, done = 0, pending = 0, none = 0;
  list.forEach(item => {
    (item.items || []).forEach(it => {
      total++;
      const st = it.status || "none";
      if (st === "done")    done++;
      else if (st === "pending") pending++;
      else none++;
    });
  });

  el.innerHTML = `
    <div class="wallet-badge-row">
      <div class="wallet-badge wallet-badge--total">
        <span class="wb-num">${total}</span>
        <span class="wb-label">전체 혜택</span>
      </div>
      <div class="wallet-badge wallet-badge--done">
        <span class="wb-num">${done}</span>
        <span class="wb-label">신청완료 ✓</span>
      </div>
      <div class="wallet-badge wallet-badge--pending">
        <span class="wb-num">${pending}</span>
        <span class="wb-label">신청예정 ⏳</span>
      </div>
      <div class="wallet-badge wallet-badge--none">
        <span class="wb-num">${none}</span>
        <span class="wb-label">미신청</span>
      </div>
    </div>`;
}

/* ── 저장 목록 렌더링 ── */
function renderMyinfoSaved() {
  const el = document.getElementById("myinfoSaved");
  if (!el) return;
  const list = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  if (!list.length) {
    el.innerHTML = `<p class="myinfo-empty">저장된 혜택이 없습니다.<br>혜택진단 결과에서 📌 버튼을 눌러 저장하세요.</p>`;
    return;
  }

  // 저장된 세션별로 카드 목록 표시
  let html = "";
  list.forEach((item, i) => {
    const items = item.items || [];
    const done    = items.filter(it => it.status === "done").length;
    const pending = items.filter(it => it.status === "pending").length;
    const none    = items.filter(it => !it.status || it.status === "none").length;

    html += `<div class="wallet-session">
      <div class="wallet-session-header">
        <span class="wallet-session-date">${item.savedAt||""}</span>
        <span class="wallet-session-stats">
          ${done ? `<span class="wss-done">완료 ${done}</span>` : ""}
          ${pending ? `<span class="wss-pending">예정 ${pending}</span>` : ""}
          ${none ? `<span class="wss-none">미신청 ${none}</span>` : ""}
        </span>
        <button class="myinfo-saved-del" onclick="deleteSavedResult(${i})">✕</button>
      </div>`;

    if (items.length) {
      items.forEach((it, j) => {
        const st = it.status || "none";
        html += `<div class="wallet-item wallet-item--${st}">
          <div class="wallet-item-left">
            <div class="wallet-item-name">${it.name}</div>
            ${it.desc ? `<div class="wallet-item-desc">${it.desc}</div>` : ""}
          </div>
          <div class="wallet-item-right">
            <div class="wallet-status-toggle">
              <button class="wst-btn ${st==="none"?"wst-active":""}" onclick="setItemStatus(${i},${j},'none')">미신청</button>
              <button class="wst-btn ${st==="pending"?"wst-active wst-pending":""}" onclick="setItemStatus(${i},${j},'pending')">예정</button>
              <button class="wst-btn ${st==="done"?"wst-active wst-done":""}" onclick="setItemStatus(${i},${j},'done')">완료✓</button>
            </div>
            <a href="${it.url||'https://www.bokjiro.go.kr'}" target="_blank" rel="noopener" class="wallet-apply-btn">신청 →</a>
          </div>
        </div>`;
      });
    } else {
      // 구버전 names 배열 fallback
      (item.names || []).forEach(name => {
        html += `<div class="wallet-item wallet-item--none">
          <div class="wallet-item-left"><div class="wallet-item-name">${name}</div></div>
          <div class="wallet-item-right">
            <a href="https://www.bokjiro.go.kr" target="_blank" class="wallet-apply-btn">신청 →</a>
          </div>
        </div>`;
      });
    }
    html += `</div>`;
  });
  el.innerHTML = html;
}

/* ── 항목 상태 변경 (미신청/예정/완료) ── */
function setItemStatus(sessionIdx, itemIdx, status) {
  const list = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  if (!list[sessionIdx] || !list[sessionIdx].items) return;
  list[sessionIdx].items[itemIdx].status = status;
  localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  renderWalletSummary();
  renderMyinfoSaved();
  const labels = { none:"미신청", pending:"신청예정으로 설정", done:"신청완료로 변경 ✅" };
  showToast(labels[status] || "");
}

/* ── 프로필 섹션 접기/펼치기 ── */
function toggleProfileSection() {
  const wrap = document.getElementById("myinfoProfileWrap");
  const icon = document.getElementById("profileToggleIcon");
  if (!wrap) return;
  const hidden = wrap.style.display === "none";
  wrap.style.display = hidden ? "" : "none";
  if (icon) icon.textContent = hidden ? "▾" : "▸";
}

/* ── 장바구니 재조회 ── */
function walletRequery() {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) { showToast("⚠️ 저장된 프로필이 없습니다. 혜택진단을 먼저 해주세요."); return; }
  bnavGo("home");
  showToast("✅ 이전 프로필이 불러와졌습니다. 조회 버튼을 눌러주세요.");
  // 마지막 스텝(C)으로 이동
  setTimeout(() => {
    const age = parseInt(document.getElementById("inputAge").value);
    if (state.region && state.district && age > 0) {
      show("stepC"); setDot(3);
    }
  }, 300);
}

/* ── 저장된 혜택 상세 패널 열기 ── */
function openSavedDetail(idx) {
  const raw = localStorage.getItem(SAVED_KEY);
  const list = raw ? JSON.parse(raw) : [];
  const item = list[idx];
  if (!item) return;

  // 패널 생성 또는 재사용
  let panel = document.getElementById("savedDetailPanel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "savedDetailPanel";
    panel.className = "saved-detail-overlay";
    panel.innerHTML = `
      <div class="saved-detail-sheet" id="savedDetailSheet">
        <div class="saved-detail-handle"></div>
        <div class="saved-detail-header">
          <h3 class="saved-detail-title" id="savedDetailTitle"></h3>
          <button class="saved-detail-close" onclick="closeSavedDetail()">✕</button>
        </div>
        <div class="saved-detail-body" id="savedDetailBody"></div>
      </div>`;
    panel.addEventListener("click", e => { if (e.target === panel) closeSavedDetail(); });
    document.body.appendChild(panel);
  }

  document.getElementById("savedDetailTitle").textContent = `📌 ${item.savedAt} 저장 혜택 (${item.count}건)`;

  const items = item.items || [];
  let bodyHtml = "";
  if (items.length === 0) {
    // 구버전 저장 데이터 (names 배열만 있는 경우)
    const names = item.names || [];
    bodyHtml = names.map(n => `
      <div class="sd-card">
        <div class="sd-name">${n}</div>
        <a href="https://www.bokjiro.go.kr" target="_blank" class="sd-apply-btn">복지로에서 신청 →</a>
      </div>`).join("");
  } else {
    bodyHtml = items.map(it => `
      <div class="sd-card">
        <div class="sd-name">${it.name}</div>
        ${it.desc ? `<div class="sd-desc">${it.desc}</div>` : ""}
        <a href="${it.url || 'https://www.bokjiro.go.kr'}" target="_blank" rel="noopener" class="sd-apply-btn">
          ${it.url ? "바로 신청하기 →" : "복지로에서 신청 →"}
        </a>
      </div>`).join("");
  }

  document.getElementById("savedDetailBody").innerHTML = bodyHtml || `<p style="color:#94a3b8;text-align:center;padding:20px 0">상세 정보가 없습니다.</p>`;

  panel.classList.remove("hidden");
  requestAnimationFrame(() => {
    document.getElementById("savedDetailSheet").classList.add("open");
  });
  document.body.style.overflow = "hidden";
}

function closeSavedDetail() {
  const sheet = document.getElementById("savedDetailSheet");
  const panel = document.getElementById("savedDetailPanel");
  if (!sheet || !panel) return;
  sheet.classList.remove("open");
  setTimeout(() => { panel.classList.add("hidden"); document.body.style.overflow = ""; }, 280);
}

function myinfoEditProfile() {
  // 홈으로 이동해서 프로필 재입력
  bnavGo("home");
  showToast("정보를 수정하고 다시 조회해 주세요 ✏️");
}

/* ── 마이페이지 열기 (레거시 — 내정보 탭으로 대체) ── */
function openMyPage() {
  bnavGo("myinfo");
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

/* ── 현재 결과 내정보에 저장 ── */
function saveResultToMyPage() {
  const ontCards  = document.querySelectorAll(".ont-card");
  const supaCards = document.querySelectorAll(".supa-card");
  const total = ontCards.length + supaCards.length;

  if (total === 0) {
    showToast(T("mypage_no_result") || "저장할 결과가 없습니다. 먼저 복지서비스를 조회해 주세요.");
    return;
  }

  const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,"0")}.${String(now.getDate()).padStart(2,"0")}`;

  // 카드별 상세 데이터 수집
  const items = [];
  ontCards.forEach(c => {
    const name = c.querySelector(".ont-policy-name")?.textContent.trim() || "";
    const desc = c.querySelector(".ont-desc")?.textContent.trim() || "";
    const url  = c.querySelector("a.ont-apply-btn")?.href || "";
    if (name) items.push({ name, desc, url, type: "ont" });
  });
  supaCards.forEach(c => {
    const name = c.querySelector(".supa-name")?.textContent.trim() || "";
    const desc = c.querySelector(".supa-desc")?.textContent.trim() || "";
    const url  = c.querySelector("a.supa-apply-btn")?.href || "";
    if (name) items.push({ name, desc, url, type: "supa" });
  });

  const names = items.map(it => it.name);
  saved.unshift({
    savedAt: dateStr,
    summary: names.slice(0, 3).join(", ") + (names.length > 3 ? ` 외 ${names.length-3}건` : ""),
    count: total,
    items: items,   // ← 상세 데이터 포함
  });

  if (saved.length > 10) saved.splice(10);
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  showToast(`🛒 ${total}건 혜택을 장바구니에 담았습니다!`);
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

/* ══════════════════════════════════════
   이웃혜택 탭 — 대상자 조회 기능
══════════════════════════════════════ */

const NBR_PRESETS = {
  elderly:      { age:"75", situation:"혼자 거주 및 거동불편", income:"80" },
  disability:   { age:"45", situation:"장애 및 의료비 부담", income:"120" },
  single_parent:{ age:"35", situation:"한부모 및 아동양육", income:"150" },
  low_income:   { age:"50", situation:"실직 및 생활비 부족", income:"70" },
  infant:       { age:"30", situation:"임신 및 영유아 양육", income:"200" },
  caregiver:    { age:"65", situation:"돌봄 필요 및 건강 악화", income:"90" },
};

function nbrSelectType(type) {
  const p = NBR_PRESETS[type];
  if (!p) return;
  document.getElementById("nbrAge").value       = p.age;
  document.getElementById("nbrSituation").value = p.situation;
  document.getElementById("nbrIncome").value    = p.income;
  // 버튼 활성화 표시
  document.querySelectorAll(".nbr-type-btn").forEach(b => b.classList.remove("active"));
  event.currentTarget.classList.add("active");
  showToast("✅ 기본 정보가 채워졌습니다. 조회 버튼을 눌러주세요.");
}

async function nbrSearch() {
  const age    = parseInt(document.getElementById("nbrAge").value || "0");
  const region = document.getElementById("nbrRegion").value;
  const situation = document.getElementById("nbrSituation").value.trim();
  const income = parseInt(document.getElementById("nbrIncome").value || "0");

  if (!age || age < 1) { showToast("⚠️ 나이를 입력해주세요."); return; }

  const resultDiv = document.getElementById("nbrResult");
  const resultBody = document.getElementById("nbrResultBody");
  resultDiv.classList.remove("hidden");
  resultBody.innerHTML = `<div class="nbr-loading">🔍 조회 중...</div>`;

  try {
    const payload = {
      age, region,
      district: "",
      life_situations: situation ? [situation] : [],
      work_status: "",
      family_status: "",
      income_range: income ? (income <= 100 ? "100만원 미만" : income <= 200 ? "100~200만원" : "200만원 이상") : "",
      gender: ""
    };
    const res = await fetch("/api/welfare/search", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("조회 실패");
    const data = await res.json();

    let html = `<div class="nbr-result-summary">
      <span class="nbr-tag">나이 ${age}세</span>
      <span class="nbr-tag">${region}</span>
      ${income ? `<span class="nbr-tag">월 ${income}만원</span>` : ""}
    </div>`;

    if (data.supabase_policies && data.supabase_policies.length > 0) {
      html += `<div class="nbr-card-list">`;
      data.supabase_policies.forEach(p => {
        html += `<div class="nbr-pol-card">
          <div class="nbr-pol-name">${p.name}</div>
          ${p.description ? `<div class="nbr-pol-desc">${p.description}</div>` : ""}
          <a href="${p.url||'https://www.bokjiro.go.kr'}" target="_blank" class="nbr-pol-link">신청하기 →</a>
        </div>`;
      });
      html += `</div>`;
    } else {
      // 정적 결과 표시
      let count = 0;
      html += `<div class="nbr-card-list">`;
      (data.results||[]).forEach(section => {
        (section.services||[]).forEach(svc => {
          if (count++ >= 6) return;
          html += `<div class="nbr-pol-card">
            <div class="nbr-pol-name">${svc.name}</div>
            <a href="${svc.url}" target="_blank" class="nbr-pol-link">바로가기 →</a>
          </div>`;
        });
      });
      html += `</div>`;
    }
    resultBody.innerHTML = html;
  } catch(e) {
    resultBody.innerHTML = `<div class="nbr-error">조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</div>`;
  }
}
