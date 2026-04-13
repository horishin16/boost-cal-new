import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { ScheduleLinkService } from '@/domain/services/schedule-link-service';
import { ScheduleLinkRepository } from '@/domain/repositories/schedule-link-repository';
import { UserRepository } from '@/domain/repositories/user-repository';
import { createScheduleLinkSchema } from '@/schemas/schedule-link';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json(
      { message: '未認証です', error: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // Find internal user by email to get our user ID
  const userRepo = new UserRepository(supabaseAdmin);
  const user = await userRepo.findByEmail(authUser.email);

  if (!user) {
    return NextResponse.json(
      { message: 'ユーザーが見つかりません', error: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const linkRepo = new ScheduleLinkRepository(supabaseAdmin);
  const service = new ScheduleLinkService(linkRepo);

  const links = await service.getMyLinks(user.id);

  return NextResponse.json({
    data: links.map((link) => ({
      id: link.id,
      name: link.name,
      slug: link.slug,
      duration: link.duration,
      isActive: link.isActive,
      participantCount: link.participantCount,
      createdAt: link.createdAt.toISOString(),
    })),
  });
}

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
  const parsed = createScheduleLinkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: 'バリデーションエラー',
        error: 'VALIDATION_ERROR',
        details: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const linkRepo = new ScheduleLinkRepository(supabaseAdmin);
  const service = new ScheduleLinkService(linkRepo);

  try {
    const link = await service.createLink(user.id, {
      name: parsed.data.name,
      description: parsed.data.description,
      slug: parsed.data.slug,
      duration: parsed.data.duration,
      settings: parsed.data.settings,
    });

    return NextResponse.json(
      {
        data: {
          id: link.id,
          slug: link.slug,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/schedule/${link.slug}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('スラッグ')) {
      return NextResponse.json(
        { message: error.message, error: 'SLUG_CONFLICT' },
        { status: 409 }
      );
    }
    throw error;
  }
}
