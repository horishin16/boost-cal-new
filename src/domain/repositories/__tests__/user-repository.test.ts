import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRepository } from '../user-repository';
import type { CreateUserInput } from '@/domain/models/user';

function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  return {
    from: vi.fn(() => chainable),
    _chain: chainable,
  };
}

describe('UserRepository', () => {
  let repo: UserRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repo = new UserRepository(mockClient as any);
  });

  describe('create', () => {
    it('should insert a user and return the created user', async () => {
      const input: CreateUserInput = {
        email: 'tanaka@boostconsulting.co.jp',
        name: '田中 太郎',
        domain: 'boostconsulting.co.jp',
        googleId: 'google-123',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      const dbRow = {
        id: 'uuid-1',
        email: input.email,
        name: input.name,
        domain: input.domain,
        google_id: input.googleId,
        access_token: input.accessToken,
        refresh_token: input.refreshToken,
        role: 'MEMBER',
        created_at: '2026-04-10T00:00:00Z',
        updated_at: '2026-04-10T00:00:00Z',
      };

      mockClient._chain.single.mockResolvedValue({ data: dbRow, error: null });

      const user = await repo.create(input);

      expect(mockClient.from).toHaveBeenCalledWith('users');
      expect(mockClient._chain.insert).toHaveBeenCalledWith({
        email: input.email,
        name: input.name,
        domain: input.domain,
        google_id: input.googleId,
        access_token: input.accessToken,
        refresh_token: input.refreshToken,
        role: 'MEMBER',
      });
      expect(user.id).toBe('uuid-1');
      expect(user.email).toBe(input.email);
      expect(user.name).toBe(input.name);
      expect(user.googleId).toBe(input.googleId);
    });

    it('should throw on database error', async () => {
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: { message: 'duplicate key' },
      });

      await expect(
        repo.create({
          email: 'test@boostconsulting.co.jp',
          name: 'テスト',
          domain: 'boostconsulting.co.jp',
        })
      ).rejects.toThrow('duplicate key');
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const dbRow = {
        id: 'uuid-1',
        email: 'tanaka@boostconsulting.co.jp',
        name: '田中 太郎',
        domain: 'boostconsulting.co.jp',
        google_id: 'google-123',
        access_token: 'token',
        refresh_token: 'refresh',
        role: 'MEMBER',
        created_at: '2026-04-10T00:00:00Z',
        updated_at: '2026-04-10T00:00:00Z',
      };

      mockClient._chain.single.mockResolvedValue({ data: dbRow, error: null });

      const user = await repo.findByEmail('tanaka@boostconsulting.co.jp');

      expect(user).not.toBeNull();
      expect(user!.email).toBe('tanaka@boostconsulting.co.jp');
      expect(user!.googleId).toBe('google-123');
    });

    it('should return null when not found', async () => {
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const user = await repo.findByEmail('unknown@example.com');
      expect(user).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      const dbRow = {
        id: 'uuid-1',
        email: 'tanaka@boostconsulting.co.jp',
        name: '田中 太郎',
        domain: 'boostconsulting.co.jp',
        google_id: null,
        access_token: null,
        refresh_token: null,
        role: 'MEMBER',
        created_at: '2026-04-10T00:00:00Z',
        updated_at: '2026-04-10T00:00:00Z',
      };

      mockClient._chain.single.mockResolvedValue({ data: dbRow, error: null });

      const user = await repo.findById('uuid-1');
      expect(user).not.toBeNull();
      expect(user!.id).toBe('uuid-1');
    });
  });

  describe('updateTokens', () => {
    it('should update access_token and refresh_token', async () => {
      const dbRow = {
        id: 'uuid-1',
        email: 'tanaka@boostconsulting.co.jp',
        name: '田中 太郎',
        domain: 'boostconsulting.co.jp',
        google_id: 'google-123',
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        role: 'MEMBER',
        created_at: '2026-04-10T00:00:00Z',
        updated_at: '2026-04-10T01:00:00Z',
      };

      mockClient._chain.single.mockResolvedValue({ data: dbRow, error: null });

      const user = await repo.updateTokens('uuid-1', {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      expect(mockClient._chain.update).toHaveBeenCalledWith({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        updated_at: expect.any(String),
      });
      expect(user.accessToken).toBe('new-access');
      expect(user.refreshToken).toBe('new-refresh');
    });
  });

  describe('upsertByEmail', () => {
    it('should update existing user if found', async () => {
      const existingRow = {
        id: 'uuid-1',
        email: 'tanaka@boostconsulting.co.jp',
        name: '田中 太郎',
        domain: 'boostconsulting.co.jp',
        google_id: 'google-123',
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        role: 'MEMBER',
        created_at: '2026-04-10T00:00:00Z',
        updated_at: '2026-04-10T01:00:00Z',
      };

      // findByEmail returns existing user
      mockClient._chain.single
        .mockResolvedValueOnce({ data: existingRow, error: null }) // findByEmail
        .mockResolvedValueOnce({ data: existingRow, error: null }); // update

      const user = await repo.upsertByEmail({
        email: 'tanaka@boostconsulting.co.jp',
        name: '田中 太郎',
        domain: 'boostconsulting.co.jp',
        googleId: 'google-123',
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
      });

      expect(user.id).toBe('uuid-1');
    });

    it('should create new user if not found', async () => {
      const newRow = {
        id: 'uuid-new',
        email: 'new@boostconsulting.co.jp',
        name: '新規ユーザー',
        domain: 'boostconsulting.co.jp',
        google_id: 'google-new',
        access_token: 'token',
        refresh_token: 'refresh',
        role: 'MEMBER',
        created_at: '2026-04-10T00:00:00Z',
        updated_at: '2026-04-10T00:00:00Z',
      };

      // findByEmail returns null (not found)
      mockClient._chain.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // findByEmail
        .mockResolvedValueOnce({ data: newRow, error: null }); // create

      const user = await repo.upsertByEmail({
        email: 'new@boostconsulting.co.jp',
        name: '新規ユーザー',
        domain: 'boostconsulting.co.jp',
        googleId: 'google-new',
        accessToken: 'token',
        refreshToken: 'refresh',
      });

      expect(user.id).toBe('uuid-new');
    });
  });

  describe('searchMembers', () => {
    it('should search members by keyword', async () => {
      const rows = [
        {
          id: 'u1',
          email: 'tanaka@boostconsulting.co.jp',
          name: '田中 太郎',
          domain: 'boostconsulting.co.jp',
          google_id: 'g1',
          access_token: 'tk',
          refresh_token: 'rt',
          role: 'MEMBER',
          created_at: '2026-04-10T00:00:00Z',
          updated_at: '2026-04-10T00:00:00Z',
        },
      ];

      // searchMembers uses ilike which chains differently
      const orMock = vi.fn().mockReturnThis();
      const rangeMock = vi.fn().mockResolvedValue({ data: rows, error: null, count: 1 });
      mockClient._chain.select = vi.fn().mockReturnValue({
        or: orMock,
        range: rangeMock,
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({ range: rangeMock }),
      });

      // We'll just verify the method exists and returns mapped data
      const result = await repo.searchMembers({ query: '田中', page: 1, pageSize: 50 });

      expect(mockClient.from).toHaveBeenCalledWith('users');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('田中 太郎');
    });
  });
});
