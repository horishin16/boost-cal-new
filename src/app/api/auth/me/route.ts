import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthService } from '@/domain/services/auth-service';
import { UserRepository } from '@/domain/repositories/user-repository';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json(
      { message: '未認証です', error: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const userRepo = new UserRepository(supabaseAdmin);
  const authService = new AuthService(userRepo);

  const user = await authService.getCurrentUser(authUser.id);

  // If user not in our DB yet, try finding by email
  if (!user && authUser.email) {
    const userByEmail = await userRepo.findByEmail(authUser.email);
    if (userByEmail) {
      return NextResponse.json({
        id: userByEmail.id,
        email: userByEmail.email,
        name: userByEmail.name,
        domain: userByEmail.domain,
        role: userByEmail.role,
        hasGoogleToken: authService.hasValidGoogleToken(userByEmail),
      });
    }
  }

  if (!user) {
    return NextResponse.json(
      { message: '未認証です', error: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    domain: user.domain,
    role: user.role,
    hasGoogleToken: authService.hasValidGoogleToken(user),
  });
}
