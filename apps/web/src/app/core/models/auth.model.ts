import { User } from './user.model';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: User;
}

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresAt: number;
}
