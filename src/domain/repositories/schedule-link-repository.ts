import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ScheduleLink,
  ScheduleLinkListItem,
  LinkSettings,
} from '@/domain/models/schedule-link';

interface ScheduleLinkRow {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  duration: number;
  owner_id: string;
  is_active: boolean;
  settings: LinkSettings;
  created_at: string;
  updated_at: string;
}

interface ScheduleLinkListRow {
  id: string;
  name: string;
  slug: string;
  duration: number;
  is_active: boolean;
  settings: LinkSettings;
  created_at: string;
}

function toScheduleLink(row: ScheduleLinkRow): ScheduleLink {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    slug: row.slug,
    duration: row.duration,
    ownerId: row.owner_id,
    isActive: row.is_active,
    settings: row.settings,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toListItem(row: ScheduleLinkListRow): ScheduleLinkListItem {
  const participants = row.settings?.participants;
  const internalCount = participants?.internalIds?.length ?? 0;
  const externalCount = participants?.externalEmails?.length ?? 0;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    duration: row.duration,
    isActive: row.is_active,
    participantCount: internalCount + externalCount,
    createdAt: new Date(row.created_at),
  };
}

export interface CreateScheduleLinkData {
  name: string;
  description?: string | null;
  slug: string;
  duration: number;
  ownerId: string;
  settings: LinkSettings;
}

export interface UpdateScheduleLinkData {
  name?: string;
  description?: string | null;
  slug?: string;
  duration?: number;
  settings?: LinkSettings;
}

export class ScheduleLinkRepository {
  constructor(private db: SupabaseClient) {}

  async create(input: CreateScheduleLinkData): Promise<ScheduleLink> {
    const { data, error } = await this.db
      .from('schedule_links')
      .insert({
        name: input.name,
        description: input.description ?? null,
        slug: input.slug,
        duration: input.duration,
        owner_id: input.ownerId,
        settings: input.settings,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return toScheduleLink(data);
  }

  async update(
    id: string,
    ownerId: string,
    input: UpdateScheduleLinkData
  ): Promise<ScheduleLink> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.duration !== undefined) updateData.duration = input.duration;
    if (input.settings !== undefined) updateData.settings = input.settings;

    const { data, error } = await this.db
      .from('schedule_links')
      .update(updateData)
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return toScheduleLink(data);
  }

  async findById(id: string, ownerId: string): Promise<ScheduleLink | null> {
    const { data, error } = await this.db
      .from('schedule_links')
      .select()
      .eq('id', id)
      .eq('owner_id', ownerId)
      .single();

    if (error) return null;
    return toScheduleLink(data);
  }

  async findBySlug(slug: string): Promise<ScheduleLink | null> {
    const { data, error } = await this.db
      .from('schedule_links')
      .select()
      .eq('slug', slug)
      .single();

    if (error) return null;
    return toScheduleLink(data);
  }

  async findActiveBySlug(slug: string): Promise<ScheduleLink | null> {
    const { data, error } = await this.db
      .from('schedule_links')
      .select()
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) return null;
    return toScheduleLink(data);
  }

  async findByOwnerId(ownerId: string): Promise<ScheduleLinkListItem[]> {
    const { data, error } = await this.db
      .from('schedule_links')
      .select('id, name, slug, duration, is_active, settings, created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data as ScheduleLinkListRow[]).map(toListItem);
  }

  async deleteById(id: string, ownerId: string): Promise<void> {
    const { error } = await this.db
      .from('schedule_links')
      .delete()
      .eq('id', id)
      .eq('owner_id', ownerId);

    if (error) throw new Error(error.message);
  }
}
