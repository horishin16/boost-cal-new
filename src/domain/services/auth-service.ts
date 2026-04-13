import type { User } from '@/domain/models/user';
import type { UserRepository } from '@/domain/repositories/user-repository';

const ALLOWED_DOMAINS = ['boostconsulting.co.jp', 'boostcapital.co.jp'];

interface SyncTokensInput {
  email: string;
  name: string;
  googleId: string;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  constructor(private userRepository: UserRepository) {}

  validateDomain(email: string): boolean {
    if (!email || !email.includes('@')) return false;
    const domain = email.split('@')[1];
    return ALLOWED_DOMAINS.includes(domain);
  }

  async syncProviderTokens(input: SyncTokensInput): Promise<User> {
    if (!this.validateDomain(input.email)) {
      throw new Error('許可されていないドメインです');
    }

    const domain = input.email.split('@')[1];

    return this.userRepository.upsertByEmail({
      email: input.email,
      name: input.name,
      domain,
      googleId: input.googleId,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
    });
  }

  async getCurrentUser(userId: string): Promise<User | null> {
    return this.userRepository.findById(userId);
  }

  hasValidGoogleToken(user: User): boolean {
    return user.accessToken !== null && user.accessToken !== '';
  }
}
