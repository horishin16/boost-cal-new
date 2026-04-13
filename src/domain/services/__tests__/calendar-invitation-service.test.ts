import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarInvitationService } from '../calendar-invitation-service';
import type { CalendarInvitationRepository } from '@/domain/repositories/calendar-invitation-repository';
import type { UserRepository } from '@/domain/repositories/user-repository';
import type { CalendarInvitation } from '@/domain/models/calendar-invitation';

function createMockInvitationRepo(): CalendarInvitationRepository {
  return {
    create: vi.fn(),
    findByToken: vi.fn(),
    updateStatus: vi.fn(),
  } as unknown as CalendarInvitationRepository;
}

function createMockUserRepo(): UserRepository {
  return {
    findByEmail: vi.fn(),
    upsertByEmail: vi.fn(),
  } as unknown as UserRepository;
}

describe('CalendarInvitationService', () => {
  let service: CalendarInvitationService;
  let mockInvRepo: ReturnType<typeof createMockInvitationRepo>;
  let mockUserRepo: ReturnType<typeof createMockUserRepo>;

  beforeEach(() => {
    mockInvRepo = createMockInvitationRepo();
    mockUserRepo = createMockUserRepo();
    service = new CalendarInvitationService(mockInvRepo, mockUserRepo);
  });

  describe('sendInvitation', () => {
    it('should create invitation with generated token and 7-day expiry', async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

      const invitation: CalendarInvitation = {
        id: 'inv-1',
        token: 'generated-token',
        email: 'guest@gmail.com',
        inviterId: 'user-1',
        status: 'PENDING',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      vi.mocked(mockInvRepo.create).mockResolvedValue(invitation);

      const result = await service.sendInvitation('guest@gmail.com', 'user-1');

      expect(mockInvRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'guest@gmail.com',
          inviterId: 'user-1',
          token: expect.any(String),
          expiresAt: expect.any(Date),
        })
      );
      expect(result.status).toBe('PENDING');
    });

    it('should throw if user is already linked (has access token)', async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue({
        id: 'existing',
        email: 'guest@gmail.com',
        accessToken: 'has-token',
        role: 'GUEST',
      } as any);

      await expect(
        service.sendInvitation('guest@gmail.com', 'user-1')
      ).rejects.toThrow('既にカレンダー連携済みです');
    });
  });

  describe('acceptInvitation', () => {
    it('should accept valid invitation and create guest user', async () => {
      const invitation: CalendarInvitation = {
        id: 'inv-1',
        token: 'valid-token',
        email: 'guest@gmail.com',
        inviterId: 'user-1',
        status: 'PENDING',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
      };

      vi.mocked(mockInvRepo.findByToken).mockResolvedValue(invitation);
      vi.mocked(mockInvRepo.updateStatus).mockResolvedValue({
        ...invitation,
        status: 'ACCEPTED',
      });
      vi.mocked(mockUserRepo.upsertByEmail).mockResolvedValue({
        id: 'guest-user-id',
        email: 'guest@gmail.com',
        name: 'ゲスト',
        role: 'GUEST',
      } as any);

      const result = await service.acceptInvitation('valid-token', {
        googleAccessToken: 'g-access',
        googleRefreshToken: 'g-refresh',
      });

      expect(mockInvRepo.updateStatus).toHaveBeenCalledWith('inv-1', 'ACCEPTED');
      expect(mockUserRepo.upsertByEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'guest@gmail.com',
          role: 'GUEST',
          accessToken: 'g-access',
          refreshToken: 'g-refresh',
        })
      );
      expect(result.userId).toBe('guest-user-id');
      expect(result.status).toBe('ACCEPTED');
    });

    it('should throw when token not found', async () => {
      vi.mocked(mockInvRepo.findByToken).mockResolvedValue(null);

      await expect(
        service.acceptInvitation('bad-token', {
          googleAccessToken: 'a',
          googleRefreshToken: 'r',
        })
      ).rejects.toThrow('招待が見つかりません');
    });

    it('should throw when invitation is expired', async () => {
      const expired: CalendarInvitation = {
        id: 'inv-1',
        token: 'expired-token',
        email: 'guest@gmail.com',
        inviterId: 'user-1',
        status: 'PENDING',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000), // past
      };

      vi.mocked(mockInvRepo.findByToken).mockResolvedValue(expired);

      await expect(
        service.acceptInvitation('expired-token', {
          googleAccessToken: 'a',
          googleRefreshToken: 'r',
        })
      ).rejects.toThrow('招待の有効期限が切れています');
    });

    it('should throw when invitation already accepted', async () => {
      const accepted: CalendarInvitation = {
        id: 'inv-1',
        token: 'accepted-token',
        email: 'guest@gmail.com',
        inviterId: 'user-1',
        status: 'ACCEPTED',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      vi.mocked(mockInvRepo.findByToken).mockResolvedValue(accepted);

      await expect(
        service.acceptInvitation('accepted-token', {
          googleAccessToken: 'a',
          googleRefreshToken: 'r',
        })
      ).rejects.toThrow('この招待は既に受諾済みです');
    });
  });
});
