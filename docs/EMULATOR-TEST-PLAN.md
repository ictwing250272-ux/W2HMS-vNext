# W2HMS vNext — Firebase Emulator Test Plan

> **สถานะ: แผนเท่านั้น — ยังไม่ได้รัน (Emulator: Not Tested)**
> ห้ามอ้างว่า Rules ปลอดภัยหรือผ่านการทดสอบจนกว่าจะมีผลรันจริงตามเกณฑ์ด้านล่าง
> Rules ที่จะทดสอบยังไม่ได้เขียน — ต้องได้รับอนุมัติ Implementation ก่อน
>
> **v1.1 (2026-11-17):** เพิ่ม Suite ตามมติ N-1–N-6, P-1, P-2, P-5 และสถานะเครื่องมือ (Phase 2A Step 2)

## 1. สภาพแวดล้อม

- Firebase Emulator Suite (Auth + Firestore) · project `demo-w2hms` เท่านั้น
- `@firebase/rules-unit-testing` + Vitest
- (v1.1) เครื่องมือ: Node.js ≥ 24.12.0 · `firebase-tools` 15.34.2 · `@firebase/rules-unit-testing` 6.0.0 (devDependencies แบบระบุเวอร์ชัน)
- (v1.1) คำสั่ง: `npm run test:rules` → `firebase emulators:exec --only firestore --project demo-w2hms "vitest run --root tests/rules"` (โฟลเดอร์ `tests/rules` จะสร้างเมื่อเริ่มเขียน test) · ต้องมี Java (JDK 11+)
- ข้อมูลทดสอบเป็นข้อมูลสมมติเท่านั้น · seed ด้วย `withSecurityRulesDisabled`
- ทดสอบ REST ด้วย idToken จาก Auth Emulator
- ห้ามใช้ข้อมูลจริง · ห้ามเชื่อมต่อ `w2hms-fbdcb` หรือ `bn2-housing`

## 2. ผู้ใช้ทดสอบ (สมมติ)

Super Admin 3 บัญชี SA1–SA3 (มี/ไม่มี healthAccess · ใช้ทดสอบ N-6/P-1) · Admin (มี/ไม่มี healthAccess) · Officer (มี/ไม่มี healthAccess, มี/ไม่มี canExport) · Viewer · Viewer ที่ seed `healthAccess=true` · ผู้ใช้ suspended / pending / ยังไม่ยืนยันอีเมล / ไม่ login

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

| Suite          | ขอบเขต                                                                                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-V           | Viewer: อ่านทุกเขต (รวม stayPrivate/stayMembers) · list ≤ 100 · ปฏิเสธการเขียนทุกช่องทาง (SDK, REST, batch, transaction) · ปฏิเสธ health/userAuditLogs/healthAuditLogs/exportLogs |
| TC-O           | Officer: อ่าน/เพิ่ม/แก้ทุกเขต · ปฏิเสธ delete, จัดการผู้ใช้, auditLogs, exportLogs, แก้สิทธิ์ตนเอง                                                                                       |
| TC-H           | Health: healthAccess ทุก role · Viewer ปฏิเสธเสมอ · ต้องมี healthAuditLogs · ฟิลด์ต้องห้าม · H-S2 ID                                                                               |
| TC-UA          | userAuditLogs: eventCode, changes from/to, changedFields = diff จริง, ไม่มี summary/ฟิลด์ OI2-D8, audit ลอย, ไม่มี audit, update/delete                                           |
| TC-D7          | E14 PERMISSIONS_CHANGED: AND authorization รายฟิลด์, ≥ 2 กลุ่ม, role transition, K3                                                                                            |
| TC-V65         | Zone metadata ไม่จำกัดสิทธิ์ · viewer + assignedZones (ตาม PD-2) · chgShape / map.get                                                                                           |
| TC-E5/E6/E14   | แยก Account Status (E5/E6) กับ Permissions (E14) · E14 ปฏิเสธ status ทุกกรณี                                                                                                   |
| TC-C66         | Atomicity / workflow 2 commit · concurrent modification · commit แรกสำเร็จ commit ที่สองล้มเหลว · recovery                                                                     |
| TC-N3 (v1.1)   | สถานะบัญชี: pending/rejected ใน accessRequests เข้าถึงข้อมูลที่ป้องกันไม่ได้ · users approved/suspended · SUSP ที่ token ยังไม่หมดอายุถูกปฏิเสธ                                               |
| TC-N4 (v1.1)   | การเขียน `rooms.occupant` ถูกปฏิเสธ · ข้อมูลผู้พักอ่านผ่าน stays/personnel                                                                                                           |
| TC-SA (v1.1)   | N-6/P-1: ลด SA จนเหลือ < 2 ถูกปฏิเสธ · ลดเมื่อมี 3 บัญชีได้ · registry ต้องอัปเดตใน batch เดียวกันและตรงกับ users · client แก้ registry ตรงไม่ได้ · ระงับฉุกเฉินจนเหลือ 1 (เงื่อนไขตาม P-1a)      |
| TC-BOOT (v1.1) | P-5: client สร้าง SA / registry / `system/bootstrap` ไม่ได้ · seed ด้วย Admin context เท่านั้น · หลัง bootstrap ไม่มีเส้นทาง client สร้าง SA                                           |
| TC-EXP (v1.1)  | N-1/P-2: Export สุขภาพรายบุคคลถูกปฏิเสธทุก role · Export สถิติสุขภาพต้องมี canExport + healthAccess · Viewer ปฏิเสธเสมอ                                                               |
| TC-STAT (v1.1) | N-2: client เขียน `healthStats` ไม่ได้ · Viewer และผู้ไม่มี healthAccess อ่านไม่ได้ · ค่า < 5 ถูกเก็บเป็น `"<5"` (ตรวจ fixture จาก Server) · ที่เก็บตาม P-6                                 |
| TC-AUD5 (v1.1) | N-5: `actorUid == request.auth.uid` ในทุก audit · `auditLogs.targetCol` ห้ามเป็น collection สุขภาพ                                                                             |

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
10. (v1.1) ทุกกรณีใน TC-SA, TC-BOOT, TC-EXP, TC-STAT ผ่าน · ไม่มีเส้นทาง client ที่ทำให้ Super Admin < 2 นอกเงื่อนไข P-1

## 6. นอกขอบเขต Emulator (ต้องควบคุมแยก)

- Admin SDK / Console / Service Account / IAM ข้าม Rules — ตรวจด้วย IAM review และขั้นตอนปฏิบัติ
- Apps Script — ทดสอบแบบ Integration บน dev project (TBD)
- (v1.1) Bootstrap script จริง (P-5) และ Break-glass (P-5a) — ซ้อมบน Emulator ได้ แต่การรันกับโปรเจกต์จริงต้องมีขั้นตอนอนุมัติแยก
- (v1.1) การคำนวณสถิติฝั่ง Server (N-2) — ขึ้นกับกลไก INFRA ที่ยังไม่อนุมัติ
