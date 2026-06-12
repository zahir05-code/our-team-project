/* 아테나 복지서비스 — 3단계 미니멀 UX (v2.4 다국어) */

/* ── 딥링크 테이블 (build_welfare_deeplinks.py 생성 JSON) ── */
let _deepLinks = {};   // id → {detailUrl, applyUrl, matchType, ...}

async function loadDeepLinks() {
  try {
    const res = await fetch("/static/js/welfareDeepLinks.json?v=5.1");
    if (!res.ok) return;
    const arr = await res.json();
    arr.forEach(item => { _deepLinks[item.id] = item; });
    console.log(`[딥링크] ${arr.length}개 로드 완료`);
  } catch(e) {
    console.warn("[딥링크] 로드 실패 — buildApplyUrl fallback 사용", e);
  }
}

/** policy_id로 detailUrl 조회 (없으면 null) */
function getDeepLink(policyId) {
  return _deepLinks[policyId] || null;
}

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
  loadDeepLinks();   // 딥링크 JSON 비동기 로드
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

  /* ── 전체 정책을 중앙부처 / 지자체 / 민간 버킷으로 분류 ── */
  const buckets = { central: [], local: [], private: [] };

  // 온톨로지 카드 분류
  if (data.ontology && data.ontology.summary.total > 0) {
    const ont = data.ontology;
    [...ont.definite, ...ont.possible, ...ont.future].forEach(p => {
      const lv = (p.level || "").trim();
      if (lv === "지자체") buckets.local.push({ src:"ont", policy:p, match: _ontMatchLabel(p, ont) });
      else if (lv === "민간") buckets.private.push({ src:"ont", policy:p, match: _ontMatchLabel(p, ont) });
      else buckets.central.push({ src:"ont", policy:p, match: _ontMatchLabel(p, ont) });
    });
  }

  // Supabase 카드 분류
  if (data.supabase_policies && data.supabase_policies.length > 0) {
    _lastSupaPolicies = data.supabase_policies;
    data.supabase_policies.forEach(p => {
      const src = (p.source || "").trim();
      if (/서울|경기|시청|구청|군청|지자체/.test(src)) buckets.local.push({ src:"bk", policy:p });
      else if (/민간|협회|재단|법인|NGO/.test(src))    buckets.private.push({ src:"bk", policy:p });
      else buckets.central.push({ src:"bk", policy:p });
    });
  }

  // 링크 섹션 → 지자체 버킷에 추가
  if (data.results && data.results.some(s => s.services.length > 0)) {
    data.results.forEach(sec => {
      sec.services.forEach(svc => {
        buckets.local.push({ src:"link", policy:{ name: svc.name, url: svc.url, description: sec.section } });
      });
    });
  }

  const totalAll = buckets.central.length + buckets.local.length + buckets.private.length;
  if (totalAll === 0) {
    body.insertAdjacentHTML("beforeend",
      `<p style="text-align:center;color:#94a3b8;padding:30px 0">조건에 맞는 서비스를 찾지 못했습니다.<br>정보를 더 입력하면 더 많은 결과가 나올 수 있습니다.</p>`);
  } else {
    // 면책 고지
    body.insertAdjacentHTML("beforeend", `
      <div class="ont-disclaimer" style="margin-bottom:8px">
        ${T("disclaimer")}
        <span class="disclaimer-legal">${T("pledge_legal")}</span>
      </div>`);
    body.insertAdjacentHTML("beforeend", renderSourceTabs(buckets));
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

/* ────────────────────────────────────────────────────────
   buildApplyUrl — ChatGPT resolveWelfareDeepLink 개념 반영
   우선순위:
     1순위 wlfareInfoId 포함 URL → 복지로 해당 서비스 상세 직접 연결
     2순위 전용 기관 URL         → 워크넷/고용보험/건강보험 등 직접 연결
     3순위 경기도                → 경기복지재단 검색
     4순위 fallback              → 복지로 통합검색 (실제 작동 URL)
   ──────────────────────────────────────────────────────── */
function buildApplyUrl(p) {
  const pid  = (p.policy_id || "").trim();
  const url  = (p.url || p.apply_url || "").trim();
  const name = (p.name || "").trim();
  const src  = (p.source || "").trim();
  const keyword = encodeURIComponent(name.replace(/\s*\(.*?\)\s*/g,"").trim());

  /* ── 0순위: 딥링크 JSON 테이블 (build_welfare_deeplinks.py 생성) ── */
  if (pid) {
    const dl = getDeepLink(pid);
    if (dl && dl.detailUrl && !dl.detailUrl.includes("search.do")) {
      return {
        url: dl.detailUrl,
        label: `🔗 ${dl.title} 바로가기 →`,
        type: "deeplink",
        tier: 0,
      };
    }
  }

  /* ── 1순위: 복지로 서비스 상세 직접 URL (wlfareInfoId 확보된 경우) ── */
  if (url && url.includes("wlfareInfoId")) {
    return {
      url,
      label: "🔗 복지로 해당 서비스 바로가기 →",
      type: "bokjiro",
      tier: 1,
    };
  }

  /* ── 2순위: 타 공공기관 전용 서비스 페이지 ── */
  const GENERIC = ["https://www.bokjiro.go.kr", ""];
  if (url && !GENERIC.includes(url)) {
    const SITE_LABELS = {
      "nhis.or.kr":          "🔗 국민건강보험공단 바로가기 →",
      "work.go.kr":          "🔗 워크넷 바로가기 →",
      "ei.go.kr":            "🔗 고용보험 신청 바로가기 →",
      "semas.or.kr":         "🔗 소상공인진흥공단 바로가기 →",
      "saeil.mogef.go.kr":   "🔗 새일센터 바로가기 →",
      "childcare.go.kr":     "🔗 아이돌봄서비스 바로가기 →",
      "kinfa.or.kr":         "🔗 서민금융진흥원 바로가기 →",
      "energyvoucher.or.kr": "🔗 에너지바우처 바로가기 →",
      "lh.or.kr":            "🔗 LH공사 바로가기 →",
      "danuri.go.kr":        "🔗 다누리(다문화가족) 바로가기 →",
      "moel.go.kr":          "🔗 고용노동부 바로가기 →",
      "youth.seoul.go.kr":   "🔗 서울청년포털 바로가기 →",
      "welfare.seoul.go.kr": "🔗 서울복지포털 바로가기 →",
      "wis.seoul.go.kr":     "🔗 서울복지포털 바로가기 →",
      "basicincome.gg.go.kr":"🔗 경기도 청년기본소득 바로가기 →",
      "gg.go.kr":            "🔗 경기도청 바로가기 →",
      "ggwf.or.kr":          "🔗 경기복지재단 바로가기 →",
      "mnuri.kr":            "🔗 문화누리카드 바로가기 →",
      "ableservice.or.kr":   "🔗 장애인활동지원 공식 사이트 →",
    };
    const host = Object.keys(SITE_LABELS).find(k => url.includes(k));
    return {
      url,
      label: host ? SITE_LABELS[host] : "🔗 관련 기관 바로가기 →",
      type: "external",
      tier: 2,
    };
  }

  /* ── 3순위: 경기도 서비스 → 경기복지재단 검색 ── */
  if (src.includes("경기") || name.includes("경기") || pid.startsWith("GG")) {
    return {
      url: `https://www.ggwf.or.kr/main/welfare/welfareInfo.do?searchKeyword=${keyword}`,
      label: "🔗 경기복지재단 서비스 검색 →",
      type: "ggwf",
      tier: 3,
    };
  }

  /* ── 4순위: 복지로 통합검색 fallback (실제 작동 URL) ── */
  return {
    url: `https://www.bokjiro.go.kr/ssis-tbu/search/search.do?query=${keyword}`,
    label: "🔍 복지로에서 서비스 검색 →",
    type: "bokjiro-search",
    tier: 4,
  };
}

/* ── 아코디언 토글 (bk-card / ont-card 공용) ── */
function toggleAccordion(id) {
  const body = document.getElementById(id);
  const btn  = document.getElementById("acc-btn-" + id);
  if (!body || !btn) return;
  const opening = body.classList.toggle("acc-open");
  btn.setAttribute("aria-expanded", opening);
  btn.querySelector(".acc-arrow").textContent = opening ? "▾" : "▶";
}

function _accRow(id, icon, label, content) {
  if (!content || content === "Y" || content === "N") return "";
  return `
  <div class="acc-row">
    <button class="acc-trigger" id="acc-btn-${id}"
            onclick="toggleAccordion('${id}')" aria-expanded="false">
      <span class="acc-arrow">▶</span>
      <span class="acc-icon">${icon}</span>
      <span class="acc-label">${label}</span>
    </button>
    <div class="acc-body" id="${id}">${content}</div>
  </div>`;
}

/* ══════════════════════════════════════
   중앙부처 / 지자체 / 민간 탭 UI
══════════════════════════════════════ */
function _ontMatchLabel(p, ont) {
  if (ont.definite.find(x => x.policy_id === p.policy_id)) return "def";
  if (ont.possible.find(x => x.policy_id === p.policy_id)) return "pos";
  return "fut";
}

const _MATCH_META = {
  def: { label:"✅ 즉시 신청 가능",  cls:"badge-def" },
  pos: { label:"🔍 조건 확인 필요",  cls:"badge-pos" },
  fut: { label:"📌 향후 해당 가능",  cls:"badge-fut" },
};

function renderSourceTabs(buckets) {
  const tabs = [
    { key:"central", label:"중앙부처", desc:"정부 부처가 제공하는 전국민 복지서비스" },
    { key:"local",   label:"지자체",   desc:"서울·경기 지역 전용 복지서비스" },
    { key:"private", label:"민간",     desc:"민간·재단·협회 복지서비스" },
  ].filter(t => buckets[t.key].length > 0);

  if (!tabs.length) return "";

  let html = `<div class="src-tabs-wrap">
    <div class="src-tabs" id="srcTabs">`;
  tabs.forEach((t, i) =>
    html += `<button class="src-tab${i===0?" active":""}"
      onclick="switchSrcTab('${t.key}',this)">${t.label}
      <span class="src-tab-cnt">${buckets[t.key].length}</span>
    </button>`);
  html += `</div>`;

  tabs.forEach((t, i) => {
    html += `<div class="src-panel${i===0?"":" hidden"}" id="srcPanel-${t.key}">
      <p class="src-desc">${t.desc}</p>
      <div class="src-cards">`;
    buckets[t.key].forEach((item, ci) => html += renderUnifiedCard(item, t.key, ci));
    html += `</div></div>`;
  });
  html += `</div>`;
  return html;
}

function switchSrcTab(key, btn) {
  document.querySelectorAll(".src-tab").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".src-panel").forEach(p => p.classList.add("hidden"));
  btn.classList.add("active");
  const panel = document.getElementById("srcPanel-" + key);
  if (panel) panel.classList.remove("hidden");
}

function renderUnifiedCard(item, bucket, ci) {
  if (item.src === "link") {
    const p = item.policy;
    return `<div class="uni-card">
      <div class="uni-name">${p.name}</div>
      <p class="uni-desc">${p.description || ""}</p>
      <a class="uni-apply-btn" href="${p.url}" target="_blank" rel="noopener">
        신청 페이지로 →
      </a>
    </div>`;
  }

  if (item.src === "bk") {
    const p = item.policy;
    const applyInfo = buildApplyUrl(p);
    const tags = (p.tags||[]).map(t=>`<span class="uni-tag">${t}</span>`).join("");
    const uid = `bk-${bucket}-${ci}`;
    // 신청방법 아코디언 내용: 신청 텍스트 + 해당 서비스 직접 링크
    const howContent = [
      p.how_to_apply ? `<p class="acc-how-text">${p.how_to_apply}</p>` : "",
      `<a class="acc-site-link" href="${applyInfo.url}" target="_blank" rel="noopener">
        🔗 ${applyInfo.label}</a>`
    ].join("");
    return `<div class="uni-card" data-tags="${(p.tags||[]).join(",")}">
      ${tags ? `<div class="uni-tags">${tags}</div>` : ""}
      <div class="uni-name">${p.name}</div>
      <p class="uni-desc">${p.description || ""}</p>
      <div class="uni-meta">
        ${p.source  ? `<span class="uni-meta-item">🏢 ${p.source}</span>` : ""}
        ${p.contact ? `<span class="uni-meta-item">☎ ${p.contact}</span>` : ""}
      </div>
      <div class="acc-group">
        ${_accRow(`${uid}-ben`, "💰", "지원내용", p.benefit && p.benefit !== p.description ? p.benefit : "")}
        ${_accRow(`${uid}-how`, "📋", "신청방법", howContent)}
      </div>
    </div>`;
  }

  // ont 카드
  const p    = item.policy;
  const match = item.match || "pos";
  const meta  = _MATCH_META[match] || _MATCH_META.pos;
  const name  = getPolicyTr(p.policy_id, "name") || p.name;
  const desc  = getPolicyTr(p.policy_id, "desc") || p.description;
  const auth  = getTr(p.authority) || p.authority;
  const trDocs    = (p.required_docs||[]).map(d => getTr(d));
  const trTags    = (p.tags||[]).map(t => getTr(t));
  const trReasons = (p.reasons||[]).map(r => getTr(r));
  const uid = `ont-${bucket}-${ci}`;

  return `<div class="uni-card uni-card--${match}" data-tags="${trTags.join(",")}">
    <div class="uni-tags">
      <span class="uni-match-badge ${meta.cls}">${meta.label}</span>
      ${trTags.map(t=>`<span class="uni-tag">${t}</span>`).join("")}
    </div>
    <div class="uni-name">${name}</div>
    <p class="uni-desc">${desc}</p>
    <div class="uni-meta">
      <span class="uni-meta-item">📞 ${auth}</span>
      <a class="uni-meta-item tel-link" href="tel:${p.phone.replace(/[^0-9]/g,'')}">${p.phone} ☎</a>
    </div>
    <div class="acc-group">
      ${trDocs.length ? _accRow(`${uid}-doc`, "📄", "필요서류",
          trDocs.map(d=>`<span class="acc-doc-item">• ${d}</span>`).join("")) : ""}
      ${(()=>{ const ai=buildApplyUrl({url:p.apply_url,name:p.name,source:p.source||"",policy_id:p.policy_id||""}); return _accRow(`${uid}-how`,"📋","신청방법",`<a class="acc-site-link" href="${ai.url}" target="_blank" rel="noopener">${ai.label}</a>`); })()}
    </div>
  </div>`;
}

function renderSupaCards(policies) {
  if (!policies || !policies.length) return "";
  let html = `<p class="supa-header">📋 맞춤 복지서비스 <span class="supa-badge">${policies.length}건</span></p>`;
  policies.forEach((p, i) => {
    const tags = (p.tags||[]).map(t=>`<span class="bk-tag">${t}</span>`).join("");
    const online = p.online_apply ? `<span class="bk-online-badge">💻 온라인 신청</span>` : "";
    const applyInfo = buildApplyUrl(p);
    const howId = `bk-how-${i}-${Date.now()}`;
    html += `<div class="bk-card" data-tags="${(p.tags||[]).join(",")}"
               data-policy-id="${p.policy_id||''}" data-url="${p.url||''}" data-name="${p.name}">
      <div class="bk-card-head">
        <div class="bk-name">${p.name}</div>
        ${online}
      </div>
      ${p.description ? `<p class="bk-desc">${p.description}</p>` : ""}
      <div class="bk-meta">
        ${p.source  ? `<div class="bk-meta-row"><span class="bk-meta-label">담당부처</span><span class="bk-meta-val">${p.source}</span></div>` : ""}
        ${p.benefit ? `<div class="bk-meta-row"><span class="bk-meta-label">제공유형</span><span class="bk-meta-val">${p.benefit}</span></div>` : ""}
        ${p.contact ? `<div class="bk-meta-row"><span class="bk-meta-label">문의처</span><span class="bk-meta-val">${p.contact}</span></div>` : ""}
      </div>
      ${_accRow(howId, "📋", "신청방법", [
          p.how_to_apply ? `<p class="acc-how-text">${p.how_to_apply}</p>` : "",
          `<a class="acc-site-link" href="${applyInfo.url}" target="_blank" rel="noopener">🔗 ${applyInfo.label}</a>`
        ].join(""))}
      ${tags ? `<div class="bk-tags">${tags}</div>` : ""}
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
  const name  = getPolicyTr(p.policy_id, "name") || p.name;
  const desc  = getPolicyTr(p.policy_id, "desc") || p.description;
  const auth  = getTr(p.authority) || p.authority;
  const trDocs    = p.required_docs.map(d => getTr(d));
  const trTags    = p.tags.map(t => getTr(t));
  const trReasons = p.reasons.map(r => getTr(r));

  const tags = trTags.length
    ? `<div class="ont-tags">${trTags.map(t=>`<span class="ont-tag">${t}</span>`).join("")}</div>` : "";
  const deadline = p.deadline
    ? `<div class="ont-deadline">⚠️ ${T("ont_deadline", p.deadline)}</div>`
    : `<div class="ont-deadline calm">${T("ont_open")}</div>`;

  // 아코디언용 고유 ID
  const uid = p.policy_id.replace(/\W/g,"_") + "_" + type;
  const howAcc  = p.apply_url
    ? (()=>{ const ai=buildApplyUrl({url:p.apply_url,name:p.name,source:p.source||"",policy_id:p.policy_id||""}); return _accRow("ont-how-"+uid,"📋","신청방법",`<a class="acc-site-link" href="${ai.url}" target="_blank" rel="noopener">${ai.label}</a>`); })()
    : "";
  const docsAcc = trDocs.length
    ? _accRow("ont-docs-" + uid, "📄", "필요서류",
        trDocs.map(d => `<span class="acc-doc-item">• ${d}</span>`).join("")) : "";

  return `<div class="ont-card ont-card-${type}" data-tags="${trTags.join(",")}">
    <div class="ont-card-top">
      <span class="ont-policy-name">${name}</span>
    </div>
    <p class="ont-desc">${desc}</p>
    ${deadline}${tags}
    <div class="ont-authority">📞 ${auth}${T("ont_authority_sep")}
      <a class="tel-link" href="tel:${p.phone.replace(/[^0-9]/g,'')}">${p.phone} ☎</a>
    </div>
    <div class="acc-group">
      ${howAcc}${docsAcc}
    </div>
  </div>`;
}

/* ── FUTURE 토글 ── */
function toggleFuture(futId) {
  const body = document.getElementById(futId);
  const btn  = document.getElementById("futBtn_" + futId);
  if (!body || !btn) return;
  const nowHidden = body.classList.toggle("hidden");
  btn.textContent = nowHidden ? T("ont_expand") : T("ont_collapse");
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
    // 홈 버튼 = 처음 화면으로 리셋
    resetToHome();
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
    initProSearch();
    window.scrollTo({ top: 0, behavior: "smooth" });

  } else if (tab === "myinfo") {
    if (main) main.classList.add("hidden");
    calPanel && calPanel.classList.add("hidden");
    locPanel && locPanel.classList.add("hidden");
    myinfoPanel && myinfoPanel.classList.remove("hidden");
    nbrPanel && nbrPanel.classList.add("hidden");
    renderMyinfoPanel();
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
  /* ────── 상시 ────── */
  {
    month:0, tag:"상시", color:"#16a34a",
    name:"기초생활수급자 급여",
    desc:"생계·의료·주거·교육급여 매월 20일 지급",
    detail:{
      target:"소득인정액이 기준 중위소득 이하인 가구 (급여 종류별 상이)\n• 생계급여: 중위소득 32% 이하\n• 의료급여: 중위소득 40% 이하\n• 주거급여: 중위소득 48% 이하\n• 교육급여: 중위소득 50% 이하",
      benefit:"• 생계급여: 현금 지급 (1인 가구 월 최대 71만 3,102원, 2026년 기준)\n• 의료급여: 병·의원 본인 부담 면제 또는 감면\n• 주거급여: 임차료 지원(최대 월 33만 원) 또는 주택 수선 지원\n• 교육급여: 학용품비·입학금·수업료 등 연 최대 65만 4,000원",
      how:"① 가까운 읍·면·동 주민센터(행정복지센터) 방문 신청\n② 복지로 온라인(www.bokjiro.go.kr) 신청\n③ 복지로 앱(모바일) 신청",
      period:"연중 상시 신청 가능 (언제든지)",
      contact:"보건복지부 복지로 콜센터 ☎ 129",
      applyUrl:"https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF_STND0007",
      applyLabel:"복지로 기초생활수급 신청하기 →",
    },
  },
  {
    month:0, tag:"상시", color:"#16a34a",
    name:"주거급여 — 주택 수선 지원",
    desc:"저소득 가구 낡은 집 수리·보수 무상 지원 (중위소득 48% 이하)",
    detail:{
      target:"소득인정액 기준 중위소득 48% 이하 가구 중 자가 주택 거주자\n(예: 1인 가구 월 소득 약 106만 원 이하, 2026년 기준)",
      benefit:"경보수(도배·장판 등): 최대 457만 원\n중보수(창호·단열 등): 최대 849만 원\n대보수(지붕·기둥 등): 최대 1,241만 원\n※ 수선 주기: 경보수 3년, 중보수 5년, 대보수 7년\n※ 장애인·고령자는 편의시설 추가 설치 가능",
      how:"① 가까운 읍·면·동 주민센터 방문 신청\n② 복지로 온라인 신청\n③ LH 마이홈 콜센터 문의 후 신청 안내",
      period:"연중 상시 신청 가능",
      contact:"LH 마이홈 콜센터 ☎ 1600-1004\n복지로 ☎ 129",
      applyUrl:"https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF_STND0008",
      applyLabel:"복지로 주거급여 신청하기 →",
    },
  },
  {
    month:0, tag:"상시", color:"#16a34a",
    name:"긴급복지지원 — 위기상황 즉시 지원",
    desc:"갑작스러운 위기(실직·화재·질병 등) 발생 시 생계·의료·주거 신속 지원",
    detail:{
      target:"갑작스러운 위기 상황으로 생계 유지가 곤란한 저소득 가구\n(실직, 주소득자 사망·행방불명, 화재, 중한 질병·부상, 가정폭력 피해 등)\n소득·재산 기준: 기준 중위소득 75% 이하, 금융재산 600만 원 이하",
      benefit:"• 생계지원: 4인 가구 기준 월 154만 원 (최대 6회)\n• 의료지원: 300만 원 이내 (최대 2회)\n• 주거지원: 임시거소 제공 또는 주거비 지원 (최대 12회)\n• 복지시설 이용: 사회복지시설 입소 지원 (최대 6개월)\n• 교육지원: 초·중·고 학비 지원 (최대 2회)\n• 연료비·해산비·장제비 등 추가 지원",
      how:"① 읍·면·동 주민센터 또는 시·군·구청 방문 신청\n② 복지로 온라인 신청\n③ ☎ 129 전화 신고 (복지 공무원 현장 출동 가능)",
      period:"연중 상시 (위기 발생 즉시 신청 가능)",
      contact:"보건복지부 복지로 콜센터 ☎ 129",
      applyUrl:"https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF_STND0013",
      applyLabel:"복지로 긴급복지지원 신청하기 →",
    },
  },
  {
    month:0, tag:"상시", color:"#16a34a",
    name:"장애인연금·장애수당",
    desc:"중증장애인 연금 및 경증장애인 수당 매월 20일 지급",
    detail:{
      target:"• 장애인연금: 만 18세 이상 중증장애인(1·2급 및 3급 중복) 중 소득인정액 기준 이하\n• 장애수당: 국민기초생활수급자 또는 차상위계층 중 경증장애인(3~6급)",
      benefit:"• 장애인연금 기초급여: 월 최대 34만 2,510원 (2026년)\n• 장애인연금 부가급여: 수급 유형별 월 2만~40만 8,000원 추가\n• 장애수당: 월 6만 원 (차상위: 월 5만 원)",
      how:"① 읍·면·동 주민센터 방문 신청\n② 복지로 온라인 신청",
      period:"연중 상시 신청 가능",
      contact:"보건복지부 장애인정책과 ☎ 129\n국민연금공단 콜센터 ☎ 1355",
      applyUrl:"https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF_STND0002",
      applyLabel:"복지로 장애인연금 신청하기 →",
    },
  },
  {
    month:0, tag:"상시", color:"#16a34a",
    name:"기초연금",
    desc:"만 65세 이상 저소득 어르신 매월 20일 지급 (최대 월 33만 4,810원)",
    detail:{
      target:"만 65세 이상 대한민국 국적자 중 소득인정액 기준 이하\n• 단독가구: 월 소득인정액 213만 원 이하\n• 부부가구: 월 소득인정액 340만 8,000원 이하 (2026년 기준)",
      benefit:"• 단독가구: 월 최대 33만 4,810원\n• 부부가구: 각 20% 감액 → 최대 53만 5,680원 (합산)\n※ 국민연금 수령액에 따라 일부 감액될 수 있음",
      how:"① 읍·면·동 주민센터 방문 신청 (대리 신청 가능)\n② 국민연금공단 지사 방문 신청\n③ 복지로 온라인 신청\n④ 스마트폰: 국민연금 앱",
      period:"만 65세 도달 생일 1개월 전부터 신청 가능, 연중 상시",
      contact:"보건복지부 기초연금 ☎ 129\n국민연금공단 ☎ 1355",
      applyUrl:"https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF_STND0001",
      applyLabel:"복지로 기초연금 신청하기 →",
    },
  },
  /* ────── 1월 ────── */
  {
    month:1, tag:"1월", color:"#2563eb",
    name:"근로·자녀장려금 반기 지급",
    desc:"하반기분(7~12월 소득) 근로장려금 1월 지급",
    detail:{
      target:"근로소득·사업소득·종교인소득이 있는 가구 중 소득·재산 요건 충족자\n• 단독가구: 총소득 2,200만 원 미만\n• 홑벌이 가구: 총소득 3,200만 원 미만\n• 맞벌이 가구: 총소득 3,800만 원 미만\n※ 가구원 전체 재산합계액 2억 4,000만 원 미만",
      benefit:"• 근로장려금: 최대 330만 원 (맞벌이 기준)\n• 자녀장려금: 자녀 1명당 최대 100만 원\n※ 반기 신청은 상·하반기 소득의 35%를 선지급, 차액은 정산",
      how:"① 홈택스(hometax.go.kr) 온라인 신청\n② 손택스(모바일 앱) 신청\n③ ARS ☎ 1544-9944\n④ 세무서 방문 신청",
      period:"반기 신청: 상반기 소득분은 9월 신청 → 12월 지급\n하반기 소득분은 3월 신청 → 6월 지급\n(1월은 하반기분 자동 지급 월)",
      contact:"국세청 세미래 콜센터 ☎ 126",
      applyUrl:"https://www.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_easy.xml",
      applyLabel:"홈택스 간편 신청하기 →",
    },
  },
  /* ────── 3월 ────── */
  {
    month:3, tag:"3월", color:"#7c3aed",
    name:"청년내일저축계좌 모집",
    desc:"차상위 이하 청년, 월 10만 원 저축 시 정부 30만 원 매칭 (3년 만기)",
    detail:{
      target:"신청 당시 만 19~34세 (수급자·차상위는 만 15~39세)\n소득: 기준 중위소득 100% 이하 (근로·사업 소득 있어야 함)\n재산: 대도시 3.5억·중소도시 2억·농어촌 1.7억 원 미만\n※ 현재 생계·의료급여 수급 중인 경우 별도 요건 적용",
      benefit:"본인 월 10만 원 저축 + 정부 매칭 월 30만 원 → 3년 후 총 1,440만 원 + 이자\n(일반 청년 기준; 수급자·차상위는 매칭액 다름)\n※ 자산형성지원 교육 이수 및 근로 유지 조건 있음",
      how:"① 복지로 온라인 신청 (www.bokjiro.go.kr)\n② 읍·면·동 주민센터 방문 신청\n③ 복지로 앱 신청",
      period:"매년 3~4월 중 모집 (연 1회, 조기 마감 가능)",
      contact:"보건복지부 자립지원과 ☎ 129",
      applyUrl:"https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF_STND0021",
      applyLabel:"복지로 청년내일저축계좌 신청하기 →",
    },
  },
  {
    month:3, tag:"3~10월", color:"#ea580c",
    name:"에너지바우처 신청",
    desc:"취약계층 냉·난방비 지원 — 하절기 6월 15일~12월 31일 신청",
    detail:{
      target:"기초생활수급자(생계·의료급여) 가구 중 아래 중 1명 이상 포함\n• 노인 (65세 이상)\n• 영유아 (6세 미만)\n• 장애인 (등록 장애인)\n• 임산부\n• 중증질환자·희귀질환자·중증난치질환자\n• 한부모가족\n• 소년소녀가정 아동\n※ 주거·교육급여 수급자는 대상 제외",
      benefit:"하절기(7~9월): 전기요금 바우처 자동 차감\n• 1인: 5만 5,000원 / 2인: 7만 3,000원 / 3인 이상: 9만 1,000원\n동절기(10~4월): 전기·도시가스·지역난방·등유·LPG·연탄 중 선택\n• 1인: 20만 9,000원 / 2인: 31만 2,000원 / 3인 이상: 41만 5,000원\n(2026년 기준, 취약 노인 가구 추가 지원 있음)",
      how:"① 읍·면·동 주민센터(행정복지센터) 방문 신청 (본인·대리인 가능)\n② 복지로 온라인 신청 불가 — 반드시 주민센터 방문 또는 ☎ 신청\n③ 에너지바우처 콜센터 ☎ 1600-3190 문의",
      period:"하절기: 2026년 6월 15일 ~ 12월 31일\n동절기: 2026년 10월 중 ~ 2027년 4월 30일\n(연간 2회 각각 신청 필요)",
      contact:"에너지바우처 콜센터 ☎ 1600-3190\n한국에너지공단 ☎ 1600-3101",
      applyUrl:"https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF_STND0033",
      applyLabel:"복지로 에너지바우처 안내 보기 →",
    },
  },
  /* ────── 5월 ────── */
  {
    month:5, tag:"5월", color:"#2563eb",
    name:"근로·자녀장려금 정기 신청",
    desc:"5월 1일~31일 홈택스 신청, 6월 말 지급",
    detail:{
      target:"전년도 근로·사업·종교인 소득이 있는 가구\n• 단독가구 총소득 2,200만 원 미만\n• 홑벌이 가구 3,200만 원 미만\n• 맞벌이 가구 3,800만 원 미만\n재산합계액 2억 4,000만 원 미만",
      benefit:"근로장려금: 단독 최대 165만 원 / 홑벌이 최대 285만 원 / 맞벌이 최대 330만 원\n자녀장려금: 자녀 1명당 최대 100만 원",
      how:"① 홈택스 (hometax.go.kr) → 장려금·연말정산·전자기부금 → 근로·자녀장려금 신청\n② 손택스 앱 신청\n③ ARS ☎ 1544-9944\n④ 세무서 방문\n※ 안내문 받은 경우 QR코드 스캔으로 간편 신청 가능",
      period:"정기 신청: 매년 5월 1일 ~ 5월 31일\n기한 후 신청: 6월 1일 ~ 11월 30일 (10% 감액 지급)",
      contact:"국세청 세미래 콜센터 ☎ 126",
      applyUrl:"https://www.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_easy.xml",
      applyLabel:"홈택스 간편 신청하기 →",
    },
  },
  /* ────── 6월 ────── */
  {
    month:6, tag:"6월", color:"#0891b2",
    name:"서울 청년수당 모집",
    desc:"서울 거주 만 19~34세 미취업 청년, 월 50만 원 × 최대 6개월",
    detail:{
      target:"신청일 기준 서울 거주 만 19~34세\n미취업 상태 (주 30시간 미만 취·창업 포함)\n기준 중위소득 150% 이하\n※ 국민취업지원제도 등 타 취업지원 수당 중복 수혜 불가",
      benefit:"월 50만 원 × 최대 6개월 (총 300만 원)\n사용처 제한 없는 현금 지급\n취업 활동 계획 작성 및 활동 보고 필요",
      how:"① 서울청년포털 (youth.seoul.go.kr) 온라인 신청\n② 방문 접수 불가 — 온라인만 가능\n※ 매년 상반기(5~6월) 모집, 경쟁률 높아 조기 신청 권장",
      period:"2026년 상반기 모집: 6월 중 (정확한 일정은 서울청년포털 공지 확인)\n※ 매년 1~2회 모집",
      contact:"서울청년포털 ☎ 02-2133-5497\n다산콜센터 ☎ 120",
      applyUrl:"https://youth.seoul.go.kr/site/main/content/youthAllowance",
      applyLabel:"서울청년포털 청년수당 신청하기 →",
    },
  },
  /* ────── 7월 ────── */
  {
    month:7, tag:"7월", color:"#ea580c",
    name:"에너지바우처 하계 지원 시작",
    desc:"하절기 전기요금 자동 차감 (7~9월) — 6월 15일부터 주민센터 신청",
    detail:{
      target:"기초생활수급자(생계·의료급여) 가구 중 노인·영유아·장애인·임산부·중증질환자·한부모·소년소녀가정 중 1명 이상 포함\n※ 이미 동절기 바우처를 받은 경우 별도 신청 필요",
      benefit:"하절기 전기요금 바우처 (7~9월 자동 차감)\n1인 가구: 5만 5,000원\n2인 가구: 7만 3,000원\n3인 이상: 9만 1,000원\n(2026년 기준)",
      how:"① 읍·면·동 주민센터 방문 신청 (6월 15일 ~ 12월 31일)\n② 전기요금 바우처는 별도 수령 없이 전기요금에서 자동 차감됨\n③ 문의: ☎ 1600-3190",
      period:"신청 기간: 2026년 6월 15일 ~ 12월 31일\n지원 기간: 2026년 7월 ~ 9월",
      contact:"에너지바우처 콜센터 ☎ 1600-3190",
      applyUrl:"https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF_STND0033",
      applyLabel:"복지로 에너지바우처 안내 보기 →",
    },
  },
  {
    month:7, tag:"7월", color:"#16a34a",
    name:"기초연금 인상 적용",
    desc:"매년 1월 물가상승률 반영 인상 (2026년 최대 월 33만 4,810원)",
    detail:{
      target:"만 65세 이상, 단독가구 소득인정액 213만 원 이하\n부부가구 340만 8,000원 이하 (2026년 기준)",
      benefit:"2026년 기준 단독가구 최대 월 33만 4,810원\n부부가구 최대 합산 53만 5,680원\n매년 1월 1일 기준 물가상승률 반영 자동 인상",
      how:"이미 수급 중이면 별도 신청 불필요 — 자동 인상 지급\n신규 신청: 주민센터 방문 또는 복지로 온라인",
      period:"매년 1월 인상 적용 (7월에 상반기 소급 차액 지급되는 경우 있음)",
      contact:"보건복지부 ☎ 129 / 국민연금공단 ☎ 1355",
      applyUrl:"https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF_STND0001",
      applyLabel:"복지로 기초연금 신청하기 →",
    },
  },
  /* ────── 9월 ────── */
  {
    month:9, tag:"9월", color:"#7c3aed",
    name:"청년도약계좌 모집",
    desc:"만 19~34세 청년, 월 70만 원 저축 시 정부 기여금 지원 (5년 만기)",
    detail:{
      target:"만 19~34세 (병역 이행 시 최대 6년 연장)\n개인소득: 총급여 7,500만 원 이하 (사업소득 6,300만 원 이하)\n가구소득: 기준 중위소득 250% 이하\n직전 3개 연도 중 1회 이상 금융소득종합과세 대상자 제외",
      benefit:"본인 월 최대 70만 원 저축\n정부 기여금: 소득 구간별 월 최대 2만 4,000원\n5년 만기 시 비과세 이자소득 혜택\n※ 5년 유지 시 총 약 5,000만 원 형성 가능",
      how:"① 취급 은행 앱에서 신청 (KB·신한·우리·하나·NH·IBK·SC·부산·광주·전북·경남·iM뱅크)\n② 매월 2주간 신청 창구 운영\n③ 금융위원회·서민금융진흥원 공식 안내: www.kinfa.or.kr",
      period:"매월 2주간 신청 창구 운영 (은행별 상이, 9월 등 대규모 모집)\n※ 정확한 일정은 서민금융진흥원 홈페이지 확인",
      contact:"서민금융진흥원 ☎ 1397\n각 취급 은행 고객센터",
      applyUrl:"https://www.kinfa.or.kr/product/youthJumpAccount.do",
      applyLabel:"서민금융진흥원 청년도약계좌 안내 →",
    },
  },
  /* ────── 10월 ────── */
  {
    month:10, tag:"10월", color:"#2563eb",
    name:"근로·자녀장려금 반기 신청",
    desc:"상반기분(1~6월 소득) 10월 신청 → 12월 지급",
    detail:{
      target:"2026년 1~6월 근로·사업·종교인 소득이 있는 가구\n(정기 신청과 동일 소득·재산 요건)",
      benefit:"상반기 소득분의 35% 선지급 (정산은 내년 5월 정기신청 시)\n최대 지급액 기준: 맞벌이 최대 330만 원 × 35% = 약 115만 원",
      how:"① 홈택스 (hometax.go.kr) 온라인 신청\n② 손택스 앱\n③ ARS ☎ 1544-9944",
      period:"매년 9월 1일 ~ 9월 15일 신청\n지급: 12월",
      contact:"국세청 세미래 콜센터 ☎ 126",
      applyUrl:"https://www.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_easy.xml",
      applyLabel:"홈택스 간편 신청하기 →",
    },
  },
  {
    month:10, tag:"10~4월", color:"#ea580c",
    name:"에너지바우처 동계 신청",
    desc:"겨울철 난방비 지원 — 전기·도시가스·등유·LPG·연탄 중 선택",
    detail:{
      target:"기초생활수급자(생계·의료급여) 가구 중 노인·영유아·장애인·임산부·중증질환자·한부모·소년소녀가정 포함 가구",
      benefit:"동절기 바우처 (10월~4월)\n1인 가구: 20만 9,000원\n2인 가구: 31만 2,000원\n3인 이상: 41만 5,000원\n(2026~27 동절기 기준)\n연료 종류 선택 가능 — 전기·도시가스·지역난방·등유·LPG·연탄",
      how:"① 읍·면·동 주민센터(행정복지센터) 방문 신청 필수\n② 온라인 신청 불가\n③ 대리 신청 가능 (가족 지참 서류 필요)\n④ 문의: ☎ 1600-3190",
      period:"신청 기간: 2026년 10월 중 ~ 2027년 4월 30일\n(정확한 시작일은 10월 초 한국에너지공단 공지 확인)",
      contact:"에너지바우처 콜센터 ☎ 1600-3190",
      applyUrl:"https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF_STND0033",
      applyLabel:"복지로 에너지바우처 안내 보기 →",
    },
  },
  /* ────── 11월 ────── */
  {
    month:11, tag:"11월", color:"#0891b2",
    name:"경기도 청년기본소득 신청",
    desc:"경기도 거주 만 24세, 분기별 25만 원 (연 100만 원) 지역화폐",
    detail:{
      target:"신청일 기준 경기도 거주 만 24세 청년\n3년 이상 경기도 거주 또는 합산 10년 이상 거주\n소득·재산 기준 없음 (보편 지급)\n※ 주민등록상 경기도 주소 기준",
      benefit:"분기별 25만 원 × 4회 = 연 100만 원\n지역화폐(지역사랑상품권)로 지급 — 해당 시·군 내 사용 가능\n대형마트·백화점·유흥업소 등 사용 제한",
      how:"① 경기도 청년기본소득 포털 (basicincome.gg.go.kr) 신청\n② 카카오톡 '청년기본소득' 채널 신청\n③ 해당 시·군 주민센터 방문 신청",
      period:"분기별 신청 (1·4·7·10월 초)\n11월 신청분: 4분기 (10~12월) 지급분 대상",
      contact:"경기도 청년기본소득 ☎ 031-120\n각 시·군 담당 부서",
      applyUrl:"https://basicincome.gg.go.kr",
      applyLabel:"경기도 청년기본소득 신청하기 →",
    },
  },
  /* ────── 12월 ────── */
  {
    month:12, tag:"12월", color:"#dc2626",
    name:"연말정산 미리보기 서비스",
    desc:"국세청 홈택스에서 올해 예상 세금 환급액 미리 확인",
    detail:{
      target:"근로소득이 있는 모든 직장인 (일용근로자 제외)\n중도 퇴직자 포함",
      benefit:"• 연말정산 예상 세액 조회 및 공제 최적화 안내\n• 내년 1~2월 연말정산 준비 자료 미리 확인\n※ 실제 환급·납부는 내년 2월 급여 또는 3월 신청 후 처리",
      how:"① 홈택스 (hometax.go.kr) → 장려금·연말정산 → 연말정산 미리보기\n② 공인인증서(공동인증서) 또는 간편인증 로그인 필요",
      period:"매년 11월 중 ~ 12월 (국세청 공지 기준)\n실제 연말정산 신청: 다음 해 1월 15일 ~ 2월 28일",
      contact:"국세청 세미래 콜센터 ☎ 126",
      applyUrl:"https://www.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_easy.xml",
      applyLabel:"홈택스 연말정산 미리보기 →",
    },
  },
];

function renderCalendar() {
  const body = document.getElementById("calendarBody");
  if (!body) return;

  const now = new Date();
  const thisMonth = now.getMonth() + 1;

  // 이번 달 우선, 상시는 맨 뒤
  const sorted = [...WELFARE_CALENDAR].map((ev, i) => ({ ev, i })).sort((a, b) => {
    const s = (e) => e.month === 0 ? 99 : e.month >= thisMonth ? e.month - thisMonth : e.month + 12 - thisMonth;
    return s(a.ev) - s(b.ev);
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

  sorted.forEach(({ ev, i }) => {
    const monthLabel = ev.month === 0 ? "🔄 상시 진행" : `${ev.month}월`;
    if (ev.month !== lastMonth) {
      const isNow = ev.month === thisMonth;
      html += `<div class="cal-month-header ${isNow ? "cal-now" : ""}">
        ${isNow ? "📍 이번 달 — " : ""}${monthLabel}
        ${isNow ? '<span class="cal-now-badge">지금 신청!</span>' : ""}
      </div>`;
      lastMonth = ev.month;
    }
    html += `<div class="cal-card" onclick="openCalDetail(${i})" role="button" style="cursor:pointer">
      <div class="cal-card-top">
        <span class="cal-tag" style="background:${ev.color}20;color:${ev.color}">${ev.tag}</span>
        <span class="cal-link-btn" style="pointer-events:none">자세히 →</span>
      </div>
      <p class="cal-name">${ev.name}</p>
      <p class="cal-desc">${ev.desc}</p>
    </div>`;
  });

  body.innerHTML = html;
}

/* ── 복지달력 혜택 상세 시트 ── */
function openCalDetail(idx) {
  const ev = WELFARE_CALENDAR[idx];
  if (!ev || !ev.detail) return;
  const d = ev.detail;

  let panel = document.getElementById("calDetailPanel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "calDetailPanel";
    panel.className = "saved-detail-overlay";
    panel.onclick = (e) => { if (e.target === panel) closeCalDetail(); };
    panel.innerHTML = `
      <div class="saved-detail-sheet" id="calDetailSheet">
        <div class="saved-detail-handle"></div>
        <div class="saved-detail-header">
          <h3 class="saved-detail-title" id="calDetailTitle"></h3>
          <button class="saved-detail-close" onclick="closeCalDetail()">✕</button>
        </div>
        <div class="saved-detail-body" id="calDetailBody"></div>
      </div>`;
    document.body.appendChild(panel);
  }

  document.getElementById("calDetailTitle").textContent = ev.name;

  // 각 항목을 행으로 표시
  const rows = [
    { label:"📋 지원 대상", val: d.target },
    { label:"💰 지원 내용", val: d.benefit },
    { label:"📝 신청 방법", val: d.how },
    { label:"📅 신청 기간", val: d.period },
    { label:"☎ 문의처",    val: d.contact },
  ];

  let bodyHtml = `<div class="cal-detail-tag" style="background:${ev.color}20;color:${ev.color};display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;margin-bottom:12px">${ev.tag}</div>`;
  bodyHtml += `<p class="cal-detail-desc">${ev.desc}</p>`;

  rows.forEach(r => {
    if (!r.val) return;
    bodyHtml += `<div class="cal-detail-row">
      <div class="cal-detail-label">${r.label}</div>
      <div class="cal-detail-val">${r.val.replace(/\n/g,"<br>")}</div>
    </div>`;
  });

  if (d.applyUrl) {
    bodyHtml += `<div class="acc-group cal-detail-acc">
      ${_accRow("cal-how-" + idx, "📋", "신청방법",
        `<a class="acc-site-link" href="${d.applyUrl}" target="_blank" rel="noopener">🔗 ${d.applyLabel || "해당 서비스 바로가기 →"}</a>`)}
    </div>`;
  }

  document.getElementById("calDetailBody").innerHTML = bodyHtml;

  panel.classList.remove("hidden");
  requestAnimationFrame(() => {
    document.getElementById("calDetailSheet").classList.add("open");
  });
  document.body.style.overflow = "hidden";
}

function closeCalDetail() {
  const sheet = document.getElementById("calDetailSheet");
  const panel = document.getElementById("calDetailPanel");
  if (!sheet || !panel) return;
  sheet.classList.remove("open");
  setTimeout(() => { panel.classList.add("hidden"); document.body.style.overflow = ""; }, 280);
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

/* ══════════════════════════════════════
   🏛 지역 공공서비스 데이터
══════════════════════════════════════ */
const LOCAL_PUBLIC = {
  "서울특별시": [
    { type:"welfare",  name:"서울시 종합사회복지관",       addr:"각 구별 운영",           tel:"02-2133-7386", desc:"생활상담, 재가복지, 직업지원 등 종합 복지서비스", url:"https://wis.seoul.go.kr", hours:"평일 09:00~18:00" },
    { type:"welfare",  name:"서울시니어플러스 (노인복지관)",addr:"25개 자치구 운영",        tel:"02-2133-5400", desc:"만 60세 이상 건강·교육·취업·여가 프로그램 운영",   url:"https://seniorplus.seoul.go.kr", hours:"평일 09:00~18:00" },
    { type:"center",   name:"주민센터 (동 행정복지센터)",  addr:"내 동 주민센터",          tel:"120",          desc:"복지급여 신청, 주민등록, 증명서 발급, 통합사례관리",url:"https://www.gov.kr", hours:"평일 09:00~18:00" },
    { type:"center",   name:"서울시 희망복지지원단",       addr:"각 구청 내",             tel:"02-2133-7386", desc:"위기가정 발굴·지원, 통합사례관리, 자원연계",        url:"https://welfare.seoul.go.kr", hours:"평일 09:00~18:00" },
    { type:"meal",     name:"무료급식소 (경로식당)",       addr:"각 구별 운영",           tel:"120",          desc:"만 60세 이상 어르신 무료 또는 저렴한 식사 제공",    url:"https://wis.seoul.go.kr", hours:"월~금 점심" },
    { type:"meal",     name:"서울 푸드뱅크·마켓",         addr:"구별 운영 (25개소)",     tel:"1688-1122",    desc:"식품·생활용품 무료 제공 (저소득·취약계층)",         url:"https://www.foodbank.or.kr", hours:"평일 09:00~17:00" },
    { type:"health",   name:"서울시 보건소",              addr:"25개 자치구 운영",        tel:"120",          desc:"건강검진, 예방접종, 만성질환 관리, 정신건강 상담",  url:"https://health.seoul.go.kr", hours:"평일 09:00~18:00" },
    { type:"health",   name:"서울 정신건강복지센터",       addr:"각 구별 운영",           tel:"1577-0199",    desc:"정신건강 상담·치료 연계, 자살예방 24시간 운영",     url:"https://blutouch.net", hours:"24시간" },
    { type:"counsel",  name:"서울시 복지재단 상담센터",    addr:"서울 전역",              tel:"02-2011-0300", desc:"복지 서비스 안내, 위기 상담, 자원 연계 지원",       url:"https://welfare.seoul.go.kr", hours:"평일 09:00~18:00" },
    { type:"counsel",  name:"다산콜 (서울시 통합민원)",    addr:"전화·온라인",            tel:"120",          desc:"서울시 각종 복지·행정 서비스 안내 및 연결",         url:"https://120.seoul.go.kr", hours:"24시간" },
  ],
  "경기도": [
    { type:"welfare",  name:"경기도 종합사회복지관",       addr:"31개 시·군 운영",        tel:"031-120",      desc:"생활상담, 재가복지, 직업지원 등 종합 복지서비스",   url:"https://www.gg.go.kr", hours:"평일 09:00~18:00" },
    { type:"welfare",  name:"경기도 노인복지관",           addr:"각 시·군 운영",          tel:"031-120",      desc:"만 60세 이상 건강·교육·취업·여가 프로그램",        url:"https://www.gg.go.kr", hours:"평일 09:00~18:00" },
    { type:"center",   name:"주민센터 (행정복지센터)",     addr:"내 읍·면·동 주민센터",   tel:"031-120",      desc:"복지급여 신청, 주민등록, 통합사례관리, 위기상담",   url:"https://www.gov.kr", hours:"평일 09:00~18:00" },
    { type:"center",   name:"경기도 희망복지지원단",       addr:"각 시·군청 내",          tel:"031-8008-2114",desc:"위기가정 통합사례관리, 자원 연계 지원",             url:"https://www.gg.go.kr", hours:"평일 09:00~18:00" },
    { type:"meal",     name:"경기 무료급식소 (경로식당)",  addr:"각 시·군 운영",          tel:"031-120",      desc:"만 60세 이상 어르신 무료 또는 저렴한 식사 제공",    url:"https://www.gg.go.kr", hours:"월~금 점심" },
    { type:"meal",     name:"경기 푸드뱅크·마켓",         addr:"시·군별 운영",           tel:"1688-1122",    desc:"식품·생활용품 무료 제공 (저소득·취약계층)",         url:"https://www.foodbank.or.kr", hours:"평일 09:00~17:00" },
    { type:"health",   name:"경기도 보건소",              addr:"31개 시·군 운영",        tel:"031-120",      desc:"건강검진, 예방접종, 만성질환 관리, 정신건강 상담",  url:"https://health.gg.go.kr", hours:"평일 09:00~18:00" },
    { type:"health",   name:"경기 정신건강복지센터",       addr:"각 시·군 운영",          tel:"1577-0199",    desc:"정신건강 상담·치료 연계, 자살예방 24시간 운영",     url:"https://www.ggmhc.or.kr", hours:"24시간" },
    { type:"counsel",  name:"경기복지재단 상담센터",       addr:"경기 전역",              tel:"031-267-9500", desc:"복지 서비스 안내, 위기 상담, 자원 연계 지원",       url:"https://www.ggwf.or.kr", hours:"평일 09:00~18:00" },
    { type:"counsel",  name:"경기도 통합민원 콜센터",      addr:"전화·온라인",            tel:"031-120",      desc:"경기도 각종 복지·행정 서비스 안내 및 연결",         url:"https://www.gg.go.kr", hours:"24시간" },
  ],
};

const LOC_TYPE_LABELS = { welfare:"복지관", center:"주민센터", meal:"무료급식", health:"보건소", counsel:"상담센터" };
const LOC_TYPE_COLORS = { welfare:"#2563eb", center:"#7c3aed", meal:"#ea580c", health:"#16a34a", counsel:"#db2777" };
const LOC_TYPE_ICONS  = { welfare:"🏢", center:"🏛", meal:"🍱", health:"💊", counsel:"💬" };

let _localRegion   = "서울특별시";
let _localTypeFilter = "all";

function localFilter(region) {
  _localRegion = region;
  document.querySelectorAll(".local-region-btn").forEach(b =>
    b.classList.toggle("active", b.textContent.includes(region === "서울특별시" ? "서울" : "경기"))
  );
  renderLocal(region);
}

function locTypeFilter(btn, type) {
  _localTypeFilter = type;
  document.querySelectorAll(".loc-type-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderLocal(_localRegion);
}

function renderLocal(region) {
  const body = document.getElementById("localBody");
  if (!body) return;

  const all = LOCAL_PUBLIC[region] || [];
  const list = _localTypeFilter === "all" ? all : all.filter(s => s.type === _localTypeFilter);

  let html = `<p class="local-count">${region} 공공서비스 <b>${list.length}곳</b></p>`;
  list.forEach(s => {
    const color = LOC_TYPE_COLORS[s.type] || "#6b7280";
    const icon  = LOC_TYPE_ICONS[s.type]  || "📍";
    const label = LOC_TYPE_LABELS[s.type] || s.type;
    html += `<div class="loc-card">
      <div class="loc-card-top">
        <span class="loc-type-tag" style="background:${color}18;color:${color}">${icon} ${label}</span>
        <span class="loc-hours">${s.hours}</span>
      </div>
      <div class="loc-name">${s.name}</div>
      <div class="loc-desc">${s.desc}</div>
      <div class="loc-meta">
        <span class="loc-addr">📍 ${s.addr}</span>
        <a class="loc-tel" href="tel:${s.tel}">📞 ${s.tel}</a>
      </div>
      <a class="loc-link-btn" href="${s.url}" target="_blank" rel="noopener">자세히 보기 →</a>
    </div>`;
  });
  body.innerHTML = html;
}

/* ══════════════════════════════════════
   👥 복지 전문가 즉시 조회
══════════════════════════════════════ */
let _proRegion = "서울특별시";
let _proJob    = "social";
let _proSit    = "";

// 지역서비스 탭 진입 시 상황 선택지 렌더링
function initProSearch() {
  const grid = document.getElementById("proSitGrid");
  if (!grid || grid.dataset.init) return;
  grid.dataset.init = "1";

  const sits = [
    "생활비·식비가 부족해요", "병원비·건강이 걱정돼요",
    "주거가 불안정해요",     "교육비·돌봄이 필요해요",
    "취업·일자리가 필요해요","갑작스러운 위기 상황이에요",
    "노인 돌봄이 필요해요",  "장애·만성질환이 있어요",
  ];
  grid.innerHTML = sits.map(s =>
    `<button class="pro-sit-btn" onclick="proSelectSit(this,'${s}')">${s}</button>`
  ).join("");
}

function proSelectJob(btn, job) {
  document.querySelectorAll(".pro-job-chip").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  _proJob = job;
}

function proSelectRegion(region, btn) {
  _proRegion = region;
  document.querySelectorAll(".pro-region-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

function proSelectSit(btn, sit) {
  document.querySelectorAll(".pro-sit-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  _proSit = sit;
}

async function submitProSearch() {
  const age = parseInt(document.getElementById("proAge").value);
  if (!age || age < 1 || age > 120) {
    showToast("대상자 나이를 입력해 주세요");
    return;
  }
  if (!_proSit) {
    showToast("주요 상황을 1개 선택해 주세요");
    return;
  }

  const btn = document.querySelector(".pro-submit-btn");
  btn.textContent = "🔍 조회 중...";
  btn.disabled = true;

  try {
    const res = await fetch("/welfare/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        age,
        region: _proRegion,
        district: "",
        life_situations: [_proSit],
      }),
    });
    const data = await res.json();
    renderProResult(data, age);
  } catch (e) {
    showToast("조회 중 오류가 발생했습니다");
  } finally {
    btn.textContent = "🔍 대상자 맞춤 혜택 즉시 조회";
    btn.disabled = false;
  }
}

function renderProResult(data, age) {
  const wrap = document.getElementById("proResultWrap");
  const body = document.getElementById("proResultBody");
  const title = document.getElementById("proResultTitle");
  if (!wrap || !body) return;

  // 수집: 온톨로지 DEFINITE + POSSIBLE
  const policies = [];
  if (data.ontology) {
    [...(data.ontology.definite||[]), ...(data.ontology.possible||[])].forEach(p => {
      policies.push({ type: data.ontology.definite.find(x=>x.policy_id===p.policy_id) ? "def":"pos", p });
    });
  }
  // Supabase 카드
  (data.supabase_policies||[]).forEach(p => policies.push({ type:"bk", p }));

  title.textContent = `${age}세 대상자 — 맞춤 혜택 ${policies.length}건`;

  if (!policies.length) {
    body.innerHTML = `<p class="pro-empty">조건에 맞는 혜택을 찾지 못했습니다.<br>나이·지역·상황을 바꿔 다시 조회해 보세요.</p>`;
  } else {
    const _BADGE = { def:"✅ 즉시 신청", pos:"🔍 조건 확인", bk:"📋 관련 혜택" };
    const _CLS   = { def:"pro-badge--def", pos:"pro-badge--pos", bk:"pro-badge--bk" };
    body.innerHTML = policies.map(({ type, p }) => {
      const name  = type === "bk" ? p.name : (getPolicyTr(p.policy_id,"name")||p.name);
      const desc  = type === "bk" ? (p.description||"") : (getPolicyTr(p.policy_id,"desc")||p.description);
      const applyInfo = type === "bk" ? buildApplyUrl(p) : { url: p.apply_url, label: "복지로 해당 서비스 바로가기 →" };
      const uid = `pro-${type}-${p.policy_id||p.name}`.replace(/\W/g,"_");
      const howText = type === "bk" && p.how_to_apply && p.how_to_apply !== "Y" && p.how_to_apply !== "N"
        ? `<p class="acc-how-text">${p.how_to_apply}</p>` : "";
      const howContent = howText + `<a class="acc-site-link" href="${applyInfo.url}" target="_blank" rel="noopener">🔗 ${applyInfo.label}</a>`;
      const docsContent = type !== "bk" && p.required_docs?.length
        ? p.required_docs.map(d=>`<span class="acc-doc-item">• ${getTr(d)}</span>`).join("") : "";
      return `<div class="pro-card">
        <div class="pro-card-top">
          <span class="pro-badge ${_CLS[type]}">${_BADGE[type]}</span>
        </div>
        <div class="pro-card-name">${name}</div>
        <p class="pro-card-desc">${desc}</p>
        <div class="acc-group">
          ${_accRow(`${uid}-how`, "📋", "신청방법", howContent)}
          ${docsContent ? _accRow(`${uid}-doc`, "📄", "필요서류", docsContent) : ""}
        </div>
      </div>`;
    }).join("");
  }

  wrap.classList.remove("hidden");
  wrap.scrollIntoView({ behavior:"smooth", block:"start" });
}

function closeProResult() {
  document.getElementById("proResultWrap").classList.add("hidden");
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

/* ── 선순환 버튼: HTML <a> 태그로 1365 직접 연결 (모달 제거됨) ── */

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

/* ── 재조회 / 홈 리셋 ── */
function retry() { location.reload(); }

function resetToHome() {
  // 결과·로딩 숨기고 입력 카드 복원
  const result   = document.getElementById("result");
  const loading  = document.getElementById("loading");
  const nlpEntry = document.getElementById("nlpEntry");
  const inputCard = document.getElementById("inputCard");
  if (result)    result.classList.add("hidden");
  if (loading)   loading.classList.add("hidden");
  if (nlpEntry)  nlpEntry.classList.remove("hidden");
  if (inputCard) inputCard.classList.remove("hidden");
  // 챗봇 state 초기화
  if (typeof state !== "undefined") {
    Object.keys(state).forEach(k => { delete state[k]; });
  }
  // 지역 선택 초기화
  const selRegion   = document.getElementById("selRegion");
  const selDistrict = document.getElementById("selDistrict");
  const inputAge    = document.getElementById("inputAge");
  if (selRegion)   selRegion.value = "";
  if (selDistrict) { selDistrict.innerHTML = '<option value="">시·군·구 선택</option>'; selDistrict.disabled = true; }
  if (inputAge)    inputAge.value = "";
  // 어려운 점 체크 초기화
  document.querySelectorAll(".sit-chip.active, .opt-chip.active").forEach(el => {
    el.classList.remove("active");
    el.setAttribute("aria-checked", "false");
  });
  // 첫 단계로 이동
  if (typeof show === "function") { show("stepA"); setDot(1); }
}

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
    const _sdHowId = (n,i) => `sd-how-old-${i}`;
    bodyHtml = names.map((n,i) => {
      const keyword = encodeURIComponent(n.replace(/\s*\(.*?\)\s*/g,"").trim());
      const searchUrl = `https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAP01P00.do?searchStr=${keyword}`;
      return `
      <div class="sd-card">
        <div class="sd-name">${n}</div>
        <div class="acc-group">
          ${_accRow(_sdHowId(n,i), "📋", "신청방법",
            `<a class="acc-site-link" href="${searchUrl}" target="_blank" rel="noopener">🔗 복지로 해당 서비스 바로가기 →</a>`)}
        </div>
      </div>`;
    }).join("");
  } else {
    bodyHtml = items.map(it => {
      // buildApplyUrl 로직을 저장된 아이템에도 동일하게 적용
      const applyInfo = buildApplyUrl({
        policy_id: it.policyId || "",
        url:       it.url || "",
        name:      it.name || "",
        source:    it.source || "",
      });
      const sdUid = `sd-${(it.policyId||it.name).replace(/\W/g,"_")}-${Math.random().toString(36).slice(2,6)}`;
      return `
      <div class="sd-card">
        <div class="sd-name">${it.name}</div>
        ${it.desc ? `<div class="sd-desc">${it.desc}</div>` : ""}
        <div class="acc-group">
          ${_accRow(sdUid+"-how", "📋", "신청방법",
            `<a class="acc-site-link" href="${applyInfo.url}" target="_blank" rel="noopener">🔗 ${applyInfo.label}</a>`)}
        </div>
      </div>`;
    }).join("");
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
  const bkCards   = document.querySelectorAll(".bk-card");
  const total = ontCards.length + bkCards.length;

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
  bkCards.forEach(c => {
    const name     = c.dataset.name  || c.querySelector(".bk-name")?.textContent.trim() || "";
    const policyId = c.dataset.policyId || "";
    const rawUrl   = c.dataset.url   || "";
    const applyBtn = c.querySelector("a.bk-detail-btn");
    const url      = applyBtn?.href || rawUrl || "https://www.bokjiro.go.kr";
    const desc     = c.querySelector(".bk-desc")?.textContent.trim() || "";
    if (name) items.push({ name, desc, url, policyId, type: "bk" });
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
