import type { ScheduleLink, ScheduleLinkListItem, LinkSettings } from '@/domain/models/schedule-link';
import type { ScheduleLinkRepository } from '@/domain/repositories/schedule-link-repository';

function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface CreateLinkInput {
  name: string;
  description?: string | null;
  slug?: string | null;
  duration: number;
  settings: LinkSettings;
}

interface UpdateLinkInput {
  name: string;
  description?: string | null;
  slug?: string | null;
  duration: number;
  settings: LinkSettings;
}

export class ScheduleLinkService {
  constructor(private scheduleLinkRepository: ScheduleLinkRepository) {}

  async getMyLinks(ownerId: string): Promise<ScheduleLinkListItem[]> {
    return this.scheduleLinkRepository.findByOwnerId(ownerId);
  }

  async deleteLink(linkId: string, ownerId: string): Promise<void> {
    await this.scheduleLinkRepository.deleteById(linkId, ownerId);
  }

  async createLink(ownerId: string, input: CreateLinkInput): Promise<ScheduleLink> {
    const slug = input.slug || generateSlug();

    // Check slug uniqueness
    const existing = await this.scheduleLinkRepository.findBySlug(slug);
    if (existing) {
      throw new Error('このスラッグは既に使用されています');
    }

    return this.scheduleLinkRepository.create({
      name: input.name,
      description: input.description,
      slug,
      duration: input.duration,
      ownerId,
      settings: input.settings,
    });
  }

  async updateLink(
    linkId: string,
    ownerId: string,
    input: UpdateLinkInput
  ): Promise<ScheduleLink> {
    const slug = input.slug || undefined;

    // Check slug uniqueness (exclude self)
    if (slug) {
      const existing = await this.scheduleLinkRepository.findBySlug(slug);
      if (existing && existing.id !== linkId) {
        throw new Error('このスラッグは既に使用されています');
      }
    }

    return this.scheduleLinkRepository.update(linkId, ownerId, {
      name: input.name,
      description: input.description,
      slug,
      duration: input.duration,
      settings: input.settings,
    });
  }

  async getLink(linkId: string, ownerId: string): Promise<ScheduleLink | null> {
    return this.scheduleLinkRepository.findById(linkId, ownerId);
  }

  async checkSlugAvailability(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await this.scheduleLinkRepository.findBySlug(slug);
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    return false;
  }
}
