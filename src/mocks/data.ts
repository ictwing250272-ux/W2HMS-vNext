/**
 * Deterministic SYNTHETIC data for the UI prototype.
 *
 * Every name, phone number and licence plate here is fictional and generated
 * from fixed patterns ("ทดสอบ", "000-000-xxxx", "ทดสอบ xxxx"). No data is taken
 * from the legacy system or any real person.
 */
import type {
  AccessRequest,
  AgeGroup,
  AppUser,
  Building,
  HealthAggregate,
  MaintenanceTicket,
  MockDataset,
  Person,
  Room,
  RoomStatus,
  Stay,
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
  // Separate stream so adding co-resident ages does not change the other generated values.
  const ageRandom = createRandom(seed + 1);

  const zones: Zone[] = [
    { id: 'z01', name: 'เขต 1 (ทดสอบ)' },
    { id: 'z02', name: 'เขต 2 (ทดสอบ)' },
    { id: 'z03', name: 'เขต 3 (ทดสอบ)' },
  ];

  const buildingSpecs: [string, string, number][] = [
    ['A', 'z01', 10],
    ['B', 'z01', 8],
    ['C', 'z02', 12],
    ['D', 'z02', 10],
    ['E', 'z03', 8],
    ['F', 'z03', 6],
  ];

  const buildings: Building[] = buildingSpecs.map(([name, zoneId, roomCount]) => ({
    id: `bld_${name}`,
    name: `อาคาร ${name}`,
    zoneId,
    kind: 'block',
    roomCount,
  }));

  const rooms: Room[] = [];
  const people: Person[] = [];
  const stays: Stay[] = [];
  const vehicles: Vehicle[] = [];

  for (const building of buildings) {
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
        roomNo: no,
        code: `${building.name.replace('อาคาร ', '')}-${pad(no, 2)}`,
        status,
        type: pick(ROOM_TYPES, random),
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
    user('u_sa1', 'ผู้ดูแลสูงสุด ทดสอบ', 'superAdmin', true, true),
    user('u_sa2', 'ผู้ดูแลสูงสุด ทดสอบ 2', 'superAdmin', false, false),
    user('u_ad1', 'ผู้ดูแล ทดสอบ', 'admin', true, true),
    user('u_ad2', 'ผู้ดูแล ทดสอบ 2', 'admin', false, false),
    user('u_of1', 'เจ้าหน้าที่ ทดสอบ', 'officer', true, true),
    user('u_of2', 'เจ้าหน้าที่ ทดสอบ 2', 'officer', false, false),
    user('u_vw1', 'ผู้บังคับบัญชา ทดสอบ', 'viewer', false, false),
    { ...user('u_of3', 'เจ้าหน้าที่ ทดสอบ 3', 'officer', false, false), status: 'suspended' },
  ];

  const accessRequests: AccessRequest[] = [
    {
      uid: 'u_rq1',
      fullName: 'ผู้ขอใช้งาน ทดสอบ 1',
      requestedRole: 'officer',
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
      requestedRole: 'officer',
      status: 'rejected',
      createdAt: '2026-11-01',
    },
  ];

  // Aggregate counts only (H-5). Labels are placeholders: the condition list (H-1) is TBD.
  const healthAggregates: HealthAggregate[] = [
    { label: 'กลุ่มโรค TBD-1', count: 7 },
    { label: 'กลุ่มโรค TBD-2', count: 4 },
    { label: 'กลุ่มโรค TBD-3', count: 2 },
    { label: 'มีข้อจำกัดการดูแล', count: 3 },
  ];

  return {
    zones,
    buildings,
    rooms,
    people,
    stays,
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
  healthAccess: boolean,
  canExport: boolean,
): AppUser {
  return {
    uid,
    displayName,
    email: `${uid}@example.test`,
    role,
    status: 'approved',
    healthAccess: role === 'viewer' ? false : healthAccess,
    canExport: role === 'viewer' ? false : canExport,
  };
}

export const mockData: MockDataset = createMockDataset();
