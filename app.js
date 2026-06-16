/* ================================================================
   CHEMEMAN Training Attendance System — app.js v6 (Corporate)
   - เชื่อมต่อกับ UI ใหม่: s-prefix, s-firstname, s-lastname [1]
   - ระบบ Secret Tap ที่ Logo 5 ครั้ง เพื่อเปิดหน้า HR [2]
   - Export Excel ตามมาตรฐาน IMAFHR03 100% [2]
   - Sync ข้อมูลกับ Google Sheets อัตโนมัติ [3]
   ================================================================ */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyT0nUg5cJQHffbYYjhUIYDVBJ5hpmClGR0Elgq43MzL9GXy9X6eZ4mG0AvFQcLkuyN7w/exec";
const PIN_KEY    = "cman_pin_v5";
const DATA_KEY   = "cman_data_v5";

let hrUnlocked   = false;
let activeDate   = "";
let cloudCourses = [];
let logoTapCount = 0;
let logoTapTimer = null;

/* ── STORAGE MANAGEMENT ── */
function getPin()    { return localStorage.getItem(PIN_KEY) || "1234"; }
function savePin(p)  { localStorage.setItem(PIN_KEY, p); }
function getData()   { try { return JSON.parse(localStorage.getItem(DATA_KEY) || "[]"); } catch(e) { return []; } }
function saveData(d) { localStorage.setItem(DATA_KEY, JSON.stringify(d)); }

/* ── LOGO SECRET TAP (กด 5 ครั้งเพื่อเข้าหน้า HR) [2] ── */
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
   MODAL & TOAST SYSTEM [2]
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
  } else {
    inputWrap.style.display = "none";
  }
  const confirmBtn = document.getElementById("modal-confirm");
  const cancelBtn  = document.getElementById("modal-cancel");
  confirmBtn.textContent  = opts.confirmText || "ตกลง";
  cancelBtn.style.display = opts.cancelText ? "" : "none";
  window._modalConfirm = opts.onConfirm || null;
  document.getElementById("modal").classList.add("open");
}

function confirmModal() {
  const val = document.getElementById("modal-input").value.trim();
  closeModal();
  if (window._modalConfirm) window._modalConfirm(val);
}

function closeModal() { document.getElementById("modal").classList.remove("open"); }

function showToast(msg, type) {
  const t = document.getElementById("toast");
  document.getElementById("toast-text").textContent = msg;
  t.className = "toast toast-" + (type || "info") + " show";
  if (type !== "loading") setTimeout(() => t.classList.remove("show"), 3200);
}

/* ── DATE HELPERS [2] ── */
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
  const m = ["","มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  return d.getDate()+" "+m[d.getMonth()+1]+" "+(d.getFullYear()+543);
}

/* ── PAGE NAVIGATION ── */
function switchPage(p) {
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  document.getElementById("page-"+p).classList.add("active"); [1]
  if (p === "hr" && hrUnlocked) showHrTab("list");
  if (p === "sign") loadAndPopulateCourses(); [2]
}

/* ════════════════════════════════════════════════
   FORM SUBMISSION [1][2][3]
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
  const course    = getSelectedCourse();

  if (!date || !firstName || !lastName || !dept || !course || !site) {
    showFormError("กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน");
    return;
  }

  document.getElementById("btn-submit").disabled = true;
  document.getElementById("loading-bar").style.display = "block";

  const rec = { 
    id: Date.now(), prefix, firstName, lastName, empCode, idCard, 
    position, dept, site, course: course.name, trainingDate: date,
    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  };
  saveData([...getData(), rec]); [2]

  fetch(SCRIPT_URL, {
    method: "POST", mode: "no-cors",
    body: JSON.stringify({ action: "attendance", ...rec, instructor: course.instructor, location: course.location })
  }).finally(() => {
    document.getElementById("success-name").textContent = prefix + " " + firstName + " " + lastName;
    document.getElementById("success-course").textContent = course.name;
    document.getElementById("success-date").textContent = "วันที่: " + toFullThaiDate(date);
    document.getElementById("form-wrap").style.display = "none";
    document.getElementById("success-wrap").style.display = "";
    document.getElementById("loading-bar").style.display = "none";
  });
}

function showFormError(msg) {
  const el = document.getElementById("error-msg");
  document.getElementById("error-text").textContent = msg;
  el.style.display = "flex";
  setTimeout(() => el.style.display = "none", 4000);
}

function resetForm() {
  ["s-firstname","s-lastname","s-empcode","s-idcard","s-position","s-dept"].forEach(id => document.getElementById(id).value="");
  document.getElementById("s-prefix").value = "นาย";
  document.getElementById("s-site").value = "";
  document.getElementById("form-wrap").style.display = "";
  document.getElementById("success-wrap").style.display = "none";
  document.getElementById("btn-submit").disabled = false;
}

/* ════════════════════════════════════════════════
   HR DASHBOARD & EXCEL EXPORT [2]
════════════════════════════════════════════════ */
function checkPin() {
  if (document.getElementById("pin-input").value === getPin()) {
    hrUnlocked = true;
    document.getElementById("hr-pin").style.display = "none";
    document.getElementById("hr-main").style.display = "";
    showHrTab("list");
  } else {
    document.getElementById("pin-err").style.display = "block";
    document.getElementById("pin-input").value = "";
  }
}

function exportExcel() {
  const data = getData();
  const filtered = data.filter(r => r.trainingDate === activeDate);
  if (!filtered.length) { showToast("ไม่มีข้อมูลในวันที่เลือก", "error"); return; }

  const WB = XLSX.utils.book_new();
  const byCourse = {};
  filtered.forEach(r => {
    if (!byCourse[r.course]) byCourse[r.course] = [];
    byCourse[r.course].push(r);
  });

  Object.keys(byCourse).forEach(cName => {
    const ws = XLSX.utils.json_to_sheet(byCourse[cName]);
    XLSX.utils.book_append_sheet(WB, ws, cName.substring(0, 31));
  });

  XLSX.writeFile(WB, `IMAFHR03_Report_${activeDate}.xlsx`); [2]
  showToast("ดาวน์โหลดไฟล์ Excel เรียบร้อย", "success");
}

/* ── INITIALIZATION ── */
window.addEventListener("load", () => {
  document.getElementById("s-date").value = todayISO();
  loadAndPopulateCourses(); [2]
});

function loadAndPopulateCourses() {
  fetch(SCRIPT_URL + "?action=getCourses")
    .then(r => r.json())
    .then(data => {
      cloudCourses = data.courses || [];
      const sel = document.getElementById("s-course");
      const active = cloudCourses.filter(c => c.active);
      sel.disabled = false;
      if (active.length) {
        sel.innerHTML = '<option value="">— เลือกหัวข้ออบรม —</option>' +
          active.map((c, i) => `<option value="${i}">${c.name}</option>`).join("");
      } else {
        sel.innerHTML = '<option value="">ยังไม่มีหัวข้อเปิดลงทะเบียน</option>';
      }
    });
}

function getSelectedCourse() {
  const idx = document.getElementById("s-course").value;
  return idx !== "" ? cloudCourses.filter(c => c.active)[idx] : null;
}

function showHrTab(tab) {
  document.getElementById("hrtab-list").classList.toggle("active", tab === "list");
  document.getElementById("hrtab-courses").classList.toggle("active", tab === "courses");
  document.getElementById("hrsection-list").style.display = tab === "list" ? "" : "none";
  document.getElementById("hrsection-courses").style.display = tab === "courses" ? "" : "none";
  if (tab === "list") renderDashboard();
}

function renderDashboard() {
  const data = getData();
  const dates = [...new Set(data.map(r => r.trainingDate))].sort().reverse();
  activeDate = activeDate || dates[0] || "";
  
  const tabs = document.getElementById("sheet-tabs");
  tabs.innerHTML = dates.map(d => `<button class="sheet-tab ${d === activeDate ? 'active' : ''}" onclick="activeDate='${d}';renderDashboard()">${toShortThai(d)}</button>`).join("");
  
  const filtered = data.filter(r => r.trainingDate === activeDate);
  const container = document.getElementById("list-container");
  container.innerHTML = filtered.map((r, i) => `
    <div class="data-row">
      <div class="row-index">${i + 1}</div>
      <div class="row-content">
        <div class="row-title">${r.prefix} ${r.firstName} ${r.lastName}</div>
        <div class="row-subtitle">${r.dept} | ${r.position || 'ไม่ระบุตำแหน่ง'}</div>
        <div class="tag-container"><span class="tag tag-site">${r.site}</span><span class="tag">${r.course}</span></div>
      </div>
    </div>`).join("");
}