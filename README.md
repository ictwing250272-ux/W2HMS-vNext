# W2HMS vNext

ระบบบริหารจัดการบ้านพัก กองบิน 2 (Wing 2 Housing Management System) — รุ่นถัดไป

> **สถานะ: Phase 1 — Foundation & Project Structure**
> มีเฉพาะโครงสร้างพื้นฐาน ยังไม่มีการเข้าสู่ระบบ การเชื่อมต่อ Firebase จริง Security Rules สำหรับใช้งานจริง
> หรือโมดูลบ้านพัก ข้อกำหนดด้านความปลอดภัยอ้างอิง Security Design v6.6 (ยังไม่อนุมัติ Implementation)

## สถาปัตยกรรม

| ส่วน            | เทคโนโลยี                                                 |
| -------------- | -------------------------------------------------------- |
| Frontend       | React + TypeScript + Vite → GitHub Pages (static)        |
| Authentication | Firebase Authentication (Phase 2+)                       |
| Database       | Cloud Firestore — Single Source of Truth (Phase 2+)      |
| Security       | Firestore Security Rules (Phase 2+)                      |
| Reporting      | Google Sheets (ระยะต่อไป)                                 |
| Local testing  | Firebase Emulator Suite (Auth + Firestore, demo project) |

## ความต้องการของระบบ

- Node.js 22 ขึ้นไป (ดู `.nvmrc`)
- npm 10 ขึ้นไป
- (เฉพาะเมื่อรัน Emulator) Java 11+ สำหรับ Firestore Emulator

## ติดตั้งและรันบนเครื่อง

```bash
npm ci
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

เปิด <http://127.0.0.1:5173/W2HMS-vNext/>

## คำสั่งที่ใช้บ่อย

| คำสั่ง                   | หน้าที่                                                          |
| ---------------------- | ------------------------------------------------------------- |
| `npm run dev`          | Dev server                                                    |
| `npm run typecheck`    | ตรวจชนิดข้อมูล (TypeScript strict)                               |
| `npm run lint`         | ESLint (typescript-eslint strict + กฎกัน XSS)                  |
| `npm run format:check` | ตรวจรูปแบบโค้ดด้วย Prettier (`npm run format` เพื่อแก้)             |
| `npm test`             | Unit tests (Vitest + Testing Library)                         |
| `npm run build`        | Typecheck + production build ไปที่ `dist/` (ไม่ deploy)          |
| `npm run preview`      | เปิด build ที่ <http://127.0.0.1:4173/W2HMS-vNext/>              |
| `npm run check`        | รันทุกขั้นตอนข้างบนตามลำดับ                                         |
| `npm run emulators`    | Firebase Emulator (Auth + Firestore) ด้วย project `demo-w2hms` |

## Environment Configuration

ค่าทั้งหมดอยู่ใน `.env.example` ให้คัดลอกเป็น `.env.local` (ไฟล์นี้ถูก git ignore)

- ทุกตัวแปร `VITE_*` **ถูกฝังในไฟล์ JavaScript สาธารณะ** ห้ามใส่ความลับใด ๆ
- `src/config/env.ts` ตรวจและแปลงค่าเป็นชนิดที่ถูกต้อง ค่าผิดรูปแบบจะหยุดทำงานทันที
- Phase 1 ใช้ Emulator และ project ID ที่ขึ้นต้นด้วย `demo-` เท่านั้น
  (`src/lib/firebase.ts` ปฏิเสธการเชื่อมต่อ project จริง)

## GitHub Pages Build (ยังไม่ deploy)

- Base path: `/W2HMS-vNext/` (ปรับได้ด้วย `VITE_BASE_PATH` ต้องขึ้นต้นและลงท้ายด้วย `/`)
- Routing: `HashRouter` (`#/path`) เพราะ GitHub Pages ไม่มี server-side fallback
- `public/.nojekyll` ปิดการประมวลผล Jekyll
- CSP ผ่าน `<meta>` ที่ฉีดเข้า `dist/index.html` ตอน build เท่านั้น (ดู `vite.config.ts`) เพราะ GitHub Pages ตั้ง HTTP header เองไม่ได้ และ dev server ต้องใช้ inline style สำหรับ hot reload
- ผลลัพธ์อยู่ที่ `dist/` · ยังไม่มี workflow สำหรับ deploy

## Firebase Emulator (เฉพาะเครื่อง)

```bash
npm run emulators
```

- ใช้ `firebase-tools` ผ่าน `npx` (ไม่ติดตั้งเป็น dependency)
- `.firebaserc` ชี้ไปที่ `demo-w2hms` ซึ่งเป็น demo project ที่ไม่ติดต่อ Firebase จริง
- `firestore.rules` เป็น **placeholder แบบ deny-all** สำหรับ Emulator เท่านั้น ไม่ใช่ Rules สำหรับใช้งานจริง
- Emulator UI: <http://127.0.0.1:4000>

## โครงสร้างโปรเจกต์

```
.
├── index.html                 # entry HTML
├── public/.nojekyll
├── src/
│   ├── main.tsx               # bootstrap + HashRouter
│   ├── app/App.tsx            # layout + routes
│   ├── pages/                 # หน้าจอ (Home, NotFound)
│   ├── config/env.ts          # อ่านและตรวจ environment
│   ├── lib/firebase.ts        # Firebase factory (Phase 1: emulator เท่านั้น)
│   ├── styles/global.css
│   └── test/setup.ts
├── firebase.json              # Emulator config
├── .firebaserc                # demo-w2hms
├── firestore.rules            # placeholder deny-all
├── firestore.indexes.json
├── vite.config.ts             # build + CSP (build only) + Vitest
├── eslint.config.js
└── tsconfig*.json
```

## ข้อห้ามด้านความปลอดภัย

- ห้าม commit ข้อมูลจริง ข้อมูลกำลังพล ข้อมูลสุขภาพ เบอร์โทร หรือข้อมูลอ่อนไหว (ใช้ข้อมูลสมมติเท่านั้น)
- ห้าม commit API secret, private key, service account หรือ credential ใด ๆ
- ห้ามเชื่อมต่อ Firebase project จริงจนกว่าจะได้รับอนุมัติ
- ห้ามใช้ `dangerouslySetInnerHTML` หรือ `innerHTML` (ESLint บังคับ)
