import { faker } from '@faker-js/faker/locale/ja';

// User Factory
export function createUserData(overrides: Record<string, unknown> = {}) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const domain = faker.helpers.arrayElement([
    'boostconsulting.co.jp',
    'boostcapital.co.jp',
  ]);
  const email = `${lastName.toLowerCase()}.${firstName.toLowerCase()}@${domain}`;

  return {
    id: faker.string.uuid(),
    email,
    name: `${lastName} ${firstName}`,
    domain,
    google_id: faker.string.alpha(21),
    access_token: null,
    refresh_token: null,
    role: 'MEMBER' as const,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

// ScheduleLink Factory
export function createScheduleLinkData(
  ownerId: string,
  overrides: Record<string, unknown> = {}
) {
  const name = faker.helpers.arrayElement([
    '定例ミーティング調整',
    '採用面接スケジュール',
    'クライアントMTG',
    '1on1',
    'プロジェクト打ち合わせ',
  ]);
  const slug = faker.helpers.slugify(faker.lorem.words(3)).toLowerCase();

  return {
    id: faker.string.uuid(),
    name,
    description: faker.lorem.sentence(),
    slug,
    duration: faker.helpers.arrayElement([30, 60, 90]),
    owner_id: ownerId,
    is_active: true,
    settings: {
      weekdayTimeSlots: {
        '0': [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '18:00' }],
        '1': [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '18:00' }],
        '2': [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '18:00' }],
        '3': [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '18:00' }],
        '4': [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '18:00' }],
      },
      excludeHolidays: true,
      allowedDurations: [30, 60],
      participants: { internalIds: [], externalEmails: [] },
      meetingOptions: {
        allowOnline: true,
        allowInPersonOffice: false,
        allowInPersonVisit: false,
        bufferOnline: 0,
        bufferInPersonOffice: 0,
        bufferInPersonVisit: 60,
      },
      timezone: 'Asia/Tokyo',
    },
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

// Booking Factory
export function createBookingData(
  scheduleLinkId: string,
  overrides: Record<string, unknown> = {}
) {
  const startTime = faker.date.future();
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

  return {
    id: faker.string.uuid(),
    schedule_link_id: scheduleLinkId,
    client_name: `${faker.person.lastName()} ${faker.person.firstName()}`,
    client_email: faker.internet.email(),
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    event_title: faker.lorem.words(3),
    meeting_url: 'https://meet.google.com/' + faker.string.alpha(10),
    meeting_mode: 'online',
    conference_room_id: null,
    location_name: null,
    location_address: null,
    status: 'CONFIRMED',
    notes: faker.lorem.sentence(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Batch creators
export function createUsers(count: number, overrides: Record<string, unknown> = {}) {
  return Array.from({ length: count }, () => createUserData(overrides));
}

export function createScheduleLinks(
  count: number,
  ownerId: string,
  overrides: Record<string, unknown> = {}
) {
  return Array.from({ length: count }, () => createScheduleLinkData(ownerId, overrides));
}
