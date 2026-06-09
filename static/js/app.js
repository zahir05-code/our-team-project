/* 아테나 복지서비스 — 3단계 미니멀 UX */

/* ── 상태 ── */
const state = {
  age: "", region: "", district: "",
  life_situations: [], family_status: "",
  income_range: "", gender: "",
};
const nlpState = {
  income_range: "", gender: "",
  region_override: "", district_override: "",
};

/* ── 초기화 ── */
window.addEventListener("DOMContentLoaded", () => {
  renderSituationGrid();
  renderChips("familyChips",   FAMILY_OPTIONS,  false, "family");
  renderChips("incomeChips",   INCOME_OPTIONS,  false, "income");
  renderChips("nlpGenderChips",GENDER_OPTIONS,  false, "nlpGender");
  renderChips("nlpIncomeChips",INCOME_OPTIONS,  false, "nlpIncome");
});

/* ── 상황 그리드 렌더링 ── */
function renderSituationGrid() {
  const grid = document.getElementById("situationGrid");
  if (!grid) return;
  SITUATIONS.forEach(label => {
    const btn = document.createElement("button");
    btn.className = "sit-card";
    btn.setAttribute("role", "checkbox");
    btn.setAttribute("aria-checked", "false");
    btn.setAttribute("aria-label", label + " 선택");
    btn.innerHTML = `<span class="sit-icon" aria-hidden="true">${SITUATION_ICONS[label] || "📌"}</span>
                     <span class="sit-label">${label}</span>`;
    btn.onclick = () => {
      btn.classList.toggle("active");
      const idx = state.life_situations.indexOf(label);
      if (idx === -1) {
        state.life_situations.push(label);
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
function renderChips(containerId, options, multi, key) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  options.forEach(opt => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = opt;
    chip.setAttribute("role", "radio");
    chip.setAttribute("aria-checked", "false");
    chip.setAttribute("aria-label", opt + " 선택");
    if (key === "nlpGender") chip.dataset.gender = GENDER_VALUE_MAP[opt] || opt;
    chip.onclick = () => toggleChip(chip, opt, multi, key);
    wrap.appendChild(chip);
  });
}

function toggleChip(chip, value, multi, key) {
  document.querySelectorAll(`#${getContainerId(key)} .chip`)
    .forEach(c => { c.classList.remove("active"); c.setAttribute("aria-checked","false"); });
  chip.classList.add("active");
  chip.setAttribute("aria-checked", "true");
  if (key === "family")    state.family_status      = value;
  if (key === "income")    state.income_range       = value;
  if (key === "nlpIncome") nlpState.income_range    = value;
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
  sel.innerHTML = '<option value="">시·군·구 선택</option>';
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
  if (!state.region)   { alert("지역을 선택해 주세요."); return; }
  if (!state.district) { alert("시·군·구를 선택해 주세요."); return; }
  if (!age || age < 1 || age > 120) { alert("나이를 입력해 주세요."); return; }
  state.age = String(age);
  show("stepB"); setDot(2);
  document.getElementById("inputCard").scrollIntoView({ behavior: "smooth" });
}

function goToC() {
  if (state.life_situations.length === 0) {
    alert("어려운 점을 하나 이상 선택해 주세요."); return;
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

/* ── 정직성 체크박스 ── */
function onPledgeChange() {
  const ok  = document.getElementById("pledgeCheck").checked;
  const btn = document.getElementById("btnC");
  btn.classList.toggle("disabled", !ok);
}

/* ── 단계별 API 호출 ── */
async function submitProfile() {
  if (!document.getElementById("pledgeCheck").checked) {
    alert("확인 체크를 해주셔야 결과를 볼 수 있습니다."); return;
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

/* ── NLP API 호출 ── */
async function submitNlp() {
  const text = document.getElementById("nlpText").value.trim();
  if (text.length < 5) { alert("상황을 좀 더 자세히 입력해 주세요."); return; }
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
  const nick = age ? `${age}세 고객님` : "고객님";
  document.getElementById("resultTitle").textContent =
    `🎯 ${nick}께 맞는 혜택을 찾았습니다`;

  const body = document.getElementById("resultBody");
  body.innerHTML = "";

  /* NLP 분석 태그 */
  if (analysis) {
    let html = `<div class="nlp-analysis"><p class="analysis-title">📊 AI 분석</p>
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
      <p class="ont-header">🏛 자격 판단 결과
        <span class="ont-badge ont-badge-def">${summ.definite_count}건 요건 충족</span>
        <span class="ont-badge ont-badge-pos">${summ.possible_count}건 가능성</span>
        <span class="ont-badge ont-badge-fut">${summ.future_count}건 미리보기</span>
      </p>
      <div class="ont-disclaimer">
        💙 입력하신 정보를 바탕으로 한 <strong>맞춤 안내</strong>입니다.
        실제 수급 여부는 담당 기관의 심사를 통해 최종 결정됩니다.
        <span class="disclaimer-legal">
          📌 허위 신청 시 「사회보장기본법」에 따라 불이익이 발생할 수 있습니다.
        </span>
      </div>`;

    if (ont.definite.length) {
      html += `<div class="ont-group ont-group-def">
        <p class="ont-group-title">✅ 지금 신청 가능 (${ont.definite.length}건)</p>`;
      ont.definite.forEach(p => html += renderOntPolicy(p, "def"));
      html += `</div>`;
    }
    if (ont.possible.length) {
      html += `<div class="ont-group ont-group-pos">
        <p class="ont-group-title">🔶 해당 가능성 (${ont.possible.length}건)</p>`;
      ont.possible.forEach(p => html += renderOntPolicy(p, "pos"));
      html += `</div>`;
    }
    if (ont.future.length) {
      html += `<div class="ont-group ont-group-fut">
        <p class="ont-group-title">📌 미리 알아두기 (${ont.future.length}건)
          <button class="ont-toggle-btn" onclick="toggleFuture(this)">펼치기 ▾</button>
        </p>
        <div class="ont-future-body hidden">`;
      ont.future.forEach(p => html += renderOntPolicy(p, "fut"));
      html += `</div></div>`;
    }
    html += `</div>`;
    body.insertAdjacentHTML("beforeend", html);
  }

  /* 링크 섹션 */
  if (data.results && data.results.some(s => s.services.length > 0)) {
    let html = `<div class="link-section-wrap">
      <p class="link-section-header">🔗 관련 기관 바로가기</p>`;
    data.results.forEach(sec => {
      if (!sec.services.length) return;
      const icon = SECTION_ICONS[sec.section] || "📋";
      html += `<div class="result-section">
        <p class="section-title">${icon} ${sec.section}</p>`;
      sec.services.forEach(svc =>
        html += `<div class="service-item">
          <span class="service-name">${svc.name}</span>
          <a class="service-link" href="${svc.url}" target="_blank" rel="noopener">바로가기 →</a>
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
  const docs   = p.required_docs.length
    ? `<div class="ont-docs">📄 ${p.required_docs.join(" · ")}</div>` : "";
  const reason = p.reasons.length
    ? `<div class="ont-reason">💡 ${p.reasons.join(", ")} 조건을 추가하면 해당될 수 있어요</div>` : "";
  const tags   = p.tags.length
    ? `<div class="ont-tags">${p.tags.map(t=>`<span class="ont-tag">${t}</span>`).join("")}</div>` : "";
  return `<div class="ont-card ont-card-${type}">
    <div class="ont-card-top">
      <span class="ont-policy-name">${p.name}</span>
      <a class="ont-apply-btn" href="${p.apply_url}" target="_blank" rel="noopener">신청 →</a>
    </div>
    <p class="ont-desc">${p.description}</p>
    ${tags}${docs}${reason}
    <div class="ont-authority">📞 ${p.authority} ·
      <a class="tel-link" href="tel:${p.phone.replace(/[^0-9]/g,'')}">${p.phone} ☎</a>
    </div>
  </div>`;
}

/* ── FUTURE 토글 ── */
function toggleFuture(btn) {
  const body    = btn.closest(".ont-group-fut").querySelector(".ont-future-body");
  const hidden  = body.classList.toggle("hidden");
  btn.textContent = hidden ? "펼치기 ▾" : "접기 ▴";
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
    community: "https://www.1365.go.kr",
    talent:    "https://www.dovol.net",
    volunteer: "https://www.1365.go.kr/vols/main.do",
  };
  if (urls[type]) window.open(urls[type], "_blank", "noopener");
  closePayForwardModal();
}

/* ── 재조회 ── */
function retry() { location.reload(); }
