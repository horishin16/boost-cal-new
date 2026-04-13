export interface EmailParams {
  to: string[];
  subject: string;
  html: string;
}

/**
 * Send an email using configured mail service.
 * Replace with actual implementation (SendGrid, Resend, etc.)
 */
export async function sendEmail(params: EmailParams): Promise<void> {
  // TODO: Integrate with actual email service
  // Example with Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'BoostCal <noreply@boostcal.app>',
  //   to: params.to,
  //   subject: params.subject,
  //   html: params.html,
  // });

  console.log(`[Email] To: ${params.to.join(', ')}, Subject: ${params.subject}`);
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
  const startStr = booking.startTime.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endStr = booking.endTime.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const subject = `【リマインダー】${booking.eventTitle ?? '予定'} (${dateStr})`;

  const locationHtml = booking.meetingUrl
    ? `<p>会議URL: <a href="${booking.meetingUrl}">${booking.meetingUrl}</a></p>`
    : booking.locationName
      ? `<p>場所: ${booking.locationName}${booking.locationAddress ? ` (${booking.locationAddress})` : ''}</p>`
      : '';

  const html = `
    <h2>${booking.eventTitle ?? '予定のリマインダー'}</h2>
    <p><strong>日時:</strong> ${dateStr} ${startStr} 〜 ${endStr}</p>
    ${locationHtml}
    <p><strong>参加者:</strong> ${participantNames.join('、')}</p>
    <hr>
    <p style="color: #666; font-size: 12px;">このメールは BoostCal から自動送信されています。</p>
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
  const startStr = booking.startTime.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endStr = booking.endTime.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const subject = `【予約確定】${booking.eventTitle ?? '予定'}`;

  const html = `
    <h2>予約が確定しました</h2>
    <p>${booking.clientName} 様</p>
    <p>以下の予定が確定しました。</p>
    <p><strong>日時:</strong> ${dateStr} ${startStr} 〜 ${endStr}</p>
    ${booking.meetingUrl ? `<p><strong>会議URL:</strong> <a href="${booking.meetingUrl}">${booking.meetingUrl}</a></p>` : ''}
    <hr>
    <p style="color: #666; font-size: 12px;">このメールは BoostCal から自動送信されています。</p>
  `;

  return { subject, html };
}
