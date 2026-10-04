import { client, ok } from '../client';
import type { TokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse } from '../types';

export async function register(body: UserRegisterRequest): Promise<UserResponse> {
  return ok(await client.POST('/api/v1/auth/register', { body }));
}

/** Вход — JSON-тело, несмотря на OAuth2PasswordBearer в Swagger. */
export async function login(body: UserLoginRequest): Promise<TokenResponse> {
  return ok(await client.POST('/api/v1/auth/login', { body }));
}

export async function logout(refreshToken: string): Promise<void> {
  ok(await client.POST('/api/v1/auth/logout', { body: { refresh_token: refreshToken } }));
}

export async function getMe(): Promise<UserResponse> {
  return ok(await client.GET('/api/v1/auth/me'));
}
