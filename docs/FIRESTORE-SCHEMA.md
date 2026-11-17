# W2HMS vNext — Firestore Schema (DRAFT)

> **สถานะ: ร่างทั้งหมด — ต้องยืนยันก่อน Implementation** (PD-11)
> ห้ามสร้าง Collection หรือเขียนข้อมูลจริงตามเอกสารนี้จนกว่าจะได้รับอนุมัติ
> ทุกเอกสารที่เขียนได้มี stamps ที่เสนอ: `version`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`
> ห้ามลบเอกสาร (ใช้ `status` / `active` แทน) — Default Deny

## Collections (ร่าง)

| Collection / Document ID (ร่าง)                | ระดับ    | ฟิลด์ที่เสนอ                                                                                                                                                           | สิทธิ์อ่าน (นโยบายที่อนุมัติ)                        |
| --------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `users/{uid}`                                 | ระบบ    | email, displayName, rank, unitName, role, status, statusReason, assignedZones, allZones, healthAccess, canExport, approvedBy, approvedAt                           | ตนเอง · SA/AD                               |
| `accessRequests/{uid}`                        | ระบบ    | email, fullName, rank, unitName, reason, requestedRole, status, reviewNote                                                                                         | ตนเอง · SA/AD                               |
| `zones/{zoneId}`                              | ทั่วไป    | name                                                                                                                                                               | ทุก role ที่ approved (Viewer: OI-8 Pending)   |
| `lookups/{type}`                              | ทั่วไป    | values[], labels{}                                                                                                                                                 | ทุก role ที่ approved (ยกเว้น healthConditions) |
| `lookups/healthConditions` หรือ collection แยก | สุขภาพ   | values[], labels{} — **ตำแหน่ง Pending (OI-3)**                                                                                                                     | ผู้มี healthAccess เท่านั้น (H-4)                 |
| `config/{id}`                                 | ระบบ    | TBD                                                                                                                                                                | `public`: approved · อื่น: SA/AD              |
| `buildings/{bldId}`                           | ทั่วไป    | name, kind, zoneId, roomCount, dir, corners[4 GeoPoint], legacyName, active                                                                                        | ทุก role ที่ approved                          |
| `layouts/{id}` + `/versions/{v}`              | ทั่วไป    | GeoJSON string (แบ่งชิ้น)                                                                                                                                             | ทุก role ที่ approved                          |
| `rooms/{bldId}_{NNN}`                         | ทั่วไป    | buildingId, zoneId, roomNo, code, status, type, note, checked, submitted, currentStayId, occupant{displayName, rank, unitName, since}, openMaintCount, memberCount | ทุก role ที่ approved                          |
| `stays/{autoId}`                              | ทั่วไป    | roomId, buildingId, zoneId, personId, status, checkIn, checkOut, endReasonCode (C6), position, unitName, subunitName, tags[] (C5), note                            | ทุก role ที่ approved                          |
| `stayMembers/{autoId}` (C3)                   | ส่วนบุคคล | stayId, roomId, zoneId, name, relation, birthYear, active — **ห้าม key สุขภาพ**                                                                                      | ทุก role ที่ approved (OI-1)                   |
| `stayPrivate/{stayId}`                        | ส่วนบุคคล | zoneId, roomId, phone — **ไม่มี members**                                                                                                                            | ทุก role ที่ approved (OI-1)                   |
| `personnel/{autoId}`                          | ทั่วไป    | fullName, rank, unitName, searchKeys[], currentStayId                                                                                                              | ทุก role ที่ approved                          |
| `vehicles/{autoId}`                           | ส่วนบุคคล | stayId, roomId, zoneId, personId, type, plate, plateKey, province, active                                                                                          | ทุก role ที่ approved                          |
| `maintenance/{autoId}`                        | ทั่วไป    | roomId, buildingId, zoneId, category (C7), title, detail (ขนาดสูงสุด TBD), status, priority, openedAt, closedAt                                                      | ทุก role ที่ approved                          |
| `personnelHealth/{stayId}_{subjectId}` (H-S2) | สุขภาพ   | stayId, roomId, zoneId, subjectType (occupant/member), subjectId, conditionCodes[], careLimitations[], active — **ไม่มีข้อความอิสระ (H-3)**                            | SA/AD/OF ที่มี healthAccess · Viewer ไม่ได้      |
| `auditLogs/{col}_{id}_v{n}`                   | audit   | actorUid, actorName, actorRank, actorRole, action, targetCol, targetId, targetVersion, zoneId, changedFields, statusFrom, statusTo, at — **ไม่มี summary (C2)**      | SA, AD, VW                                  |
| `userAuditLogs/{col}_{id}_v{n}`               | audit   | actorUid, actorRole, eventCode, targetCol, targetId, targetVersion, changedFields, changes, reasonCode, at (10 keys · OI2-D8)                                      | SA, AD                                      |
| `healthAuditLogs/personnelHealth_{hid}_v{n}`  | audit   | actorUid, actorName, actorRank, actorRole, action, targetCol, targetId, targetVersion, zoneId, changedFields, at — ไม่มี summary (OB-D8-2 Pending)                   | SA/AD ที่มี healthAccess (K1)                  |
| `exportLogs/{autoId}`                         | audit   | actorUid, actorName, reportType, filters, rowCount, at (OB-D8-3 Pending)                                                                                           | SA, AD (C1)                                 |

## userAuditLogs — changes allowlist (ร่าง)

| Key           | ค่า from / to                                                                  | สถานะ                         |
| ------------- | ----------------------------------------------------------------------------- | ----------------------------- |
| role          | superAdmin / admin / officer / viewer / null                                  | ร่าง                           |
| status        | approved / suspended (users) · pending / approved / rejected (accessRequests) | ร่าง                           |
| healthAccess  | bool / null                                                                   | ร่าง (K3)                      |
| canExport     | bool / null                                                                   | **Pending OI-6**              |
| allZones      | bool / null                                                                   | **Pending PD-2**              |
| assignedZones | list ของ zoneId **หรือ** assignedZonesCount (int)                              | **Pending PD-2 (S-1 ถึง S-4)** |

## Event Codes (ร่าง — รายการสุดท้าย TBD)

| Code | ชื่อ                    | หมายเหตุ                                                  |
| ---- | --------------------- | -------------------------------------------------------- |
| E1   | REQUEST_APPROVED      | ร่าง                                                      |
| E2   | REQUEST_REJECTED      | reasonCode: OI2-D9                                       |
| E3   | USER_CREATED          | ผูกกับคำขอ: OI2-D10                                        |
| E4   | ROLE_CHANGED          | ร่าง                                                      |
| E5   | STATUS_SUSPENDED      | reasonCode: OI2-D9                                       |
| E6   | STATUS_REINSTATED     | reasonCode: OI2-D9                                       |
| E7   | HEALTH_ACCESS_GRANTED | Super Admin เท่านั้น (K3)                                   |
| E8   | HEALTH_ACCESS_REVOKED | Super Admin เท่านั้น (K3)                                   |
| E9   | EXPORT_GRANTED        | **Pending OI-6 / OI2-D11**                               |
| E10  | EXPORT_REVOKED        | **Pending OI-6 / OI2-D11**                               |
| E11  | ZONES_CHANGED         | **Pending PD-2 / OI2-D11**                               |
| E12  | PROFILE_UPDATED       | ร่าง                                                      |
| E13  | PROFILE_RENAMED_SELF  | ร่าง                                                      |
| E14  | PERMISSIONS_CHANGED   | **Selected for Design (OI2-D7-A, D7-Q1-A) — ไม่มี status** |

## รายการค่า (ทั้งหมด TBD)

- `healthConditions`: TBD (H-1, OI-5)
- `careLimitations`: เสนอ bedridden, wheelchair, mobilityAid, needsCaregiver, visualHearing, other — ความหมายสุดท้าย TBD (H-2)
- `stayTags`: TBD (C5 · ความหมายแท็ก "ชนอ." ยังไม่ทราบ)
- `endReasonCode`: TBD (C6)
- `maintCategories` และขนาด `detail`: TBD (C7)
- `reasonCode`: TBD (OI2-D9)
