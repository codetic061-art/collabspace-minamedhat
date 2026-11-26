export {
  SessionProvider,
  useSession,
  type SessionContextValue,
  type SessionStatus,
} from './context/SessionContext';

export async function loadSignInPage() {
  const { SignInPage } = await import('./pages/SignInPage');
  return { Component: SignInPage };
}

export async function loadSignUpPage() {
  const { SignUpPage } = await import('./pages/SignUpPage');
  return { Component: SignUpPage };
}

export async function loadForgotPasswordPage() {
  const { ForgotPasswordPage } = await import('./pages/ForgotPasswordPage');
  return { Component: ForgotPasswordPage };
}

export async function loadVerifyCodePage() {
  const { VerifyCodePage } = await import('./pages/VerifyCodePage');
  return { Component: VerifyCodePage };
}

export async function loadResetPasswordPage() {
  const { ResetPasswordPage } = await import('./pages/ResetPasswordPage');
  return { Component: ResetPasswordPage };
}
