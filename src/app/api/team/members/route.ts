import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { UserRepository } from '@/domain/repositories/user-repository';

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json(
      { message: '未認証です', error: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? undefined;
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? '50'), 100);

  const userRepo = new UserRepository(supabaseAdmin);
  const { data, total } = await userRepo.searchMembers({ query: q, page, pageSize });

  return NextResponse.json({
    data: data.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      linked: u.accessToken ? (u.role === 'GUEST' ? 'external' : true) : false,
    })),
    total,
    page,
    pageSize,
  });
}
