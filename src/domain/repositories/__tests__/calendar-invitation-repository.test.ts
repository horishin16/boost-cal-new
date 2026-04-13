import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarInvitationRepository } from '../calendar-invitation-repository';

function createMockSupabaseClient() {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    from: vi.fn(() => chainable),
    _chain: chainable,
  };
}

describe('CalendarInvitationRepository', () => {
  let repo: CalendarInvitationRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repo = new CalendarInvitationRepository(mockClient as any);
  });

  describe('create', () => {
    it('should insert an invitation and return it', async () => {
      const dbRow = {
        id: 'inv-1',
        token: 'abc123',
        email: 'guest@gmail.com',
        inviter_id: 'user-1',
        status: 'PENDING',
        created_at: '2026-04-10T00:00:00Z',
        expires_at: '2026-04-17T00:00:00Z',
      };

      mockClient._chain.single.mockResolvedValue({ data: dbRow, error: null });

      const result = await repo.create({
        token: 'abc123',
        email: 'guest@gmail.com',
        inviterId: 'user-1',
        expiresAt: new Date('2026-04-17'),
      });

      expect(mockClient.from).toHaveBeenCalledWith('calendar_invitations');
      expect(mockClient._chain.insert).toHaveBeenCalledWith({
        token: 'abc123',
        email: 'guest@gmail.com',
        inviter_id: 'user-1',
        status: 'PENDING',
        expires_at: expect.any(String),
      });
      expect(result.id).toBe('inv-1');
      expect(result.status).toBe('PENDING');
    });

    it('should throw on database error', async () => {
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: { message: 'duplicate token' },
      });

      await expect(
        repo.create({
          token: 'dup',
          email: 'x@y.com',
          inviterId: 'u1',
          expiresAt: new Date(),
        })
      ).rejects.toThrow('duplicate token');
    });
  });

  describe('findByToken', () => {
    it('should return invitation when found', async () => {
      const dbRow = {
        id: 'inv-1',
        token: 'abc123',
        email: 'guest@gmail.com',
        inviter_id: 'user-1',
        status: 'PENDING',
        created_at: '2026-04-10T00:00:00Z',
        expires_at: '2026-04-17T00:00:00Z',
      };

      mockClient._chain.single.mockResolvedValue({ data: dbRow, error: null });

      const result = await repo.findByToken('abc123');
      expect(result).not.toBeNull();
      expect(result!.token).toBe('abc123');
      expect(result!.email).toBe('guest@gmail.com');
    });

    it('should return null when not found', async () => {
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await repo.findByToken('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update the invitation status', async () => {
      const dbRow = {
        id: 'inv-1',
        token: 'abc123',
        email: 'guest@gmail.com',
        inviter_id: 'user-1',
        status: 'ACCEPTED',
        created_at: '2026-04-10T00:00:00Z',
        expires_at: '2026-04-17T00:00:00Z',
      };

      mockClient._chain.single.mockResolvedValue({ data: dbRow, error: null });

      const result = await repo.updateStatus('inv-1', 'ACCEPTED');

      expect(mockClient._chain.update).toHaveBeenCalledWith({ status: 'ACCEPTED' });
      expect(mockClient._chain.eq).toHaveBeenCalledWith('id', 'inv-1');
      expect(result.status).toBe('ACCEPTED');
    });
  });
});
