import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { CalendarInvitationRepository } from '@/domain/repositories/calendar-invitation-repository';
import { UserRepository } from '@/domain/repositories/user-repository';
import { CalendarInvitationService } from '@/domain/services/calendar-invitation-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const inviteToken = searchParams.get('state'); // We pass invite token as state

  if (!code || !inviteToken) {
    return NextResponse.redirect(new URL(`/invite/${inviteToken ?? ''}?error=no_code`, request.url));
  }

  const supabase = await createSupabaseServerClient();

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(new URL(`/invite/${inviteToken}?error=exchange_failed`, request.url));
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.redirect(new URL(`/invite/${inviteToken}?error=no_session`, request.url));
  }

  // Accept the invitation with Google tokens
  const invRepo = new CalendarInvitationRepository(supabaseAdmin);
  const userRepo = new UserRepository(supabaseAdmin);
  const service = new CalendarInvitationService(invRepo, userRepo);

  try {
    await service.acceptInvitation(inviteToken, {
      googleAccessToken: session.provider_token ?? '',
      googleRefreshToken: session.provider_refresh_token ?? '',
    });

    return NextResponse.redirect(new URL(`/invite/${inviteToken}?success=true`, request.url));
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'unknown';
    return NextResponse.redirect(new URL(`/invite/${inviteToken}?error=${encodeURIComponent(msg)}`, request.url));
  }
}
