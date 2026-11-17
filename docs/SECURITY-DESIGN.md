# W2HMS vNext — Security Design

> **สถานะ:** อ้างอิง Security Design v6.6 (รวม v6–v6.6 และ OI-2 Review)
> **Implementation: Not Approved** · **Rules: Not Implemented** · **Emulator: Not Tested**
>
> เอกสารนี้บันทึกนโยบายและข้อเสนอการออกแบบเพื่อใช้อ้างอิงกลาง ไม่ใช่การอนุมัติให้พัฒนา
> สถานะของแต่ละรายการให้ยึด [SECURITY-DECISIONS.md](./SECURITY-DECISIONS.md) เป็นหลัก

## 1. สถาปัตยกรรม (APPROVED)

```
GitHub Pages (static SPA) ──ID token──▶ Firebase Authentication
        │                                   │ uid, email_verified
        └──Firestore SDK/REST──▶ Cloud Firestore ◀── Firestore Security Rules (ด่านบังคับสิทธิ์จริง)
                                     │ อ่านอย่างเดียว
                                     ▼
                    Reporting / Export (canExport) → Google Sheets (อ่านอย่างเดียว · ไม่ไหลกลับ)
```

| รหัส     | นโยบาย                                                           |
| ------- | ---------------------------------------------------------------- |
| POL-A1  | Frontend: GitHub Pages                                           |
| POL-A2  | Authentication: Firebase Authentication                          |
| POL-A3  | Cloud Firestore เป็น Single Source of Truth                       |
| POL-A4  | Firestore Security Rules เป็นกลไกบังคับสิทธิ์ (UI ซ่อนปุ่มเป็นชั้นเสริมเท่านั้น) |
| POL-A5  | Google Sheets ใช้สำหรับรายงานเท่านั้น                                 |
| POL-A6  | Apps Script เป็นส่วนเสริมในอนาคต ไม่ใช่ฐานข้อมูลหลัก                     |
| POL-A7  | แยก Development และ Production                                   |
| POL-A8  | ห้ามมีข้อมูลจริงหรือข้อมูลอ่อนไหวใน public repository                     |
| POL-A9  | ระบบเดิมและ Firebase project `bn2-housing` ต้องไม่ถูกกระทบ           |
| POL-A10 | ระบบใหม่ใช้ Firebase project `w2hms-fbdcb` (Phase 1 ยังไม่เชื่อมต่อ)    |

## 2. บัญชีผู้ใช้และการอนุมัติ (APPROVED)

- บัญชีรายบุคคล · Roles: **Super Admin, Admin, Officer, Viewer**
- สถานะ: **pending, approved, rejected, suspended**
- ต้องผ่าน Authentication + Email Verification + Approved Status ก่อนเข้าถึงข้อมูลที่ป้องกัน
- **K2:** คงขั้นตอนสมัครและการอ่าน `users/{uid}` ของตนเองตาม flow เดิม (ไม่บังคับ email verification สำหรับการอ่านเอกสารของตนเอง)
- **K3:** Super Admin เท่านั้นที่ให้หรือถอน `healthAccess` · ผู้ใช้เปลี่ยนสิทธิ์ของตนเองไม่ได้

## 3. นโยบาย Role (APPROVED)

### 3.1 Viewer — ผู้บังคับบัญชา

- อ่านข้อมูลทั่วไปทุกเขต: rooms, buildings, personnel, stays/history, **stayPrivate, stayMembers (OI-1)**, vehicles, maintenance, layouts/maps, general auditLogs
- อ่านได้ทั้ง get / list / query · list ไม่เกิน 100 รายการต่อหน้า (**C12**)
- **Read Only อย่างสมบูรณ์:** ห้าม Create / Update / Delete / Import / Export / Check-in / Check-out / เปลี่ยนสถานะ / จัดการผู้ใช้
- ห้ามอ่าน: `personnelHealth` (แม้ `healthAccess=true`), `healthAuditLogs`, `userAuditLogs`, `exportLogs`, `users` และ `accessRequests` ของผู้อื่น, `lookups/healthConditions` (H-4)
- ห้ามแก้ข้อมูลบัญชีตนเองทุกฟิลด์ รวมถึง displayName, role, status, approvedBy, assignedZones
- ไม่แสดงหรือคำนวณสถิติสุขภาพ (D4)
- ข้อจำกัด: ป้องกันการคัดลอกข้อมูลที่ Viewer มีสิทธิ์อ่านผ่านช่องทางภายนอกไม่ได้อย่างสมบูรณ์

### 3.2 Officer

- อ่าน เพิ่ม และแก้ไขข้อมูลทั่วไป **ทุกเขต** (ยกเลิก `assignedZones` restriction สำหรับข้อมูลทั่วไปเท่านั้น)
- ห้าม: ลบข้อมูล · จัดการผู้ใช้ · เปลี่ยน role / status / approvedBy / assignedZones · เปลี่ยนสิทธิ์ตนเอง · อ่าน `auditLogs` / `userAuditLogs`
- ข้อมูลสุขภาพ: ต้องมี `healthAccess=true`
- Export: ตาม `canExport` เดิมเท่านั้น · ขอบเขตทุกเขตหรือเฉพาะเขตยัง **Pending (P-O1)**
- ข้อจำกัดเดิมที่ไม่เกี่ยวกับเขต (สร้าง rooms, แก้ buildings/layouts/lookups, แก้ stay ที่ ended, เปิดงานซ่อมที่ done ซ้ำ) คงไว้ — รายละเอียดยัง **Pending (P-O5)**

### 3.3 Admin / Super Admin

- จัดการข้อมูลทั่วไปและผู้ใช้ตามสิทธิ์ · Admin จัดการได้เฉพาะบัญชี officer/viewer
- ข้อมูลสุขภาพต้องมี `healthAccess=true` เช่นกัน (ไม่ได้สิทธิ์อัตโนมัติตาม role)
- อ่าน `exportLogs` ได้เฉพาะ Admin / Super Admin (**C1**)

## 4. Health Data และ Data Separation (APPROVED)

- เก็บได้เฉพาะ **โรคประจำตัว** และ **ข้อจำกัดในการดูแล**
- ห้ามเก็บ: ประวัติการรักษา, รายละเอียดการรักษา, ประวัติการใช้ยา, ผลตรวจ, เวชระเบียน, ข้อมูลทางการแพทย์เชิงลึก
- **H-S2:** `personnelHealth` แยกเอกสารรายบุคคลต่อหนึ่งการเข้าพัก · Document ID แนวทาง `stayId_subjectId` · ไม่ใช้ map รวมหลายคน
- **H-1:** รหัสโรคจากรายการที่กำหนด ไม่มีข้อความอิสระ (รายการสุดท้าย TBD)
- **H-2:** `careLimitations` จากรายการที่กำหนด — ค่าที่เสนอ: bedridden, wheelchair, mobilityAid, needsCaregiver, visualHearing, other (ความหมายสุดท้าย TBD)
- **H-3:** ไม่เก็บ `otherCondition` · ไม่มีช่องข้อความอิสระด้านสุขภาพ
- **H-5:** Dashboard ของผู้มี healthAccess แสดงเฉพาะตัวเลขรวม ไม่มีรายชื่อหรือรายละเอียดรายบุคคล
- **H-6:** ยังไม่บังคับ MFA ในระยะแรก
- ทุกการเขียนข้อมูลสุขภาพต้องสร้าง `healthAuditLogs` · ข้อมูลสุขภาพต้องแยกจากข้อมูลทั่วไป
- **C3:** สมาชิกครอบครัวแยกเป็น `stayMembers` · ไม่มีข้อมูลสุขภาพใน `stayPrivate` หรือข้อมูลทั่วไป
- **C5 / C6 / C7:** tags, endReasonCode, maintenance category ใช้ allowlist · จำกัดขนาด maintenance detail

## 5. Audit Logging (APPROVED บางส่วน)

| Collection        | ผู้อ่าน                       | หลักการ                                                                                                                                                                                      |
| ----------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auditLogs`       | SA, AD, VW                 | **C2:** ห้ามข้อความอิสระใน summary · ห้ามข้อมูลสุขภาพ                                                                                                                                              |
| `userAuditLogs`   | SA, AD                     | **OI-2 ทางเลือก C:** Structured Audit Log (eventCode, changes, reasonCode) ที่ Rules ตรวจกับเอกสารเป้าหมาย · ยกเลิก `summary` · **OI2-D8:** ตัด `actorName`, `actorRank`, `zoneId` · คง `actorUid` |
| `healthAuditLogs` | SA/AD ที่มี healthAccess (K1) | Officer ที่มี healthAccess สร้างได้แต่อ่านไม่ได้ · Viewer ไม่ได้                                                                                                                                       |
| `exportLogs`      | SA, AD (C1)                | Viewer อ่าน/เขียนไม่ได้ · Officer อ่านไม่ได้                                                                                                                                                       |

- ห้าม Update/Delete audit log ทุกประเภท
- **Selected for Design (ยังไม่อนุมัติ Implementation):** OI2-D7-A (E14 `PERMISSIONS_CHANGED`) และ D7-Q1-A (ไม่รวม `status` ใน E14 — ใช้ E5/E6 แทน)

## 6. ข้อเสนอการออกแบบ (PROPOSED — ยังไม่อนุมัติ)

- Pseudo rules และ helper ทั้งหมดใน Security Design v6–v6.6
- หลัก "1 commit = 1 เป้าหมาย = 1 audit log" ใน batch/transaction เดียวกัน · Document ID แบบ `{col}_{id}_v{version}`
- ตรวจ `pre.version == n−1`, `post.version == n`, `changedFields == diff จริง`, `changes.from/to` ตรงกับ `get()/getAfter()`
- Default Deny · ห้ามลบเอกสาร (ใช้ status/active แทน)
- รายละเอียด Schema ดู [FIRESTORE-SCHEMA.md](./FIRESTORE-SCHEMA.md)

## 7. ข้อจำกัดและความเสี่ยง

| รหัส  | ความเสี่ยง                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------ |
| RK-1 | **Rules access calls:** อาจชนขีดจำกัด 10 (single) / 20 (batch/transaction) document access calls — ต้องวัดใน Emulator  |
| RK-2 | **Audit Log integrity:** ค่าบางส่วนยังมาจาก client · ระดับที่ปลอมไม่ได้ต้องใช้ server-side audit (Cloud Functions — Pending) |
| RK-3 | **Admin SDK / Console / Service Account / IAM ข้าม Firestore Rules ทั้งหมด** — ต้องควบคุมด้วย IAM และขั้นตอนปฏิบัติแยกต่างหาก  |
| RK-4 | **ข้อมูลอ่อนไหว:** ข้อความอิสระ (note, detail) Rules ตรวจความหมายไม่ได้ อาจมีข้อมูลสุขภาพปะปน                                 |
| RK-5 | Viewer อ่านเบอร์โทรและข้อมูลครอบครัวทุกเขตได้ (อนุมัติแล้ว) — การคัดลอกข้อมูลป้องกันไม่ได้ทั้งหมด · ประเด็น PDPA                        |
| RK-6 | C12 (`limit ≤ 100`) อาจกระทบ aggregation (`count()`) — ต้องทดสอบ                                                    |
| RK-7 | บัญชี Officer/Viewer ถูกเจาะ มีผลกระทบทุกเขต · MFA ยังเป็นระยะถัดไป                                                        |
| RK-8 | GitHub Pages ตั้ง HTTP security headers ไม่ได้ (เช่น `frame-ancestors`)                                                 |

## 8. สถานะ Implementation ปัจจุบัน (Phase 1)

- Firebase Emulator-only guard (`demo-` project, host `localhost`/`127.0.0.1` เท่านั้น)
- `firestore.rules` เป็น **deny-all placeholder** สำหรับ Emulator — ไม่ใช่ Rules ตามเอกสารนี้
- ยังไม่มี Auth, RBAC, Collections หรือ Rules จริง
