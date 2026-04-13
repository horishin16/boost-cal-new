import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { ScheduleLinkService } from '@/domain/services/schedule-link-service';
import { ScheduleLinkRepository } from '@/domain/repositories/schedule-link-repository';
import { UserRepository } from '@/domain/repositories/user-repository';
import { createScheduleLinkSchema } from '@/schemas/schedule-link';

async function getAuthUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser?.email) return null;

  const userRepo = new UserRepository(supabaseAdmin);
  return userRepo.findByEmail(authUser.email);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { message: '未認証です', error: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const linkRepo = new ScheduleLinkRepository(supabaseAdmin);
  const service = new ScheduleLinkService(linkRepo);
  const link = await service.getLink(id, user.id);

  if (!link) {
    return NextResponse.json(
      { message: 'リンクが見つかりません', error: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: {
      id: link.id,
      name: link.name,
      description: link.description,
      slug: link.slug,
      duration: link.duration,
      isActive: link.isActive,
      settings: link.settings,
      createdAt: link.createdAt.toISOString(),
      updatedAt: link.updatedAt.toISOString(),
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { message: '未認証です', error: 'UNAUTHORIZED' },
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
    const link = await service.updateLink(id, user.id, {
      name: parsed.data.name,
      description: parsed.data.description,
      slug: parsed.data.slug,
      duration: parsed.data.duration,
      settings: parsed.data.settings,
    });

    return NextResponse.json({
      data: {
        id: link.id,
        name: link.name,
        description: link.description,
        slug: link.slug,
        duration: link.duration,
        isActive: link.isActive,
        settings: link.settings,
        createdAt: link.createdAt.toISOString(),
        updatedAt: link.updatedAt.toISOString(),
      },
    });
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const linkRepo = new ScheduleLinkRepository(supabaseAdmin);
  const service = new ScheduleLinkService(linkRepo);

  try {
    await service.deleteLink(id, user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { message: '削除に失敗しました', error: 'DELETE_FAILED' },
      { status: 400 }
    );
  }
}
