# W2HMS vNext — Firebase Emulator Test Plan

> **สถานะ: แผนเท่านั้น — ยังไม่ได้รัน (Emulator: Not Tested)**
> ห้ามอ้างว่า Rules ปลอดภัยหรือผ่านการทดสอบจนกว่าจะมีผลรันจริงตามเกณฑ์ด้านล่าง
> Rules ที่จะทดสอบยังไม่ได้เขียน — ต้องได้รับอนุมัติ Implementation ก่อน
>
> **v1.3 (2026-11-17):** เพิ่ม §7 Test Cases รายข้อสำหรับ P-8 / P-9 / E15 และโครง `tests/rules` · Rules จริงยังไม่ได้เขียน (ผลที่คาดหวังจะเป็น NOT IMPLEMENTED จนกว่าจะมี Rules)
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

## 7. Test Cases รายข้อ — P-8 / P-9 / E15 (v1.3)

### 7.1 สถานะผลทดสอบ

| สถานะ           | ความหมาย                                                                      |
| --------------- | ----------------------------------------------------------------------------- |
| PASS            | ผล Allow/Deny จริงจาก Emulator ตรงกับที่คาดหวัง (`assertSucceeds` / `assertFails`) |
| FAIL            | ผลจริงไม่ตรงกับที่คาดหวัง — ต้องแก้ Rules ก่อนไปขั้นถัดไป                                 |
| NOT IMPLEMENTED | ยังไม่มี Rules หรือยังไม่ได้เขียนโค้ดทดสอบ (`it.todo`) — **ห้ามนับเป็น PASS**             |
| BLOCKED         | ผลที่คาดหวังขึ้นกับรายการ Pending (ระบุในคอลัมน์ "ขึ้นกับ")                               |

- กรณี "คาด = A" จะ PASS ได้ก็ต่อเมื่อมี Rules ที่อนุญาตอย่างเจาะจง · ห้ามเปิดสิทธิ์ทั้งหมดเพื่อให้ผ่าน
- กรณี "คาด = D" ที่ผ่านภายใต้ placeholder deny-all **ไม่ถือว่าพิสูจน์ Rules** จนกว่าจะรันซ้ำกับ Rules จริง
- ทุกกรณีใช้บัญชีและข้อมูลสมมติจาก `tests/rules/fixtures.ts` · project `demo-w2hms` เท่านั้น

### 7.2 การยื่นคำขอ (P-9, N-3)

| ID    | ผู้ใช้                                         | การกระทำ                                                             | คาด          | ขึ้นกับ       |
| ----- | ------------------------------------------- | -------------------------------------------------------------------- | ------------ | ---------- |
| R9-01 | ผู้สมัคร U                                     | สร้าง `U_1` (`uid=U`, `seq=1`, `status=pending`)                      | A            | P-13, P-15 |
| R9-02 | U                                           | สร้าง `U_1` ด้วย `status=rejected` หรือ `approved`                      | D            | —          |
| R9-03 | U                                           | สร้าง `X_1` ที่ `uid=X` (คนอื่น)                                          | D            | —          |
| R9-04 | U                                           | สร้างคำขอที่ ID ไม่ตรง `uid_seq` (เช่น ID `U_9`, `seq=2`)                 | D            | P-14       |
| R9-05 | U                                           | สร้าง `U_2` ขณะ `U_1` ยัง pending                                      | D            | —          |
| R9-06 | U                                           | สร้าง `U_3` โดยไม่มี `U_2` (ข้ามเลข)                                     | D            | —          |
| R9-07 | U                                           | สร้าง `U_2` เมื่อ `U_1` = rejected พร้อม E15 ใน batch เดียว (พ้น COOLDOWN) | A            | P-11, P-12 |
| R9-08 | U                                           | สร้าง `U_2` เมื่อ `U_1` = rejected แต่ไม่มี E15                            | D            | —          |
| R9-09 | U                                           | สร้าง `U_2` ก่อนพ้น COOLDOWN                                            | D            | P-11       |
| R9-10 | U                                           | สร้างคำขอที่ `seq > MAX_SEQ`                                            | D            | P-10       |
| R9-11 | U                                           | update คำขอใด ๆ ของตนเอง (รวม rejected → pending)                    | D            | —          |
| R9-12 | U                                           | delete คำขอใด ๆ ของตนเอง                                             | D            | —          |
| R9-13 | U ที่มี `users/U` แล้ว (approved หรือ suspended) | สร้างคำขอใหม่                                                          | D            | —          |
| R9-14 | ผู้สมัคร V                                     | อ่านคำขอของ U                                                         | D            | —          |
| R9-15 | U                                           | อ่านคำขอของตนเอง                                                      | A            | —          |
| R9-16 | ANON / UNVER                                | สร้างคำขอ                                                             | D / ตาม P-15 | P-15       |
| R9-17 | U                                           | สร้างคำขอที่มี key นอก allowlist หรือ `createdAt ≠ request.time`          | D            | —          |

### 7.3 การยื่นพร้อมกัน (Concurrency)

| ID    | สถานการณ์                                                | คาด                                        |
| ----- | ------------------------------------------------------- | ------------------------------------------ |
| C9-01 | สร้าง `U_1` สองครั้งพร้อมกัน (Promise.all)                   | สำเร็จ 1 ครั้ง · อีกครั้งถูกปฏิเสธ (เป็น update)    |
| C9-02 | `U_1` = rejected · สร้าง `U_2` สองครั้งพร้อมกัน              | สำเร็จ 1 ครั้ง                                |
| C9-03 | `U_1` = rejected · สร้าง `U_2` และ `U_3` ใน batch เดียวกัน | D ทั้ง batch (`U_3` ต้องการ `U_2` ที่ rejected) |
| C9-04 | `U_1` = rejected · สร้าง `U_2` และ `U_3` แยกคำขอพร้อมกัน   | `U_3` = D เสมอ · มี pending ได้ไม่เกิน 1 ฉบับ   |
| C9-05 | ตรวจหลังทุกกรณี C9                                         | จำนวนคำขอ pending ของ U ≤ 1                |

### 7.4 E15 — การปลอม Audit

| ID     | ผู้ใช้       | การกระทำ                                                                                            | คาด           |
| ------ | --------- | --------------------------------------------------------------------------------------------------- | ------------- |
| E15-01 | U         | E15 ที่ `actorUid ≠ U`                                                                                | D             |
| E15-02 | U         | ใช้ eventCode อื่น (E1, E2, E4, E7 …)                                                                  | D             |
| E15-03 | U         | E15 ที่ `targetId` เป็นคำขอของคนอื่น                                                                     | D             |
| E15-04 | U         | E15 ที่อ้างถึงคำขอที่มีอยู่ก่อน batch (ไม่ได้สร้างพร้อมกัน)                                                        | D             |
| E15-05 | U         | E15 ที่ไม่มีคำขอใหม่ใน batch (audit ลอย)                                                                 | D             |
| E15-06 | U         | `changes` ≠ `{status: null→pending}` · `changedFields` ≠ `['status']` · มี key เกิน allowlist 10 keys | D             |
| E15-07 | U         | `at ≠ request.time` · `reasonCode ≠ null` · `targetCol ≠ accessRequests`                            | D             |
| E15-08 | U         | Document ID ไม่ใช่ `accessRequests_{requestId}_v1`                                                    | D             |
| E15-09 | U         | สร้าง E15 ซ้ำ (ID เดิม) / update / delete                                                              | D             |
| E15-10 | U, OF, VW | อ่าน userAuditLogs                                                                                   | D             |
| E15-11 | U         | E15 ที่ `actorRole` ไม่ตรงค่าที่กำหนด                                                                     | D (เมื่อมี P-12) |

### 7.5 การอนุมัติ / ปฏิเสธ (P-8)

| ID    | ผู้ใช้       | การกระทำ                                                                                                                  | คาด |
| ----- | --------- | ------------------------------------------------------------------------------------------------------------------------- | --- |
| R8-01 | AD        | อนุมัติ `U_k`: สร้าง `users/U` (approved, approvedBy/At, requestId, requestedRole, requestedAt) + E1 + ลบ `U_k` ใน batch เดียว | A   |
| R8-02 | AD        | ลบ `U_k` โดยไม่มี `users/U` หรือ E1 ใน batch เดียวกัน                                                                          | D   |
| R8-03 | AD        | สร้าง `users/U` โดยไม่ลบคำขอ หรือไม่มี E1                                                                                      | D   |
| R8-04 | AD        | ลบคำขอที่ rejected                                                                                                          | D   |
| R8-05 | AD        | `users.requestId ≠ requestId` / ไม่มี requestedRole / role ≠ requestedRole                                                  | D   |
| R8-06 | AD        | อนุมัติเป็น admin หรือ superAdmin                                                                                              | D   |
| R8-07 | OF, VW, U | อนุมัติหรือลบคำขอ                                                                                                             | D   |
| R8-08 | AD        | ปฏิเสธ `pending → rejected` + rejectedBy/rejectedAt + E2                                                                   | A   |
| R8-09 | AD        | ปฏิเสธโดยไม่มี E2 · แก้ field นอก allowlist · `rejected → pending`                                                            | D   |
| R8-10 | AD        | อนุมัติซ้ำ (มี `users/U` หรือ E1 `users_U_v1` อยู่แล้ว)                                                                            | D   |
| R8-11 | AD        | คัดลอก `reason` / `reviewNote` ไปยัง `users`                                                                                | D   |

### 7.6 อนุมัติ / ปฏิเสธพร้อมกัน

| ID    | สถานการณ์                            | คาด                                                                                           |
| ----- | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| C8-01 | AD1 อนุมัติ และ AD2 ปฏิเสธ `U_k` พร้อมกัน | สำเร็จได้เพียงรายการเดียว · สถานะสุดท้ายสอดคล้อง (มี users + E1 **หรือ** คำขอ rejected + E2 ไม่ใช่ทั้งสอง) |
| C8-02 | AD1 และ AD2 อนุมัติ `U_k` พร้อมกัน       | สำเร็จ 1 ครั้ง · มี E1 1 รายการ                                                                   |
| C8-03 | AD ปฏิเสธ `U_k` ขณะที่ U ยื่น `U_{k+1}`  | `U_{k+1}` สำเร็จได้เฉพาะเมื่อ `U_k` เป็น rejected แล้ว                                              |

### 7.7 Invariants ที่รันได้ตั้งแต่ตอนนี้ (baseline)

กรณีที่ต้องเป็น Deny ทั้งภายใต้ placeholder และ Rules จริง: ANON อ่าน/เขียน `accessRequests` และ `users` · client เขียน `system/superAdmins` · client ลบ `userAuditLogs` · collection ที่ไม่ได้กำหนดไว้ — ผล PASS ของกลุ่มนี้ยืนยันเพียงว่า default deny ทำงาน ไม่ใช่หลักฐานของ P-8 / P-9

### 7.8 เกณฑ์ผ่านของ §7

1. ทุกกรณีใน 7.2–7.6 เป็น PASS (ยกเว้น BLOCKED ที่รอมติ ซึ่งต้องระบุชัด)
2. ไม่มีกรณี NOT IMPLEMENTED เหลือเมื่อปิดขั้นที่เขียน Rules ของ accessRequests / E15
3. ทุก `allow` ใน Rules ของ accessRequests และ userAuditLogs (เส้นทาง E1 / E2 / E15) มีกรณี A และ D อย่างน้อยอย่างละ 1
4. Access calls ของ batch อนุมัติ (R8-01) และยื่นใหม่ (R9-07) ไม่เกินขีดจำกัด (TL-1)
