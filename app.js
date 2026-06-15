/* ============================================================
   CHEMEMAN Training Attendance System — app.js (Cloud Sync Version)
   ============================================================ */
const SCRIPT_URL  = "https://script.google.com/macros/s/AKfycbyl48Wi5UWd0-opSZHHFN_nc_B1ovE23rnyaJcmHRYLOhnM7QfeNh71FqJFMnPrfZxd/exec";
const PIN_KEY     = "cman_pin_v3";
const DATA_KEY    = "cman_data_v3";
const COURSE_KEY  = "cman_courses_v3";   
let hrUnlocked  = false;
let activeDate  = "";
let hrPage      = "list";   

/* ── STORAGE ── */
function getPin()       { return localStorage.getItem(PIN_KEY) || "1234"; }
function savePin(p)     { localStorage.setItem(PIN_KEY, p); }
function getData()      { try { return JSON.parse(localStorage.getItem(DATA_KEY) || "[]"); } catch(e) { return []; } }
function saveData(d)    { localStorage.setItem(DATA_KEY, JSON.stringify(d)); }
function getCourses()   { try { return JSON.parse(localStorage.getItem(COURSE_KEY) || "[]"); } catch(e) { return []; } }
function saveCourses(c) { localStorage.setItem(COURSE_KEY, JSON.stringify(c)); }

/* ── CLOUD SYNC: ดึงข้อมูลจาก Google Sheets มาลงเครื่อง ── */
async function loadCloudData() {
  console.log("กำลังซิงค์ข้อมูลจาก Cloud...");
  try {
    const response = await fetch(SCRIPT_URL);
    const result = await response.json();
    
    // ซิงค์หัวข้ออบรม
    if (result.courses) {
      saveCourses(result.courses);
      populateCourseSelect();
      if (hrPage === "courses") renderCourses();
    }
    
    // ซิงค์รายชื่อผู้เข้าอบรม
    if (result.attendance) {
      saveData(result.attendance);
      if (hrUnlocked) renderDashboard();
    }
    console.log("ซิงค์ข้อมูลสำเร็จ");
  } catch (e) {
    console.error("Cloud Sync Error:", e);
  }
}

/* ── DATE HELPERS ── */
function todayISO() {
  const t = new Date();
  return t.getFullYear() + "-" +
    String(t.getMonth()+1).padStart(2,"0") + "-" +
    String(t.getDate()).padStart(2,"0");
}

function toShortThai(dateStr) {
  if (!dateStr) return "";
  const d  = new Date(dateStr + "T00:00:00");
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = String(d.getFullYear()+543).slice(-2);
  return dd + "/" + mm + "/" + yy;
}

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
  if (p === "sign") {
    populateCourseSelect();
    loadCloudData(); // โหลดหัวข้อใหม่เผื่อ HR เพิ่งเพิ่ม
  }
}

/* ── INIT ── */
window.addEventListener("load", () => {
  document.getElementById("s-date").value = todayISO();
  loadCloudData(); // โหลดข้อมูลจาก Cloud ทันทีที่เปิดเว็บ
});

/* ── POPULATE COURSE DROPDOWN ── */
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
  const timeStr = String(now.getHours()).padStart(2,"0") + ":" + String(now.getMinutes()).padStart(2,"0");

  const payload = {
    action: "attendance",
    name, dept, position: pos, course, tel, 
    trainingDate: date,
    time: timeStr
  };

  fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).finally(() => {
    document.getElementById("success-name").textContent  = name;
    document.getElementById("success-course").textContent = course;
    document.getElementById("success-date").textContent  = toShortThai(date);
    document.getElementById("success-sheet-name").textContent = toSheetName(date);
    document.getElementById("form-wrap").style.display    = "none";
    document.getElementById("success-wrap").style.display = "";
    document.getElementById("loading-bar").style.display  = "none";
    loadCloudData(); // โหลดข้อมูลรายชื่อใหม่เข้า LocalStorage
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
    loadCloudData(); // ซิงค์ข้อมูลล่าสุดเมื่อเข้าหน้าผู้ดูแล
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

/* ── COURSE MANAGEMENT ── */
function renderCourses() {
  const courses = getCourses();
  const el = document.getElementById("course-list");
  if (!courses.length) {
    el.innerHTML = `<div class="empty-state"><p>ยังไม่มีหัวข้ออบรม</p></div>`;
    return;
  }
  el.innerHTML = courses.map((c, i) => `
    <div class="course-row ${c.active ? "" : "course-hidden"}">
      <div class="course-left">
        <div class="course-status-dot ${c.active ? "dot-active" : "dot-hidden"}"></div>
        <div>
          <div class="course-name">${c.name}</div>
          <div class="course-meta">${c.active ? "แสดงให้ผู้อบรมเห็น" : "ซ่อนอยู่"}</div>
        </div>
      </div>
      <div class="course-actions">
        <p style="font-size:11px;color:var(--c-muted)">จัดการผ่าน Google Sheets</p>
      </div>
    </div>`).join("");
}

async function addCourse() {
  const input = document.getElementById("new-course-input");
  const name  = input.value.trim();
  if (!name) { input.focus(); return; }

  const courses = getCourses();
  if (courses.find(c => c.name === name)) { alert("มีหัวข้อนี้อยู่แล้ว"); return; }

  input.disabled = true;
  try {
    // ส่ง Action ไปที่ Google Sheets เพื่อเพิ่มหัวข้อ
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({ action: "addCourse", name: name })
    });
    input.value = "";
    await loadCloudData(); // โหลดข้อมูลที่อัปเดตแล้วกลับมา
    alert("เพิ่มหัวข้ออบรมสำเร็จ เครื่องอื่นจะเห็นข้อมูลนี้ทันที");
  } catch (e) {
    alert("เกิดข้อผิดพลาดในการเชื่อมต่อ Cloud");
  } finally {
    input.disabled = false;
  }
}

/* ── DASHBOARD (รายชื่อ) ── */
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

  renderList();
}

function selectDate(d) {
  activeDate = d;
  renderDashboard();
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
    el.innerHTML = `<div class="empty-state"><p>ไม่พบรายชื่อในวันที่เลือก</p></div>`;
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
        <div class="row-date">${toShortThai(r.dateSort)}</div>
        <div class="row-time">${r.time || "--:--"} น.</div>
      </div>
    </div>`).join("");
}

/* ── EXPORT EXCEL (ปรับปรุงตารางตาม Requirement) ── */
function exportExcel() {
  const data = getData().filter(r => r.dateSort === activeDate);
  if (!data.length) { alert("ไม่มีข้อมูลในวันที่นี้"); return; }
  
  const q  = (document.getElementById("search-input").value || "").toLowerCase();
  const fc = document.getElementById("filter-course").value;
  
  const filtered = data.filter(r => {
    if (fc && r.course !== fc) return false;
    if (q  && !r.name.toLowerCase().includes(q) && !r.dept.toLowerCase().includes(q)) return false;
    return true;
  }).reverse();

  // สร้างตารางข้อมูลตามหัวข้อที่ต้องการ
  const rows = filtered.map((r, i) => ({
    "ลำดับ": i + 1,
    "ชื่อ-นามสกุล": r.name,
    "แผนก / หน่วยงาน": r.dept,
    "ตำแหน่ง": r.position || "-",
    "หลักสูตร / การอบรม": r.course,
    "เบอร์โทรศัพท์": r.tel || "-",
    "วันที่": toFullThai(r.dateSort),
    "เวลา": r.time || "-"
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  
  // กำหนดความกว้างคอลัมน์
  ws["!cols"] = [
    {wch: 8},  // ลำดับ
    {wch: 25}, // ชื่อ
    {wch: 25}, // แผนก
    {wch: 20}, // ตำแหน่ง
    {wch: 35}, // หลักสูตร
    {wch: 15}, // เบอร์โทร
    {wch: 15}, // วันที่
    {wch: 10}  // เวลา
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "รายชื่อผู้เข้าอบรม");
  
  const fileName = "CHEMEMAN_Attendance_" + activeDate.replace(/-/g, "") + ".xlsx";
  XLSX.writeFile(wb, fileName);
}