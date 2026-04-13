import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../auth-service';
import type { User } from '@/domain/models/user';
import type { UserRepository } from '@/domain/repositories/user-repository';

function createMockUserRepository(): UserRepository {
  return {
    create: vi.fn(),
    findByEmail: vi.fn(),
    findById: vi.fn(),
    updateTokens: vi.fn(),
    upsertByEmail: vi.fn(),
  } as unknown as UserRepository;
}

const ALLOWED_DOMAINS = ['boostconsulting.co.jp', 'boostcapital.co.jp'];

describe('AuthService', () => {
  let service: AuthService;
  let mockRepo: ReturnType<typeof createMockUserRepository>;

  beforeEach(() => {
    mockRepo = createMockUserRepository();
    service = new AuthService(mockRepo);
  });

  describe('validateDomain', () => {
    it('should return true for boostconsulting.co.jp', () => {
      expect(service.validateDomain('user@boostconsulting.co.jp')).toBe(true);
    });

    it('should return true for boostcapital.co.jp', () => {
      expect(service.validateDomain('user@boostcapital.co.jp')).toBe(true);
    });

    it('should return false for unauthorized domain', () => {
      expect(service.validateDomain('user@gmail.com')).toBe(false);
    });

    it('should return false for empty email', () => {
      expect(service.validateDomain('')).toBe(false);
    });

    it('should return false for malformed email', () => {
      expect(service.validateDomain('not-an-email')).toBe(false);
    });
  });

  describe('syncProviderTokens', () => {
    it('should upsert user with tokens and return user', async () => {
      const mockUser: User = {
        id: 'uuid-1',
        email: 'tanaka@boostconsulting.co.jp',
        name: '田中 太郎',
        domain: 'boostconsulting.co.jp',
        googleId: 'google-123',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepo.upsertByEmail).mockResolvedValue(mockUser);

      const result = await service.syncProviderTokens({
        email: 'tanaka@boostconsulting.co.jp',
        name: '田中 太郎',
        googleId: 'google-123',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      expect(mockRepo.upsertByEmail).toHaveBeenCalledWith({
        email: 'tanaka@boostconsulting.co.jp',
        name: '田中 太郎',
        domain: 'boostconsulting.co.jp',
        googleId: 'google-123',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw for unauthorized domain', async () => {
      await expect(
        service.syncProviderTokens({
          email: 'user@gmail.com',
          name: 'User',
          googleId: 'g-1',
          accessToken: 'a',
          refreshToken: 'r',
        })
      ).rejects.toThrow('許可されていないドメインです');
    });
  });

  describe('getCurrentUser', () => {
    it('should return user when found', async () => {
      const mockUser: User = {
        id: 'uuid-1',
        email: 'tanaka@boostconsulting.co.jp',
        name: '田中 太郎',
        domain: 'boostconsulting.co.jp',
        googleId: null,
        accessToken: null,
        refreshToken: null,
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepo.findById).mockResolvedValue(mockUser);

      const result = await service.getCurrentUser('uuid-1');
      expect(result).toEqual(mockUser);
      expect(mockRepo.findById).toHaveBeenCalledWith('uuid-1');
    });

    it('should return null when user not found', async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      const result = await service.getCurrentUser('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('hasValidGoogleToken', () => {
    it('should return true when user has access token', () => {
      const user: User = {
        id: 'uuid-1',
        email: 'tanaka@boostconsulting.co.jp',
        name: '田中',
        domain: 'boostconsulting.co.jp',
        googleId: 'g-1',
        accessToken: 'some-token',
        refreshToken: 'some-refresh',
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(service.hasValidGoogleToken(user)).toBe(true);
    });

    it('should return false when user has no access token', () => {
      const user: User = {
        id: 'uuid-1',
        email: 'tanaka@boostconsulting.co.jp',
        name: '田中',
        domain: 'boostconsulting.co.jp',
        googleId: null,
        accessToken: null,
        refreshToken: null,
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(service.hasValidGoogleToken(user)).toBe(false);
    });
  });
});
