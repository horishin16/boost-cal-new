import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingService } from '../booking-service';
import type { BookingRepository } from '@/domain/repositories/booking-repository';
import type { ScheduleLinkRepository } from '@/domain/repositories/schedule-link-repository';
import type { ScheduleLink, LinkSettings } from '@/domain/models/schedule-link';
import type { Booking } from '@/domain/models/booking';

function createMockBookingRepo(): BookingRepository {
  return {
    create: vi.fn(),
    checkOverlap: vi.fn(),
    createParticipants: vi.fn(),
  } as unknown as BookingRepository;
}

function createMockLinkRepo(): ScheduleLinkRepository {
  return {
    findActiveBySlug: vi.fn(),
  } as unknown as ScheduleLinkRepository;
}

const mockSettings: LinkSettings = {
  weekdayTimeSlots: { '1': [{ start: '09:00', end: '17:00' }] },
  excludeHolidays: true,
  dateOverrides: {},
  allowedDurations: [30],
  participants: { internalIds: ['user-1'], externalEmails: [] },
  meetingOptions: {
    allowOnline: true,
    allowInPersonOffice: true,
    allowInPersonVisit: false,
    bufferOnline: 0,
    bufferInPersonOffice: 0,
    bufferInPersonVisit: 60,
  },
  timezone: 'Asia/Tokyo',
};

const mockLink: ScheduleLink = {
  id: 'link-1',
  name: '30分ミーティング',
  description: 'テスト',
  slug: 'tanaka-30min',
  duration: 30,
  ownerId: 'owner-1',
  isActive: true,
  settings: mockSettings,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('BookingService', () => {
  let service: BookingService;
  let mockBookingRepo: ReturnType<typeof createMockBookingRepo>;
  let mockLinkRepo: ReturnType<typeof createMockLinkRepo>;

  beforeEach(() => {
    mockBookingRepo = createMockBookingRepo();
    mockLinkRepo = createMockLinkRepo();
    service = new BookingService(mockBookingRepo, mockLinkRepo);
  });

  describe('createBooking', () => {
    it('should create a booking successfully', async () => {
      vi.mocked(mockLinkRepo.findActiveBySlug).mockResolvedValue(mockLink);
      vi.mocked(mockBookingRepo.checkOverlap).mockResolvedValue(false);
      vi.mocked(mockBookingRepo.create).mockResolvedValue({
        id: 'booking-1',
        scheduleLinkId: 'link-1',
        clientName: '山本 太郎',
        clientEmail: 'yamamoto@client.com',
        startTime: new Date('2026-04-13T10:00:00+09:00'),
        endTime: new Date('2026-04-13T10:30:00+09:00'),
        eventTitle: '30分ミーティング - 山本 太郎',
        meetingUrl: null,
        meetingMode: 'online',
        conferenceRoomId: null,
        locationName: null,
        locationAddress: null,
        status: 'CONFIRMED',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Booking);
      vi.mocked(mockBookingRepo.createParticipants).mockResolvedValue(undefined);

      const result = await service.createBooking('tanaka-30min', {
        clientName: '山本 太郎',
        clientEmail: 'yamamoto@client.com',
        startTime: '2026-04-13T10:00:00+09:00',
        endTime: '2026-04-13T10:30:00+09:00',
        meetingMode: 'online',
      });

      expect(result.id).toBe('booking-1');
      expect(result.status).toBe('CONFIRMED');
      expect(mockBookingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduleLinkId: 'link-1',
          clientName: '山本 太郎',
          eventTitle: '30分ミーティング - 山本 太郎',
        })
      );
      // Should create participants for link's internal participants
      expect(mockBookingRepo.createParticipants).toHaveBeenCalledWith('booking-1', ['user-1']);
    });

    it('should throw when link not found', async () => {
      vi.mocked(mockLinkRepo.findActiveBySlug).mockResolvedValue(null);

      await expect(
        service.createBooking('nonexistent', {
          clientName: 'test',
          clientEmail: 'test@test.com',
          startTime: '2026-04-13T10:00:00+09:00',
          endTime: '2026-04-13T10:30:00+09:00',
          meetingMode: 'online',
        })
      ).rejects.toThrow('リンクが見つかりません');
    });

    it('should throw on double booking', async () => {
      vi.mocked(mockLinkRepo.findActiveBySlug).mockResolvedValue(mockLink);
      vi.mocked(mockBookingRepo.checkOverlap).mockResolvedValue(true);

      await expect(
        service.createBooking('tanaka-30min', {
          clientName: 'test',
          clientEmail: 'test@test.com',
          startTime: '2026-04-13T10:00:00+09:00',
          endTime: '2026-04-13T10:30:00+09:00',
          meetingMode: 'online',
        })
      ).rejects.toThrow('この時間帯は既に予約されています');
    });

    it('should use custom meeting URL when provided', async () => {
      vi.mocked(mockLinkRepo.findActiveBySlug).mockResolvedValue(mockLink);
      vi.mocked(mockBookingRepo.checkOverlap).mockResolvedValue(false);
      vi.mocked(mockBookingRepo.create).mockResolvedValue({
        id: 'booking-2',
        meetingUrl: 'https://zoom.us/custom',
        status: 'CONFIRMED',
      } as Booking);
      vi.mocked(mockBookingRepo.createParticipants).mockResolvedValue(undefined);

      await service.createBooking('tanaka-30min', {
        clientName: 'test',
        clientEmail: 'test@test.com',
        startTime: '2026-04-13T10:00:00+09:00',
        endTime: '2026-04-13T10:30:00+09:00',
        meetingMode: 'online',
        customMeetingUrl: 'https://zoom.us/custom',
      });

      expect(mockBookingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          meetingUrl: 'https://zoom.us/custom',
        })
      );
    });
  });

  describe('generateEventTitle', () => {
    it('should generate title from link name and client name', () => {
      const title = service.generateEventTitle('30分ミーティング', '山本 太郎');
      expect(title).toBe('30分ミーティング - 山本 太郎');
    });
  });
});
