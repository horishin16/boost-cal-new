export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED';

export interface CalendarInvitation {
  id: string;
  token: string;
  email: string;
  inviterId: string;
  status: InvitationStatus;
  createdAt: Date;
  expiresAt: Date;
}

export interface CreateInvitationInput {
  token: string;
  email: string;
  inviterId: string;
  expiresAt: Date;
}
