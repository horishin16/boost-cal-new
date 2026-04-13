import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { UserRepository } from '@/domain/repositories/user-repository';
import { CalendarInvitationRepository } from '@/domain/repositories/calendar-invitation-repository';
import { CalendarInvitationService } from '@/domain/services/calendar-invitation-service';

export async function POST(request: NextRequest) {
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

  if (!user) {
    return NextResponse.json(
      { message: 'ユーザーが見つかりません', error: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { email } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { message: 'メールアドレスが不正です', error: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const invRepo = new CalendarInvitationRepository(supabaseAdmin);
  const service = new CalendarInvitationService(invRepo, userRepo);

  try {
    const invitation = await service.sendInvitation(email, user.id);

    return NextResponse.json(
      {
        data: {
          id: invitation.id,
          email: invitation.email,
          status: invitation.status,
          expiresAt: invitation.expiresAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('連携済み')) {
      return NextResponse.json(
        { message: error.message, error: 'ALREADY_LINKED' },
        { status: 409 }
      );
    }
    throw error;
  }
}
