import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CalendarInvitation,
  CreateInvitationInput,
  InvitationStatus,
} from '@/domain/models/calendar-invitation';

interface InvitationRow {
  id: string;
  token: string;
  email: string;
  inviter_id: string;
  status: string;
  created_at: string;
  expires_at: string;
}

function toInvitation(row: InvitationRow): CalendarInvitation {
  return {
    id: row.id,
    token: row.token,
    email: row.email,
    inviterId: row.inviter_id,
    status: row.status as InvitationStatus,
    createdAt: new Date(row.created_at),
    expiresAt: new Date(row.expires_at),
  };
}

export class CalendarInvitationRepository {
  constructor(private db: SupabaseClient) {}

  async create(input: CreateInvitationInput): Promise<CalendarInvitation> {
    const { data, error } = await this.db
      .from('calendar_invitations')
      .insert({
        token: input.token,
        email: input.email,
        inviter_id: input.inviterId,
        status: 'PENDING',
        expires_at: input.expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return toInvitation(data);
  }

  async findByToken(token: string): Promise<CalendarInvitation | null> {
    const { data, error } = await this.db
      .from('calendar_invitations')
      .select()
      .eq('token', token)
      .single();

    if (error) return null;
    return toInvitation(data);
  }

  async updateStatus(
    id: string,
    status: InvitationStatus
  ): Promise<CalendarInvitation> {
    const { data, error } = await this.db
      .from('calendar_invitations')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return toInvitation(data);
  }
}
