# CHEMEMAN Training Attendance System

ระบบบันทึกการเข้าร่วมอบรม บริษัท เคมีแมน จำกัด (มหาชน)  
พัฒนาด้วย Vanilla JS + Google Apps Script + Google Sheets

---

## ไฟล์ในโปรเจกต์

| ไฟล์ | หน้าที่ |
|------|---------|
| `index.html` | UI หน้าเว็บหลัก |
| `app.js` | Logic ทั้งหมด (form, export, HR) |
| `AppScriptCode.txt` | โค้ด Google Apps Script สำหรับ backend |
| `logo.png` | โลโก้บริษัท (เพิ่มเองได้) |

---

## ขั้นตอนติดตั้งตั้งแต่ศูนย์

### ขั้นตอนที่ 1 — สร้าง Google Sheet และเชื่อม Apps Script

1. ไปที่ [https://sheets.google.com](https://sheets.google.com) แล้วสร้าง Spreadsheet ใหม่ ตั้งชื่อตามต้องการ เช่น `CHEMEMAN Attendance 2568`
2. คลิกเมนู **Extensions > Apps Script**
3. ลบโค้ดเดิมทั้งหมดในไฟล์ `Code.gs`
4. คัดลอกเนื้อหาทั้งหมดจากไฟล์ `AppScriptCode.txt` แล้ววางแทน
5. กด **Save** (Ctrl+S)
6. ไปที่เมนู **Run > testSetup** เพื่อทดสอบ (ระบบจะสร้าง Sheet "หัวข้ออบรม" ให้อัตโนมัติ)
   - ครั้งแรกจะถามสิทธิ์ — กด **Review permissions > Allow**

### ขั้นตอนที่ 2 — Deploy เป็น Web App

1. ใน Apps Script Editor คลิก **Deploy > New deployment**
2. คลิกไอคอน **gear** ข้าง "Select type" แล้วเลือก **Web app**
3. ตั้งค่าดังนี้:
   - **Description**: `CHEMEMAN v1`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
4. คลิก **Deploy**
5. คัดลอก **Web app URL** ที่ได้ (จะขึ้นต้นด้วย `https://script.google.com/macros/s/...`)

### ขั้นตอนที่ 3 — ใส่ URL ลงในโค้ดเว็บ

เปิดไฟล์ `app.js` แล้วแก้บรรทัดแรก:

```js
const SCRIPT_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";
```

เปลี่ยนเป็น URL ที่ได้จากขั้นตอนที่ 2:

```js
const SCRIPT_URL = "https://script.google.com/macros/s/XXXXXXXXXX/exec";
```

### ขั้นตอนที่ 4 — Upload ขึ้น GitHub Pages

1. สร้าง Repository ใหม่บน [https://github.com](https://github.com)
2. ตั้งชื่อ เช่น `chememan-attendance`
3. Upload ไฟล์เหล่านี้:
   - `index.html`
   - `app.js`
   - `logo.png` (ถ้ามี)
4. ไปที่ **Settings > Pages**
5. ตั้ง **Source**: `Deploy from a branch`
6. เลือก Branch: `main` และ folder: `/ (root)`
7. กด **Save**
8. รอ 1-2 นาที จะได้ URL เช่น `https://yourusername.github.io/chememan-attendance/`

---

## วิธีใช้งานบนเครื่องใหม่ / อุปกรณ์ใหม่

ไม่ต้องติดตั้งอะไรเพิ่ม เพียงเปิด URL ของ GitHub Pages บน Browser ใดก็ได้

> รหัสผ่าน HR เริ่มต้น: **1234** (เปลี่ยนได้หลังเข้าระบบ)

---

## การใช้งานระบบ

### หน้า "ลงชื่อเข้าอบรม"
- ผู้เข้าอบรมกรอกข้อมูลและกด **ยืนยันการลงชื่อ**
- ข้อมูลจะบันทึกลง Google Sheets ทันที พร้อมบันทึก local backup ไว้ในเบราว์เซอร์ด้วย

### หน้า "ผู้ดูแล HR"
- ใส่รหัสผ่านเพื่อเข้าระบบ
- **แท็บรายชื่อ**: ดูข้อมูลแยกตามวันที่, ค้นหา, กรองตามหลักสูตร, ดาวน์โหลด Excel
- **แท็บจัดการหัวข้อ**: เพิ่ม/ซ่อน/ลบหัวข้ออบรม (sync ข้ามทุกเครื่อง)

### Excel ที่ได้รับ
ไฟล์ Excel จะมีรูปแบบ "ใบลงทะเบียนการฝึกอบรม" ตรงตามแบบฟอร์มของบริษัท:
- หัวกระดาษ: ชื่อเอกสาร, หลักสูตร, วัน/เวลา/สถานที่, วิทยากร
- ตาราง: ลำดับ | รหัสพนักงาน | ชื่อ-นามสกุล | ตำแหน่ง | หน่วยงาน | ลายมือชื่อเข้า | ลายมือชื่อออก
- แต่ละหลักสูตรจะได้ชีทแยกต่างหาก

---

## หากต้อง Re-deploy Apps Script (เมื่อแก้โค้ด)

1. แก้ไขโค้ดใน Apps Script Editor
2. คลิก **Deploy > Manage deployments**
3. คลิกไอคอนดินสอ (Edit) ข้าง deployment ที่มีอยู่
4. เปลี่ยน **Version** เป็น **New version**
5. คลิก **Deploy** — URL จะเหมือนเดิม ไม่ต้องแก้ `app.js`

---

## คำถามที่พบบ่อย

**Q: ข้อมูลหายเมื่อเปลี่ยนเบราว์เซอร์หรือเครื่อง?**  
A: ข้อมูล local จะอยู่เฉพาะในเบราว์เซอร์นั้น แต่ข้อมูลจริงอยู่ใน Google Sheets ครบถ้วนเสมอ

**Q: ต้องการเพิ่มโลโก้บริษัท?**  
A: ใส่ไฟล์ภาพชื่อ `logo.png` ไว้ในโฟลเดอร์เดียวกับ `index.html`

**Q: เปลี่ยนรหัสผ่าน HR ได้อย่างไร?**  
A: เข้าระบบ HR แล้วคลิก "เปลี่ยนรหัสผ่าน" มุมขวาบน
