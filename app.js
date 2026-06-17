/* ================================================================
   CHEMEMAN Training Attendance System — app.js v8
   เวอร์ชันอัปเดต: ซิงค์กับ HTML ใหม่
   - ไม่มีอีโมจิ (ใช้ SVG แทน)
   - รองรับ time picker (ช่วงเวลา)
   - localStorage เก็บ PIN + ข้อมูลการลงทะเบียน
   - Modal ใช้ SVG icon
================================================================ */

'use strict';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyT0nUg5cJQHffbYYjhUIYDVBJ5hpmClGR0Elgq43MzL9GXy9X6eZ4mG0AvFQcLkuyN7w/exec";
const PIN_KEY    = "cman_pin_v8";
const DATA_KEY   = "cman_data_v8";

let hrUnlocked   = false;
let activeDate   = "";
let cloudCourses = [];
let logoTapCount = 0;
let logoTapTimer = null;
let toastTimer   = null;

/* ════════════════════════════════════════════════
   STORAGE (localStorage)
════════════════════════════════════════════════ */
function getPin()    { return localStorage.getItem(PIN_KEY) || "1234"; }
function savePin(p)  { localStorage.setItem(PIN_KEY, p); }

function getData() {
  try { return JSON.parse(localStorage.getItem(DATA_KEY) || "[]"); }
  catch(e) { return []; }
}
function saveData(d) { localStorage.setItem(DATA_KEY, JSON.stringify(d)); }

/* ════════════════════════════════════════════════
   TIME PICKER
   prefix = ""  → ฟอร์มลงทะเบียน (#s-time)
   prefix = "nc" → ฟอร์มหลักสูตร  (#nc-time)
════════════════════════════════════════════════ */
const tpState = {
  "":   { sh: 8, sm: 0, eh: 17, em: 0 },
  "nc": { sh: 8, sm: 0, eh: 17, em: 0 }
};

function pad(n) { return String(n).padStart(2, "0"); }

function buildTimePicker(pfx) {
  const hours   = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  const ids = pfx
    ? { sh: "nc-opts-sh", sm: "nc-opts-sm", eh: "nc-opts-eh", em: "nc-opts-em" }
    : { sh: "opts-sh",    sm: "opts-sm",    eh: "opts-eh",    em: "opts-em"    };

  function fillCol(elId, values, key) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = values.map(v =>
      `<div class="time-opt" data-key="${key}" data-pfx="${pfx}" data-val="${v}">${pad(v)}</div>`
    ).join("");
    el.querySelectorAll(".time-opt").forEach(opt => {
      opt.addEventListener("click", () => {
        tpState[pfx][opt.dataset.key] = parseInt(opt.dataset.val);
        refreshHighlights(pfx);
      });
    });
  }

  fillCol(ids.sh, hours,   "sh");
  fillCol(ids.sm, minutes, "sm");
  fillCol(ids.eh, hours,   "eh");
  fillCol(ids.em, minutes, "em");
  refreshHighlights(pfx);
}

function refreshHighlights(pfx) {
  const s   = tpState[pfx];
  const map = pfx
    ? { sh:"nc-opts-sh", sm:"nc-opts-sm", eh:"nc-opts-eh", em:"nc-opts-em" }
    : { sh:"opts-sh",    sm:"opts-sm",    eh:"opts-eh",    em:"opts-em"    };

  Object.entries(map).forEach(([key, elId]) => {
    const el = document.getElementById(elId);
    if (!el) return;
    el.querySelectorAll(".time-opt").forEach(opt => {
      opt.classList.toggle("selected", parseInt(opt.dataset.val) === s[key]);
    });
  });
}

function formatTimeRange(pfx) {
  const s = tpState[pfx];
  return `${pad(s.sh)}:${pad(s.sm)} — ${pad(s.eh)}:${pad(s.em)}`;
}

function toggleTimePicker(pfx = "") {
  const ddId = pfx ? "nc-time-dropdown" : "time-dropdown";
  const dd   = document.getElementById(ddId);
  if (!dd) return;
  const isOpen = dd.classList.contains("open");
  // ปิดทั้งหมดก่อน
  ["time-dropdown", "nc-time-dropdown"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("open");
  });
  if (!isOpen) dd.classList.add("open");
}

function confirmTimePicker(pfx = "") {
  const inputId = pfx ? "nc-time" : "s-time";
  const input   = document.getElementById(inputId);
  if (input) input.value = formatTimeRange(pfx);
  closeTimePicker(pfx);
  showToast(`กำหนดเวลา ${formatTimeRange(pfx)} แล้ว`, "success");
}

function clearTimePicker(pfx = "") {
  tpState[pfx] = { sh: 8, sm: 0, eh: 17, em: 0 };
  refreshHighlights(pfx);
  const inputId = pfx ? "nc-time" : "s-time";
  const input   = document.getElementById(inputId);
  if (input) input.value = "";
}

function closeTimePicker(pfx = "") {
  const ddId = pfx ? "nc-time-dropdown" : "time-dropdown";
  const dd   = document.getElementById(ddId);
  if (dd) dd.classList.remove("open");
}

/* ════════════════════════════════════════════════
   MODAL — SVG icon (ไม่ใช้อีโมจิ)
════════════════════════════════════════════════ */
const MODAL_ICONS = {
  warn: `<svg width="26" height="26" fill="none" stroke="#92400e" stroke-width="2" viewBox="0 0 24 24">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`,
  danger: `<svg width="26" height="26" fill="none" stroke="#b91c1c" stroke-width="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>`,
  info: `<svg width="26" height="26" fill="none" stroke="#1B5E2B" stroke-width="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>`,
  success: `<svg width="26" height="26" fill="none" stroke="#15803D" stroke-width="2.5" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`,
  lock: `<svg width="26" height="26" fill="none" stroke="#1B5E2B" stroke-width="2" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>`,
  trash: `<svg width="26" height="26" fill="none" stroke="#b91c1c" stroke-width="2" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>`,
  report: `<svg width="26" height="26" fill="none" stroke="#92400e" stroke-width="2" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>`,
};

function showModal(opts) {
  const iconEl     = document.getElementById("modal-icon");
  const titleEl    = document.getElementById("modal-title");
  const msgEl      = document.getElementById("modal-msg");
  const inputWrap  = document.getElementById("modal-input-wrap");
  const inputEl    = document.getElementById("modal-input");
  const confirmBtn = document.getElementById("modal-confirm");
  const cancelBtn  = document.getElementById("modal-cancel");

  // SVG icon
  iconEl.innerHTML = MODAL_ICONS[opts.iconType] || MODAL_ICONS.info;
  iconEl.className = "modal-icon" + (opts.iconClass ? " " + opts.iconClass : "");

  titleEl.textContent = opts.title   || "";
  msgEl.innerHTML     = opts.message || "";

  if (opts.inputPlaceholder !== undefined) {
    inputWrap.style.display = "";
    inputEl.value           = opts.inputValue   || "";
    inputEl.placeholder     = opts.inputPlaceholder;
    inputEl.type            = opts.inputType    || "text";
    setTimeout(() => inputEl.focus(), 80);
  } else {
    inputWrap.style.display = "none";
    inputEl.value = "";
  }

  confirmBtn.textContent  = opts.confirmText || "ตกลง";
  confirmBtn.className    = "modal-btn modal-btn-" + (opts.confirmType || "primary");
  cancelBtn.style.display = opts.cancelText ? "" : "none";
  cancelBtn.textContent   = opts.cancelText  || "ยกเลิก";
  window._modalConfirm    = opts.onConfirm   || null;

  document.getElementById("modal").classList.add("open");
}

function confirmModal() {
  const val = document.getElementById("modal-input").value.trim();
  closeModal();
  if (window._modalConfirm) window._modalConfirm(val);
}

function closeModal() {
  document.getElementById("modal").classList.remove("open");
}

/* ════════════════════════════════════════════════
   TOAST — SVG icon
════════════════════════════════════════════════ */
const TOAST_SVG = {
  success: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  error:   `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  info:    `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  warning: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  loading: `<svg class="spin" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`,
};

function showToast(msg, type = "info") {
  clearTimeout(toastTimer);
  const t   = document.getElementById("toast");
  const ico = document.getElementById("toast-icon-svg");
  if (ico) ico.outerHTML; // ป้องกัน stale ref
  document.getElementById("toast-text").textContent = msg;

  // SVG icon slot
  const iconSlot = t.querySelector(".toast-icon-wrap");
  if (iconSlot) iconSlot.innerHTML = TOAST_SVG[type] || TOAST_SVG.info;

  t.className = `toast toast-${type} show`;
  if (type !== "loading") {
    toastTimer = setTimeout(() => t.classList.remove("show"), 3300);
  }
}

/* ════════════════════════════════════════════════
   DATE HELPERS
════════════════════════════════════════════════ */
function todayISO() {
  const t = new Date();
  return `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
}

function toShortThai(ds) {
  if (!ds) return "";
  const d = new Date(ds + "T00:00:00");
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${String(d.getFullYear()+543).slice(-2)}`;
}

function toFullThaiDate(ds) {
  if (!ds) return "";
  const d = new Date(ds + "T00:00:00");
  const m = ["","มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
             "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  return `${d.getDate()} ${m[d.getMonth()+1]} ${d.getFullYear()+543}`;
}

function escHtml(s) {
  return String(s || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* ════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════ */
window.addEventListener("load", () => {
  // วันที่ default
  const dateEl = document.getElementById("s-date");
  if (dateEl) dateEl.value = todayISO();

  // สร้าง time pickers
  buildTimePicker("");
  buildTimePicker("nc");

  // โหลดหลักสูตร
  loadAndPopulateCourses();

  // Logo tap secret → HR (5 ครั้ง ใน 2 วิ)
  const logoWrap = document.getElementById("header-logo-wrap");
  if (logoWrap) {
    logoWrap.addEventListener("click", () => {
      logoTapCount++;
      clearTimeout(logoTapTimer);
      if (logoTapCount >= 5) { logoTapCount = 0; switchPage("hr"); }
      else logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 2000);
    });
  }

  // ปิด time picker เมื่อคลิกนอก
  document.addEventListener("click", (e) => {
    const wraps = [
      document.getElementById("time-picker-wrap"),
      document.getElementById("nc-time-picker-wrap"),
    ];
    wraps.forEach((wrap, idx) => {
      if (wrap && !wrap.contains(e.target)) {
        closeTimePicker(idx === 0 ? "" : "nc");
      }
    });
  });
});

/* ════════════════════════════════════════════════
   PAGE NAVIGATION
════════════════════════════════════════════════ */
function switchPage(p) {
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  document.getElementById("page-" + p)?.classList.add("active");

  document.querySelectorAll(".nav-tab").forEach(el => el.classList.remove("active"));
  document.getElementById("tab-" + p)?.classList.add("active");

  if (p === "hr") {
    if (hrUnlocked) {
      document.getElementById("hr-pin").style.display  = "none";
      document.getElementById("hr-main").style.display = "";
      showHrTab("list");
    } else {
      document.getElementById("hr-pin").style.display  = "";
      document.getElementById("hr-main").style.display = "none";
    }
  }
  if (p === "sign") loadAndPopulateCourses();
}

/* ════════════════════════════════════════════════
   COURSE SELECT → แสดงรายละเอียด
════════════════════════════════════════════════ */
function onCourseChange() {
  const course = getSelectedCourse();
  const panel  = document.getElementById("course-detail-panel");
  if (!course) {
    panel?.classList.remove("show");
    const sTime = document.getElementById("s-time");
    if (sTime) sTime.value = "";
    return;
  }
  panel?.classList.add("show");
  document.getElementById("cdp-date").textContent       = course.date ? toFullThaiDate(course.date) : "—";
  document.getElementById("cdp-time").textContent       = course.time || "—";
  document.getElementById("cdp-location").textContent   = course.location || "—";
  document.getElementById("cdp-instructor").textContent = course.instructor || "—";

  // ซิงค์วันที่และเวลาจากหลักสูตร
  if (course.date) document.getElementById("s-date").value = course.date;
  if (course.time) document.getElementById("s-time").value = course.time;
}

/* ════════════════════════════════════════════════
   FORM SUBMISSION
════════════════════════════════════════════════ */
function submitForm() {
  const date      = document.getElementById("s-date").value;
  const prefix    = document.getElementById("s-prefix").value;
  const firstName = document.getElementById("s-firstname").value.trim();
  const lastName  = document.getElementById("s-lastname").value.trim();
  const empCode   = document.getElementById("s-empcode").value.trim();
  const idCard    = document.getElementById("s-idcard").value.trim();
  const position  = document.getElementById("s-position").value.trim();
  const dept      = document.getElementById("s-dept").value.trim();
  const site      = document.getElementById("s-site").value;
  const timeVal   = document.getElementById("s-time").value.trim();
  const course    = getSelectedCourse();

  // Validation
  if (!course) {
    showModal({ iconType:"warn", iconClass:"icon-warn", title:"ยังไม่ได้เลือกหัวข้ออบรม",
      message:"กรุณาเลือกหัวข้ออบรมก่อนลงทะเบียน", confirmText:"รับทราบ" });
    return;
  }
  if (!date) {
    showModal({ iconType:"warn", iconClass:"icon-warn", title:"ยังไม่ได้เลือกวันที่",
      message:"กรุณาระบุวันที่อบรม", confirmText:"รับทราบ" });
    return;
  }
  if (!timeVal) {
    showModal({ iconType:"warn", iconClass:"icon-warn", title:"ยังไม่ได้เลือกเวลา",
      message:"กรุณาเลือกช่วงเวลาอบรมก่อน", confirmText:"รับทราบ" });
    return;
  }
  if (!firstName || !lastName) {
    showModal({ iconType:"warn", iconClass:"icon-warn", title:"กรุณากรอกชื่อ-นามสกุล",
      message:"ชื่อและนามสกุลเป็นข้อมูลจำเป็น", confirmText:"รับทราบ" });
    return;
  }
  if (!dept) {
    showModal({ iconType:"warn", iconClass:"icon-warn", title:"กรุณาระบุหน่วยงาน",
      message:"โปรดกรอกหน่วยงาน / แผนกที่สังกัด", confirmText:"รับทราบ" });
    return;
  }
  if (!site) {
    showModal({ iconType:"warn", iconClass:"icon-warn", title:"กรุณาเลือกสาขา",
      message:"โปรดเลือกสาขาที่สังกัด", confirmText:"รับทราบ" });
    return;
  }

  const btn = document.getElementById("btn-submit");
  btn.disabled = true;
  document.getElementById("loading-bar").style.display = "block";
  showToast("กำลังบันทึก...", "loading");

  const now = new Date();
  const rec = {
    id: Date.now(), prefix, firstName, lastName, empCode, idCard,
    position, dept, site,
    course: course.name,
    trainingDate: date,
    courseTime: timeVal,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    location: course.location || "",
    instructor: course.instructor || "",
  };

  // บันทึก localStorage
  saveData([...getData(), rec]);

  // ส่ง Google Sheets
  fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "attendance", data: rec }),
  })
  .then(() => { showSuccess(rec); showToast("ลงทะเบียนสำเร็จ", "success"); })
  .catch(() => { showSuccess(rec); showToast("บันทึกเฉพาะเครื่อง (ไม่มีเน็ต)", "warning"); })
  .finally(() => { document.getElementById("loading-bar").style.display = "none"; });
}

function showSuccess(rec) {
  document.getElementById("success-name").textContent   = `${rec.prefix} ${rec.firstName} ${rec.lastName}`;
  document.getElementById("success-course").textContent = rec.course;
  document.getElementById("success-date").textContent   = `${toFullThaiDate(rec.trainingDate)} · ${rec.courseTime}`;
  document.getElementById("success-loc").textContent    = rec.location || "—";
  document.getElementById("form-wrap").style.display    = "none";
  document.getElementById("success-wrap").style.display = "";
}

function resetForm() {
  ["s-firstname","s-lastname","s-empcode","s-idcard","s-position","s-dept"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("s-prefix").value = "นาย";
  document.getElementById("s-site").value   = "";
  document.getElementById("s-course").value = "";
  document.getElementById("s-time").value   = "";
  document.getElementById("course-detail-panel")?.classList.remove("show");
  document.getElementById("form-wrap").style.display    = "";
  document.getElementById("success-wrap").style.display = "none";
  document.getElementById("btn-submit").disabled        = false;
}

/* ════════════════════════════════════════════════
   LOAD COURSES
════════════════════════════════════════════════ */
function loadAndPopulateCourses() {
  const sel = document.getElementById("s-course");
  if (!sel) return;
  sel.innerHTML = '<option value="">กำลังโหลด...</option>';
  sel.disabled  = true;

  fetch(SCRIPT_URL + "?action=getCourses")
    .then(r => r.json())
    .then(data => {
      cloudCourses = data.courses || [];
      populateCourseSelect(sel);
    })
    .catch(() => {
      sel.innerHTML = '<option value="">โหลดไม่ได้ — กรุณาลองใหม่</option>';
      sel.disabled  = false;
    });
}

function populateCourseSelect(sel) {
  const active = cloudCourses.filter(c => c.active);
  sel.innerHTML = active.length
    ? '<option value="">— เลือกหัวข้ออบรม —</option>' +
      active.map((c, i) => `<option value="${i}">${escHtml(c.name)}</option>`).join("")
    : '<option value="">ยังไม่มีหัวข้อเปิดรับ</option>';
  sel.disabled = false;
}

function getSelectedCourse() {
  const idx    = document.getElementById("s-course")?.value;
  if (!idx && idx !== 0) return null;
  const active = cloudCourses.filter(c => c.active);
  return active[parseInt(idx)] || null;
}

/* ════════════════════════════════════════════════
   HR — PIN
════════════════════════════════════════════════ */
function checkPin() {
  const input = document.getElementById("pin-input").value;
  const errEl = document.getElementById("pin-err");
  if (input === getPin()) {
    hrUnlocked = true;
    document.getElementById("hr-pin").style.display  = "none";
    document.getElementById("hr-main").style.display = "";
    document.getElementById("pin-input").value = "";
    showHrTab("list");
  } else {
    errEl.style.display = "flex";
    document.getElementById("pin-input").value = "";
    setTimeout(() => { errEl.style.display = "none"; }, 3000);
  }
}

function changePin() {
  showModal({
    iconType: "lock", iconClass: "icon-info",
    title: "เปลี่ยน PIN ผู้ดูแล",
    message: "กรอก PIN ใหม่ (ตัวเลข 4–8 หลัก)",
    inputPlaceholder: "PIN ใหม่",
    inputType: "password",
    confirmText: "บันทึก PIN",
    cancelText: "ยกเลิก",
    onConfirm: (val) => {
      if (!val || val.length < 4) { showToast("PIN ต้องมีอย่างน้อย 4 หลัก", "error"); return; }
      if (!/^\d+$/.test(val))     { showToast("PIN ต้องเป็นตัวเลขเท่านั้น", "error"); return; }
      savePin(val);
      showModal({
        iconType: "success", iconClass: "icon-success",
        title: "เปลี่ยน PIN สำเร็จ",
        message: "PIN ใหม่ถูกบันทึกแล้ว กรุณาจำ PIN ไว้",
        confirmText: "รับทราบ",
      });
    },
  });
}

/* ════════════════════════════════════════════════
   HR — TABS
════════════════════════════════════════════════ */
function showHrTab(tab) {
  document.getElementById("hrtab-list").classList.toggle("active", tab === "list");
  document.getElementById("hrtab-courses").classList.toggle("active", tab === "courses");
  document.getElementById("hrsection-list").style.display    = tab === "list"    ? "" : "none";
  document.getElementById("hrsection-courses").style.display = tab === "courses" ? "" : "none";
  if (tab === "list")    renderDashboard();
  if (tab === "courses") renderCourseSection();
}

/* ════════════════════════════════════════════════
   HR — DASHBOARD
════════════════════════════════════════════════ */
function renderDashboard() {
  const data  = getData();
  const dates = [...new Set(data.map(r => r.trainingDate))].filter(Boolean).sort().reverse();
  if (!activeDate || !dates.includes(activeDate)) activeDate = dates[0] || "";

  // Date tabs
  const tabsEl = document.getElementById("sheet-tabs");
  tabsEl.innerHTML = dates.length === 0
    ? '<span class="no-data-hint">ยังไม่มีข้อมูล</span>'
    : dates.map(d =>
        `<button class="sheet-tab ${d === activeDate ? "active" : ""}"
          onclick="activeDate='${d}';renderDashboard()">${toShortThai(d)}</button>`
      ).join("");

  // Metrics
  const filtered = data.filter(r => r.trainingDate === activeDate);
  const male     = filtered.filter(r => r.prefix === "นาย").length;
  const female   = filtered.length - male;
  const courses  = new Set(filtered.map(r => r.course));

  const metricData = [
    { n: filtered.length, l: "ผู้เข้าอบรมรวม",
      svg: `<svg width="14" height="14" fill="none" stroke="var(--g)" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
    { n: male,   l: "ชาย",
      svg: `<svg width="14" height="14" fill="none" stroke="var(--g)" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>` },
    { n: female, l: "หญิง",
      svg: `<svg width="14" height="14" fill="none" stroke="var(--g)" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>` },
    { n: courses.size, l: "หลักสูตร",
      svg: `<svg width="14" height="14" fill="none" stroke="var(--g)" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>` },
  ];

  document.getElementById("metrics").innerHTML = metricData.map(m =>
    `<div class="metric">
      <div class="metric-icon">${m.svg}</div>
      <div class="metric-n">${m.n}</div>
      <div class="metric-l">${m.l}</div>
    </div>`
  ).join("");

  // Course filter dropdown
  const filterSel = document.getElementById("filter-course");
  const curVal    = filterSel.value;
  filterSel.innerHTML = '<option value="">ทุกหัวข้อ</option>' +
    [...courses].map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join("");
  if (curVal) filterSel.value = curVal;

  renderList();
}

/* ════════════════════════════════════════════════
   HR — LIST
════════════════════════════════════════════════ */
function renderList() {
  const data     = getData();
  const filtered = data.filter(r => r.trainingDate === activeDate);
  const q        = (document.getElementById("search-input")?.value || "").toLowerCase();
  const fc       = document.getElementById("filter-course")?.value || "";
  const fs       = document.getElementById("filter-site")?.value   || "";

  const shown = filtered.filter(r => {
    const matchQ  = !q  || `${r.firstName}${r.lastName}${r.dept}${r.empCode}`.toLowerCase().includes(q);
    const matchFC = !fc || r.course === fc;
    const matchFS = !fs || r.site   === fs;
    return matchQ && matchFC && matchFS;
  });

  const container = document.getElementById("list-container");
  if (shown.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon-wrap">
          <svg width="22" height="22" fill="none" stroke="var(--tm)" stroke-width="1.5" viewBox="0 0 24 24">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </div>
        <p>${filtered.length === 0 ? "ยังไม่มีข้อมูลในวันที่เลือก" : "ไม่พบข้อมูลที่ค้นหา"}</p>
      </div>`;
    return;
  }

  container.innerHTML = shown.map((r, i) => `
    <div class="list-row">
      <div class="row-num">${i + 1}</div>
      <div class="row-info">
        <div class="row-name">${escHtml((r.prefix||"") + " " + (r.firstName||"") + " " + (r.lastName||""))}</div>
        <div class="row-sub">${escHtml(r.dept||"—")}${r.position ? " · " + escHtml(r.position) : ""}</div>
        <div class="row-tags">
          <span class="tag tag-site">${escHtml(r.site||"—")}</span>
          <span class="tag tag-course">${escHtml(r.course||"—")}</span>
          ${r.empCode ? `<span class="tag tag-emp">${escHtml(r.empCode)}</span>` : ""}
          ${r.idCard  ? `<span class="tag tag-id">
            <svg width="9" height="9" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg> ID
          </span>` : ""}
        </div>
      </div>
      <div class="row-meta"><div class="row-time">${escHtml(r.time||"")}</div></div>
    </div>`).join("");
}

/* ════════════════════════════════════════════════
   EXCEL EXPORT
════════════════════════════════════════════════ */
function exportExcel() {
  const data     = getData();
  const filtered = data.filter(r => r.trainingDate === activeDate);

  if (!filtered.length) {
    showModal({
      iconType: "report", iconClass: "icon-warn",
      title: "ไม่มีข้อมูล",
      message: "ไม่พบข้อมูลในวันที่เลือก กรุณาเลือกวันที่มีข้อมูลก่อนออกรายงาน",
      confirmText: "ตกลง",
    });
    return;
  }

  showToast("กำลังสร้างไฟล์...", "loading");

  const WB       = XLSX.utils.book_new();
  const byCourse = {};
  filtered.forEach(r => {
    if (!byCourse[r.course]) byCourse[r.course] = [];
    byCourse[r.course].push(r);
  });

  Object.entries(byCourse).forEach(([cName, rows]) => {
    const ci      = cloudCourses.find(c => c.name === cName) || {};
    const dateStr = rows[0] ? toFullThaiDate(rows[0].trainingDate) : "";
    const timeStr = rows[0]?.courseTime || ci.time || "08.00-17.00น.";
    const loc     = ci.location || rows[0]?.location || "";
    const instr   = ci.instructor || rows[0]?.instructor || "วิทยากรภายใน บริษัท เคมีแมน จำกัด (มหาชน)";

    const headerRows = [
      ["ใบลงทะเบียนการฝึกอบรม","","","","","","","","","","","","KK","","ชาย",""],
      ["หลักสูตร " + cName,     "","","","","","","","","","","","BKK","","หญิง",""],
      [`วันที่ ${dateStr}  เวลา ${timeStr}  สถานที่อบรม  ${loc}`,"","","","","","","","","","","","TK","","",""],
      ["โดย  " + instr,          "","","","","","","","","","","","RY","","",""],
      ["","","","","","","","","","","","","PBB","","รวม",""],
      [],
      ["ลำดับ","รหัสพนักงาน","เลขบัตรประชาชน (ID)","คำนำหน้า","ชื่อ","นามสกุล",
       "ตำแหน่ง","หน่วยงาน / แผนก","ลายมือชื่อ (เช้า)","ลายมือชื่อ (บ่าย)",
       "หมายเหตุ","สาขาสังกัด","","","",""],
    ];

    const dataRows = rows.map((r, i) => [
      i + 1, r.empCode||"", r.idCard||"", r.prefix||"",
      r.firstName||"", r.lastName||"", r.position||"", r.dept||"",
      "", "", "", r.site||"", "", "", "", ""
    ]);

    const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows]);
    ws["!cols"] = [
      {wch:7},{wch:13},{wch:20},{wch:10},{wch:16},{wch:16},
      {wch:18},{wch:18},{wch:22},{wch:22},{wch:14},{wch:10}
    ];
    ws["!merges"] = [
      {s:{r:0,c:0},e:{r:0,c:11}},
      {s:{r:1,c:0},e:{r:1,c:11}},
      {s:{r:2,c:0},e:{r:2,c:11}},
      {s:{r:3,c:0},e:{r:3,c:11}},
      {s:{r:4,c:0},e:{r:4,c:11}},
    ];

    const sheetName = (cName.substring(0,22) + " " + (activeDate||"").slice(5).replace("-","/")).substring(0,31);
    XLSX.utils.book_append_sheet(WB, ws, sheetName);
  });

  XLSX.writeFile(WB, `IMAFHR03_${activeDate}.xlsx`);
  setTimeout(() => showToast("ดาวน์โหลด Excel สำเร็จ", "success"), 600);
}

/* ════════════════════════════════════════════════
   CLEAR DATE DATA
════════════════════════════════════════════════ */
function clearDateData() {
  if (!activeDate) { showToast("ไม่ได้เลือกวันที่", "error"); return; }
  showModal({
    iconType: "trash", iconClass: "icon-danger",
    title: "ยืนยันลบข้อมูล",
    message: `ต้องการลบข้อมูลวันที่ <strong>${toShortThai(activeDate)}</strong> ทั้งหมดใช่หรือไม่?
      <small style="color:var(--r)">การกระทำนี้ไม่สามารถย้อนกลับได้</small>`,
    confirmText: "ลบข้อมูล",
    confirmType: "danger",
    cancelText: "ยกเลิก",
    onConfirm: () => {
      saveData(getData().filter(r => r.trainingDate !== activeDate));
      activeDate = "";
      renderDashboard();
      showToast("ลบข้อมูลสำเร็จ", "success");
    },
  });
}

/* ════════════════════════════════════════════════
   COURSE MANAGEMENT
════════════════════════════════════════════════ */
function renderCourseSection() {
  loadAndRenderCourseList();
}

function loadAndRenderCourseList() {
  const listEl = document.getElementById("course-list");
  listEl.innerHTML = `
    <div class="empty-state">
      <div class="spin-wrap">
        <svg class="spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--g)" stroke-width="2">
          <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
          <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
        </svg>
      </div>
      <p>กำลังโหลด...</p>
    </div>`;

  fetch(SCRIPT_URL + "?action=getCourses")
    .then(r => r.json())
    .then(data => { cloudCourses = data.courses || []; renderCourseList(); })
    .catch(() => {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon-wrap">
            <svg width="22" height="22" fill="none" stroke="var(--tm)" stroke-width="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p>โหลดข้อมูลไม่ได้<small>ตรวจสอบการเชื่อมต่อ</small></p>
        </div>`;
    });
}

function renderCourseList() {
  const listEl = document.getElementById("course-list");
  if (cloudCourses.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon-wrap">
          <svg width="22" height="22" fill="none" stroke="var(--tm)" stroke-width="1.5" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <p>ยังไม่มีหลักสูตร<small>เพิ่มหลักสูตรแรกได้เลย</small></p>
      </div>`;
    return;
  }

  const icons = {
    cal:  `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    clk:  `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    pin:  `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    usr:  `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    tag:  `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
    note: `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    del:  `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>`,
  };

  listEl.innerHTML = cloudCourses.map((c, i) => `
    <div class="course-row ${c.active ? "" : "course-hidden"}">
      <div class="course-left">
        <div class="course-dot ${c.active ? "dot-active" : "dot-hidden"}"></div>
        <div style="min-width:0;flex:1">
          <div class="course-name">${escHtml(c.name)}</div>
          <div class="course-meta">
            ${c.date ? `<span class="course-meta-item">${icons.cal}${escHtml(toFullThaiDate(c.date))}</span>` : ""}
            ${c.time ? `<span class="course-meta-item">${icons.clk}${escHtml(c.time)}</span>` : ""}
            ${c.type ? `<span class="course-meta-item">${icons.tag}${escHtml(c.type)}</span>` : ""}
          </div>
          <div class="course-meta">
            ${c.location   ? `<span class="course-meta-item">${icons.pin}${escHtml(c.location)}</span>` : ""}
            ${c.instructor ? `<span class="course-meta-item">${icons.usr}${escHtml(c.instructor)}</span>` : ""}
          </div>
          ${c.note ? `<div class="course-meta"><span class="course-meta-item" style="color:var(--a)">${icons.note}${escHtml(c.note)}</span></div>` : ""}
        </div>
      </div>
      <div class="course-actions">
        <button class="btn btn-xs ${c.active ? "btn-warning" : "btn-ok-outline"}" onclick="toggleCourse(${i})">
          ${c.active ? "ซ่อน" : "แสดง"}
        </button>
        <button class="btn btn-xs btn-danger-xs" onclick="deleteCourse(${i})">
          ${icons.del} ลบ
        </button>
      </div>
    </div>`).join("");
}

function addCourse() {
  const name  = document.getElementById("nc-name").value.trim();
  const date  = document.getElementById("nc-date").value;
  const time  = document.getElementById("nc-time").value.trim();
  const loc   = document.getElementById("nc-location").value.trim();
  const instr = document.getElementById("nc-instructor").value.trim() || "วิทยากรภายใน บริษัท เคมีแมน จำกัด (มหาชน)";
  const type  = document.getElementById("nc-type").value;
  const note  = document.getElementById("nc-note")?.value.trim() || "";

  if (!name) { showModal({ iconType:"warn", iconClass:"icon-warn", title:"กรอกชื่อหลักสูตร", message:"ชื่อหลักสูตรเป็นข้อมูลจำเป็น", confirmText:"ตกลง" }); return; }
  if (!date) { showModal({ iconType:"warn", iconClass:"icon-warn", title:"ระบุวันที่อบรม",    message:"วันที่อบรมเป็นข้อมูลจำเป็น",   confirmText:"ตกลง" }); return; }
  if (!time) { showModal({ iconType:"warn", iconClass:"icon-warn", title:"ระบุเวลาอบรม",      message:"กรุณาเลือกช่วงเวลาอบรม",        confirmText:"ตกลง" }); return; }
  if (!loc)  { showModal({ iconType:"warn", iconClass:"icon-warn", title:"ระบุสถานที่อบรม",   message:"สถานที่อบรมเป็นข้อมูลจำเป็น",  confirmText:"ตกลง" }); return; }

  cloudCourses.push({ name, active: true, date, time, location: loc, instructor: instr, type, note });
  saveCourses();
  clearCourseForm();
  renderCourseList();
  showToast(`เพิ่มหลักสูตร «${name}» สำเร็จ`, "success");
}

function clearCourseForm() {
  ["nc-name","nc-date","nc-location","nc-note"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("nc-time").value       = "";
  document.getElementById("nc-instructor").value = "วิทยากรภายใน บริษัท เคมีแมน จำกัด (มหาชน)";
  document.getElementById("nc-type").value       = "พนักงาน";
  clearTimePicker("nc");
}

function toggleCourse(i) {
  cloudCourses[i].active = !cloudCourses[i].active;
  saveCourses();
  renderCourseList();
  showToast(cloudCourses[i].active ? "แสดงหลักสูตรแล้ว" : "ซ่อนหลักสูตรแล้ว", "info");
}

function deleteCourse(i) {
  showModal({
    iconType: "trash", iconClass: "icon-danger",
    title: "ยืนยันลบหลักสูตร",
    message: `ต้องการลบ <strong>«${escHtml(cloudCourses[i].name)}»</strong> ใช่หรือไม่?
      <small style="color:var(--r)">ไม่สามารถย้อนกลับได้</small>`,
    confirmText: "ลบหลักสูตร",
    confirmType: "danger",
    cancelText: "ยกเลิก",
    onConfirm: () => {
      cloudCourses.splice(i, 1);
      saveCourses();
      renderCourseList();
      showToast("ลบหลักสูตรสำเร็จ", "success");
    },
  });
}

function saveCourses() {
  showToast("กำลังบันทึก...", "loading");
  fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "saveCourses", courses: cloudCourses }),
  })
  .then(() => {
    showToast("บันทึกหลักสูตรสำเร็จ", "success");
    // อัปเดต dropdown หน้าลงทะเบียน
    const sel = document.getElementById("s-course");
    if (sel) populateCourseSelect(sel);
  })
  .catch(() => { showToast("บันทึกเฉพาะเครื่อง (ไม่มีเน็ต)", "warning"); });
}