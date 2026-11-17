# W2HMS vNext — Security Decisions Register

> แหล่งอ้างอิงสถานะการตัดสินใจ · ห้ามตีความรายการ PENDING หรือ SELECTED เป็นการอนุมัติ
> **Implementation ของ Security Design v6.6: Not Approved**
>
> **Register version: v1.4 (2026-11-17)** — v1.1: เพิ่มมติ N-1 ถึง N-6, P-1, P-2, P-5 และ T-1 · v1.2: เพิ่ม P-8, P-9, T-2 และบันทึกความเสี่ยง P-1 · v1.3: เพิ่ม Pending P-10 ถึง P-15 (รายละเอียด P-9) · v1.4: อนุมัติ P-13 (Option A) · ไม่ลบรายการเดิม
> (รายการที่ถูกขยายความหรือแทนที่จะมีหมายเหตุ "ดู …") · ประวัติการเปลี่ยนแปลงอยู่ท้ายเอกสาร

## APPROVED (นโยบายที่อนุมัติแล้ว)

| รหัส          | การตัดสินใจ                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| ARCH         | Architecture C (Hybrid): GitHub Pages + Firebase Auth + Firestore (SSOT) + Rules · Sheets รายงานเท่านั้น                                 |
| ROLES        | Super Admin / Admin / Officer / Viewer · สถานะ pending / approved / rejected / suspended · บัญชีรายบุคคล — ที่เก็บของแต่ละสถานะ ดู N-3 (v1.1) |
| D1           | Viewer อ่าน `users` / `accessRequests` ได้เฉพาะของตนเอง · แก้บัญชีตนเองไม่ได้ทุกฟิลด์                                                           |
| D2           | Viewer อ่าน `personnelHealth` ไม่ได้ทุกกรณี แม้ `healthAccess=true`                                                                         |
| D3           | Viewer ห้าม Export · ห้ามอ่าน/เขียน `exportLogs`                                                                                          |
| D4           | ไม่แสดงสถิติสุขภาพให้ Viewer                                                                                                               |
| D5           | MFA เป็นมาตรการระยะถัดไป (ยังไม่เปิดใช้)                                                                                                    |
| D6           | Cloud Audit Logs พิจารณาภายหลังตามงบประมาณ (ยังไม่เปิดใช้)                                                                                  |
| VIEWER       | อ่านข้อมูลทั่วไปทุกเขต · Read Only สมบูรณ์ บังคับด้วย Rules                                                                                      |
| OI-1         | Viewer อ่าน `stayPrivate` และ `stayMembers` ได้ทุกเขต (get/list/query, list ≤ 100) · ห้ามเขียน/ลบ/Export                                   |
| OFFICER      | อ่าน/เพิ่ม/แก้ไขข้อมูลทั่วไปทุกเขต · ห้ามลบ · ห้ามจัดการผู้ใช้ · ห้ามอ่าน auditLogs/userAuditLogs                                                      |
| HEALTH       | เก็บเฉพาะโรคประจำตัวและข้อจำกัดการดูแล · ทุก role ต้องมี healthAccess · Viewer ปฏิเสธเสมอ · ต้องมี healthAuditLogs                               |
| K1           | healthAuditLogs: อ่านได้ SA/AD ที่มี healthAccess · Officer ที่มี healthAccess สร้างได้แต่อ่านไม่ได้ · ห้าม U/D                                      |
| K2           | คง flow สมัครและการอ่าน users doc ของตนเอง · ข้อมูลที่ป้องกันต้อง auth + email verified + approved                                             |
| K3           | Super Admin เท่านั้นที่ให้/ถอน healthAccess                                                                                                 |
| H-S2         | personnelHealth แยกเอกสารรายบุคคลต่อการเข้าพัก · ID แนวทาง `stayId_subjectId`                                                             |
| H-1 ถึง H-6   | รหัสโรค/careLimitations จากรายการ · ไม่เก็บ otherCondition · Viewer อ่าน healthConditions ไม่ได้ · Dashboard ตัวเลขรวม · ยังไม่บังคับ MFA        |
| C1           | exportLogs อ่านได้เฉพาะ SA/AD                                                                                                           |
| C2           | ห้ามข้อความอิสระใน auditLogs.summary · ห้ามข้อมูลสุขภาพใน general audit                                                                      |
| C3           | แยกสมาชิกครอบครัวเป็น `stayMembers`                                                                                                      |
| C5 / C6 / C7 | allowlist ของ tags / endReasonCode / maintenance category + จำกัดขนาด detail                                                           |
| C12          | Viewer list ≤ 100 ต่อหน้า (ต้องทดสอบร่วมกับ aggregation)                                                                                   |
| OI-2         | ทางเลือก C: Structured userAuditLogs ที่ Rules ตรวจกับเอกสารเป้าหมาย · ยกเลิก `summary`                                                     |
| OI2-D8       | ตัด `actorName`, `actorRank`, `zoneId` ออกจาก userAuditLogs · คง `actorUid`                                                            |

### มติเพิ่มเติม v1.1 (2026-11-17 · ก่อนเริ่ม Phase 2A)

| รหัส | การตัดสินใจ                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N-1 | ห้าม Export ข้อมูลสุขภาพรายบุคคลทุกรูปแบบ · อนุญาตเฉพาะสถิติรวมที่ผ่านเกณฑ์ความเป็นส่วนตัว (N-2) และสิทธิ์ (P-2)                                                                |
| N-2 | สถิติสุขภาพคำนวณฝั่ง Server · จำนวนที่ต่ำกว่า 5 แสดงเป็น `<5` (small-cell suppression) · กลไก Server ที่ใช้ยังเป็น INFRA (Pending)                                         |
| N-3 | `pending` / `rejected` เก็บใน `accessRequests` · `approved` / `suspended` เก็บใน `users` (สถานะบัญชีที่ใช้ตัดสินสิทธิ์อยู่ใน `users` เท่านั้น)                               |
| N-4 | ห้ามเก็บข้อมูล occupant ซ้ำใน `rooms` · เชื่อมข้อมูลผ่าน `rooms.currentStayId → stays → personnel`                                                                    |
| N-5 | ใช้ `actorUid` เป็นตัวระบุผู้กระทำหลักใน Audit Logs ทุกประเภท และต้องคงความสามารถตรวจสอบย้อนหลังได้ (การตัดฟิลด์อื่นนอก userAuditLogs ดู P-4)                                 |
| N-6 | Super Admin ขั้นต่ำ 2 บัญชีในสภาวะปกติ · บัญชีเฉพาะบุคคล ห้ามใช้บัญชีร่วม · Bootstrap/Recovery ต้องปลอดภัย · ปิดช่องทาง Bootstrap หลังตั้งต้นครบ · ห้ามลดต่ำกว่า 2 (ยกเว้นตาม P-1)    |
| P-1 | ยกเว้น N-6: อนุญาตให้เหลือ Super Admin 1 บัญชี **ชั่วคราว** เฉพาะเหตุฉุกเฉินเพื่อระงับบัญชีที่ถูกเจาะ และต้องดำเนิน Recovery ให้กลับเป็นอย่างน้อย 2 บัญชี (กรอบเวลาและผู้ดำเนินการ ดู P-1a) |
| P-2 | Export สถิติสุขภาพต้องมี `canExport=true` **และ** `healthAccess=true` และต้องผ่านเกณฑ์ suppression (N-2) · Viewer ห้ามเสมอ (D3)                                      |
| P-5 | Bootstrap ใช้ Admin SDK script แบบครั้งเดียว ควบคุมโดยผู้รับผิดชอบ 2 คน · ห้ามเก็บ Service Account Key ใน Repository                                                   |
| T-1 | เครื่องมือพัฒนา: Node.js 24 (≥ 24.12.0) · `firebase-tools` และ `@firebase/rules-unit-testing` เป็น devDependency แบบระบุเวอร์ชัน · ใช้กับ Emulator `demo-w2hms` เท่านั้น |

### มติเพิ่มเติม v1.2 (2026-11-17 · Phase 2A Step 1–2 Review)

| รหัส             | การตัดสินใจ                                                                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N-3 (ยืนยัน v1.2) | `accessRequests` ใช้สถานะ `pending` / `rejected` **เท่านั้น** · ห้ามมีความหมาย `approved` ซ้ำกับ `users`                                                                                                         |
| P-8             | (Option A) การอนุมัติคำขอ: สร้าง `users/{uid}` (คัดลอกข้อมูลคำขอที่จำเป็น: requestId, requestedRole, requestedAt) + userAuditLogs E1 + **ลบคำขอที่ pending** ใน batch เดียวกัน — เป็นข้อยกเว้นหลัก "ห้ามลบเอกสาร" เฉพาะกรณีนี้ |
| P-9             | ผู้ถูก rejected ยื่นคำขอใหม่ได้ โดยบันทึก Audit Event (ร่าง E15 REQUEST_RESUBMITTED) · ผู้ใช้เปลี่ยนสถานะคำขอเองไม่ได้ · คำขอที่ rejected เก็บไว้เป็นประวัติ                                                                     |
| T-2             | ยอมรับ npm audit 14 moderate **ชั่วคราว** เฉพาะ devDependencies (สายของ `firebase-tools`) · ห้าม `npm audit fix --force` · ตรวจซ้ำทุกครั้งที่อัปเดต dependencies                                                    |

> **P-1 (ข้อสังเกต v1.2 — ไม่ใช่มติบังคับ):** ความเสี่ยง W-P1a (ช่องทางฉุกเฉินถูกผู้โจมตีใช้ระงับ SA ที่ถูกต้องได้), W-P1b (การระงับใน Firestore ไม่ปิด session ของ Auth), W-P1c (ไม่มีทางกู้จาก client เมื่อ SA ที่เหลือใช้งานไม่ได้) และข้อเสนอแนวปฏิบัติ SA 3 บัญชี บันทึกใน SECURITY-DESIGN §2.1 · **ห้าม implement ช่องทางฉุกเฉินใน Rules จนกว่า P-1a และ P-5a ได้รับอนุมัติ**

### มติเพิ่มเติม v1.4 (2026-11-17 · ก่อนเริ่ม Rules R1)

| รหัส  | การตัดสินใจ                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P-13 | (Option A) **ไม่บันทึก Audit** สำหรับคำขอฉบับแรก (`seq = 1`) · ไม่ใช้ eventCode ใด · ตัวเอกสาร `accessRequests/{uid}_1` (`createdAt`) เป็นหลักฐานการยื่น · E15 ใช้เฉพาะคำขอ `seq ≥ 2` ตาม P-9 · เหตุผล: ลดความซับซ้อนของ Rules และทำให้เริ่ม R1 ได้เร็วขึ้น · ไม่เปลี่ยน N-3, P-8, P-9 และไม่ตัดสิน OI2-OB1 / OI2-OB2 ส่วนข้อความอิสระ |

## SELECTED BUT NOT APPROVED (Selected for Design — ยังไม่อนุมัติ Implementation)

| รหัส      | รายการ                                                                      |
| -------- | --------------------------------------------------------------------------- |
| OI2-D7-A | ใช้ eventCode `PERMISSIONS_CHANGED` (E14) สำหรับเปลี่ยนสิทธิ์หลายกลุ่มใน 1 log       |
| D7-Q1-A  | ไม่รวม `status` ใน E14 · การเปลี่ยนสถานะใช้ E5 (ระงับ) / E6 (คืนสิทธิ์)              |
| SD-v6.6  | Security Design v6.6 ทั้งฉบับ และ pseudo rules ทั้งหมด                           |
| SCHEMA   | Collections และ Schema ทั้งหมดใน [FIRESTORE-SCHEMA.md](./FIRESTORE-SCHEMA.md) |

## PENDING (รอการตัดสินใจของเจ้าของโครงการ)

| รหัส               | คำถาม                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| OI2-D9            | reasonCode บังคับสำหรับ event ใด (E2, E5, E6, E14)                                                                                                       |
| OI2-D10           | USER_CREATED ต้องผูกกับคำขอที่ approved ใน batch เดียวกันหรือไม่                                                                                               |
| OI2-D11           | E9/E10 (canExport) และ E11 (zones) ระหว่างรอ OI-6 / PD-2: ปิดชั่วคราว หรือเปิดตามสิทธิ์เดิม                                                                     |
| OI2-P7            | Reconciliation แบบอ่านอย่างเดียวเพื่อหา version ที่ไม่มี audit log                                                                                             |
| D7-Q2             | ห้ามแก้ profile / statusReason ใน commit เดียวกับ E14 หรือไม่                                                                                               |
| D7-Q3             | เพิ่มฟิลด์ `changedGroups` หรือไม่                                                                                                                          |
| D7-Q4             | นิยาม "≥ 2 กลุ่มสิทธิ์" สำหรับ E14                                                                                                                           |
| D7-Q5             | มีเงื่อนไข: ขึ้นกับ PD-2 / V65-PD-Z1                                                                                                                        |
| PD-2 / V65-PD-Z1  | Schema ของ zones (S-1 ถึง S-4: array หรือ count ใน audit) · ห้าม Viewer มีข้อมูลเขตหรือไม่                                                                    |
| OI-3              | ซ่อน `healthConditions` จาก list (แยก collection หรือห้าม list lookups)                                                                                  |
| OI-4              | C12 กับ `count()` aggregation                                                                                                                          |
| OI-5              | หมวดโรคอ่อนไหวสูง (สุขภาพจิต ฯลฯ) อยู่ในรายการหรือไม่                                                                                                         |
| OI-6              | ผู้มีสิทธิ์มอบ `canExport`                                                                                                                                  |
| OI-7              | audit ของการแก้ healthConditions ลง healthAuditLogs หรือไม่                                                                                              |
| OI-8              | Viewer อ่าน zones / lookups ทั่วไป / config/public                                                                                                       |
| PD-1 ถึง PD-16     | รวม P-O1 (ขอบเขต export ของ Officer), P-O2, P-O3, P-O5, P-O6 และประเด็น schema/IAM/รายงาน                                                              |
| OQ-1 ถึง OQ-6      | E5/E6 แยกกัน · statusReason ใน E5/E6 · ทบทวนสิทธิ์ก่อน E6 · workflowId · E14 กับบัญชีที่ถูกระงับ · E1/E2                                                          |
| OB-D8-2 / OB-D8-3 | ใช้หลัก OI2-D8 กับ healthAuditLogs / exportLogs หรือไม่                                                                                                    |
| OI2-OB1 / OI2-OB2 | ข้อความอิสระใน statusReason / reason / reviewNote · audit ตอนยื่นคำขอ                                                                                     |
| LISTS             | รายการค่าฉบับสุดท้าย: eventCode, reasonCode, healthConditions, careLimitations, stayTags, endReasonCode, maintCategories — **TBD**                        |
| INFRA             | IAM / Admin SDK / Apps Script · MFA · Cloud Audit Logs · Cloud Functions · Document ID scheme — **TBD** · (v1.1) N-2 ต้องใช้กลไก Server ที่เลือกจากรายการนี้ |
| P-1a (v1.1)       | กรอบเวลาสูงสุดที่ยอมให้มี Super Admin 1 บัญชี · ใครดำเนิน Recovery · การแจ้งเตือน · reasonCode ของการระงับฉุกเฉิน (ขึ้นกับ OI2-D9)                                     |
| P-3 (v1.1)        | คง `rooms.memberCount` (ตัวเลขรวม ไม่ใช่ข้อมูล occupant) หรือไม่                                                                                             |
| P-4 (v1.1)        | ใช้หลัก OI2-D8 / N-5 (ตัด `actorName`, `actorRank`, `zoneId`) กับ `auditLogs`, `healthAuditLogs`, `exportLogs` หรือไม่ (รวม OB-D8-2 / OB-D8-3)              |
| P-5a (v1.1)       | ขั้นตอน Break-glass เมื่อไม่มี Super Admin ใช้งานได้ (ผู้มีสิทธิ์ IAM, การบันทึก, การกระทบยอด)                                                                        |
| P-6 (v1.1)        | ที่เก็บสถิติสุขภาพ (ร่าง `healthStats/{scope}`) ขอบเขตการแบ่ง (scope) และผู้อ่าน                                                                                 |
| P-10 (v1.3)       | **MAX_SEQ** — จำนวนครั้งสูงสุดที่ผู้ใช้หนึ่งคนยื่นคำขอได้ (P-9) · ยังไม่กำหนดค่า                                                                                       |
| P-11 (v1.3)       | **COOLDOWN** — ระยะเวลาขั้นต่ำหลัง `rejectedAt` ก่อนยื่นใหม่ได้ (P-9) · ยังไม่กำหนดค่า                                                                            |
| P-12 (v1.3)       | **actorRole** ของผู้สมัครใน E15 (ผู้สมัครยังไม่มี role ใน `users`) · ยังไม่กำหนดค่า                                                                               |
| P-13 (v1.3)       | ~~**Audit ของคำขอฉบับแรก** (`seq = 1`) ต้องบันทึกหรือไม่ และใช้ eventCode ใด (เกี่ยวกับ OI2-OB2)~~ → **ตัดสินแล้ว v1.4: Option A ไม่บันทึก Audit** (ดู APPROVED v1.4) |
| P-14 (v1.3)       | ยืนยันรูปแบบ `requestId = {uid}_{seq}` (field `uid`, `seq`) และชื่อ/เลขรหัส E15 REQUEST_RESUBMITTED                                                         |
| P-15 (v1.3)       | ผู้สมัครต้องยืนยันอีเมลก่อนยื่นคำขอหรือไม่ (ความสัมพันธ์กับ K2)                                                                                                       |

## คำถามที่ต้องให้เจ้าของโครงการตัดสินใจก่อน Phase 2

1. อนุมัติ OI2-D7-A และ D7-Q1-A สำหรับ Implementation หรือไม่
2. เลือก Schema zones (S-1 ถึง S-4) และ V65-PD-Z1
3. OI-6 และ OI2-D11
4. OI2-D9 และ OI2-D10
5. อนุมัติรายการค่าฉบับสุดท้ายทั้ง 7 ชุด
6. OI-3 และ OI-4
7. (v1.1) P-1a, P-3, P-4, P-5a, P-6 และกลไก Server สำหรับ N-2 (INFRA)
8. (v1.3) P-10, P-11, P-12, P-14, P-15 (P-13 ตัดสินแล้ว v1.4) — ต้องตัดสินใจก่อนเขียน Rules ของ accessRequests / E15

## ประวัติการเปลี่ยนแปลง (Change Log)

| Version | วันที่        | การเปลี่ยนแปลง                                                                                                                                                                         | แหล่งที่มา                                    |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| v1.0    | Phase 1.5  | สร้าง register จาก Security Design v6–v6.6 และ OI-2 Review                                                                                                                            | มติเจ้าของโครงการ (Phase 1.5)                |
| v1.4    | 2026-11-17 | เพิ่ม APPROVED: P-13 (Option A) ไม่บันทึก Audit สำหรับคำขอฉบับแรก (`seq = 1`) · P-10, P-11, P-12, P-14, P-15 และ OI2-D9 คง PENDING · ไม่เปลี่ยนมติอื่น | มติเจ้าของโครงการ (ก่อน Rules R1) |
| v1.3    | 2026-11-17 | เพิ่ม PENDING: P-10 MAX_SEQ, P-11 COOLDOWN, P-12 actorRole, P-13 Audit คำขอฉบับแรก, P-14 รูปแบบ requestId/E15, P-15 การยืนยันอีเมลผู้สมัคร · ไม่กำหนดค่าใด ๆ เอง · ไม่เปลี่ยน N-3, P-8, P-9         | Phase 2A Step 3                            |
| v1.2    | 2026-11-17 | เพิ่ม APPROVED: P-8 (Option A), P-9, T-2 · ยืนยัน N-3 (ไม่มี approved ใน accessRequests) · บันทึกความเสี่ยง P-1 (W-P1a–c) และข้อเสนอ SA 3 บัญชีเป็นแนวปฏิบัติ (ไม่บังคับ) · Node 24 ใน `.nvmrc` / README | มติเจ้าของโครงการ (Step 1–2 Review)          |
| v1.1    | 2026-11-17 | เพิ่ม APPROVED: N-1–N-6, P-1, P-2, P-5, T-1 · เพิ่ม PENDING: P-1a, P-3, P-4, P-5a, P-6 · ขยายความ ROLES (N-3) และ INFRA (N-2)                                                            | มติเจ้าของโครงการ (Phase 2A Prep / Step 1–2) |
