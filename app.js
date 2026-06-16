/* ================================================================
   CHEMEMAN Training Attendance System — app.js v6
   - Custom modal/toast (ไม่มี browser dialog)
   - หัวข้ออบรมมีรายละเอียดครบ (วัน/เวลา/สถานที่/วิทยากร/ประเภท)
   - Export Excel เหมือนต้นฉบับ IMAFHR03 100%
   - ปุ่ม HR ซ่อนอยู่ที่ footer (กด logo 3 ครั้ง)
   ================================================================ */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyT0nUg5cJQHffbYYjhUIYDVBJ5hpmClGR0Elgq43MzL9GXy9X6eZ4mG0AvFQcLkuyN7w/exec";
const PIN_KEY    = "cman_pin_v5";
const DATA_KEY   = "cman_data_v5";

let hrUnlocked   = false;
let activeDate   = "";
let cloudCourses = [];
let logoTapCount = 0;
let logoTapTimer = null;

/* ── STORAGE ── */
function getPin()    { return localStorage.getItem(PIN_KEY) || "1234"; }
function savePin(p)  { localStorage.setItem(PIN_KEY, p); }
function getData()   { try { return JSON.parse(localStorage.getItem(DATA_KEY) || "[]"); } catch(e) { return []; } }
function saveData(d) { localStorage.setItem(DATA_KEY, JSON.stringify(d)); }

/* ── LOGO SECRET TAP (กด 5 ครั้ง เปิดหน้า HR) ── */
function logoTap() {
  logoTapCount++;
  clearTimeout(logoTapTimer);
  if (logoTapCount >= 5) {
    logoTapCount = 0;
    switchPage('hr');
  } else {
    logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 2000);
  }
}

/* ════════════════════════════════════════════════
   MODAL SYSTEM
════════════════════════════════════════════════ */
function showModal(opts) {
  document.getElementById("modal-icon").innerHTML    = opts.icon || "";
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
    inputEl.value = "";
  }

  const confirmBtn = document.getElementById("modal-confirm");
  const cancelBtn  = document.getElementById("modal-cancel");
  confirmBtn.textContent  = opts.confirmText || "ตกลง";
  confirmBtn.className    = "modal-btn " + (opts.confirmClass || "modal-btn-primary");
  cancelBtn.style.display = opts.cancelText ? "" : "none";
  cancelBtn.textContent   = opts.cancelText || "ยกเลิก";

  window._modalConfirm = opts.onConfirm || null;
  window._modalCancel  = opts.onCancel  || null;
  document.getElementById("modal").classList.add("open");
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
  const t = document.getElementById("toast");
  const icons = {
    success: `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    loading: `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" class="spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`
  };
  document.getElementById("toast-icon").innerHTML = icons[type] || icons.info;
  document.getElementById("toast-text").textContent = msg;
  t.className = "toast toast-" + (type || "info") + " show";
  clearTimeout(_toastTimer);
  if (type !== "loading") _toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

/* ── DATE HELPERS ── */
function todayISO() {
  const t = new Date();
  return t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0");
}
function toShortThai(ds) {
  if (!ds) return "";
  const d = new Date(ds+"T00:00:00");
  return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+String(d.getFullYear()+543).slice(-2);
}
function toFullThaiDate(ds) {
  if (!ds) return "";
  const d = new Date(ds+"T00:00:00");
  const m = ["","มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
             "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  return d.getDate()+" "+m[d.getMonth()+1]+" "+(d.getFullYear()+543);
}
function toSheetName(ds, course) {
  if (!ds) return "ไม่ระบุวัน";
  const d  = new Date(ds+"T00:00:00");
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = String(d.getFullYear()+543).slice(-2);
  return (course||"อบรม").substring(0,20)+" "+dd+"/"+mm+"/"+yy;
}

/* ── PAGE SWITCH ── */
function switchPage(p) {
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(el => el.classList.remove("active"));
  document.getElementById("page-"+p).classList.add("active");
  const tab = document.getElementById("tab-"+p);
  if (tab) tab.classList.add("active");
  if (p === "hr" && hrUnlocked) showHrTab("list");
  if (p === "sign") loadAndPopulateCourses();
}

/* ════════════════════════════════════════════════
   COURSE SYNC
════════════════════════════════════════════════ */
function loadAndPopulateCourses() {
  const sel = document.getElementById("s-course");
  sel.innerHTML = '<option value="">กำลังโหลดหัวข้ออบรม...</option>';
  sel.disabled  = true;
  fetch(SCRIPT_URL+"?action=getCourses&t="+Date.now())
    .then(r => r.json())
    .then(data => { cloudCourses = data.courses || []; populateCourseSelect(); })
    .catch(() => {
      sel.innerHTML = '<option value="">ไม่สามารถโหลดได้ กรุณารีเฟรช</option>';
      sel.disabled  = true;
    });
}

function populateCourseSelect() {
  const sel    = document.getElementById("s-course");
  const active = cloudCourses.filter(c => c.active);
  sel.disabled = false;
  if (!active.length) {
    sel.innerHTML = '<option value="">ยังไม่มีหัวข้ออบรม — กรุณาติดต่อ HR</option>';
    sel.disabled  = true;
    return;
  }
  sel.innerHTML = '<option value="">— เลือกหัวข้ออบรม —</option>' +
    active.map((c,i) => `<option value="${i}">${c.name}</option>`).join("");
}

function getSelectedCourse() {
  const sel = document.getElementById("s-course");
  const idx = parseInt(sel.value);
  if (isNaN(idx)) return null;
  const active = cloudCourses.filter(c => c.active);
  return active[idx] || null;
}

function syncCoursesToCloud() {
  return fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "saveCourses", courses: cloudCourses })
  }).then(r => r.json());
}

/* ════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════ */
window.addEventListener("load", () => {
  document.getElementById("s-date").value = todayISO();
  loadAndPopulateCourses();
});

/* ════════════════════════════════════════════════
   FORM SUBMIT
════════════════════════════════════════════════ */
function showFormError(msg) {
  const el = document.getElementById("error-msg");
  document.getElementById("error-text").textContent = msg;
  el.style.display = "flex";
  clearTimeout(el._t);
  el._t = setTimeout(() => el.style.display = "none", 4000);
}

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
  const courseIdx = document.getElementById("s-course").value;
  const course    = getSelectedCourse();

  if (!date)      { showFormError("กรุณาเลือกวันที่อบรม");      return; }
  if (!firstName) { showFormError("กรุณากรอกชื่อ");              document.getElementById("s-firstname").focus(); return; }
  if (!lastName)  { showFormError("กรุณากรอกนามสกุล");           document.getElementById("s-lastname").focus();  return; }
  if (!dept)      { showFormError("กรุณากรอกหน่วยงาน");          document.getElementById("s-dept").focus();      return; }
  if (!course)    { showFormError("กรุณาเลือกหัวข้ออบรม");       document.getElementById("s-course").focus();    return; }
  if (!site)      { showFormError("กรุณาเลือกสถานที่สังกัด");    document.getElementById("s-site").focus();      return; }

  const btn = document.getElementById("btn-submit");
  btn.disabled = true;
  document.getElementById("loading-bar").style.display = "block";

  const now = new Date(), pad = n => String(n).padStart(2,"0");
  const rec = {
    id: Date.now(), prefix, firstName, lastName, empCode, idCard,
    position, dept, site, course: course.name,
    courseData: course,
    trainingDate: date, dateDisplay: toShortThai(date),
    time: pad(now.getHours())+":"+pad(now.getMinutes()), dateSort: date
  };
  saveData([...getData(), rec]);

  fetch(SCRIPT_URL, {
    method: "POST", mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "attendance", prefix, firstName, lastName, empCode, idCard,
      position, dept, site, course: course.name,
      time: course.time, location: course.location,
      instructor: course.instructor, trainingDate: date
    })
  }).finally(() => {
    document.getElementById("success-name").textContent   = prefix+" "+firstName+" "+lastName;
    document.getElementById("success-course").textContent = course.name;
    document.getElementById("success-date").textContent   = "วันที่อบรม: "+toShortThai(date);
    document.getElementById("success-sheet").textContent  = toSheetName(date, course.name);
    document.getElementById("form-wrap").style.display    = "none";
    document.getElementById("success-wrap").style.display = "";
    document.getElementById("loading-bar").style.display  = "none";
  });
}

function resetForm() {
  ["s-firstname","s-lastname","s-empcode","s-idcard","s-position","s-dept"].forEach(id => document.getElementById(id).value="");
  document.getElementById("s-prefix").value = "นาย";
  document.getElementById("s-site").value   = "";
  document.getElementById("s-course").value = "";
  document.getElementById("s-date").value   = todayISO();
  document.getElementById("btn-submit").disabled = false;
  document.getElementById("form-wrap").style.display    = "";
  document.getElementById("success-wrap").style.display = "none";
  document.getElementById("s-firstname").focus();
}

/* ════════════════════════════════════════════════
   PIN
════════════════════════════════════════════════ */
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
    icon: `<svg width="22" height="22" fill="none" stroke="#1B5E2B" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    title: "เปลี่ยนรหัส PIN",
    message: "ระบุรหัส PIN ใหม่ (ตัวเลข 4–8 หลัก)",
    inputPlaceholder: "PIN ใหม่", inputType: "password",
    confirmText: "บันทึก PIN", cancelText: "ยกเลิก",
    onConfirm: val => {
      if (!/^\d{4,8}$/.test(val)) { showToast("PIN ต้องเป็นตัวเลข 4–8 หลัก", "error"); return; }
      savePin(val);
      showToast("เปลี่ยน PIN เรียบร้อย", "success");
    }
  });
}

/* ════════════════════════════════════════════════
   HR SUB-TABS
════════════════════════════════════════════════ */
function showHrTab(tab) {
  ["list","courses"].forEach(t => {
    document.getElementById("hrtab-"+t).classList.toggle("active", t===tab);
    document.getElementById("hrsection-"+t).style.display = t===tab ? "" : "none";
  });
  if (tab==="list")    renderDashboard();
  if (tab==="courses") loadCourseManager();
}

/* ════════════════════════════════════════════════
   COURSE MANAGER
════════════════════════════════════════════════ */
function loadCourseManager() {
  const el = document.getElementById("course-list");
  el.innerHTML = `<div class="empty-state"><div class="empty-icon spin-wrap"><svg width="20" height="20" fill="none" stroke="#1B5E2B" stroke-width="2" viewBox="0 0 24 24" class="spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg></div><p>กำลังโหลด...</p></div>`;
  fetch(SCRIPT_URL+"?action=getCourses&t="+Date.now())
    .then(r => r.json())
    .then(data => { cloudCourses = data.courses || []; renderCourseManager(); })
    .catch(() => { el.innerHTML=`<div class="empty-state"><p style="color:#B91C1C">โหลดไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ</p></div>`; });
}

function renderCourseManager() {
  const el = document.getElementById("course-list");
  if (!cloudCourses.length) {
    el.innerHTML=`<div class="empty-state"><div class="empty-icon"><svg width="20" height="20" fill="none" stroke="#9a9994" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><p>ยังไม่มีหัวข้ออบรม<br><small>กรอกรายละเอียดด้านบนแล้วกด "เพิ่ม"</small></p></div>`;
    return;
  }
  el.innerHTML = cloudCourses.map((c,i) => `
    <div class="course-row ${c.active?"":"course-hidden"}">
      <div class="course-left">
        <div class="course-status-dot ${c.active?"dot-active":"dot-hidden"}"></div>
        <div style="min-width:0;flex:1">
          <div class="course-name">${c.name}</div>
          <div class="course-meta">
            ${c.date ? toFullThaiDate(c.date) : "ไม่ระบุวันที่"} &nbsp;|&nbsp; ${c.time||""} &nbsp;|&nbsp; ${c.location||"ไม่ระบุสถานที่"} &nbsp;|&nbsp; ${c.type||""}
          </div>
          <div class="course-meta" style="margin-top:1px">${c.instructor||""}</div>
        </div>
      </div>
      <div class="course-actions">
        <button class="btn btn-xs ${c.active?"btn-warning":"btn-ok-outline"}" onclick="toggleCourse(${i})">
          ${c.active
            ? `<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> ซ่อน`
            : `<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> แสดง`}
        </button>
        <button class="btn btn-xs btn-danger-xs" onclick="confirmDeleteCourse(${i})">
          <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg> ลบ
        </button>
      </div>
    </div>`).join("");
}

function addCourse() {
  const name       = document.getElementById("nc-name").value.trim();
  const date       = document.getElementById("nc-date").value;
  const time       = document.getElementById("nc-time").value.trim() || "08.00-17.00น.";
  const location   = document.getElementById("nc-location").value.trim();
  const instructor = document.getElementById("nc-instructor").value.trim() || "วิทยากรภายใน บริษัท เคมีแมน จำกัด (มหาชน)";
  const type       = document.getElementById("nc-type").value;

  if (!name)     { showToast("กรุณากรอกชื่อหัวข้อ","error"); document.getElementById("nc-name").focus(); return; }
  if (!date)     { showToast("กรุณาเลือกวันที่อบรม","error"); document.getElementById("nc-date").focus(); return; }
  if (!location) { showToast("กรุณากรอกสถานที่อบรม","error"); document.getElementById("nc-location").focus(); return; }
  if (cloudCourses.find(c=>c.name===name)) { showToast(`"${name}" มีในรายการแล้ว`,"error"); return; }

  cloudCourses.push({ name, active:true, date, time, location, instructor, type });
  // เคลียร์ฟอร์ม
  ["nc-name","nc-time","nc-location","nc-instructor"].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value="";
  });
  document.getElementById("nc-date").value="";
  document.getElementById("nc-type").value="พนักงาน";

  renderCourseManager();
  showToast("กำลังบันทึก...","loading");
  syncCoursesToCloud()
    .then(()=>{ showToast(`เพิ่ม "${name}" เรียบร้อย`,"success"); populateCourseSelect(); })
    .catch(()=>{ cloudCourses.pop(); renderCourseManager(); showToast("บันทึกไม่สำเร็จ","error"); });
}

function toggleCourse(i) {
  const c = cloudCourses[i];
  c.active = !c.active;
  renderCourseManager();
  showToast("กำลังบันทึก...","loading");
  syncCoursesToCloud()
    .then(()=>{ showToast(c.active?`แสดง "${c.name}" แล้ว`:`ซ่อน "${c.name}" แล้ว`,"success"); populateCourseSelect(); })
    .catch(()=>{ c.active=!c.active; renderCourseManager(); showToast("บันทึกไม่สำเร็จ","error"); });
}

function confirmDeleteCourse(i) {
  const name = cloudCourses[i].name;
  showModal({
    icon:`<svg width="22" height="22" fill="none" stroke="#B91C1C" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
    title:"ลบหัวข้ออบรม",
    message:`ต้องการลบ <strong>"${name}"</strong> ?<br><small style="color:#8E9489">ข้อมูลการลงชื่อที่บันทึกไว้จะยังคงอยู่</small>`,
    confirmText:"ลบ", confirmClass:"modal-btn-danger", cancelText:"ยกเลิก",
    onConfirm:()=>{
      cloudCourses.splice(i,1);
      renderCourseManager();
      showToast("กำลังบันทึก...","loading");
      syncCoursesToCloud()
        .then(()=>{ showToast(`ลบ "${name}" เรียบร้อย`,"success"); populateCourseSelect(); })
        .catch(()=>showToast("บันทึกไม่สำเร็จ","error"));
    }
  });
}

/* ════════════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════════════ */
function renderDashboard() {
  const data    = getData();
  const dates   = [...new Set(data.map(r=>r.dateSort))].sort().reverse();
  const courses = [...new Set(data.map(r=>r.course))];
  const depts   = [...new Set(data.map(r=>r.dept))];
  if (!activeDate || !dates.includes(activeDate)) activeDate = dates[0]||"";

  document.getElementById("metrics").innerHTML=`
    <div class="metric-card"><div class="metric-num">${data.length}</div><div class="metric-lbl">ผู้ลงทะเบียน</div></div>
    <div class="metric-card"><div class="metric-num">${courses.length}</div><div class="metric-lbl">หลักสูตร</div></div>
    <div class="metric-card"><div class="metric-num">${depts.length}</div><div class="metric-lbl">หน่วยงาน</div></div>`;

  const tabs = document.getElementById("sheet-tabs");
  tabs.innerHTML = !dates.length
    ? '<span class="no-data-hint">ยังไม่มีข้อมูล</span>'
    : dates.map(d=>`<button class="sheet-tab ${d===activeDate?"active":""}" onclick="selectDate('${d}')">${toShortThai(d)}</button>`).join("");

  const dayData    = data.filter(r=>r.dateSort===activeDate);
  const dayCourses = [...new Set(dayData.map(r=>r.course))].sort();
  const fc = document.getElementById("filter-course"), sc=fc.value;
  fc.innerHTML='<option value="">ทุกหัวข้อ</option>'+dayCourses.map(c=>`<option value="${c}" ${sc===c?"selected":""}>${c}</option>`).join("");
  renderList();
}

function selectDate(d) {
  activeDate=d;
  document.querySelectorAll(".sheet-tab").forEach(t=>t.classList.remove("active"));
  event.target.classList.add("active");
  document.getElementById("filter-course").value="";
  renderList();
}

function renderList() {
  const data=getData(), q=(document.getElementById("search-input").value||"").toLowerCase();
  const fc=document.getElementById("filter-course").value;
  const filtered=data.filter(r=>{
    if(r.dateSort!==activeDate) return false;
    const fullName=(r.prefix+r.firstName+" "+r.lastName).toLowerCase();
    if(q && !fullName.includes(q) && !r.dept.toLowerCase().includes(q)) return false;
    if(fc && r.course!==fc) return false;
    return true;
  }).reverse();

  const el=document.getElementById("list-container");
  if(!filtered.length){
    el.innerHTML=`<div class="empty-state"><div class="empty-icon"><svg width="20" height="20" fill="none" stroke="#9a9994" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><p>${activeDate?"ยังไม่มีข้อมูลในวันนี้":"ยังไม่มีข้อมูล"}</p></div>`;
    return;
  }
  el.innerHTML=filtered.map((r,idx)=>`
    <div class="list-row">
      <div class="row-num">${filtered.length-idx}</div>
      <div class="row-info">
        <div class="row-name">${r.prefix} ${r.firstName} ${r.lastName}</div>
        <div class="row-sub">${[r.empCode,r.position,r.dept].filter(Boolean).join(" · ")}</div>
        <div class="row-tags">
          <span class="tag tag-course">${r.course}</span>
          <span class="tag tag-site">${r.site||""}</span>
        </div>
      </div>
      <div class="row-meta">
        <div class="row-date">${r.dateDisplay||""}</div>
        <div class="row-time">${r.time} น.</div>
        <button class="btn btn-xs btn-danger-xs" style="margin-top:5px" onclick="confirmDeleteRecord(${r.id},'${(r.prefix+r.firstName+" "+r.lastName).replace(/'/g,"\\'")}')">ลบ</button>
      </div>
    </div>`).join("");
}

function confirmDeleteRecord(id,name){
  showModal({
    icon:`<svg width="22" height="22" fill="none" stroke="#B91C1C" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>`,
    title:"ลบรายการ",
    message:`ต้องการลบรายการของ <strong>${name}</strong> ?`,
    confirmText:"ลบ", confirmClass:"modal-btn-danger", cancelText:"ยกเลิก",
    onConfirm:()=>{ saveData(getData().filter(r=>r.id!==id)); renderDashboard(); showToast("ลบรายการเรียบร้อย","success"); }
  });
}

function clearDateData(){
  if(!activeDate) return;
  showModal({
    icon:`<svg width="22" height="22" fill="none" stroke="#B91C1C" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    title:"ล้างข้อมูลวันที่นี้",
    message:`ต้องการล้างข้อมูลทั้งหมดของวันที่ <strong>${toShortThai(activeDate)}</strong> ?<br><small style="color:#B91C1C">ไม่สามารถย้อนกลับได้</small>`,
    confirmText:"ล้างข้อมูล", confirmClass:"modal-btn-danger", cancelText:"ยกเลิก",
    onConfirm:()=>{ saveData(getData().filter(r=>r.dateSort!==activeDate)); activeDate=""; renderDashboard(); showToast("ล้างข้อมูลเรียบร้อย","success"); }
  });
}

/* ════════════════════════════════════════════════
   EXPORT EXCEL — เหมือน IMAFHR03 100%
════════════════════════════════════════════════ */
function exportExcel(){
  const data=getData();
  const fc=document.getElementById("filter-course").value;
  const q=(document.getElementById("search-input").value||"").toLowerCase();
  let filtered=data.filter(r=>{
    if(r.dateSort!==activeDate) return false;
    const fn=(r.prefix+r.firstName+" "+r.lastName).toLowerCase();
    if(q && !fn.includes(q) && !r.dept.toLowerCase().includes(q)) return false;
    if(fc && r.course!==fc) return false;
    return true;
  }).reverse();

  if(!filtered.length){ showToast("ไม่มีข้อมูลในวันที่นี้","error"); return; }

  const WB  = XLSX.utils.book_new();
  // จัดกลุ่มตามหัวข้ออบรม
  const byCourse={};
  filtered.forEach(r=>{ if(!byCategory[r.course]) byCategory[r.course]=[]; byCategory[r.course].push(r); });
  // แก้ชื่อตัวแปร
  const byCategory={};
  filtered.forEach(r=>{ if(!byCategory[r.course]) byCategory[r.course]=[]; byCategory[r.course].push(r); });

  Object.keys(byCategory).forEach(courseName=>{
    const rows=byCategory[courseName];
    const c=rows[0].courseData || {};
    const shName=toSheetName(activeDate,courseName).substring(0,31);
    buildExcelSheet(WB, shName, rows, c, courseName);
  });

  const fname="IMAFHR03_ใบลงทะเบียน_"+(activeDate||"all").replace(/-/g,"")+".xlsx";
  XLSX.writeFile(WB,fname);
  showToast("ดาวน์โหลด Excel เรียบร้อย","success");
}

function buildExcelSheet(wb, sheetName, rows, courseData, courseName){
  const ws={};
  const dateStr = rows[0]?.trainingDate || activeDate;
  const thDate  = toFullThaiDate(dateStr);
  const timeStr = courseData.time||"08.00-17.00น.";
  const loc     = courseData.location||"";
  const inst    = courseData.instructor||"วิทยากรภายใน บริษัท เคมีแมน จำกัด (มหาชน)";

  // ── helper ──
  const cell=(r,c,v,s)=>{ const ref=XLSX.utils.encode_cell({r,c}); ws[ref]={v,t:typeof v==="number"?"n":"s",...(s?{s}:{})}; };
  const merge=(rs,re,cs,ce)=>{ if(!ws["!merges"]) ws["!merges"]=[]; ws["!merges"].push({s:{r:rs,c:cs},e:{r:re,c:ce}}); };

  const H_GREEN="1B5E2B", H_WHITE="FFFFFF";
  const boldGreen={font:{bold:true,name:"TH SarabunPSK",sz:14},fill:{fgColor:{rgb:H_GREEN}},alignment:{vertical:"center"}};
  const boldWhite={font:{bold:true,name:"TH SarabunPSK",sz:12,color:{rgb:H_WHITE}},fill:{fgColor:{rgb:H_GREEN}},alignment:{horizontal:"center",vertical:"center"},border:{top:{style:"thin"},bottom:{style:"thin"},left:{style:"thin"},right:{style:"thin"}}};
  const headerStyle={font:{bold:true,name:"TH SarabunPSK",sz:11},alignment:{horizontal:"center",vertical:"center",wrapText:true},border:{top:{style:"thin"},bottom:{style:"thin"},left:{style:"thin"},right:{style:"thin"}}};
  const dataStyle={font:{name:"TH SarabunPSK",sz:11},alignment:{horizontal:"center",vertical:"center"},border:{top:{style:"thin"},bottom:{style:"thin"},left:{style:"thin"},right:{style:"thin"}}};
  const dataLeft={...dataStyle,alignment:{...dataStyle.alignment,horizontal:"left"}};

  // Row 0: ใบลงทะเบียน
  cell(0,0,"ใบลงทะเบียนการฝึกอบรม",{font:{bold:true,name:"TH SarabunPSK",sz:16},alignment:{vertical:"center"}});
  merge(0,0,0,10);
  cell(0,11,"KK =",{font:{name:"TH SarabunPSK",sz:11}});
  cell(0,12,{f:`COUNTIF(M8:M207,"KK")`},{font:{name:"TH SarabunPSK",sz:11}});
  cell(0,13,"ชาย =",{font:{name:"TH SarabunPSK",sz:11}});
  cell(0,14,{f:`COUNTIF(D8:D207,"นาย")`},{font:{name:"TH SarabunPSK",sz:11}});

  // Row 1: หลักสูตร
  cell(1,0,"หลักสูตร "+courseName,{font:{bold:true,name:"TH SarabunPSK",sz:13}});
  merge(1,1,0,10);
  cell(1,11,"BKK =",{font:{name:"TH SarabunPSK",sz:11}});
  cell(1,12,{f:`COUNTIF(M8:M207,"BKK")`},{font:{name:"TH SarabunPSK",sz:11}});
  cell(1,13,"หญิง =",{font:{name:"TH SarabunPSK",sz:11}});
  cell(1,14,{f:`SUM(COUNTIF(D8:D207,"นาง"),COUNTIF(D8:D207,"น.ส."))`},{font:{name:"TH SarabunPSK",sz:11}});

  // Row 2: วันที่
  cell(2,0,"วันที่ "+thDate+"  เวลา "+timeStr+"  สถานที่อบรม  "+loc,{font:{bold:true,name:"TH SarabunPSK",sz:13}});
  merge(2,2,0,10);
  cell(2,11,"TK =",{font:{name:"TH SarabunPSK",sz:11}});
  cell(2,12,{f:`COUNTIF(M8:M207,"TK")`},{font:{name:"TH SarabunPSK",sz:11}});

  // Row 3: วิทยากร
  cell(3,0,"โดย  "+inst,{font:{bold:true,name:"TH SarabunPSK",sz:13}});
  merge(3,3,0,10);
  cell(3,11,"RY =",{font:{name:"TH SarabunPSK",sz:11}});
  cell(3,12,{f:`COUNTIF(M8:M207,"RY")`},{font:{name:"TH SarabunPSK",sz:11}});

  // Row 4: header ตาราง แถว 1
  const hdr4=[
    [0,0,"ลำดับ",boldWhite],[1,1,"รหัสพนักงาน",boldWhite],[2,2,"ID",boldWhite],
    [3,5,"ชื่อ - นามสกุล",boldWhite],[6,6,"ตำแหน่ง",boldWhite],
    [7,7,"หน่วยงาน",boldWhite],[8,10,"ลายมือชื่อ",boldWhite]
  ];
  hdr4.forEach(([cs,ce,v,s])=>{ cell(4,cs,v,s); if(cs!==ce) merge(4,4,cs,ce); });
  merge(4,5,0,0); // ลำดับ span 2 แถว
  merge(4,5,1,1); // รหัส span 2 แถว
  merge(4,5,2,2); // ID span 2 แถว
  merge(4,5,6,6); // ตำแหน่ง
  merge(4,5,7,7); // หน่วยงาน
  cell(4,11,"PBB =",{font:{name:"TH SarabunPSK",sz:11}});
  cell(4,12,{f:`COUNTIF(M8:M207,"PBB")`},{font:{name:"TH SarabunPSK",sz:11}});
  cell(4,13,{f:`SUM(M1:M5)`},{font:{name:"TH SarabunPSK",sz:11}});

  // Row 5: header แถว 2
  cell(5,3,"คำนำหน้า",boldWhite);
  cell(5,4,"ชื่อ",boldWhite);
  cell(5,5,"นามสกุล",boldWhite);
  cell(5,8,"เช้า",boldWhite);
  cell(5,9,"บ่าย",boldWhite);
  cell(5,10,"หมายเหตุ",boldWhite);

  // Rows 6+: ข้อมูล
  rows.forEach((r,i)=>{
    const R=6+i;
    cell(R,0,i+1,dataStyle);
    cell(R,1,r.empCode||"",dataStyle);
    cell(R,2,r.idCard||"",dataStyle);
    cell(R,3,r.prefix||"",dataStyle);
    cell(R,4,r.firstName||"",dataLeft);
    cell(R,5,r.lastName||"",dataLeft);
    cell(R,6,r.position||"",dataLeft);
    cell(R,7,r.dept||"",dataLeft);
    cell(R,8,"",dataStyle); // ลายมือเช้า
    cell(R,9,"",dataStyle); // ลายมือบ่าย
    cell(R,10,"",dataStyle);// หมายเหตุ
    cell(R,11,r.site||"",dataStyle);
  });

  // Column widths
  ws["!cols"]=[
    {wch:6},{wch:13},{wch:14},{wch:10},{wch:16},{wch:18},
    {wch:18},{wch:16},{wch:18},{wch:18},{wch:12},{wch:7},
    {wch:7},{wch:8},{wch:7}
  ];
  // Row heights
  ws["!rows"]=[{hpt:28},{hpt:24},{hpt:24},{hpt:24},{hpt:26},{hpt:22}];
  for(let i=0;i<rows.length;i++) ws["!rows"].push({hpt:36});

  ws["!ref"]=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:6+rows.length,c:14}});
  XLSX.utils.book_append_sheet(wb,ws,sheetName);
}
