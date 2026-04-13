import { z } from 'zod';

export const createBookingSchema = z.object({
  clientName: z.string().min(1, '名前は必須です'),
  clientEmail: z.string().email('正しいメールアドレスを入力してください'),
  startTime: z.string().min(1, '開始時刻は必須です'),
  endTime: z.string().min(1, '終了時刻は必須です'),
  meetingMode: z.enum(['online', 'inPerson_office', 'inPerson_visit'], {
    error: '会議形式を選択してください',
  }),
  customMeetingUrl: z.string().url().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type CreateBookingFormInput = z.infer<typeof createBookingSchema>;
