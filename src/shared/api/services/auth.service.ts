import { requestAction, requestEnvelope, requestJson, type ApiMessageResult } from '../httpClient';
import type { UserResource } from '../types';

export interface AuthSessionPayload {
  user: UserResource;
  token: string;
  token_type: 'Bearer';
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean | null;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResult {
  message: string;
  expires_in_minutes: number;
}

export interface VerifyResetOtpRequest {
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  password: string;
  password_confirmation: string;
}

const AUTH_PATHS = {
  register: '/auth/register',
  login: '/auth/login',
  forgotPassword: '/auth/forgot-password',
  verifyResetOtp: '/auth/verify-reset-otp',
  resetPassword: '/auth/reset-password',
  logout: '/auth/logout',
} as const;

/** Registers a new Team Member account (`POST /auth/register`, E1 201 Created). */
export function register(payload: RegisterRequest): Promise<AuthSessionPayload> {
  return requestJson<AuthSessionPayload>(AUTH_PATHS.register, {
    method: 'POST',
    body: payload,
    skipAuth: true,
    skipUnauthorizedHandler: true,
  });
}

/** Authenticates with email and password (`POST /auth/login`; 401 is treated as a credential error). */
export function login(payload: LoginRequest): Promise<AuthSessionPayload> {
  return requestJson<AuthSessionPayload>(AUTH_PATHS.login, {
    method: 'POST',
    body: payload,
    skipAuth: true,
    skipUnauthorizedHandler: true,
  });
}

/** Sends a password reset OTP email (`POST /auth/forgot-password`). */
export async function forgotPassword(
  payload: ForgotPasswordRequest,
): Promise<ForgotPasswordResult> {
  const envelope = await requestEnvelope<{
    success: true;
    message?: string;
    data: { expires_in_minutes: number };
  }>(AUTH_PATHS.forgotPassword, {
    method: 'POST',
    body: payload,
    skipAuth: true,
    skipUnauthorizedHandler: true,
  });

  return {
    message:
      typeof envelope.message === 'string'
        ? envelope.message
        : 'If an account exists for this email, a password reset code has been sent.',
    expires_in_minutes: envelope.data.expires_in_minutes,
  };
}

/** Verifies the 6-digit password reset OTP without consuming it (`POST /auth/verify-reset-otp`). */
export function verifyResetOtp(payload: VerifyResetOtpRequest): Promise<ApiMessageResult> {
  return requestAction(AUTH_PATHS.verifyResetOtp, {
    method: 'POST',
    body: payload,
    skipAuth: true,
    skipUnauthorizedHandler: true,
  });
}

/** Resets password and revokes all Sanctum tokens (`POST /auth/reset-password`). */
export function resetPassword(payload: ResetPasswordRequest): Promise<ApiMessageResult> {
  return requestAction(AUTH_PATHS.resetPassword, {
    method: 'POST',
    body: payload,
    skipAuth: true,
    skipUnauthorizedHandler: true,
  });
}

/** Revokes the current Bearer token (`POST /auth/logout`). */
export function logout(): Promise<ApiMessageResult> {
  return requestAction(AUTH_PATHS.logout, {
    method: 'POST',
    skipUnauthorizedHandler: true,
  });
}
