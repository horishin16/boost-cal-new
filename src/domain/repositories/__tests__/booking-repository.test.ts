import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingRepository } from '../booking-repository';

function createMockSupabaseClient() {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  let listData: unknown[] = [];
  // For list queries
  chainable.gt = vi.fn().mockImplementation(() => ({
    ...chainable,
    then: (resolve: (val: { data: unknown; error: null }) => void) =>
      resolve({ data: listData, error: null }),
  }));

  return {
    from: vi.fn(() => chainable),
    _chain: chainable,
    _setListData(data: unknown[]) { listData = data; },
  };
}

describe('BookingRepository', () => {
  let repo: BookingRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repo = new BookingRepository(mockClient as any);
  });

  describe('create', () => {
    it('should insert a booking and return it', async () => {
      const dbRow = {
        id: 'booking-1',
        schedule_link_id: 'link-1',
        client_name: '山本 太郎',
        client_email: 'yamamoto@client.com',
        start_time: '2026-04-15T10:00:00+09:00',
        end_time: '2026-04-15T10:30:00+09:00',
        event_title: '30分ミーティング - 山本 太郎',
        meeting_url: 'https://meet.google.com/xxx',
        meeting_mode: 'online',
        conference_room_id: null,
        location_name: null,
        location_address: null,
        status: 'CONFIRMED',
        notes: 'テスト',
        created_at: '2026-04-15T00:00:00Z',
        updated_at: '2026-04-15T00:00:00Z',
      };

      mockClient._chain.single.mockResolvedValue({ data: dbRow, error: null });

      const result = await repo.create({
        scheduleLinkId: 'link-1',
        clientName: '山本 太郎',
        clientEmail: 'yamamoto@client.com',
        startTime: new Date('2026-04-15T10:00:00+09:00'),
        endTime: new Date('2026-04-15T10:30:00+09:00'),
        eventTitle: '30分ミーティング - 山本 太郎',
        meetingUrl: 'https://meet.google.com/xxx',
        meetingMode: 'online',
        notes: 'テスト',
      });

      expect(mockClient.from).toHaveBeenCalledWith('bookings');
      expect(result.id).toBe('booking-1');
      expect(result.clientName).toBe('山本 太郎');
      expect(result.status).toBe('CONFIRMED');
    });
  });

  describe('checkOverlap', () => {
    it('should return true when overlapping booking exists', async () => {
      mockClient._setListData([{ id: 'existing' }]);

      const result = await repo.checkOverlap(
        'link-1',
        new Date('2026-04-15T10:00:00+09:00'),
        new Date('2026-04-15T10:30:00+09:00')
      );

      expect(result).toBe(true);
    });

    it('should return false when no overlap', async () => {
      mockClient._setListData([]);

      const result = await repo.checkOverlap(
        'link-1',
        new Date('2026-04-15T10:00:00+09:00'),
        new Date('2026-04-15T10:30:00+09:00')
      );

      expect(result).toBe(false);
    });
  });

  describe('createParticipants', () => {
    it('should insert booking participants', async () => {
      mockClient._chain.insert = vi.fn().mockResolvedValue({ data: null, error: null });

      await repo.createParticipants('booking-1', ['user-1', 'user-2']);

      expect(mockClient.from).toHaveBeenCalledWith('booking_participants');
      expect(mockClient._chain.insert).toHaveBeenCalledWith([
        { booking_id: 'booking-1', user_id: 'user-1' },
        { booking_id: 'booking-1', user_id: 'user-2' },
      ]);
    });

    it('should skip when no user ids', async () => {
      await repo.createParticipants('booking-1', []);
      // from should not be called with booking_participants for empty array
      const calls = mockClient.from.mock.calls.filter(
        (c: string[]) => c[0] === 'booking_participants'
      );
      expect(calls).toHaveLength(0);
    });
  });

  describe('findUpcomingConfirmed', () => {
    it('should return confirmed bookings for tomorrow', async () => {
      const rows = [
        {
          id: 'b1',
          schedule_link_id: 'link-1',
          client_name: '山本',
          client_email: 'yamamoto@test.com',
          start_time: '2026-04-16T10:00:00+09:00',
          end_time: '2026-04-16T10:30:00+09:00',
          event_title: 'MTG',
          meeting_url: 'https://meet.google.com/xxx',
          meeting_mode: 'online',
          conference_room_id: null,
          location_name: null,
          location_address: null,
          status: 'CONFIRMED',
          notes: null,
          created_at: '2026-04-15T00:00:00Z',
          updated_at: '2026-04-15T00:00:00Z',
        },
      ];

      mockClient._setListData(rows);
      // Override the chain to handle gte/lt
      mockClient._chain.eq = vi.fn().mockReturnThis();
      const gteMock = vi.fn().mockReturnThis();
      const ltMock = vi.fn().mockImplementation(() => ({
        then: (resolve: (val: { data: unknown; error: null }) => void) =>
          resolve({ data: rows, error: null }),
      }));
      (mockClient._chain as any).gte = gteMock;
      (mockClient._chain as any).lt = ltMock;

      const result = await repo.findUpcomingConfirmed(
        new Date('2026-04-16T00:00:00+09:00'),
        new Date('2026-04-17T00:00:00+09:00')
      );

      expect(mockClient.from).toHaveBeenCalledWith('bookings');
      expect(result).toHaveLength(1);
      expect(result[0].clientName).toBe('山本');
    });
  });

  describe('findParticipantsByBookingIds', () => {
    it('should return participants for given booking ids', async () => {
      const rows = [
        { booking_id: 'b1', user_id: 'u1' },
        { booking_id: 'b1', user_id: 'u2' },
        { booking_id: 'b2', user_id: 'u1' },
      ];

      // Override chain for 'in' query
      const inMock = vi.fn().mockResolvedValue({ data: rows, error: null });
      mockClient._chain.select = vi.fn().mockReturnValue({ in: inMock });

      const result = await repo.findParticipantsByBookingIds(['b1', 'b2']);

      expect(mockClient.from).toHaveBeenCalledWith('booking_participants');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ bookingId: 'b1', userId: 'u1' });
    });

    it('should return empty array for empty input', async () => {
      const result = await repo.findParticipantsByBookingIds([]);
      expect(result).toHaveLength(0);
    });
  });
});
