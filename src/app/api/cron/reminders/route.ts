import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { BookingRepository } from '@/domain/repositories/booking-repository';
import { UserRepository } from '@/domain/repositories/user-repository';
import { ReminderService } from '@/domain/services/reminder-service';
import { sendEmail, buildReminderEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { message: '認証エラー', error: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const bookingRepo = new BookingRepository(supabaseAdmin);
  const userRepo = new UserRepository(supabaseAdmin);
  const service = new ReminderService(bookingRepo, userRepo);

  const reminders = await service.getDailyReminders(new Date());

  const sent: { bookingId: string; to: string[]; title: string | null }[] = [];

  for (const reminder of reminders) {
    const { subject, html } = buildReminderEmail(
      reminder.booking,
      reminder.participantNames
    );

    await sendEmail({
      to: reminder.recipientEmails,
      subject,
      html,
    });

    sent.push({
      bookingId: reminder.booking.id,
      to: reminder.recipientEmails,
      title: reminder.booking.eventTitle,
    });
  }

  return NextResponse.json({
    message: `${sent.length}件のリマインダーを送信しました`,
    sent,
  });
}
