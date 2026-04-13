import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { ScheduleLinkService } from '@/domain/services/schedule-link-service';
import { ScheduleLinkRepository } from '@/domain/repositories/schedule-link-repository';
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
  const slug = searchParams.get('slug');
  const excludeId = searchParams.get('excludeId') ?? undefined;

  if (!slug) {
    return NextResponse.json(
      { message: 'slugパラメータが必要です', error: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const linkRepo = new ScheduleLinkRepository(supabaseAdmin);
  const service = new ScheduleLinkService(linkRepo);

  const available = await service.checkSlugAvailability(slug, excludeId);

  return NextResponse.json({ available });
}
