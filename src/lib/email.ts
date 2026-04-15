import { ServerClient } from 'postmark';

export interface EmailParams {
  to: string[];
  subject: string;
  html: string;
}

const FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL ?? 'noreply@boostcal.app';

export async function sendEmail(params: EmailParams): Promise<void> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) {
    console.warn('[Email] POSTMARK_SERVER_TOKEN not set, skipping send');
    return;
  }

  const client = new ServerClient(token);

  for (const to of params.to) {
    await client.sendEmail({
      From: FROM_EMAIL,
      To: to,
      Subject: params.subject,
      HtmlBody: params.html,
      MessageStream: 'outbound',
    });
  }
}

export function buildInvitationEmail(params: {
  inviterName: string;
  inviteUrl: string;
}): { subject: string; html: string } {
  const subject = `【BoostCal】カレンダー連携のお願い`;

  const html = `
    <h2>カレンダー連携のお願い</h2>
    <p>${params.inviterName} さんから、カレンダー連携の依頼が届いています。</p>
    <p>以下のリンクから Google アカウントでログインして、カレンダーへのアクセスを許可してください。</p>
    <p style="margin: 24px 0;">
      <a href="${params.inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
        カレンダーを連携する
      </a>
    </p>
    <p style="color: #666; font-size: 12px;">このリンクの有効期限は7日間です。</p>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
    <p style="color: #999; font-size: 11px;">このメールは BoostCal から自動送信されています。</p>
  `;

  return { subject, html };
}

export function buildReminderEmail(booking: {
  eventTitle: string | null;
  startTime: Date;
  endTime: Date;
  meetingUrl: string | null;
  meetingMode: string;
  locationName: string | null;
  locationAddress: string | null;
  clientName: string;
}, participantNames: string[]): { subject: string; html: string } {
  const dateStr = booking.startTime.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const startStr = booking.startTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const endStr = booking.endTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

  const subject = `【リマインダー】${booking.eventTitle ?? '予定'} (${dateStr})`;

  const locationHtml = booking.meetingUrl
    ? `<p><strong>会議URL:</strong> <a href="${booking.meetingUrl}">${booking.meetingUrl}</a></p>`
    : booking.locationName
      ? `<p><strong>場所:</strong> ${booking.locationName}${booking.locationAddress ? ` (${booking.locationAddress})` : ''}</p>`
      : '';

  const html = `
    <h2>${booking.eventTitle ?? '予定のリマインダー'}</h2>
    <p><strong>日時:</strong> ${dateStr} ${startStr} 〜 ${endStr}</p>
    ${locationHtml}
    <p><strong>参加者:</strong> ${participantNames.join('、')}</p>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
    <p style="color: #999; font-size: 11px;">このメールは BoostCal から自動送信されています。</p>
  `;

  return { subject, html };
}

export function buildBookingNotificationEmail(params: {
  linkName: string;
  clientName: string;
  clientEmail: string;
  startTime: Date;
  endTime: Date;
  meetingMode: string;
  meetingUrl: string | null;
  locationName: string | null;
  locationAddress: string | null;
  notes: string | null;
}): { subject: string; html: string } {
  const dateStr = params.startTime.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const startStr = params.startTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const endStr = params.endTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

  const modeLabel =
    params.meetingMode === 'online' ? 'オンライン'
    : params.meetingMode === 'inPerson_office' ? '対面（弊社オフィス）'
    : params.meetingMode === 'inPerson_visit' ? '対面（貴社指定）'
    : params.meetingMode;

  const subject = `【新しい予約】${params.linkName} - ${params.clientName} 様`;

  const locationHtml = params.meetingUrl
    ? `<p><strong>会議URL:</strong> <a href="${params.meetingUrl}">${params.meetingUrl}</a></p>`
    : params.locationName
      ? `<p><strong>場所:</strong> ${params.locationName}${params.locationAddress ? ` (${params.locationAddress})` : ''}</p>`
      : '';

  const notesHtml = params.notes
    ? `<p><strong>メモ:</strong><br>${params.notes.replace(/\n/g, '<br>')}</p>`
    : '';

  const html = `
    <h2>新しい予約が入りました</h2>
    <p><strong>予約リンク:</strong> ${params.linkName}</p>
    <p><strong>予約者:</strong> ${params.clientName} 様 (${params.clientEmail})</p>
    <p><strong>日時:</strong> ${dateStr} ${startStr} 〜 ${endStr}</p>
    <p><strong>会議形式:</strong> ${modeLabel}</p>
    ${locationHtml}
    ${notesHtml}
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
    <p style="color: #999; font-size: 11px;">このメールは BoostCal から自動送信されています。</p>
  `;

  return { subject, html };
}

export function buildConfirmationEmail(booking: {
  eventTitle: string | null;
  startTime: Date;
  endTime: Date;
  meetingUrl: string | null;
  meetingMode: string;
  clientName: string;
}): { subject: string; html: string } {
  const dateStr = booking.startTime.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const startStr = booking.startTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const endStr = booking.endTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

  const subject = `【予約確定】${booking.eventTitle ?? '予定'}`;

  const html = `
    <h2>予約が確定しました</h2>
    <p>${booking.clientName} 様</p>
    <p>以下の予定が確定しました。</p>
    <p><strong>日時:</strong> ${dateStr} ${startStr} 〜 ${endStr}</p>
    ${booking.meetingUrl ? `<p><strong>会議URL:</strong> <a href="${booking.meetingUrl}">${booking.meetingUrl}</a></p>` : ''}
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
    <p style="color: #999; font-size: 11px;">このメールは BoostCal から自動送信されています。</p>
  `;

  return { subject, html };
}
