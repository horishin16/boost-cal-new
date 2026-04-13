import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReminderService } from '../reminder-service';
import type { BookingRepository } from '@/domain/repositories/booking-repository';
import type { UserRepository } from '@/domain/repositories/user-repository';
import type { Booking } from '@/domain/models/booking';
import type { User } from '@/domain/models/user';

function createMockBookingRepo(): BookingRepository {
  return {
    findUpcomingConfirmed: vi.fn(),
    findParticipantsByBookingIds: vi.fn(),
  } as unknown as BookingRepository;
}

function createMockUserRepo(): UserRepository {
  return {
    findById: vi.fn(),
  } as unknown as UserRepository;
}

describe('ReminderService', () => {
  let service: ReminderService;
  let mockBookingRepo: ReturnType<typeof createMockBookingRepo>;
  let mockUserRepo: ReturnType<typeof createMockUserRepo>;

  beforeEach(() => {
    mockBookingRepo = createMockBookingRepo();
    mockUserRepo = createMockUserRepo();
    service = new ReminderService(mockBookingRepo, mockUserRepo);
  });

  describe('getDailyReminders', () => {
    it('should return reminders for upcoming confirmed bookings', async () => {
      const bookings: Booking[] = [
        {
          id: 'b1',
          scheduleLinkId: 'link-1',
          clientName: '山本 太郎',
          clientEmail: 'yamamoto@test.com',
          startTime: new Date('2026-04-16T10:00:00+09:00'),
          endTime: new Date('2026-04-16T10:30:00+09:00'),
          eventTitle: 'MTG - 山本 太郎',
          meetingUrl: 'https://meet.google.com/xxx',
          meetingMode: 'online',
          conferenceRoomId: null,
          locationName: null,
          locationAddress: null,
          status: 'CONFIRMED',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const participants = [
        { bookingId: 'b1', userId: 'u1' },
        { bookingId: 'b1', userId: 'u2' },
      ];

      const user1: User = {
        id: 'u1',
        email: 'tanaka@boost.co.jp',
        name: '田中',
        domain: 'boost.co.jp',
        googleId: null,
        accessToken: null,
        refreshToken: null,
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user2: User = {
        id: 'u2',
        email: 'sato@boost.co.jp',
        name: '佐藤',
        domain: 'boost.co.jp',
        googleId: null,
        accessToken: null,
        refreshToken: null,
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockBookingRepo.findUpcomingConfirmed).mockResolvedValue(bookings);
      vi.mocked(mockBookingRepo.findParticipantsByBookingIds).mockResolvedValue(participants);
      vi.mocked(mockUserRepo.findById)
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(user2);

      const reminders = await service.getDailyReminders(new Date('2026-04-15'));

      expect(reminders).toHaveLength(1);
      expect(reminders[0].booking.id).toBe('b1');
      expect(reminders[0].recipientEmails).toContain('yamamoto@test.com');
      expect(reminders[0].recipientEmails).toContain('tanaka@boost.co.jp');
      expect(reminders[0].recipientEmails).toContain('sato@boost.co.jp');
    });

    it('should return empty array when no upcoming bookings', async () => {
      vi.mocked(mockBookingRepo.findUpcomingConfirmed).mockResolvedValue([]);

      const reminders = await service.getDailyReminders(new Date('2026-04-15'));
      expect(reminders).toHaveLength(0);
    });

    it('should include client email even without participants', async () => {
      const bookings: Booking[] = [
        {
          id: 'b2',
          scheduleLinkId: 'link-1',
          clientName: 'Guest',
          clientEmail: 'guest@test.com',
          startTime: new Date('2026-04-16T14:00:00+09:00'),
          endTime: new Date('2026-04-16T14:30:00+09:00'),
          eventTitle: 'MTG',
          meetingUrl: null,
          meetingMode: 'online',
          conferenceRoomId: null,
          locationName: null,
          locationAddress: null,
          status: 'CONFIRMED',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(mockBookingRepo.findUpcomingConfirmed).mockResolvedValue(bookings);
      vi.mocked(mockBookingRepo.findParticipantsByBookingIds).mockResolvedValue([]);

      const reminders = await service.getDailyReminders(new Date('2026-04-15'));

      expect(reminders).toHaveLength(1);
      expect(reminders[0].recipientEmails).toEqual(['guest@test.com']);
    });
  });
});
