import { NextResponse } from 'next/server';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { UserRepository } from '@/domain/repositories/user-repository';
import { getConferenceRooms } from '@/lib/google/calendar';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json(
      { message: '未認証です', error: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const userRepo = new UserRepository(supabaseAdmin);
  const user = await userRepo.findByEmail(authUser.email);

  if (!user?.accessToken) {
    return NextResponse.json({ data: [] });
  }

  try {
    const rooms = await getConferenceRooms(user.accessToken, user.refreshToken ?? undefined);
    return NextResponse.json({ data: rooms });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
