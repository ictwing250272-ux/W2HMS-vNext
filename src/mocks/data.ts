/**
 * Deterministic SYNTHETIC data for the UI prototype.
 *
 * Every name, phone number and licence plate here is fictional and generated
 * from fixed patterns ("ทดสอบ", "000-000-xxxx", "ทดสอบ xxxx"). No data is taken
 * from the legacy system or any real person.
 */
import { emptyGrants, normaliseUser, presetGrants } from '../app/permissions';
import type {
  AccessRequest,
  AgeGroup,
  AppUser,
  Building,
  CareLimitation,
  HealthAggregate,
  MaintenanceTicket,
  MockDataset,
  Person,
  PersonnelHealth,
  Room,
  RoomStatus,
  Stay,
  StayMember,
  Vehicle,
  Zone,
} from './types';

/** Small seeded PRNG (mulberry32) so the dataset is identical on every load. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: readonly T[], random: () => number): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) {
    throw new Error('pick() called with an empty list');
  }
  return item;
}

const AGE_GROUPS: readonly AgeGroup[] = [
  'child',
  'child',
  'youth',
  'adult',
  'adult',
  'adult',
  'adult',
  'senior',
  'unknown',
];

const pad = (n: number, width: number) => String(n).padStart(width, '0');

const RANKS = ['พล.อ.ต.', 'น.อ.', 'น.ท.', 'น.ต.', 'ร.อ.', 'ร.ท.', 'พ.อ.อ.', 'พ.อ.ท.', 'จ.อ.'];
const UNITS = ['หน่วยทดสอบ 1', 'หน่วยทดสอบ 2', 'หน่วยทดสอบ 3', 'หน่วยทดสอบ 4'];
const ROOM_TYPES = ['ห้องแถว', 'แฟลต', 'บ้านเดี่ยว'];
const TICKET_CATEGORIES = ['ประปา', 'ไฟฟ้า', 'โครงสร้าง', 'เครื่องใช้', 'อื่น ๆ'];
const RELATIONS = ['คู่สมรส', 'บุตร', 'บุตร', 'บิดา/มารดา', 'ญาติ'];
const ROOM_NOTES = ['', '', '', 'ตรวจสภาพห้องแล้ว (ทดสอบ)', 'รอเปลี่ยนมิเตอร์ (ทดสอบ)'];
/** Placeholder condition codes: the real list (H-1) is TBD. */
export const HEALTH_CODES = ['TBD-1', 'TBD-2', 'TBD-3'] as const;
const CARE_LIMITATIONS: readonly CareLimitation[] = [
  'bedridden',
  'wheelchair',
  'mobilityAid',
  'needsCaregiver',
  'visualHearing',
];
const BIRTH_YEARS: Record<AgeGroup, [number, number] | null> = {
  child: [2014, 2024],
  youth: [2002, 2013],
  adult: [1967, 2001],
  senior: [1940, 1966],
  unknown: null,
};

const TICKET_TITLES = [
  'ก๊อกน้ำรั่ว',
  'หลอดไฟเสีย',
  'ประตูปิดไม่สนิท',
  'หลังคารั่ว',
  'ปลั๊กไฟชำรุด',
  'ท่อระบายน้ำตัน',
];

export function createMockDataset(seed = 2026): MockDataset {
  const random = createRandom(seed);
  // Separate streams so newer synthetic fields do not shift the original seeded values.
  const ageRandom = createRandom(seed + 1);
  const memberRandom = createRandom(seed + 2);
  const historyRandom = createRandom(seed + 3);
  const healthRandom = createRandom(seed + 4);

  const zones: Zone[] = [
    { id: 'z01', name: 'เขต 1 (ทดสอบ)' },
    { id: 'z02', name: 'เขต 2 (ทดสอบ)' },
    { id: 'z03', name: 'เขต 3 (ทดสอบ)' },
  ];

  // [name, zone, rooms, floors] — housing blocks.
  const buildingSpecs: [string, string, number, number][] = [
    ['A', 'z01', 10, 2],
    ['B', 'z01', 8, 2],
    ['C', 'z02', 12, 3],
    ['D', 'z02', 10, 2],
    ['E', 'z03', 8, 1],
    ['F', 'z03', 6, 2],
  ];

  const buildings: Building[] = buildingSpecs.map(([name, zoneId, roomCount, floors]) => ({
    id: `bld_${name}`,
    name: `อาคาร ${name}`,
    zoneId,
    kind: 'housing',
    floors,
    roomCount,
  }));
  // Office buildings (no rooms). Appended after housing so the seeded room order is unchanged.
  buildings.push(
    { id: 'off_1', name: 'อาคารสำนักงาน 1', zoneId: 'z01', kind: 'office', floors: 3, roomCount: 0 },
    { id: 'off_2', name: 'อาคารสำนักงาน 2', zoneId: 'z02', kind: 'office', floors: 2, roomCount: 0 },
    { id: 'off_3', name: 'อาคารอเนกประสงค์', zoneId: 'z03', kind: 'office', floors: 1, roomCount: 0 },
  );

  const rooms: Room[] = [];
  const people: Person[] = [];
  const stays: Stay[] = [];
  const vehicles: Vehicle[] = [];

  for (const building of buildings) {
    const perFloor = Math.ceil(building.roomCount / building.floors);
    for (let no = 1; no <= building.roomCount; no++) {
      const roll = random();
      const status: RoomStatus =
        roll < 0.62
          ? 'occupied'
          : roll < 0.8
            ? 'vacant'
            : roll < 0.9
              ? 'repair'
              : roll < 0.96
                ? 'unknown'
                : 'closed';
      const roomId = `${building.id}_${pad(no, 3)}`;
      const room: Room = {
        id: roomId,
        buildingId: building.id,
        zoneId: building.zoneId,
        floor: Math.ceil(no / perFloor),
        roomNo: no,
        code: `${building.name.replace('อาคาร ', '')}-${pad(no, 2)}`,
        status,
        type: pick(ROOM_TYPES, random),
        note: ROOM_NOTES[no % ROOM_NOTES.length] ?? '',
        checked: no % 4 !== 0,
        submitted: status === 'occupied' && no % 3 !== 0,
        updatedAt: `2026-10-${pad(1 + (no % 28), 2)}`,
        currentStayId: null,
      };

      if (status === 'occupied') {
        const index = people.length + 1;
        const personId = `per_${pad(index, 3)}`;
        const stayId = `stay_${pad(index, 3)}`;
        people.push({
          id: personId,
          fullName: `ผู้พักทดสอบ ${pad(index, 3)}`,
          rank: pick(RANKS, random),
          unitName: pick(UNITS, random),
        });
        // Draw order (checkIn, then memberCount) is kept stable so the seeded dataset does not shift.
        const checkIn = `2025-${pad(1 + Math.floor(random() * 12), 2)}-${pad(1 + Math.floor(random() * 28), 2)}`;
        const memberCount = Math.floor(random() * 5);
        stays.push({
          id: stayId,
          roomId,
          personId,
          status: 'active',
          checkIn,
          checkOut: null,
          phone: `000-000-${pad(index, 4)}`,
          memberCount,
          memberAgeGroups: Array.from({ length: memberCount }, () => pick(AGE_GROUPS, ageRandom)),
        });
        room.currentStayId = stayId;

        const vehicleCount = random() < 0.25 ? 2 : random() < 0.8 ? 1 : 0;
        for (let v = 0; v < vehicleCount; v++) {
          const vIndex = vehicles.length + 1;
          vehicles.push({
            id: `veh_${pad(vIndex, 3)}`,
            stayId,
            roomId,
            personId,
            type: random() < 0.6 ? 'car' : 'motorcycle',
            plate: `ทดสอบ ${pad(vIndex, 4)}`,
            province: 'จังหวัดทดสอบ',
          });
        }
      }
      rooms.push(room);
    }
  }

  // Past (ended) stays for the room history tab. Former occupants are synthetic too.
  let formerIndex = 500;
  for (const room of rooms) {
    const count = historyRandom() < 0.55 ? 1 + Math.floor(historyRandom() * 2) : 0;
    for (let h = 0; h < count; h++) {
      formerIndex += 1;
      const personId = `per_${pad(formerIndex, 3)}`;
      people.push({
        id: personId,
        fullName: `ผู้พักทดสอบ ${pad(formerIndex, 3)}`,
        rank: pick(RANKS, historyRandom),
        unitName: pick(UNITS, historyRandom),
      });
      const year = 2021 + h * 2;
      stays.push({
        id: `stay_${pad(formerIndex, 3)}`,
        roomId: room.id,
        personId,
        status: 'ended',
        checkIn: `${String(year)}-${pad(1 + Math.floor(historyRandom() * 12), 2)}-01`,
        checkOut: `${String(year + 1)}-${pad(1 + Math.floor(historyRandom() * 12), 2)}-15`,
        phone: `000-000-${pad(formerIndex, 4)}`,
        memberCount: 0,
        memberAgeGroups: [],
      });
    }
  }

  // stayMembers (C3): one record per co-resident of an active stay. No health keys.
  const stayMembers: StayMember[] = [];
  for (const stay of stays.filter((s) => s.status === 'active')) {
    stay.memberAgeGroups.forEach((age, i) => {
      const range = BIRTH_YEARS[age];
      stayMembers.push({
        id: `mem_${stay.id.slice(5)}_${String(i + 1)}`,
        stayId: stay.id,
        roomId: stay.roomId,
        name: `สมาชิกทดสอบ ${stay.id.slice(5)}-${String(i + 1)}`,
        relation: pick(RELATIONS, memberRandom),
        birthYear:
          range === null ? null : range[0] + Math.floor(memberRandom() * (range[1] - range[0] + 1)),
      });
    });
  }

  // personnelHealth (H-S2): separate collection, one document per subject per stay.
  const personnelHealth: PersonnelHealth[] = [];
  const addHealth = (stay: Stay, subjectType: 'occupant' | 'member', subjectId: string) => {
    const codes = [pick(HEALTH_CODES, healthRandom)];
    if (healthRandom() < 0.3) codes.push(pick(HEALTH_CODES, healthRandom));
    const limits = healthRandom() < 0.35 ? [pick(CARE_LIMITATIONS, healthRandom)] : [];
    personnelHealth.push({
      id: `${stay.id}_${subjectId}`,
      stayId: stay.id,
      roomId: stay.roomId,
      subjectType,
      subjectId,
      conditionCodes: [...new Set(codes)],
      careLimitations: limits,
    });
  };
  for (const stay of stays.filter((s) => s.status === 'active')) {
    if (healthRandom() < 0.2) addHealth(stay, 'occupant', stay.personId);
    for (const m of stayMembers.filter((x) => x.stayId === stay.id)) {
      if (healthRandom() < 0.12) addHealth(stay, 'member', m.id);
    }
  }

  const tickets: MaintenanceTicket[] = [];
  const ticketStatuses = ['open', 'open', 'inProgress', 'done', 'cancelled'] as const;
  for (let i = 1; i <= 18; i++) {
    const room = pick(rooms, random);
    tickets.push({
      id: `mt_${pad(i, 3)}`,
      roomId: room.id,
      category: pick(TICKET_CATEGORIES, random),
      title: pick(TICKET_TITLES, random),
      status: pick(ticketStatuses, random),
      openedAt: `2026-${pad(1 + Math.floor(random() * 10), 2)}-${pad(1 + Math.floor(random() * 28), 2)}`,
    });
  }

  const users: AppUser[] = [
    user('u_sa1', 'ผู้ดูแลสูงสุด ทดสอบ 1', 'superAdmin', { healthAccess: true }),
    user('u_sa2', 'ผู้ดูแลสูงสุด ทดสอบ 2', 'superAdmin', {}),
    user('u_st1', 'เจ้าหน้าที่ ทดสอบ 1', 'staff', { healthAccess: true, preset: 'supervisor' }),
    user('u_st2', 'เจ้าหน้าที่ ทดสอบ 2', 'staff', { preset: 'operator' }),
    user('u_st3', 'เจ้าหน้าที่ ทดสอบ 3', 'staff', { preset: 'readOnly' }),
    user('u_st4', 'เจ้าหน้าที่ ทดสอบ 4', 'staff', { preset: 'operator', suspended: true }),
    user('u_vw1', 'ผู้บังคับบัญชา ทดสอบ 1', 'viewer', { commanderGroup: true }),
    user('u_vw2', 'ผู้ใช้อ่านอย่างเดียว ทดสอบ 2', 'viewer', {}),
  ];

  const accessRequests: AccessRequest[] = [
    {
      uid: 'u_rq1',
      fullName: 'ผู้ขอใช้งาน ทดสอบ 1',
      requestedRole: 'staff',
      status: 'pending',
      createdAt: '2026-11-10',
    },
    {
      uid: 'u_rq2',
      fullName: 'ผู้ขอใช้งาน ทดสอบ 2',
      requestedRole: 'viewer',
      status: 'pending',
      createdAt: '2026-11-12',
    },
    {
      uid: 'u_rq3',
      fullName: 'ผู้ขอใช้งาน ทดสอบ 3',
      requestedRole: 'staff',
      status: 'rejected',
      createdAt: '2026-11-01',
    },
  ];

  // Aggregate counts only (H-5), derived from personnelHealth. Labels are placeholders (H-1 TBD).
  const healthAggregates: HealthAggregate[] = [
    ...HEALTH_CODES.map((code) => ({
      label: `กลุ่มโรค ${code}`,
      count: personnelHealth.filter((h) => h.conditionCodes.includes(code)).length,
    })),
    {
      label: 'มีข้อจำกัดการดูแล',
      count: personnelHealth.filter((h) => h.careLimitations.length > 0).length,
    },
  ];

  return {
    zones,
    buildings,
    rooms,
    people,
    stays,
    stayMembers,
    personnelHealth,
    vehicles,
    tickets,
    users,
    accessRequests,
    healthAggregates,
  };
}

function user(
  uid: string,
  displayName: string,
  role: AppUser['role'],
  options: { healthAccess?: boolean; commanderGroup?: boolean; preset?: string; suspended?: boolean },
): AppUser {
  return normaliseUser({
    uid,
    displayName,
    email: `${uid}@example.test`,
    role,
    status: options.suspended === true ? 'suspended' : 'approved',
    healthAccess: options.healthAccess ?? false,
    commanderGroup: options.commanderGroup ?? false,
    grants: options.preset === undefined ? emptyGrants() : presetGrants(options.preset),
  });
}

export const mockData: MockDataset = createMockDataset();
