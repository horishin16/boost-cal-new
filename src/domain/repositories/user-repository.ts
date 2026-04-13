import type { SupabaseClient } from '@supabase/supabase-js';
import type { User, CreateUserInput, UpdateTokensInput } from '@/domain/models/user';

interface UserRow {
  id: string;
  email: string;
  name: string;
  domain: string;
  google_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    domain: row.domain,
    googleId: row.google_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    role: row.role as User['role'],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class UserRepository {
  constructor(private db: SupabaseClient) {}

  async create(input: CreateUserInput): Promise<User> {
    const { data, error } = await this.db
      .from('users')
      .insert({
        email: input.email,
        name: input.name,
        domain: input.domain,
        google_id: input.googleId ?? null,
        access_token: input.accessToken ?? null,
        refresh_token: input.refreshToken ?? null,
        role: input.role ?? 'MEMBER',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return toUser(data);
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.db
      .from('users')
      .select()
      .eq('email', email)
      .single();

    if (error) return null;
    return toUser(data);
  }

  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.db
      .from('users')
      .select()
      .eq('id', id)
      .single();

    if (error) return null;
    return toUser(data);
  }

  async updateTokens(id: string, input: UpdateTokensInput): Promise<User> {
    const { data, error } = await this.db
      .from('users')
      .update({
        access_token: input.accessToken,
        refresh_token: input.refreshToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return toUser(data);
  }

  async upsertByEmail(input: CreateUserInput): Promise<User> {
    const existing = await this.findByEmail(input.email);

    if (existing) {
      const { data, error } = await this.db
        .from('users')
        .update({
          name: input.name,
          google_id: input.googleId ?? existing.googleId,
          access_token: input.accessToken ?? existing.accessToken,
          refresh_token: input.refreshToken ?? existing.refreshToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return toUser(data);
    }

    return this.create(input);
  }

  async searchMembers(params: {
    query?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: User[]; total: number }> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.db
      .from('users')
      .select('*', { count: 'exact' });

    if (params.query) {
      query = query.or(
        `name.ilike.%${params.query}%,email.ilike.%${params.query}%`
      );
    }

    const { data, error, count } = await query
      .order('name')
      .range(from, to);

    if (error) throw new Error(error.message);
    return {
      data: (data as UserRow[]).map(toUser),
      total: count ?? 0,
    };
  }

  async getTokensByIds(ids: string[]): Promise<Pick<User, 'id' | 'accessToken' | 'refreshToken' | 'domain'>[]> {
    if (ids.length === 0) return [];

    const { data, error } = await this.db
      .from('users')
      .select('id, access_token, refresh_token, domain')
      .in('id', ids);

    if (error) throw new Error(error.message);
    return (data as { id: string; access_token: string | null; refresh_token: string | null; domain: string }[]).map((row) => ({
      id: row.id,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      domain: row.domain,
    }));
  }
}
