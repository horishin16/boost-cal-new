import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    return NextResponse.json({ message: error.message, error: 'AUTH_ERROR' }, { status: 500 });
  }

  return NextResponse.redirect(data.url);
}
