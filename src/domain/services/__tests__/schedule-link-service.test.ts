import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScheduleLinkService } from '../schedule-link-service';
import type { ScheduleLinkRepository } from '@/domain/repositories/schedule-link-repository';
import type { ScheduleLink, ScheduleLinkListItem, LinkSettings } from '@/domain/models/schedule-link';

const mockSettings: LinkSettings = {
  weekdayTimeSlots: { '1': [{ start: '09:00', end: '18:00' }] },
  excludeHolidays: true,
  dateOverrides: {},
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
};

function createMockRepo(): ScheduleLinkRepository {
  return {
    findByOwnerId: vi.fn(),
    deleteById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
  } as unknown as ScheduleLinkRepository;
}

describe('ScheduleLinkService', () => {
  let service: ScheduleLinkService;
  let mockRepo: ReturnType<typeof createMockRepo>;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new ScheduleLinkService(mockRepo);
  });

  describe('getMyLinks', () => {
    it('should return links for the given user', async () => {
      const links: ScheduleLinkListItem[] = [
        {
          id: 'link-1',
          name: '30分ミーティング',
          slug: 'tanaka-30min',
          duration: 30,
          isActive: true,
          participantCount: 3,
          createdAt: new Date('2026-04-10'),
        },
      ];

      vi.mocked(mockRepo.findByOwnerId).mockResolvedValue(links);

      const result = await service.getMyLinks('owner-1');

      expect(mockRepo.findByOwnerId).toHaveBeenCalledWith('owner-1');
      expect(result).toEqual(links);
    });

    it('should return empty array when no links', async () => {
      vi.mocked(mockRepo.findByOwnerId).mockResolvedValue([]);

      const result = await service.getMyLinks('owner-no-links');
      expect(result).toHaveLength(0);
    });
  });

  describe('deleteLink', () => {
    it('should delete the link for the owner', async () => {
      vi.mocked(mockRepo.deleteById).mockResolvedValue(undefined);

      await service.deleteLink('link-1', 'owner-1');

      expect(mockRepo.deleteById).toHaveBeenCalledWith('link-1', 'owner-1');
    });

    it('should propagate errors from repository', async () => {
      vi.mocked(mockRepo.deleteById).mockRejectedValue(new Error('not found'));

      await expect(service.deleteLink('bad-id', 'owner-1')).rejects.toThrow('not found');
    });
  });

  describe('createLink', () => {
    it('should create a link with provided slug', async () => {
      const created: ScheduleLink = {
        id: 'link-new',
        name: '30分ミーティング',
        description: null,
        slug: 'my-slug',
        duration: 30,
        ownerId: 'owner-1',
        isActive: true,
        settings: mockSettings,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepo.findBySlug).mockResolvedValue(null);
      vi.mocked(mockRepo.create).mockResolvedValue(created);

      const result = await service.createLink('owner-1', {
        name: '30分ミーティング',
        slug: 'my-slug',
        duration: 30,
        settings: mockSettings,
      });

      expect(result.slug).toBe('my-slug');
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '30分ミーティング',
          slug: 'my-slug',
          ownerId: 'owner-1',
        })
      );
    });

    it('should auto-generate slug when not provided', async () => {
      const created: ScheduleLink = {
        id: 'link-new',
        name: 'テスト',
        description: null,
        slug: expect.any(String) as unknown as string,
        duration: 30,
        ownerId: 'owner-1',
        isActive: true,
        settings: mockSettings,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepo.findBySlug).mockResolvedValue(null);
      vi.mocked(mockRepo.create).mockResolvedValue(created);

      await service.createLink('owner-1', {
        name: 'テスト',
        duration: 30,
        settings: mockSettings,
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: expect.stringMatching(/^[a-z0-9-]+$/),
        })
      );
    });

    it('should throw when slug already exists', async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue({
        id: 'existing',
        slug: 'taken-slug',
      } as ScheduleLink);

      await expect(
        service.createLink('owner-1', {
          name: 'テスト',
          slug: 'taken-slug',
          duration: 30,
          settings: mockSettings,
        })
      ).rejects.toThrow('このスラッグは既に使用されています');
    });
  });

  describe('updateLink', () => {
    it('should update and return the link', async () => {
      const updated: ScheduleLink = {
        id: 'link-1',
        name: '更新タイトル',
        description: null,
        slug: 'updated',
        duration: 60,
        ownerId: 'owner-1',
        isActive: true,
        settings: mockSettings,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepo.findBySlug).mockResolvedValue(null);
      vi.mocked(mockRepo.update).mockResolvedValue(updated);

      const result = await service.updateLink('link-1', 'owner-1', {
        name: '更新タイトル',
        slug: 'updated',
        duration: 60,
        settings: mockSettings,
      });

      expect(result.name).toBe('更新タイトル');
      expect(mockRepo.update).toHaveBeenCalledWith('link-1', 'owner-1', expect.any(Object));
    });

    it('should throw when slug conflicts with another link', async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue({
        id: 'other-link',
        slug: 'conflict',
      } as ScheduleLink);

      await expect(
        service.updateLink('link-1', 'owner-1', {
          name: 'test',
          slug: 'conflict',
          duration: 30,
          settings: mockSettings,
        })
      ).rejects.toThrow('このスラッグは既に使用されています');
    });

    it('should allow same slug when editing own link', async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue({
        id: 'link-1',
        slug: 'same-slug',
      } as ScheduleLink);
      vi.mocked(mockRepo.update).mockResolvedValue({
        id: 'link-1',
        slug: 'same-slug',
      } as ScheduleLink);

      const result = await service.updateLink('link-1', 'owner-1', {
        name: 'test',
        slug: 'same-slug',
        duration: 30,
        settings: mockSettings,
      });

      expect(result.id).toBe('link-1');
    });
  });

  describe('getLink', () => {
    it('should return the link detail', async () => {
      const link: ScheduleLink = {
        id: 'link-1',
        name: 'テストリンク',
        description: '説明',
        slug: 'test-link',
        duration: 30,
        ownerId: 'owner-1',
        isActive: true,
        settings: mockSettings,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepo.findById).mockResolvedValue(link);

      const result = await service.getLink('link-1', 'owner-1');
      expect(result).toEqual(link);
      expect(mockRepo.findById).toHaveBeenCalledWith('link-1', 'owner-1');
    });

    it('should return null when not found', async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      const result = await service.getLink('bad-id', 'owner-1');
      expect(result).toBeNull();
    });
  });

  describe('checkSlugAvailability', () => {
    it('should return true when slug is available', async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue(null);

      const result = await service.checkSlugAvailability('new-slug');
      expect(result).toBe(true);
    });

    it('should return false when slug is taken', async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue({ id: 'existing' } as ScheduleLink);

      const result = await service.checkSlugAvailability('taken-slug');
      expect(result).toBe(false);
    });

    it('should return true when slug belongs to excluded id', async () => {
      vi.mocked(mockRepo.findBySlug).mockResolvedValue({ id: 'link-1' } as ScheduleLink);

      const result = await service.checkSlugAvailability('my-slug', 'link-1');
      expect(result).toBe(true);
    });
  });
});
