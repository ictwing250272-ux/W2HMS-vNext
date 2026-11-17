# W2HMS vNext — Firebase Emulator Test Plan

> **สถานะ: แผนเท่านั้น — ยังไม่ได้รัน (Emulator: Not Tested)**
> ห้ามอ้างว่า Rules ปลอดภัยหรือผ่านการทดสอบจนกว่าจะมีผลรันจริงตามเกณฑ์ด้านล่าง
> Rules ที่จะทดสอบยังไม่ได้เขียน — ต้องได้รับอนุมัติ Implementation ก่อน

## 1. สภาพแวดล้อม

- Firebase Emulator Suite (Auth + Firestore) · project `demo-w2hms` เท่านั้น
- `@firebase/rules-unit-testing` + Vitest (เครื่องมือยังไม่ติดตั้ง — TBD ใน Phase 2)
- ข้อมูลทดสอบเป็นข้อมูลสมมติเท่านั้น · seed ด้วย `withSecurityRulesDisabled`
- ทดสอบ REST ด้วย idToken จาก Auth Emulator
- ห้ามใช้ข้อมูลจริง · ห้ามเชื่อมต่อ `w2hms-fbdcb` หรือ `bn2-housing`

## 2. ผู้ใช้ทดสอบ (สมมติ)

Super Admin (มี/ไม่มี healthAccess) · Admin (มี/ไม่มี healthAccess) · Officer (มี/ไม่มี healthAccess, มี/ไม่มี canExport) · Viewer · Viewer ที่ seed `healthAccess=true` · ผู้ใช้ suspended / pending / ยังไม่ยืนยันอีเมล / ไม่ login

## 3. Technical Limits ที่ต้องพิสูจน์

| รหัส   | ประเด็น                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------- |
| TL-1  | จำนวน document access calls ต่อคำขอ (10 single / 20 batch-transaction)                             |
| TL-2  | path แบบ dynamic `$(targetCol)` ใน auditBound                                                     |
| TL-4  | การ cache ของ `get()` เอกสารเดิมซ้ำในคำขอเดียว                                                       |
| TL-7  | `get()` ของเอกสารที่ไม่มีอยู่ (null หรือ error)                                                          |
| TL-8  | `let` binding กับ `get()` / `getAfter()`                                                           |
| TL-9  | set operations: `diff().affectedKeys()`, `toSet()`, `difference()`, `intersection()`, `hasOnly()` |
| TL-10 | การเทียบ list (assignedZones)                                                                      |
| TL-11 | จำนวน expression ต่อการประเมิน                                                                      |
| TL-12 | ternary + การบวกเลขใน `groupCount`                                                                |
| TL-13 | `map.get(key, default)` บน `resource.data`                                                        |

## 4. Test Suites (ตาม Security Design v6–v6.6)

| Suite        | ขอบเขต                                                                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-V         | Viewer: อ่านทุกเขต (รวม stayPrivate/stayMembers) · list ≤ 100 · ปฏิเสธการเขียนทุกช่องทาง (SDK, REST, batch, transaction) · ปฏิเสธ health/userAuditLogs/healthAuditLogs/exportLogs |
| TC-O         | Officer: อ่าน/เพิ่ม/แก้ทุกเขต · ปฏิเสธ delete, จัดการผู้ใช้, auditLogs, exportLogs, แก้สิทธิ์ตนเอง                                                                                       |
| TC-H         | Health: healthAccess ทุก role · Viewer ปฏิเสธเสมอ · ต้องมี healthAuditLogs · ฟิลด์ต้องห้าม · H-S2 ID                                                                               |
| TC-UA        | userAuditLogs: eventCode, changes from/to, changedFields = diff จริง, ไม่มี summary/ฟิลด์ OI2-D8, audit ลอย, ไม่มี audit, update/delete                                           |
| TC-D7        | E14 PERMISSIONS_CHANGED: AND authorization รายฟิลด์, ≥ 2 กลุ่ม, role transition, K3                                                                                            |
| TC-V65       | Zone metadata ไม่จำกัดสิทธิ์ · viewer + assignedZones (ตาม PD-2) · chgShape / map.get                                                                                           |
| TC-E5/E6/E14 | แยก Account Status (E5/E6) กับ Permissions (E14) · E14 ปฏิเสธ status ทุกกรณี                                                                                                   |
| TC-C66       | Atomicity / workflow 2 commit · concurrent modification · commit แรกสำเร็จ commit ที่สองล้มเหลว · recovery                                                                     |

> รายการ test case รายข้อและ Expected Allow/Deny อยู่ใน Security Design v6–v6.6 · กรณีที่ขึ้นกับ
> รายการ Pending (เช่น OI2-D9, D11, PD-2, OI-4) ต้องกำหนดผลที่คาดหวังหลังได้รับการตัดสินใจ

## 5. เกณฑ์ผ่าน (Acceptance Criteria)

1. ทุก test case ได้ผล Allow/Deny ตรงตาม Expected และมีหลักฐานผลรัน
2. Rules coverage ครอบคลุมทุก `allow`
3. ไม่มีกฎเขียนใดที่ Viewer ผ่านได้
4. Viewer และผู้ไม่มี healthAccess เข้าถึงข้อมูลสุขภาพไม่ได้ทุกช่องทาง
5. ทุกการเขียนข้อมูลสุขภาพมี healthAuditLogs · ทุกการเปลี่ยน users มี userAuditLogs ที่ตรงกับ diff จริง
6. batch ที่ใหญ่ที่สุดไม่เกินขีดจำกัด document access calls (TL-1)
7. C12 + aggregation มีผลทดสอบและข้อสรุป (OI-4)
8. มีผู้ตรวจทาน Rules คนที่สอง
9. ไม่มีข้อมูลจริงหรือ secret ใน fixtures

## 6. นอกขอบเขต Emulator (ต้องควบคุมแยก)

- Admin SDK / Console / Service Account / IAM ข้าม Rules — ตรวจด้วย IAM review และขั้นตอนปฏิบัติ
- Apps Script — ทดสอบแบบ Integration บน dev project (TBD)
