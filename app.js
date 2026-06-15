/* ============================================================
   CHEMEMAN Training Attendance System — app.js
   ============================================================ */

const SCRIPT_URL  = "https://script.google.com/macros/s/AKfycbyl48Wi5UWd0-opSZHHFN_nc_B1ovE23rnyaJcmHRYLOhnM7QfeNh71FqJFMnPrfZxd/exec";
const PIN_KEY     = "cman_pin_v3";
const DATA_KEY    = "cman_data_v3";
const COURSE_KEY  = "cman_courses_v3";   // รายการหัวข้ออบรม

let hrUnlocked  = false;
let activeDate  = "";
let hrPage      = "list";   // "list" | "courses"

/* ── STORAGE ── */
function getPin()       { return localStorage.getItem(PIN_KEY) || "1234"; }
function savePin(p)     { localStorage.setItem(PIN_KEY, p); }
function getData()      { try { return JSON.parse(localStorage.getItem(DATA_KEY) || "[]"); } catch(e) { return []; } }
function saveData(d)    { localStorage.setItem(DATA_KEY, JSON.stringify(d)); }
function getCourses()   { try { return JSON.parse(localStorage.getItem(COURSE_KEY) || "[]"); } catch(e) { return []; } }
function saveCourses(c) { localStorage.setItem(COURSE_KEY, JSON.stringify(c)); }

/* ── DATE HELPERS ── */
function todayISO() {
  const t = new Date();
  return t.getFullYear() + "-" +
    String(t.getMonth()+1).padStart(2,"0") + "-" +
    String(t.getDate()).padStart(2,"0");
}
/* dd/mm/yy (พ.ศ. แบบย่อ 2 หลัก) */
function toShortThai(dateStr) {
  if (!dateStr) return "";
  const d  = new Date(dateStr + "T00:00:00");
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = String(d.getFullYear()+543).slice(-2);
  return dd + "/" + mm + "/" + yy;
}
/* dd/mm/yyyy (พ.ศ. เต็ม) สำหรับ Excel */
function toFullThai(dateStr) {
  if (!dateStr) return "";
  const d    = new Date(dateStr + "T00:00:00");
  const dd   = String(d.getDate()).padStart(2,"0");
  const mm   = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear()+543;
  return dd + "/" + mm + "/" + yyyy;
}
function toSheetName(dateStr) {
  if (!dateStr) return "ไม่ระบุวัน";
  const d  = new Date(dateStr + "T00:00:00");
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  return "อบรม " + dd + "-" + mm + "-" + (d.getFullYear()+543);
}

/* ── PAGE SWITCH ── */
function switchPage(p) {
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(el => el.classList.remove("active"));
  document.getElementById("page-" + p).classList.add("active");
  document.getElementById("tab-" + p).classList.add("active");
  if (p === "hr" && hrUnlocked) renderDashboard();
  if (p === "sign") populateCourseSelect();
}

/* ── INIT ── */
window.addEventListener("load", () => {
  document.getElementById("s-date").value = todayISO();
  populateCourseSelect();
});

/* ── POPULATE COURSE DROPDOWN (หน้าลงชื่อ) ── */
function populateCourseSelect() {
  const courses = getCourses().filter(c => c.active);
  const sel = document.getElementById("s-course");
  if (!sel) return;
  sel.innerHTML = '<option value="">-- เลือกหัวข้ออบรม --</option>' +
    courses.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
}

/* ── FORM SUBMIT ── */
function showError(msg) {
  document.getElementById("error-text").textContent = msg;
  const el = document.getElementById("error-msg");
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

  if (!date)   { showError("กรุณาเลือกวันที่อบรม");      return; }
  if (!name)   { showError("กรุณากรอกชื่อ-นามสกุล");     document.getElementById("s-name").focus();   return; }
  if (!dept)   { showError("กรุณากรอกแผนก / หน่วยงาน");  document.getElementById("s-dept").focus();   return; }
  if (!course) { showError("กรุณาเลือกหัวข้ออบรม");       document.getElementById("s-course").focus(); return; }

  const btn = document.getElementById("btn-submit");
  btn.disabled = true;
  document.getElementById("loading-bar").style.display = "block";

  const now = new Date();
  const pad = n => String(n).padStart(2,"0");
  const rec = {
    id: Date.now(), name, dept, position: pos, course, tel,
    trainingDate: date,
    dateDisplay: toShortThai(date),
    time: pad(now.getHours()) + ":" + pad(now.getMinutes()),
    dateSort: date
  };
  saveData([...getData(), rec]);

  fetch(SCRIPT_URL, {
    method: "POST", mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, dept, position: pos, course, tel, trainingDate: date })
  }).finally(() => {
    document.getElementById("success-name").textContent  = name;
    document.getElementById("success-course").textContent = course;
    document.getElementById("success-date").textContent  = toShortThai(date);
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

/* ── PIN ── */
function checkPin() {
  const val = document.getElementById("pin-input").value;
  if (val === getPin()) {
    hrUnlocked = true;
    document.getElementById("hr-pin").style.display       = "none";
    document.getElementById("hr-main").style.display      = "";
    document.getElementById("pin-err").style.display      = "none";
    showHrTab("list");
  } else {
    document.getElementById("pin-err").style.display = "block";
    document.getElementById("pin-input").value = "";
    document.getElementById("pin-input").focus();
  }
}
function changePin() {
  const np = prompt("ใส่รหัส PIN ใหม่ (ตัวเลข 4-8 หลัก):");
  if (!np) return;
  if (!/^\d{4,8}$/.test(np)) { alert("PIN ต้องเป็นตัวเลข 4-8 หลักเท่านั้น"); return; }
  savePin(np);
  alert("เปลี่ยน PIN เรียบร้อยแล้ว");
}

/* ── HR SUB-TABS ── */
function showHrTab(tab) {
  hrPage = tab;
  ["list","courses"].forEach(t => {
    document.getElementById("hrtab-" + t).classList.toggle("active", t === tab);
    document.getElementById("hrsection-" + t).style.display = t === tab ? "" : "none";
  });
  if (tab === "list")    renderDashboard();
  if (tab === "courses") renderCourses();
}

/* ══════════════════════════════════════
   COURSE MANAGEMENT
══════════════════════════════════════ */
function renderCourses() {
  const courses = getCourses();
  const el = document.getElementById("course-list");

  if (!courses.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon"><svg width="22" height="22" fill="none" stroke="#9a9994" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></div>
      <p>ยังไม่มีหัวข้ออบรม กดปุ่มด้านบนเพื่อเพิ่ม</p></div>`;
    return;
  }

  el.innerHTML = courses.map((c, i) => `
    <div class="course-row ${c.active ? "" : "course-hidden"}">
      <div class="course-left">
        <div class="course-status-dot ${c.active ? "dot-active" : "dot-hidden"}"></div>
        <div>
          <div class="course-name">${c.name}</div>
          <div class="course-meta">${c.active ? "แสดงให้ผู้อบรมเห็น" : "ซ่อนจากผู้อบรม"}</div>
        </div>
      </div>
      <div class="course-actions">
        <button class="btn btn-sm ${c.active ? "btn-warning" : "btn-success-outline"}"
          onclick="toggleCourse(${i})">
          ${c.active
            ? `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> ซ่อน`
            : `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> แสดง`}
        </button>
        <button class="btn btn-sm btn-danger-outline" onclick="deleteCourse(${i})">
          <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          ลบ
        </button>
      </div>
    </div>`).join("");
}

function addCourse() {
  const input = document.getElementById("new-course-input");
  const name  = input.value.trim();
  if (!name) { input.focus(); return; }
  const courses = getCourses();
  if (courses.find(c => c.name === name)) { alert("มีหัวข้อนี้อยู่แล้ว"); return; }
  courses.push({ name, active: true });
  saveCourses(courses);
  input.value = "";
  renderCourses();
  populateCourseSelect();
}

function toggleCourse(i) {
  const courses = getCourses();
  courses[i].active = !courses[i].active;
  saveCourses(courses);
  renderCourses();
  populateCourseSelect();
}

function deleteCourse(i) {
  const courses = getCourses();
  if (!confirm(`ลบหัวข้อ "${courses[i].name}" ?\nข้อมูลการลงชื่อที่ผ่านมาจะยังอยู่`)) return;
  courses.splice(i, 1);
  saveCourses(courses);
  renderCourses();
  populateCourseSelect();
}

/* ══════════════════════════════════════
   DASHBOARD (รายชื่อ)
══════════════════════════════════════ */
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
  tabs.innerHTML = dates.length === 0 ? '<span style="font-size:13px;color:#8E9489">ยังไม่มีข้อมูล</span>' :
    dates.map(d =>
      `<button class="sheet-tab ${d === activeDate ? "active" : ""}" onclick="selectDate('${d}')">${toShortThai(d)}</button>`
    ).join("");

  const dayData    = data.filter(r => r.dateSort === activeDate);
  const dayCourses = [...new Set(dayData.map(r => r.course))].sort();
  const fc = document.getElementById("filter-course");
  const savedC = fc.value;
  fc.innerHTML = '<option value="">ทุกหลักสูตร</option>' +
    dayCourses.map(c => `<option value="${c}" ${savedC===c?"selected":""}>${c}</option>`).join("");

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
  const data = getData();
  const q    = (document.getElementById("search-input").value || "").toLowerCase();
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
      <div class="empty-icon"><svg width="22" height="22" fill="none" stroke="#9a9994" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
      <p>${activeDate ? "ยังไม่มีข้อมูลในวันนี้" : "ยังไม่มีข้อมูล"}</p></div>`;
    return;
  }

  el.innerHTML = filtered.map(r => `
    <div class="list-row">
      <div class="avatar">${r.name.trim().slice(0,1)}</div>
      <div class="row-info">
        <div class="row-name">${r.name}</div>
        <div class="row-dept">${[r.dept, r.position].filter(Boolean).join(" · ")}</div>
        <div class="row-course">${r.course}</div>
      </div>
      <div class="row-meta">
        <div class="row-date">${r.dateDisplay || r.date || ""}</div>
        <div class="row-time">${r.time} น.</div>
        <button class="btn btn-danger-outline btn-sm" style="margin-top:6px;padding:4px 10px;font-size:11px"
          onclick="deleteRecord(${r.id})">ลบ</button>
      </div>
    </div>`).join("");
}

function deleteRecord(id) {
  if (!confirm("ลบรายการนี้?")) return;
  saveData(getData().filter(r => r.id !== id));
  renderDashboard();
}
function clearDateData() {
  if (!activeDate) return;
  if (!confirm("ล้างข้อมูลทั้งหมดของวัน " + toShortThai(activeDate) + "?\nไม่สามารถย้อนกลับได้")) return;
  saveData(getData().filter(r => r.dateSort !== activeDate));
  activeDate = "";
  renderDashboard();
}

/* ── EXPORT EXCEL ── */
function exportExcel() {
  const data = getData().filter(r => r.dateSort === activeDate);
  if (!data.length) { alert("ไม่มีข้อมูลในวันที่นี้"); return; }
  const fc = document.getElementById("filter-course").value;
  const q  = (document.getElementById("search-input").value || "").toLowerCase();
  const filtered = data.filter(r => {
    if (fc && r.course !== fc) return false;
    if (q  && !r.name.toLowerCase().includes(q) && !r.dept.toLowerCase().includes(q)) return false;
    return true;
  }).reverse();

  const rows = filtered.map((r,i) => ({
    "ลำดับ":               i+1,
    "ชื่อ-นามสกุล":        r.name,
    "แผนก / หน่วยงาน":    r.dept,
    "ตำแหน่ง":             r.position || "",
    "หลักสูตร / การอบรม": r.course,
    "เบอร์โทรศัพท์":      r.tel || "",
    "วันที่อบรม":          toFullThai(r.dateSort),
    "เวลาลงชื่อ":          r.time
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{wch:6},{wch:24},{wch:22},{wch:18},{wch:30},{wch:16},{wch:16},{wch:10}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, toSheetName(activeDate));
  XLSX.writeFile(wb, "CHEMEMAN_" + (activeDate||"all").replace(/-/g,"") + ".xlsx");
}
