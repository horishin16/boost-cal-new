import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/domain/services/auth-service';
import { UserRepository } from '@/domain/repositories/user-repository';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createSupabaseServerClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.email) {
    return NextResponse.json(
      { message: '未認証です', error: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const userRepo = new UserRepository(supabaseAdmin);
  const authService = new AuthService(userRepo);

  const user = await authService.syncProviderTokens({
    email: session.user.email,
    name: session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? session.user.email,
    googleId: session.user.user_metadata?.provider_id ?? session.user.id,
    accessToken: session.provider_token ?? '',
    refreshToken: session.provider_refresh_token ?? '',
  });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    hasGoogleToken: authService.hasValidGoogleToken(user),
  });
}
