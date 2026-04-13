import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScheduleLinkRepository } from '../schedule-link-repository';

function createMockSupabaseClient() {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: undefined as unknown,
  };
  // For queries that return arrays (no .single())
  let resolvedData: unknown = [];
  chainable.order = vi.fn().mockImplementation(() => ({
    ...chainable,
    then: (resolve: (val: { data: unknown; error: null }) => void) =>
      resolve({ data: resolvedData, error: null }),
  }));

  return {
    from: vi.fn(() => chainable),
    _chain: chainable,
    _setListData(data: unknown) {
      resolvedData = data;
    },
  };
}

describe('ScheduleLinkRepository', () => {
  let repo: ScheduleLinkRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repo = new ScheduleLinkRepository(mockClient as any);
  });

  describe('findByOwnerId', () => {
    it('should return list of schedule links for the owner', async () => {
      const rows = [
        {
          id: 'link-1',
          name: '30分ミーティング',
          slug: 'tanaka-30min',
          duration: 30,
          is_active: true,
          settings: {
            participants: { internalIds: ['u1', 'u2'], externalEmails: ['a@b.com'] },
          },
          created_at: '2026-04-10T00:00:00Z',
        },
        {
          id: 'link-2',
          name: '60分面談',
          slug: 'tanaka-60min',
          duration: 60,
          is_active: true,
          settings: {
            participants: { internalIds: [], externalEmails: [] },
          },
          created_at: '2026-04-09T00:00:00Z',
        },
      ];

      mockClient._setListData(rows);

      const links = await repo.findByOwnerId('owner-1');

      expect(mockClient.from).toHaveBeenCalledWith('schedule_links');
      expect(mockClient._chain.select).toHaveBeenCalledWith(
        'id, name, slug, duration, is_active, settings, created_at'
      );
      expect(mockClient._chain.eq).toHaveBeenCalledWith('owner_id', 'owner-1');
      expect(links).toHaveLength(2);
      expect(links[0].name).toBe('30分ミーティング');
      expect(links[0].participantCount).toBe(3); // 2 internal + 1 external
      expect(links[1].participantCount).toBe(0);
    });

    it('should return empty array when no links found', async () => {
      mockClient._setListData([]);

      const links = await repo.findByOwnerId('owner-no-links');
      expect(links).toHaveLength(0);
    });
  });

  describe('deleteById', () => {
    it('should delete the link by id and owner_id', async () => {
      mockClient._chain.eq = vi.fn().mockReturnThis();
      // Chain: delete().eq('id', ...).eq('owner_id', ...)
      // We need eq to be called twice and then resolve
      const eqMock = vi.fn()
        .mockReturnValueOnce(mockClient._chain) // first .eq('id', ...)
        .mockResolvedValueOnce({ data: null, error: null }); // second .eq('owner_id', ...)
      mockClient._chain.eq = eqMock;

      await repo.deleteById('link-1', 'owner-1');

      expect(mockClient.from).toHaveBeenCalledWith('schedule_links');
      expect(mockClient._chain.delete).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('id', 'link-1');
      expect(eqMock).toHaveBeenCalledWith('owner_id', 'owner-1');
    });

    it('should throw when delete fails', async () => {
      mockClient._chain.eq = vi.fn()
        .mockReturnValueOnce(mockClient._chain)
        .mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

      await expect(repo.deleteById('bad-id', 'owner-1')).rejects.toThrow('not found');
    });
  });

  describe('create', () => {
    it('should insert a schedule link and return the full record', async () => {
      const dbRow = {
        id: 'link-new',
        name: '30分ミーティング',
        description: 'テスト説明',
        slug: 'tanaka-30min',
        duration: 30,
        owner_id: 'owner-1',
        is_active: true,
        settings: { timezone: 'Asia/Tokyo' },
        created_at: '2026-04-10T00:00:00Z',
        updated_at: '2026-04-10T00:00:00Z',
      };

      mockClient._chain.single.mockResolvedValue({ data: dbRow, error: null });

      const result = await repo.create({
        name: '30分ミーティング',
        description: 'テスト説明',
        slug: 'tanaka-30min',
        duration: 30,
        ownerId: 'owner-1',
        settings: { timezone: 'Asia/Tokyo' } as any,
      });

      expect(mockClient.from).toHaveBeenCalledWith('schedule_links');
      expect(mockClient._chain.insert).toHaveBeenCalledWith({
        name: '30分ミーティング',
        description: 'テスト説明',
        slug: 'tanaka-30min',
        duration: 30,
        owner_id: 'owner-1',
        settings: { timezone: 'Asia/Tokyo' },
      });
      expect(result.id).toBe('link-new');
      expect(result.name).toBe('30分ミーティング');
      expect(result.slug).toBe('tanaka-30min');
    });

    it('should throw on database error', async () => {
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: { message: 'duplicate slug' },
      });

      await expect(
        repo.create({
          name: 'test',
          slug: 'dup',
          duration: 30,
          ownerId: 'o1',
          settings: {} as any,
        })
      ).rejects.toThrow('duplicate slug');
    });
  });

  describe('update', () => {
    it('should update and return the updated record', async () => {
      const dbRow = {
        id: 'link-1',
        name: '更新後タイトル',
        description: null,
        slug: 'updated-slug',
        duration: 60,
        owner_id: 'owner-1',
        is_active: true,
        settings: { timezone: 'Asia/Tokyo' },
        created_at: '2026-04-10T00:00:00Z',
        updated_at: '2026-04-10T01:00:00Z',
      };

      const eqMock = vi.fn()
        .mockReturnValueOnce(mockClient._chain)
        .mockReturnValueOnce(mockClient._chain);
      mockClient._chain.eq = eqMock;
      mockClient._chain.single.mockResolvedValue({ data: dbRow, error: null });

      const result = await repo.update('link-1', 'owner-1', {
        name: '更新後タイトル',
        slug: 'updated-slug',
        duration: 60,
        settings: { timezone: 'Asia/Tokyo' } as any,
      });

      expect(mockClient._chain.update).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('id', 'link-1');
      expect(eqMock).toHaveBeenCalledWith('owner_id', 'owner-1');
      expect(result.name).toBe('更新後タイトル');
    });
  });

  describe('findById', () => {
    it('should return a schedule link by id', async () => {
      const dbRow = {
        id: 'link-1',
        name: 'テストリンク',
        description: '説明',
        slug: 'test-link',
        duration: 30,
        owner_id: 'owner-1',
        is_active: true,
        settings: { timezone: 'Asia/Tokyo' },
        created_at: '2026-04-10T00:00:00Z',
        updated_at: '2026-04-10T00:00:00Z',
      };

      mockClient._chain.single.mockResolvedValue({ data: dbRow, error: null });

      const result = await repo.findById('link-1', 'owner-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('link-1');
      expect(result!.ownerId).toBe('owner-1');
    });

    it('should return null when not found', async () => {
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await repo.findById('bad-id', 'owner-1');
      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should return a link when slug exists', async () => {
      const dbRow = {
        id: 'link-1',
        name: 'テストリンク',
        description: null,
        slug: 'test-slug',
        duration: 30,
        owner_id: 'owner-1',
        is_active: true,
        settings: {},
        created_at: '2026-04-10T00:00:00Z',
        updated_at: '2026-04-10T00:00:00Z',
      };

      mockClient._chain.single.mockResolvedValue({ data: dbRow, error: null });

      const result = await repo.findBySlug('test-slug');
      expect(result).not.toBeNull();
      expect(result!.slug).toBe('test-slug');
    });

    it('should return null when slug not found', async () => {
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await repo.findBySlug('nonexistent');
      expect(result).toBeNull();
    });
  });
});
