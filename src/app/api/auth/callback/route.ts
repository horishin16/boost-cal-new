import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/domain/services/auth-service';
import { UserRepository } from '@/domain/repositories/user-repository';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  const supabase = await createSupabaseServerClient();

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(new URL('/login?error=exchange_failed', request.url));
  }

  // Get the session with provider tokens
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.redirect(new URL('/login?error=no_session', request.url));
  }

  const email = session.user.email;
  if (!email) {
    return NextResponse.redirect(new URL('/login?error=no_email', request.url));
  }

  // Validate domain
  const userRepo = new UserRepository(supabaseAdmin);
  const authService = new AuthService(userRepo);

  if (!authService.validateDomain(email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=domain_not_allowed', request.url));
  }

  // Sync provider tokens to users table
  await authService.syncProviderTokens({
    email,
    name: session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? email,
    googleId: session.user.user_metadata?.provider_id ?? session.user.id,
    accessToken: session.provider_token ?? '',
    refreshToken: session.provider_refresh_token ?? '',
  });

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
