import { z } from 'zod';

const timeSlotSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, 'HH:mm形式で入力してください'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'HH:mm形式で入力してください'),
});

const meetingOptionsSchema = z.object({
  allowOnline: z.boolean(),
  allowInPersonOffice: z.boolean(),
  allowInPersonVisit: z.boolean(),
  bufferOnline: z.number().min(0).default(0),
  bufferInPersonOffice: z.number().min(0).default(0),
  bufferInPersonVisit: z.number().min(0).default(60),
});

const participantsSchema = z.object({
  internalIds: z.array(z.string()).default([]),
  externalEmails: z.array(z.string().email()).default([]),
});

const linkSettingsSchema = z.object({
  weekdayTimeSlots: z.record(z.string(), z.array(timeSlotSchema)).default({}),
  excludeHolidays: z.boolean().default(true),
  dateOverrides: z.record(z.string(), z.array(timeSlotSchema)).default({}),
  allowedDurations: z.array(z.number().positive()).min(1, '会議時間を1つ以上選択してください'),
  participants: participantsSchema.default({ internalIds: [], externalEmails: [] }),
  meetingOptions: meetingOptionsSchema.refine(
    (opts) => opts.allowOnline || opts.allowInPersonOffice || opts.allowInPersonVisit,
    { message: '会議形式を1つ以上選択してください' }
  ),
  conferenceRoomId: z.string().optional(),
  visitLocationName: z.string().optional(),
  visitLocationAddress: z.string().optional(),
  timezone: z.string().default('Asia/Tokyo'),
});

export const createScheduleLinkSchema = z.object({
  name: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(100, 'タイトルは100文字以内で入力してください'),
  description: z
    .string()
    .max(500, '説明は500文字以内で入力してください')
    .optional()
    .nullable(),
  slug: z
    .string()
    .max(50, 'スラッグは50文字以内で入力してください')
    .regex(/^[a-z0-9-]*$/, 'スラッグは半角英小文字・数字・ハイフンのみ使用できます')
    .optional()
    .nullable(),
  duration: z.number().positive('会議時間は1分以上を指定してください'),
  settings: linkSettingsSchema,
});

export type CreateScheduleLinkInput = z.infer<typeof createScheduleLinkSchema>;
