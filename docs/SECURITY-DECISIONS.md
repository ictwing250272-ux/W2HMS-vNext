# W2HMS vNext — Security Decisions Register

> แหล่งอ้างอิงสถานะการตัดสินใจ · ห้ามตีความรายการ PENDING หรือ SELECTED เป็นการอนุมัติ
> **Implementation ของ Security Design v6.6: Not Approved**

## APPROVED (นโยบายที่อนุมัติแล้ว)

| รหัส          | การตัดสินใจ                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| ARCH         | Architecture C (Hybrid): GitHub Pages + Firebase Auth + Firestore (SSOT) + Rules · Sheets รายงานเท่านั้น                          |
| ROLES        | Super Admin / Admin / Officer / Viewer · สถานะ pending / approved / rejected / suspended · บัญชีรายบุคคล                          |
| D1           | Viewer อ่าน `users` / `accessRequests` ได้เฉพาะของตนเอง · แก้บัญชีตนเองไม่ได้ทุกฟิลด์                                                    |
| D2           | Viewer อ่าน `personnelHealth` ไม่ได้ทุกกรณี แม้ `healthAccess=true`                                                                  |
| D3           | Viewer ห้าม Export · ห้ามอ่าน/เขียน `exportLogs`                                                                                   |
| D4           | ไม่แสดงสถิติสุขภาพให้ Viewer                                                                                                        |
| D5           | MFA เป็นมาตรการระยะถัดไป (ยังไม่เปิดใช้)                                                                                             |
| D6           | Cloud Audit Logs พิจารณาภายหลังตามงบประมาณ (ยังไม่เปิดใช้)                                                                           |
| VIEWER       | อ่านข้อมูลทั่วไปทุกเขต · Read Only สมบูรณ์ บังคับด้วย Rules                                                                               |
| OI-1         | Viewer อ่าน `stayPrivate` และ `stayMembers` ได้ทุกเขต (get/list/query, list ≤ 100) · ห้ามเขียน/ลบ/Export                            |
| OFFICER      | อ่าน/เพิ่ม/แก้ไขข้อมูลทั่วไปทุกเขต · ห้ามลบ · ห้ามจัดการผู้ใช้ · ห้ามอ่าน auditLogs/userAuditLogs                                               |
| HEALTH       | เก็บเฉพาะโรคประจำตัวและข้อจำกัดการดูแล · ทุก role ต้องมี healthAccess · Viewer ปฏิเสธเสมอ · ต้องมี healthAuditLogs                        |
| K1           | healthAuditLogs: อ่านได้ SA/AD ที่มี healthAccess · Officer ที่มี healthAccess สร้างได้แต่อ่านไม่ได้ · ห้าม U/D                               |
| K2           | คง flow สมัครและการอ่าน users doc ของตนเอง · ข้อมูลที่ป้องกันต้อง auth + email verified + approved                                      |
| K3           | Super Admin เท่านั้นที่ให้/ถอน healthAccess                                                                                          |
| H-S2         | personnelHealth แยกเอกสารรายบุคคลต่อการเข้าพัก · ID แนวทาง `stayId_subjectId`                                                      |
| H-1 ถึง H-6   | รหัสโรค/careLimitations จากรายการ · ไม่เก็บ otherCondition · Viewer อ่าน healthConditions ไม่ได้ · Dashboard ตัวเลขรวม · ยังไม่บังคับ MFA |
| C1           | exportLogs อ่านได้เฉพาะ SA/AD                                                                                                    |
| C2           | ห้ามข้อความอิสระใน auditLogs.summary · ห้ามข้อมูลสุขภาพใน general audit                                                               |
| C3           | แยกสมาชิกครอบครัวเป็น `stayMembers`                                                                                               |
| C5 / C6 / C7 | allowlist ของ tags / endReasonCode / maintenance category + จำกัดขนาด detail                                                    |
| C12          | Viewer list ≤ 100 ต่อหน้า (ต้องทดสอบร่วมกับ aggregation)                                                                            |
| OI-2         | ทางเลือก C: Structured userAuditLogs ที่ Rules ตรวจกับเอกสารเป้าหมาย · ยกเลิก `summary`                                              |
| OI2-D8       | ตัด `actorName`, `actorRank`, `zoneId` ออกจาก userAuditLogs · คง `actorUid`                                                     |

## SELECTED BUT NOT APPROVED (Selected for Design — ยังไม่อนุมัติ Implementation)

| รหัส      | รายการ                                                                      |
| -------- | --------------------------------------------------------------------------- |
| OI2-D7-A | ใช้ eventCode `PERMISSIONS_CHANGED` (E14) สำหรับเปลี่ยนสิทธิ์หลายกลุ่มใน 1 log       |
| D7-Q1-A  | ไม่รวม `status` ใน E14 · การเปลี่ยนสถานะใช้ E5 (ระงับ) / E6 (คืนสิทธิ์)              |
| SD-v6.6  | Security Design v6.6 ทั้งฉบับ และ pseudo rules ทั้งหมด                           |
| SCHEMA   | Collections และ Schema ทั้งหมดใน [FIRESTORE-SCHEMA.md](./FIRESTORE-SCHEMA.md) |

## PENDING (รอการตัดสินใจของเจ้าของโครงการ)

| รหัส               | คำถาม                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| OI2-D9            | reasonCode บังคับสำหรับ event ใด (E2, E5, E6, E14)                                                                                |
| OI2-D10           | USER_CREATED ต้องผูกกับคำขอที่ approved ใน batch เดียวกันหรือไม่                                                                        |
| OI2-D11           | E9/E10 (canExport) และ E11 (zones) ระหว่างรอ OI-6 / PD-2: ปิดชั่วคราว หรือเปิดตามสิทธิ์เดิม                                              |
| OI2-P7            | Reconciliation แบบอ่านอย่างเดียวเพื่อหา version ที่ไม่มี audit log                                                                      |
| D7-Q2             | ห้ามแก้ profile / statusReason ใน commit เดียวกับ E14 หรือไม่                                                                        |
| D7-Q3             | เพิ่มฟิลด์ `changedGroups` หรือไม่                                                                                                   |
| D7-Q4             | นิยาม "≥ 2 กลุ่มสิทธิ์" สำหรับ E14                                                                                                    |
| D7-Q5             | มีเงื่อนไข: ขึ้นกับ PD-2 / V65-PD-Z1                                                                                                 |
| PD-2 / V65-PD-Z1  | Schema ของ zones (S-1 ถึง S-4: array หรือ count ใน audit) · ห้าม Viewer มีข้อมูลเขตหรือไม่                                             |
| OI-3              | ซ่อน `healthConditions` จาก list (แยก collection หรือห้าม list lookups)                                                           |
| OI-4              | C12 กับ `count()` aggregation                                                                                                   |
| OI-5              | หมวดโรคอ่อนไหวสูง (สุขภาพจิต ฯลฯ) อยู่ในรายการหรือไม่                                                                                  |
| OI-6              | ผู้มีสิทธิ์มอบ `canExport`                                                                                                           |
| OI-7              | audit ของการแก้ healthConditions ลง healthAuditLogs หรือไม่                                                                       |
| OI-8              | Viewer อ่าน zones / lookups ทั่วไป / config/public                                                                                |
| PD-1 ถึง PD-16     | รวม P-O1 (ขอบเขต export ของ Officer), P-O2, P-O3, P-O5, P-O6 และประเด็น schema/IAM/รายงาน                                       |
| OQ-1 ถึง OQ-6      | E5/E6 แยกกัน · statusReason ใน E5/E6 · ทบทวนสิทธิ์ก่อน E6 · workflowId · E14 กับบัญชีที่ถูกระงับ · E1/E2                                   |
| OB-D8-2 / OB-D8-3 | ใช้หลัก OI2-D8 กับ healthAuditLogs / exportLogs หรือไม่                                                                             |
| OI2-OB1 / OI2-OB2 | ข้อความอิสระใน statusReason / reason / reviewNote · audit ตอนยื่นคำขอ                                                              |
| LISTS             | รายการค่าฉบับสุดท้าย: eventCode, reasonCode, healthConditions, careLimitations, stayTags, endReasonCode, maintCategories — **TBD** |
| INFRA             | IAM / Admin SDK / Apps Script · MFA · Cloud Audit Logs · Cloud Functions · Document ID scheme — **TBD**                        |

## คำถามที่ต้องให้เจ้าของโครงการตัดสินใจก่อน Phase 2

1. อนุมัติ OI2-D7-A และ D7-Q1-A สำหรับ Implementation หรือไม่
2. เลือก Schema zones (S-1 ถึง S-4) และ V65-PD-Z1
3. OI-6 และ OI2-D11
4. OI2-D9 และ OI2-D10
5. อนุมัติรายการค่าฉบับสุดท้ายทั้ง 7 ชุด
6. OI-3 และ OI-4
