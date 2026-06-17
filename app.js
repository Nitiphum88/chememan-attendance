/* ================================================================
   CHEMEMAN Training Attendance System — app.js v7
   Script URL อัพเดทแล้ว
================================================================ */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyT0nUg5cJQHffbYYjhUIYDVBJ5hpmClGR0Elgq43MzL9GXy9X6eZ4mG0AvFQcLkuyN7w/exec";
const PIN_KEY    = "cman_pin_v6";
const DATA_KEY   = "cman_data_v6";

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

/* ── LOGO TAP SECRET (5 ครั้ง เปิด HR) ── */
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
   MODAL SYSTEM (สวยงาม custom modal)
════════════════════════════════════════════════ */
function showModal(opts) {
  const modal = document.getElementById("modal");
  document.getElementById("modal-icon").innerHTML    = opts.icon || "";
  document.getElementById("modal-icon").className   = "modal-icon" + (opts.iconClass ? " " + opts.iconClass : "");
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
  confirmBtn.className    = "modal-btn modal-btn-" + (opts.confirmType || "primary");
  cancelBtn.style.display = opts.cancelText ? "" : "none";
  cancelBtn.textContent   = opts.cancelText || "ยกเลิก";
  window._modalConfirm    = opts.onConfirm || null;

  modal.classList.add("open");
}

function confirmModal() {
  const val = document.getElementById("modal-input").value.trim();
  closeModal();
  if (window._modalConfirm) window._modalConfirm(val);
}

function closeModal() {
  document.getElementById("modal").classList.remove("open");
}

/* ── TOAST ── */
function showToast(msg, type) {
  const t = document.getElementById("toast");
  document.getElementById("toast-text").textContent = msg;
  const icons = { success:"✓", error:"✕", info:"ℹ", loading:"⟳" };
  document.getElementById("toast-icon").textContent = icons[type] || "";
  t.className = "toast toast-" + (type || "info") + " show";
  if (type !== "loading") setTimeout(() => t.classList.remove("show"), 3200);
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
  const m = ["","มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  return d.getDate()+" "+m[d.getMonth()+1]+" "+(d.getFullYear()+543);
}

/* ── PAGE NAVIGATION ── */
function switchPage(p) {
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  document.getElementById("page-"+p).classList.add("active");
  if (p === "hr" && hrUnlocked) showHrTab("list");
  if (p === "sign") loadAndPopulateCourses();
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
  const course    = getSelectedCourse();

  if (!date || !firstName || !lastName || !dept || !course || !site) {
    showModal({
      icon: "⚠️", iconClass: "icon-warn",
      title: "ข้อมูลไม่ครบถ้วน",
      message: "กรุณากรอกข้อมูลที่มีเครื่องหมาย <span style='color:var(--r)'>*</span> ให้ครบถ้วน",
      confirmText: "รับทราบ"
    });
    return;
  }

  document.getElementById("btn-submit").disabled = true;
  document.getElementById("loading-bar").style.display = "block";

  const rec = {
    id: Date.now(), prefix, firstName, lastName, empCode, idCard,
    position, dept, site, course: course.name, trainingDate: date,
    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  };
  saveData([...getData(), rec]);

  fetch(SCRIPT_URL, {
    method: "POST", mode: "no-cors",
    body: JSON.stringify({ action: "attendance", ...rec, instructor: course.instructor, location: course.location })
  }).finally(() => {
    document.getElementById("success-name").textContent   = prefix + " " + firstName + " " + lastName;
    document.getElementById("success-course").textContent = course.name;
    document.getElementById("success-date").textContent   = "วันที่ " + toFullThaiDate(date);
    document.getElementById("success-loc").textContent    = course.location || "";
    document.getElementById("form-wrap").style.display    = "none";
    document.getElementById("success-wrap").style.display = "";
    document.getElementById("loading-bar").style.display  = "none";
  });
}

function showFormError(msg) {
  const el = document.getElementById("error-msg");
  document.getElementById("error-text").textContent = msg;
  el.style.display = "flex";
  setTimeout(() => el.style.display = "none", 4000);
}

function resetForm() {
  ["s-firstname","s-lastname","s-empcode","s-idcard","s-position","s-dept"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("s-prefix").value = "นาย";
  document.getElementById("s-site").value = "";
  document.getElementById("form-wrap").style.display    = "";
  document.getElementById("success-wrap").style.display = "none";
  document.getElementById("btn-submit").disabled = false;
}

/* ════════════════════════════════════════════════
   HR DASHBOARD
════════════════════════════════════════════════ */
function checkPin() {
  const input = document.getElementById("pin-input").value;
  if (input === getPin()) {
    hrUnlocked = true;
    document.getElementById("hr-pin").style.display  = "none";
    document.getElementById("hr-main").style.display = "";
    showHrTab("list");
  } else {
    document.getElementById("pin-err").style.display = "block";
    document.getElementById("pin-input").value = "";
    setTimeout(() => { document.getElementById("pin-err").style.display = "none"; }, 3000);
  }
}

function changePin() {
  showModal({
    icon: "🔒", iconClass: "icon-info",
    title: "เปลี่ยน PIN ผู้ดูแล",
    message: "กรอก PIN ใหม่ (ตัวเลข 4–8 หลัก)",
    inputPlaceholder: "PIN ใหม่",
    inputType: "password",
    confirmText: "บันทึก",
    cancelText: "ยกเลิก",
    onConfirm: (val) => {
      if (!val || val.length < 4) {
        showToast("PIN ต้องมีอย่างน้อย 4 หลัก", "error");
        return;
      }
      savePin(val);
      showToast("เปลี่ยน PIN สำเร็จ", "success");
    }
  });
}

/* ── EXCEL EXPORT ── */
function exportExcel() {
  const data     = getData();
  const filtered = data.filter(r => r.trainingDate === activeDate);
  if (!filtered.length) {
    showModal({
      icon: "📋", iconClass: "icon-warn",
      title: "ไม่มีข้อมูล",
      message: "ไม่พบข้อมูลในวันที่เลือก กรุณาเลือกวันที่มีข้อมูลก่อนออกรายงาน",
      confirmText: "ตกลง"
    });
    return;
  }

  const WB = XLSX.utils.book_new();
  const byCourse = {};
  filtered.forEach(r => {
    if (!byCourse[r.course]) byCourse[r.course] = [];
    byCourse[r.course].push(r);
  });

  Object.entries(byCourse).forEach(([cName, rows]) => {
    // หา course metadata จาก cloudCourses
    const ci = cloudCourses.find(c => c.name === cName) || {};
    const dateStr = rows[0] ? toFullThaiDate(rows[0].trainingDate) : "";
    const timeStr = ci.time || "08.00-17.00น.";
    const loc     = ci.location || "";
    const instr   = ci.instructor || "วิทยากรภายใน บริษัท เคมีแมน จำกัด (มหาชน)";

    // สร้าง header ตามรูปแบบใบลงทะเบียน IMAFHR03
    const headerRows = [
      ["ใบลงทะเบียนการฝึกอบรม","","","","","","","","","","","","","",""],
      ["หลักสูตร " + cName,"","","","","","","","","","","","","",""],
      ["วันที่ " + dateStr + "  เวลา " + timeStr + "  สถานที่อบรม  " + loc,"","","","","","","","","","","","","",""],
      ["โดย  " + instr,"","","","","","","","","","","","","",""],
      [],
      ["ลำดับ","รหัสพนักงาน","บัตรประชาชน (ID)","คำนำหน้า","ชื่อ","นามสกุล","ตำแหน่ง","หน่วยงาน","ลายมือชื่อ (เช้า)","ลายมือชื่อ (บ่าย)","หมายเหตุ","สังกัด","","",""],
    ];

    const dataRows = rows.map((r, i) => [
      i+1, r.empCode||"", r.idCard||"", r.prefix||"",
      r.firstName||"", r.lastName||"", r.position||"", r.dept||"",
      "","","", r.site||"","","",""
    ]);

    const allRows = [...headerRows, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    // ความกว้างคอลัมน์
    ws["!cols"] = [
      {wch:8},{wch:14},{wch:18},{wch:10},{wch:18},{wch:18},{wch:20},{wch:18},
      {wch:20},{wch:20},{wch:14},{wch:8}
    ];

    const sheetName = cName.substring(0, 28) + " " + (activeDate || "").slice(-5).replace("-","/");
    XLSX.utils.book_append_sheet(WB, ws, sheetName.substring(0,31));
  });

  XLSX.writeFile(WB, `IMAFHR03_${activeDate}.xlsx`);
  showToast("ดาวน์โหลด Excel เรียบร้อย ✓", "success");
}

function clearDateData() {
  if (!activeDate) return;
  showModal({
    icon: "🗑️", iconClass: "icon-danger",
    title: "ยืนยันลบข้อมูล",
    message: `ต้องการลบข้อมูลวันที่ <strong>${toShortThai(activeDate)}</strong> ทั้งหมดใช่หรือไม่?<br><small style="color:var(--r)">การกระทำนี้ไม่สามารถย้อนกลับได้</small>`,
    confirmText: "ลบข้อมูล",
    confirmType: "danger",
    cancelText: "ยกเลิก",
    onConfirm: () => {
      const remaining = getData().filter(r => r.trainingDate !== activeDate);
      saveData(remaining);
      activeDate = "";
      renderDashboard();
      showToast("ลบข้อมูลสำเร็จ", "success");
    }
  });
}

/* ── INIT ── */
window.addEventListener("load", () => {
  document.getElementById("s-date").value = todayISO();
  loadAndPopulateCourses();
});

function loadAndPopulateCourses() {
  const sel = document.getElementById("s-course");
  sel.innerHTML = '<option value="">กำลังโหลด...</option>';
  sel.disabled = true;

  fetch(SCRIPT_URL + "?action=getCourses")
    .then(r => r.json())
    .then(data => {
      cloudCourses = data.courses || [];
      const active = cloudCourses.filter(c => c.active);
      if (active.length) {
        sel.innerHTML = '<option value="">— เลือกหัวข้ออบรม —</option>' +
          active.map((c, i) => `<option value="${i}">${c.name}</option>`).join("");
      } else {
        sel.innerHTML = '<option value="">ยังไม่มีหัวข้อเปิดรับสมัคร</option>';
      }
      sel.disabled = false;
    })
    .catch(() => {
      sel.innerHTML = '<option value="">โหลดข้อมูลไม่ได้ — ลองใหม่</option>';
      sel.disabled = false;
    });
}

function getSelectedCourse() {
  const idx = document.getElementById("s-course").value;
  return idx !== "" ? cloudCourses.filter(c => c.active)[parseInt(idx)] : null;
}

function showHrTab(tab) {
  document.getElementById("hrtab-list").classList.toggle("active", tab === "list");
  document.getElementById("hrtab-courses").classList.toggle("active", tab === "courses");
  document.getElementById("hrsection-list").style.display    = tab === "list" ? "" : "none";
  document.getElementById("hrsection-courses").style.display = tab === "courses" ? "" : "none";
  if (tab === "list") renderDashboard();
  if (tab === "courses") renderCourseSection();
}

function renderDashboard() {
  const data  = getData();
  const dates = [...new Set(data.map(r => r.trainingDate))].sort().reverse();
  if (!activeDate || !dates.includes(activeDate)) activeDate = dates[0] || "";

  // Date tabs
  const tabs = document.getElementById("sheet-tabs");
  if (dates.length === 0) {
    tabs.innerHTML = '<span class="no-data-hint">ยังไม่มีข้อมูล</span>';
  } else {
    tabs.innerHTML = dates.map(d =>
      `<button class="sheet-tab ${d===activeDate?"active":""}" onclick="activeDate='${d}';renderDashboard()">
        ${toShortThai(d)}
       </button>`
    ).join("");
  }

  // Metrics
  const filtered = data.filter(r => r.trainingDate === activeDate);
  const sites = {};
  filtered.forEach(r => { sites[r.site] = (sites[r.site]||0)+1; });
  const male   = filtered.filter(r => r.prefix === "นาย").length;
  const female = filtered.filter(r => r.prefix !== "นาย").length;

  document.getElementById("metrics").innerHTML = `
    <div class="metric"><div class="metric-n">${filtered.length}</div><div class="metric-l">ผู้เข้าอบรมรวม</div></div>
    <div class="metric"><div class="metric-n">${male}</div><div class="metric-l">ชาย</div></div>
    <div class="metric"><div class="metric-n">${female}</div><div class="metric-l">หญิง</div></div>
  `;

  // Filter course dropdown
  const filterSel = document.getElementById("filter-course");
  const courses = [...new Set(filtered.map(r => r.course))];
  filterSel.innerHTML = '<option value="">ทุกหัวข้อ</option>' +
    courses.map(c => `<option value="${c}">${c}</option>`).join("");

  renderList();
}

function renderList() {
  const data     = getData();
  const filtered = data.filter(r => r.trainingDate === activeDate);
  const q        = (document.getElementById("search-input").value || "").toLowerCase();
  const fc       = document.getElementById("filter-course").value;

  const shown = filtered.filter(r => {
    const matchQ  = !q || (r.firstName+r.lastName+r.dept+r.empCode).toLowerCase().includes(q);
    const matchFC = !fc || r.course === fc;
    return matchQ && matchFC;
  });

  const container = document.getElementById("list-container");
  if (shown.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>${filtered.length === 0 ? "ยังไม่มีข้อมูลวันนี้" : "ไม่พบข้อมูลที่ค้นหา"}</p>
      </div>`;
    return;
  }

  container.innerHTML = shown.map((r, i) => `
    <div class="list-row">
      <div class="row-num">${i+1}</div>
      <div class="row-info">
        <div class="row-name">${r.prefix||""} ${r.firstName||""} ${r.lastName||""}</div>
        <div class="row-sub">${r.dept||"—"} ${r.position ? "· "+r.position : ""}</div>
        <div class="row-tags">
          <span class="tag tag-site">${r.site||"—"}</span>
          <span class="tag tag-course">${r.course||"—"}</span>
          ${r.empCode ? `<span class="tag tag-emp">${r.empCode}</span>` : ""}
        </div>
      </div>
      <div class="row-meta">
        <div class="row-time">${r.time||""}</div>
      </div>
    </div>`).join("");
}

/* ════════════════════════════════════════════════
   COURSE MANAGEMENT
════════════════════════════════════════════════ */
function renderCourseSection() {
  loadAndRenderCourseList();
}

function loadAndRenderCourseList() {
  const listEl = document.getElementById("course-list");
  listEl.innerHTML = `<div class="empty-state"><div class="spin-wrap"><svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg></div><p>กำลังโหลด...</p></div>`;

  fetch(SCRIPT_URL + "?action=getCourses")
    .then(r => r.json())
    .then(data => {
      cloudCourses = data.courses || [];
      renderCourseList();
    })
    .catch(() => {
      listEl.innerHTML = `<div class="empty-state"><p>โหลดข้อมูลไม่ได้</p></div>`;
    });
}

function renderCourseList() {
  const listEl = document.getElementById("course-list");
  if (cloudCourses.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><p>ยังไม่มีหลักสูตร<br><small>เพิ่มหลักสูตรแรกได้เลย</small></p></div>`;
    return;
  }
  listEl.innerHTML = cloudCourses.map((c, i) => `
    <div class="course-row ${c.active?"":"course-hidden"}">
      <div class="course-left">
        <div class="course-dot ${c.active?"dot-active":"dot-hidden"}"></div>
        <div>
          <div class="course-name">${c.name}</div>
          <div class="course-meta">
            ${c.date ? "📅 "+toFullThaiDate(c.date) : ""}
            ${c.time ? " · ⏰ "+c.time : ""}
            ${c.location ? " · 📍 "+c.location : ""}
          </div>
          <div class="course-meta" style="margin-top:2px">
            ${c.instructor ? "👤 "+c.instructor : ""}
            ${c.type ? " · 🏷 "+c.type : ""}
          </div>
        </div>
      </div>
      <div class="course-actions">
        <button class="btn btn-xs ${c.active?"btn-warning":"btn-ok-outline"}" onclick="toggleCourse(${i})">
          ${c.active?"ซ่อน":"แสดง"}
        </button>
        <button class="btn btn-xs btn-danger-xs" onclick="deleteCourse(${i})">ลบ</button>
      </div>
    </div>`).join("");
}

function addCourse() {
  const name  = document.getElementById("nc-name").value.trim();
  const date  = document.getElementById("nc-date").value;
  const time  = document.getElementById("nc-time").value.trim() || "08.00-17.00น.";
  const loc   = document.getElementById("nc-location").value.trim();
  const instr = document.getElementById("nc-instructor").value.trim() || "วิทยากรภายใน บริษัท เคมีแมน จำกัด (มหาชน)";
  const type  = document.getElementById("nc-type").value;

  if (!name || !date || !loc) {
    showModal({
      icon: "⚠️", iconClass: "icon-warn",
      title: "ข้อมูลไม่ครบ",
      message: "กรุณากรอก ชื่อหลักสูตร, วันที่ และ สถานที่อบรม",
      confirmText: "ตกลง"
    });
    return;
  }

  cloudCourses.push({ name, active: true, date, time, location: loc, instructor: instr, type });
  saveCourses();

  // เคลียร์ฟอร์ม
  ["nc-name","nc-date","nc-time","nc-location","nc-instructor"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("nc-time").value       = "08.00-17.00น.";
  document.getElementById("nc-instructor").value = "วิทยากรภายใน บริษัท เคมีแมน จำกัด (มหาชน)";
  document.getElementById("nc-type").value       = "พนักงาน";

  renderCourseList();
  showToast("เพิ่มหลักสูตรสำเร็จ", "success");
}

function toggleCourse(i) {
  cloudCourses[i].active = !cloudCourses[i].active;
  saveCourses();
  renderCourseList();
}

function deleteCourse(i) {
  showModal({
    icon: "🗑️", iconClass: "icon-danger",
    title: "ยืนยันลบหลักสูตร",
    message: `ต้องการลบ <strong>${cloudCourses[i].name}</strong> ใช่หรือไม่?`,
    confirmText: "ลบหลักสูตร",
    confirmType: "danger",
    cancelText: "ยกเลิก",
    onConfirm: () => {
      cloudCourses.splice(i, 1);
      saveCourses();
      renderCourseList();
      showToast("ลบหลักสูตรสำเร็จ", "success");
    }
  });
}

function saveCourses() {
  showToast("กำลังบันทึก...", "loading");
  fetch(SCRIPT_URL, {
    method: "POST", mode: "no-cors",
    body: JSON.stringify({ action: "saveCourses", courses: cloudCourses })
  }).finally(() => {
    showToast("บันทึกสำเร็จ", "success");
  });
}
