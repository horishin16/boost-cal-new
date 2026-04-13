export type UserRole = 'ADMIN' | 'MEMBER' | 'GUEST';

export interface User {
  id: string;
  email: string;
  name: string;
  domain: string;
  googleId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  name: string;
  domain: string;
  googleId?: string;
  accessToken?: string;
  refreshToken?: string;
  role?: UserRole;
}

export interface UpdateTokensInput {
  accessToken: string;
  refreshToken: string;
}
