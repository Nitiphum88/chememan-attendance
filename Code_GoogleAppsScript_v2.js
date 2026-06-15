// ==========================================
// CHEMEMAN — ระบบลงชื่อเข้าอบรม v2
// แยก Sheet อัตโนมัติตามวันที่อบรม
// ==========================================

function doPost(e) {
  try {
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    const data = JSON.parse(e.postData.contents);

    // ใช้วันที่อบรมที่ผู้ใช้เลือก (format: YYYY-MM-DD)
    const trainingDate = data.trainingDate || "";
    const sheetName   = getSheetName(trainingDate);

    let sheet = ss.getSheetByName(sheetName);

    // สร้าง Sheet ใหม่ถ้ายังไม่มี
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      setupHeader(sheet);
      // เรียงชีตใหม่สุดไว้ข้างหน้า
      ss.setActiveSheet(sheet);
      ss.moveActiveSheet(1);
    }

    const now    = new Date();
    const thTime = Utilities.formatDate(now, "Asia/Bangkok", "HH:mm");
    const rowNum = Math.max(sheet.getLastRow(), 1); // ลำดับ

    sheet.appendRow([
      rowNum,               // ลำดับ
      data.name     || "",
      data.dept     || "",
      data.position || "",
      data.course   || "",
      data.tel      || "",
      formatThaiDate(trainingDate),
      thTime
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", name: data.name, sheet: sheetName }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// สร้างชื่อ Sheet จากวันที่ เช่น "อบรม 15-06-2568"
function getSheetName(dateStr) {
  if (!dateStr) return "อบรม (ไม่ระบุวัน)";
  const d = new Date(dateStr + "T00:00:00");
  const day   = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year  = d.getFullYear() + 543;
  return "อบรม " + day + "-" + month + "-" + year;
}

// แปลงวันที่เป็นรูปแบบไทย เช่น 15/6/2568
function formatThaiDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.getDate() + "/" + (d.getMonth() + 1) + "/" + (d.getFullYear() + 543);
}

// ตั้งค่า Header ของ Sheet ใหม่
function setupHeader(sheet) {
  const headers = ["ลำดับ","ชื่อ-นามสกุล","แผนก / หน่วยงาน","ตำแหน่ง","หลักสูตร / การอบรม","เบอร์โทรศัพท์","วันที่อบรม","เวลาลงชื่อ"];
  sheet.appendRow(headers);
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold")
             .setBackground("#1e5c2a")
             .setFontColor("#ffffff")
             .setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 60);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 160);
  sheet.setColumnWidth(4, 140);
  sheet.setColumnWidth(5, 220);
  sheet.setColumnWidth(6, 130);
  sheet.setColumnWidth(7, 110);
  sheet.setColumnWidth(8, 100);
}

// ฟังก์ชันทดสอบ — กด Run ในหน้า Apps Script เพื่อเช็คว่าทำงานได้
function testSetup() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const today = Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd");
  let sheet   = ss.getSheetByName(getSheetName(today));
  if (!sheet) {
    sheet = ss.insertSheet(getSheetName(today));
    setupHeader(sheet);
  }
  SpreadsheetApp.getUi().alert("✅ ตั้งค่าเรียบร้อย! Sheet '" + getSheetName(today) + "' พร้อมใช้งาน");
}
