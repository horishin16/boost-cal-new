import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { UserRepository } from '@/domain/repositories/user-repository';
import { CalendarInvitationRepository } from '@/domain/repositories/calendar-invitation-repository';
import { CalendarInvitationService } from '@/domain/services/calendar-invitation-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await request.json();
  const { googleAccessToken, googleRefreshToken } = body;

  if (!googleAccessToken || !googleRefreshToken) {
    return NextResponse.json(
      { message: 'Googleトークンが必要です', error: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const userRepo = new UserRepository(supabaseAdmin);
  const invRepo = new CalendarInvitationRepository(supabaseAdmin);
  const service = new CalendarInvitationService(invRepo, userRepo);

  try {
    const result = await service.acceptInvitation(token, {
      googleAccessToken,
      googleRefreshToken,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('見つかりません')) {
        return NextResponse.json(
          { message: error.message, error: 'INVITATION_NOT_FOUND' },
          { status: 404 }
        );
      }
      if (error.message.includes('有効期限')) {
        return NextResponse.json(
          { message: error.message, error: 'INVITATION_EXPIRED' },
          { status: 410 }
        );
      }
      if (error.message.includes('受諾済み')) {
        return NextResponse.json(
          { message: error.message, error: 'ALREADY_ACCEPTED' },
          { status: 409 }
        );
      }
    }
    throw error;
  }
}
