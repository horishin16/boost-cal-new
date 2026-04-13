import type { Booking } from '@/domain/models/booking';
import type { BookingRepository } from '@/domain/repositories/booking-repository';
import type { UserRepository } from '@/domain/repositories/user-repository';

export interface ReminderInfo {
  booking: Booking;
  recipientEmails: string[];
  participantNames: string[];
}

export class ReminderService {
  constructor(
    private bookingRepository: BookingRepository,
    private userRepository: UserRepository
  ) {}

  async getDailyReminders(today: Date): Promise<ReminderInfo[]> {
    // Get tomorrow's date range (JST)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const bookings = await this.bookingRepository.findUpcomingConfirmed(tomorrow, dayAfter);
    if (bookings.length === 0) return [];

    const bookingIds = bookings.map((b) => b.id);
    const participants = await this.bookingRepository.findParticipantsByBookingIds(bookingIds);

    // Group participants by booking
    const participantsByBooking = new Map<string, string[]>();
    for (const p of participants) {
      const existing = participantsByBooking.get(p.bookingId) ?? [];
      existing.push(p.userId);
      participantsByBooking.set(p.bookingId, existing);
    }

    const reminders: ReminderInfo[] = [];

    for (const booking of bookings) {
      const emails: string[] = [booking.clientEmail];
      const names: string[] = [booking.clientName];

      const userIds = participantsByBooking.get(booking.id) ?? [];
      for (const userId of userIds) {
        const user = await this.userRepository.findById(userId);
        if (user) {
          emails.push(user.email);
          names.push(user.name);
        }
      }

      reminders.push({
        booking,
        recipientEmails: emails,
        participantNames: names,
      });
    }

    return reminders;
  }
}
