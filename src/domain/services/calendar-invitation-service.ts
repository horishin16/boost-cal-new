import type { CalendarInvitation } from '@/domain/models/calendar-invitation';
import type { CalendarInvitationRepository } from '@/domain/repositories/calendar-invitation-repository';
import type { UserRepository } from '@/domain/repositories/user-repository';

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface AcceptInvitationInput {
  googleAccessToken: string;
  googleRefreshToken: string;
}

interface AcceptInvitationResult {
  userId: string;
  email: string;
  name: string;
  status: string;
}

export class CalendarInvitationService {
  constructor(
    private invitationRepository: CalendarInvitationRepository,
    private userRepository: UserRepository
  ) {}

  async sendInvitation(
    email: string,
    inviterId: string
  ): Promise<CalendarInvitation> {
    // Check if already linked
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser && existingUser.accessToken) {
      throw new Error('既にカレンダー連携済みです');
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return this.invitationRepository.create({
      token,
      email,
      inviterId,
      expiresAt,
    });
  }

  async acceptInvitation(
    token: string,
    input: AcceptInvitationInput
  ): Promise<AcceptInvitationResult> {
    const invitation = await this.invitationRepository.findByToken(token);

    if (!invitation) {
      throw new Error('招待が見つかりません');
    }

    if (invitation.status === 'ACCEPTED') {
      throw new Error('この招待は既に受諾済みです');
    }

    if (new Date() > invitation.expiresAt) {
      throw new Error('招待の有効期限が切れています');
    }

    // Update invitation status
    await this.invitationRepository.updateStatus(invitation.id, 'ACCEPTED');

    // Create or update guest user with Google tokens
    const domain = invitation.email.split('@')[1];
    const user = await this.userRepository.upsertByEmail({
      email: invitation.email,
      name: invitation.email.split('@')[0], // Use email prefix as default name
      domain,
      accessToken: input.googleAccessToken,
      refreshToken: input.googleRefreshToken,
      role: 'GUEST',
    });

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      status: 'ACCEPTED',
    };
  }
}
