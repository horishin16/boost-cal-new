import { createClient } from '@supabase/supabase-js';
import {
  createUserData,
  createScheduleLinkData,
  createBookingData,
} from '../factories';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません。.env.local を確認してください。');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
  console.log('🌱 Database seeding started...');

  try {
    // テーブルをクリア（依存関係の順序で削除）
    console.log('Clearing existing data...');
    await client.from('booking_participants').delete().neq('id', '');
    await client.from('bookings').delete().neq('id', '');
    await client.from('calendar_invitations').delete().neq('id', '');
    await client.from('schedule_links').delete().neq('id', '');
    await client.from('users').delete().neq('id', '');

    // ユーザーを5人作成
    console.log('Creating users...');
    const users = [
      createUserData({ name: '山田 太郎', email: 'yamada@boostconsulting.co.jp', role: 'ADMIN' }),
      createUserData({ name: '佐藤 花子', email: 'sato@boostconsulting.co.jp' }),
      createUserData({ name: '鈴木 一郎', email: 'suzuki@boostconsulting.co.jp' }),
      createUserData({ name: '田中 美咲', email: 'tanaka@boostcapital.co.jp' }),
      createUserData({ name: '高橋 健太', email: 'takahashi@boostcapital.co.jp' }),
    ];

    const { data: insertedUsers, error: userError } = await client
      .from('users')
      .insert(users)
      .select();

    if (userError) {
      console.error('Error inserting users:', userError);
      return;
    }
    console.log(`✓ Created ${insertedUsers.length} users`);

    // スケジュールリンクを3件作成
    console.log('Creating schedule links...');
    const links = [
      createScheduleLinkData(insertedUsers[0].id, {
        name: '定例ミーティング調整',
        slug: 'yamada-meeting',
        duration: 60,
      }),
      createScheduleLinkData(insertedUsers[0].id, {
        name: '採用面接スケジュール',
        slug: 'interview-2026',
        duration: 30,
      }),
      createScheduleLinkData(insertedUsers[1].id, {
        name: 'クライアントMTG',
        slug: 'sato-client',
        duration: 60,
      }),
    ];

    const { data: insertedLinks, error: linkError } = await client
      .from('schedule_links')
      .insert(links)
      .select();

    if (linkError) {
      console.error('Error inserting schedule links:', linkError);
      return;
    }
    console.log(`✓ Created ${insertedLinks.length} schedule links`);

    // 予約を2件作成
    console.log('Creating bookings...');
    const bookings = [
      createBookingData(insertedLinks[0].id, {
        client_name: '外部 クライアント',
        client_email: 'client@example.com',
        event_title: '定例ミーティング',
      }),
      createBookingData(insertedLinks[2].id, {
        client_name: 'テスト ゲスト',
        client_email: 'guest@example.com',
        event_title: 'クライアント打ち合わせ',
      }),
    ];

    const { data: insertedBookings, error: bookingError } = await client
      .from('bookings')
      .insert(bookings)
      .select();

    if (bookingError) {
      console.error('Error inserting bookings:', bookingError);
      return;
    }
    console.log(`✓ Created ${insertedBookings.length} bookings`);

    // 予約参加者を追加
    console.log('Creating booking participants...');
    const participants = [
      {
        id: crypto.randomUUID(),
        booking_id: insertedBookings[0].id,
        user_id: insertedUsers[0].id,
      },
      {
        id: crypto.randomUUID(),
        booking_id: insertedBookings[0].id,
        user_id: insertedUsers[1].id,
      },
      {
        id: crypto.randomUUID(),
        booking_id: insertedBookings[1].id,
        user_id: insertedUsers[1].id,
      },
    ];

    const { data: insertedParticipants, error: participantError } = await client
      .from('booking_participants')
      .insert(participants)
      .select();

    if (participantError) {
      console.error('Error inserting participants:', participantError);
      return;
    }
    console.log(`✓ Created ${insertedParticipants.length} booking participants`);

    console.log('\n✨ Database seeding completed successfully!');
    console.log(`   Users: ${insertedUsers.length}`);
    console.log(`   Schedule Links: ${insertedLinks.length}`);
    console.log(`   Bookings: ${insertedBookings.length}`);
    console.log(`   Participants: ${insertedParticipants.length}`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

seedDatabase();
