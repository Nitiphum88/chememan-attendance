/* ============================================================
   CHEMEMAN Training Attendance System — app.js v5
   - ไม่มี alert/confirm/prompt ของ browser เลย
   - ใช้ modal สวยงามแทนทั้งหมด
   - สร้างหัวข้อ → sync Sheets อัตโนมัติ
   ============================================================ */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyl48Wi5UWd0-opSZHHFN_nc_B1ovE23rnyaJcmHRYLOhnM7QfeNh71FqJFMnPrfZxd/exec";
const PIN_KEY    = "cman_pin_v4";
const DATA_KEY   = "cman_data_v4";

let hrUnlocked   = false;
let activeDate   = "";
let cloudCourses = [];

/* ── STORAGE ── */
function getPin()    { return localStorage.getItem(PIN_KEY) || "1234"; }
function savePin(p)  { localStorage.setItem(PIN_KEY, p); }
function getData()   { try { return JSON.parse(localStorage.getItem(DATA_KEY) || "[]"); } catch(e) { return []; } }
function saveData(d) { localStorage.setItem(DATA_KEY, JSON.stringify(d)); }

/* ══════════════════════════════════════════════
   MODAL SYSTEM (แทน alert/confirm/prompt)
══════════════════════════════════════════════ */
function showModal(opts) {
  /* opts: { type, title, message, icon, confirmText, cancelText, inputPlaceholder, onConfirm, onCancel } */
  const m = document.getElementById("modal");
  document.getElementById("modal-icon").innerHTML   = opts.icon || "";
  document.getElementById("modal-title").textContent = opts.title || "";
  document.getElementById("modal-msg").innerHTML     = opts.message || "";

  const inputWrap = document.getElementById("modal-input-wrap");
  const inputEl   = document.getElementById("modal-input");
  if (opts.inputPlaceholder !== undefined) {
    inputWrap.style.display = "";
    inputEl.value           = opts.inputValue || "";
    inputEl.placeholder     = opts.inputPlaceholder;
    inputEl.type            = opts.inputType || "text";
    setTimeout(() => inputEl.focus(), 80);
    inputEl.onkeydown = e => { if (e.key === "Enter") confirmModal(); };
  } else {
    inputWrap.style.display = "none";
    inputEl.value           = "";
  }

  const confirmBtn = document.getElementById("modal-confirm");
  const cancelBtn  = document.getElementById("modal-cancel");

  confirmBtn.textContent  = opts.confirmText || "ตกลง";
  confirmBtn.className    = "modal-btn " + (opts.confirmClass || "modal-btn-primary");
  cancelBtn.style.display = opts.cancelText ? "" : "none";
  cancelBtn.textContent   = opts.cancelText || "ยกเลิก";

  window._modalConfirm = opts.onConfirm || null;
  window._modalCancel  = opts.onCancel  || null;

  m.classList.add("open");
  document.getElementById("modal-confirm").focus();
}

function confirmModal() {
  const val = document.getElementById("modal-input").value.trim();
  closeModal();
  if (window._modalConfirm) window._modalConfirm(val);
}
function cancelModal() {
  closeModal();
  if (window._modalCancel) window._modalCancel();
}
function closeModal() {
  document.getElementById("modal").classList.remove("open");
}

/* ── TOAST ── */
let _toastTimer;
function showToast(msg, type) {
  const t  = document.getElementById("toast");
  const ic = document.getElementById("toast-icon");
  const tx = document.getElementById("toast-text");
  const icons = {
    success: '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info:    '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    loading: '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" class="spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>'
  };
  ic.innerHTML    = icons[type] || icons.info;
  tx.textContent  = msg;
  t.className     = "toast toast-" + (type || "info") + " show";
  clearTimeout(_toastTimer);
  if (type !== "loading") _toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}
function hideToast() { document.getElementById("toast").classList.remove("show"); }

/* ── DATE HELPERS ── */
function todayISO() {
  const t = new Date();
  return t.getFullYear() + "-" + String(t.getMonth()+1).padStart(2,"0") + "-" + String(t.getDate()).padStart(2,"0");
}
function toShortThai(ds) {
  if (!ds) return "";
  const d = new Date(ds + "T00:00:00");
  return String(d.getDate()).padStart(2,"0") + "/" + String(d.getMonth()+1).padStart(2,"0") + "/" + String(d.getFullYear()+543).slice(-2);
}
function toFullThai(ds) {
  if (!ds) return "";
  const d = new Date(ds + "T00:00:00");
  return String(d.getDate()).padStart(2,"0") + "/" + String(d.getMonth()+1).padStart(2,"0") + "/" + (d.getFullYear()+543);
}
function toSheetName(ds) {
  if (!ds) return "ไม่ระบุวัน";
  const d = new Date(ds + "T00:00:00");
  return "อบรม " + String(d.getDate()).padStart(2,"0") + "/" + String(d.getMonth()+1).padStart(2,"0") + "/" + String(d.getFullYear()+543).slice(-2);
}

/* ── PAGE SWITCH ── */
function switchPage(p) {
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(el => el.classList.remove("active"));
  document.getElementById("page-" + p).classList.add("active");
  document.getElementById("tab-" + p).classList.add("active");
  if (p === "hr" && hrUnlocked) showHrTab("list");
  if (p === "sign") loadAndPopulateCourses();
}

/* ══════════════════════════════════════════════
   COURSE SYNC
══════════════════════════════════════════════ */
function loadAndPopulateCourses() {
  const sel       = document.getElementById("s-course");
  sel.innerHTML   = '<option value="">กำลังโหลดหัวข้ออบรม...</option>';
  sel.disabled    = true;
  fetch(SCRIPT_URL + "?action=getCourses&t=" + Date.now())
    .then(r => r.json())
    .then(data => { cloudCourses = data.courses || []; populateCourseSelect(); })
    .catch(() => {
      sel.innerHTML = '<option value="">ไม่สามารถโหลดหัวข้อได้ กรุณารีเฟรช</option>';
      sel.disabled  = true;
    });
}

function populateCourseSelect() {
  const sel    = document.getElementById("s-course");
  const active = cloudCourses.filter(c => c.active);
  sel.disabled = false;
  if (!active.length) {
    sel.innerHTML = '<option value="">ยังไม่มีหัวข้ออบรม — ติดต่อ HR</option>';
    sel.disabled  = true;
    return;
  }
  sel.innerHTML = '<option value="">— เลือกหัวข้ออบรม —</option>' +
    active.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
}

function syncCoursesToCloud() {
  return fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "saveCourses", courses: cloudCourses })
  }).then(r => r.json());
}

/* ── INIT ── */
window.addEventListener("load", () => {
  document.getElementById("s-date").value = todayISO();
  loadAndPopulateCourses();
});

/* ══════════════════════════════════════════════
   FORM SUBMIT
══════════════════════════════════════════════ */
function showFormError(msg) {
  const el = document.getElementById("error-msg");
  document.getElementById("error-text").textContent = msg;
  el.style.display = "flex";
  clearTimeout(el._t);
  el._t = setTimeout(() => el.style.display = "none", 4000);
}

function submitForm() {
  const date   = document.getElementById("s-date").value;
  const name   = document.getElementById("s-name").value.trim();
  const dept   = document.getElementById("s-dept").value.trim();
  const pos    = document.getElementById("s-position").value.trim();
  const course = document.getElementById("s-course").value;
  const tel    = document.getElementById("s-tel").value.trim();

  if (!date)   { showFormError("กรุณาเลือกวันที่อบรม");      return; }
  if (!name)   { showFormError("กรุณากรอกชื่อ-นามสกุล");     document.getElementById("s-name").focus();   return; }
  if (!dept)   { showFormError("กรุณากรอกแผนก / หน่วยงาน");  document.getElementById("s-dept").focus();   return; }
  if (!course) { showFormError("กรุณาเลือกหัวข้ออบรม");       document.getElementById("s-course").focus(); return; }

  const btn = document.getElementById("btn-submit");
  btn.disabled = true;
  document.getElementById("loading-bar").style.display = "block";

  const now = new Date(), pad = n => String(n).padStart(2,"0");
  const rec = { id: Date.now(), name, dept, position: pos, course, tel,
    trainingDate: date, dateDisplay: toShortThai(date),
    time: pad(now.getHours()) + ":" + pad(now.getMinutes()), dateSort: date };
  saveData([...getData(), rec]);

  fetch(SCRIPT_URL, {
    method: "POST", mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "attendance", name, dept, position: pos, course, tel, trainingDate: date })
  }).finally(() => {
    document.getElementById("success-name").textContent   = name;
    document.getElementById("success-course").textContent = course;
    document.getElementById("success-date").textContent   = "วันที่อบรม: " + toShortThai(date);
    document.getElementById("success-sheet-name").textContent = toSheetName(date);
    document.getElementById("form-wrap").style.display    = "none";
    document.getElementById("success-wrap").style.display = "";
    document.getElementById("loading-bar").style.display  = "none";
  });
}

function resetForm() {
  ["s-name","s-dept","s-position","s-tel"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("s-course").value = "";
  document.getElementById("s-date").value   = todayISO();
  document.getElementById("btn-submit").disabled = false;
  document.getElementById("form-wrap").style.display    = "";
  document.getElementById("success-wrap").style.display = "none";
  document.getElementById("s-name").focus();
}

/* ══════════════════════════════════════════════
   PIN
══════════════════════════════════════════════ */
function checkPin() {
  if (document.getElementById("pin-input").value === getPin()) {
    hrUnlocked = true;
    document.getElementById("hr-pin").style.display  = "none";
    document.getElementById("hr-main").style.display = "";
    document.getElementById("pin-err").style.display = "none";
    showHrTab("list");
  } else {
    document.getElementById("pin-err").style.display = "block";
    document.getElementById("pin-input").value = "";
    document.getElementById("pin-input").focus();
  }
}

function changePin() {
  showModal({
    icon: '<svg width="22" height="22" fill="none" stroke="#1B5E2B" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    title: "เปลี่ยนรหัส PIN",
    message: "ใส่รหัส PIN ใหม่ที่ต้องการ (ตัวเลข 4–8 หลัก)",
    inputPlaceholder: "PIN ใหม่",
    inputType: "password",
    confirmText: "บันทึก PIN",
    cancelText: "ยกเลิก",
    onConfirm: val => {
      if (!/^\d{4,8}$/.test(val)) {
        showToast("PIN ต้องเป็นตัวเลข 4–8 หลักเท่านั้น", "error"); return;
      }
      savePin(val);
      showToast("เปลี่ยน PIN เรียบร้อยแล้ว", "success");
    }
  });
}

/* ══════════════════════════════════════════════
   HR SUB-TABS
══════════════════════════════════════════════ */
function showHrTab(tab) {
  ["list","courses"].forEach(t => {
    document.getElementById("hrtab-" + t).classList.toggle("active", t === tab);
    document.getElementById("hrsection-" + t).style.display = t === tab ? "" : "none";
  });
  if (tab === "list")    renderDashboard();
  if (tab === "courses") loadCourseManager();
}

/* ══════════════════════════════════════════════
   COURSE MANAGER
══════════════════════════════════════════════ */
function loadCourseManager() {
  const el = document.getElementById("course-list");
  el.innerHTML = `<div class="empty-state"><div class="empty-icon spin-icon">
    <svg width="20" height="20" fill="none" stroke="#1B5E2B" stroke-width="2" viewBox="0 0 24 24" class="spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
    </div><p>กำลังโหลด...</p></div>`;

  fetch(SCRIPT_URL + "?action=getCourses&t=" + Date.now())
    .then(r => r.json())
    .then(data => { cloudCourses = data.courses || []; renderCourseManager(); })
    .catch(() => {
      el.innerHTML = `<div class="empty-state"><p style="color:#B91C1C">โหลดไม่ได้ กรุณาตรวจสอบการเชื่อมต่อ</p></div>`;
    });
}

function renderCourseManager() {
  const el = document.getElementById("course-list");
  if (!cloudCourses.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon"><svg width="20" height="20" fill="none" stroke="#9a9994" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></div>
      <p>ยังไม่มีหัวข้ออบรม<br><span style="font-size:12px">กรอกชื่อแล้วกด "เพิ่ม" ด้านบน</span></p></div>`;
    return;
  }
  el.innerHTML = cloudCourses.map((c, i) => `
    <div class="course-row ${c.active ? "" : "course-hidden"}">
      <div class="course-left">
        <div class="course-status-dot ${c.active ? "dot-active" : "dot-hidden"}"></div>
        <div style="min-width:0">
          <div class="course-name">${c.name}</div>
          <div class="course-meta">${c.active ? "แสดงในหน้าลงชื่อ" : "ซ่อนจากผู้อบรม"}</div>
        </div>
      </div>
      <div class="course-actions">
        <button class="btn btn-sm ${c.active ? "btn-warning" : "btn-success-outline"}" onclick="toggleCourse(${i})">
          ${c.active
            ? `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> ซ่อน`
            : `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> แสดง`}
        </button>
        <button class="btn btn-sm btn-danger-outline" onclick="confirmDeleteCourse(${i})">
          <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg> ลบ
        </button>
      </div>
    </div>`).join("");
}

function addCourse() {
  const input = document.getElementById("new-course-input");
  const name  = input.value.trim();
  if (!name) {
    showModal({
      icon: '<svg width="22" height="22" fill="none" stroke="#B91C1C" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      title: "กรุณากรอกชื่อหัวข้อ",
      message: "ยังไม่ได้พิมพ์ชื่อหัวข้ออบรม",
      confirmText: "ตกลง"
    });
    input.focus(); return;
  }
  if (cloudCourses.find(c => c.name === name)) {
    showModal({
      icon: '<svg width="22" height="22" fill="none" stroke="#92400E" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      title: "มีหัวข้อนี้อยู่แล้ว",
      message: `"${name}" มีในรายการแล้ว กรุณาใช้ชื่ออื่น`,
      confirmText: "ตกลง"
    });
    return;
  }

  cloudCourses.push({ name, active: true });
  input.value = "";
  renderCourseManager();
  showToast("กำลังบันทึก...", "loading");

  syncCoursesToCloud()
    .then(() => { showToast(`เพิ่ม "${name}" เรียบร้อย`, "success"); populateCourseSelect(); })
    .catch(() => {
      cloudCourses.pop();
      renderCourseManager();
      showToast("บันทึกไม่สำเร็จ กรุณาลองใหม่", "error");
    });
}

function toggleCourse(i) {
  const c    = cloudCourses[i];
  const next = !c.active;
  c.active   = next;
  renderCourseManager();
  showToast("กำลังบันทึก...", "loading");

  syncCoursesToCloud()
    .then(() => {
      showToast(next ? `แสดง "${c.name}" แล้ว` : `ซ่อน "${c.name}" แล้ว`, "success");
      populateCourseSelect();
    })
    .catch(() => {
      c.active = !next;
      renderCourseManager();
      showToast("บันทึกไม่สำเร็จ", "error");
    });
}

function confirmDeleteCourse(i) {
  const name = cloudCourses[i].name;
  showModal({
    icon: '<svg width="22" height="22" fill="none" stroke="#B91C1C" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>',
    title: "ลบหัวข้ออบรม",
    message: `ต้องการลบ <strong>"${name}"</strong> ออกจากรายการ?<br><span style="font-size:12px;color:#8E9489">ข้อมูลการลงชื่อที่ผ่านมาจะยังคงอยู่</span>`,
    confirmText: "ลบหัวข้อ",
    confirmClass: "modal-btn-danger",
    cancelText: "ยกเลิก",
    onConfirm: () => {
      cloudCourses.splice(i, 1);
      renderCourseManager();
      showToast("กำลังบันทึก...", "loading");
      syncCoursesToCloud()
        .then(() => { showToast(`ลบ "${name}" เรียบร้อย`, "success"); populateCourseSelect(); })
        .catch(() => showToast("บันทึกไม่สำเร็จ", "error"));
    }
  });
}

/* ══════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════ */
function renderDashboard() {
  const data    = getData();
  const dates   = [...new Set(data.map(r => r.dateSort))].sort().reverse();
  const courses = [...new Set(data.map(r => r.course))];
  const depts   = [...new Set(data.map(r => r.dept))];
  if (!activeDate || !dates.includes(activeDate)) activeDate = dates[0] || "";

  document.getElementById("metrics").innerHTML = `
    <div class="metric-card"><div class="metric-num">${data.length}</div><div class="metric-lbl">ทั้งหมด</div></div>
    <div class="metric-card"><div class="metric-num">${courses.length}</div><div class="metric-lbl">หลักสูตร</div></div>
    <div class="metric-card"><div class="metric-num">${depts.length}</div><div class="metric-lbl">หน่วยงาน</div></div>`;

  const tabs = document.getElementById("sheet-tabs");
  tabs.innerHTML = !dates.length
    ? '<span style="font-size:12px;color:#8E9489">ยังไม่มีข้อมูล</span>'
    : dates.map(d => `<button class="sheet-tab ${d===activeDate?"active":""}" onclick="selectDate('${d}')">${toShortThai(d)}</button>`).join("");

  const dayData    = data.filter(r => r.dateSort === activeDate);
  const dayCourses = [...new Set(dayData.map(r => r.course))].sort();
  const fc = document.getElementById("filter-course"), sc = fc.value;
  fc.innerHTML = '<option value="">ทุกหัวข้อ</option>' +
    dayCourses.map(c => `<option value="${c}" ${sc===c?"selected":""}>${c}</option>`).join("");
  renderList();
}

function selectDate(d) {
  activeDate = d;
  document.querySelectorAll(".sheet-tab").forEach(t => t.classList.remove("active"));
  event.target.classList.add("active");
  document.getElementById("filter-course").value = "";
  renderList();
}

function renderList() {
  const data = getData(), q = (document.getElementById("search-input").value||"").toLowerCase();
  const fc   = document.getElementById("filter-course").value;
  const filtered = data.filter(r => {
    if (r.dateSort !== activeDate) return false;
    if (q  && !r.name.toLowerCase().includes(q) && !r.dept.toLowerCase().includes(q)) return false;
    if (fc && r.course !== fc) return false;
    return true;
  }).reverse();

  const el = document.getElementById("list-container");
  if (!filtered.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon"><svg width="20" height="20" fill="none" stroke="#9a9994" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
      <p>${activeDate ? "ยังไม่มีข้อมูลในวันนี้" : "ยังไม่มีข้อมูล"}</p></div>`;
    return;
  }
  el.innerHTML = filtered.map(r => `
    <div class="list-row">
      <div class="avatar">${r.name.trim().slice(0,1)}</div>
      <div class="row-info">
        <div class="row-name">${r.name}</div>
        <div class="row-dept">${[r.dept,r.position].filter(Boolean).join(" · ")}</div>
        <div class="row-course">${r.course}</div>
      </div>
      <div class="row-meta">
        <div class="row-date">${r.dateDisplay||""}</div>
        <div class="row-time">${r.time} น.</div>
        <button class="btn btn-danger-outline btn-sm" style="margin-top:6px;padding:4px 10px;font-size:11px"
          onclick="confirmDeleteRecord(${r.id}, '${r.name.replace(/'/g,"\\'")}')">ลบ</button>
      </div>
    </div>`).join("");
}

function confirmDeleteRecord(id, name) {
  showModal({
    icon: '<svg width="22" height="22" fill="none" stroke="#B91C1C" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>',
    title: "ลบรายการ",
    message: `ต้องการลบรายการของ <strong>${name}</strong>?`,
    confirmText: "ลบ",
    confirmClass: "modal-btn-danger",
    cancelText: "ยกเลิก",
    onConfirm: () => { saveData(getData().filter(r => r.id !== id)); renderDashboard(); showToast("ลบรายการแล้ว", "success"); }
  });
}

function clearDateData() {
  if (!activeDate) return;
  showModal({
    icon: '<svg width="22" height="22" fill="none" stroke="#B91C1C" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    title: "ล้างข้อมูลวันที่นี้",
    message: `ต้องการล้างข้อมูลทั้งหมดของวันที่ <strong>${toShortThai(activeDate)}</strong>?<br><span style="font-size:12px;color:#B91C1C">ไม่สามารถย้อนกลับได้</span>`,
    confirmText: "ล้างข้อมูล",
    confirmClass: "modal-btn-danger",
    cancelText: "ยกเลิก",
    onConfirm: () => {
      saveData(getData().filter(r => r.dateSort !== activeDate));
      activeDate = "";
      renderDashboard();
      showToast("ล้างข้อมูลเรียบร้อย", "success");
    }
  });
}

/* ── EXPORT ── */
function exportExcel() {
  const data = getData().filter(r => r.dateSort === activeDate);
  if (!data.length) { showToast("ไม่มีข้อมูลในวันที่นี้", "error"); return; }
  const fc = document.getElementById("filter-course").value;
  const q  = (document.getElementById("search-input").value||"").toLowerCase();
  const filtered = data.filter(r => {
    if (fc && r.course !== fc) return false;
    if (q  && !r.name.toLowerCase().includes(q) && !r.dept.toLowerCase().includes(q)) return false;
    return true;
  }).reverse();
  const rows = filtered.map((r,i) => ({
    "ลำดับ": i+1, "ชื่อ-นามสกุล": r.name, "แผนก / หน่วยงาน": r.dept,
    "ตำแหน่ง": r.position||"", "หัวข้ออบรม": r.course,
    "เบอร์โทรศัพท์": r.tel||"", "วันที่อบรม": toFullThai(r.dateSort), "เวลาลงชื่อ": r.time
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{wch:6},{wch:24},{wch:22},{wch:18},{wch:30},{wch:16},{wch:16},{wch:10}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, toSheetName(activeDate));
  XLSX.writeFile(wb, "CHEMEMAN_" + (activeDate||"all").replace(/-/g,"") + ".xlsx");
  showToast("ดาวน์โหลด Excel เรียบร้อย", "success");
}
