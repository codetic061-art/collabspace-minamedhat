import { createBrowserRouter, type RouteObject } from 'react-router';
import { SessionRoot } from './providers';
import { RouteErrorBoundary } from './RouteErrorBoundary';

/**
 * Application route tree shared between browser runtime and Layer 3 integration tests (ID-3, ID-18).
 * Every screen resolves lazily so public auth pages load zero authenticated shell code.
 */
export function createAppRoutes(): RouteObject[] {
  return [
    {
      element: <SessionRoot />,
      errorElement: <RouteErrorBoundary />,
      children: [
        {
          lazy: async () => {
            const { PublicOnlyRoute } = await import('./RouteGuards');
            return { Component: PublicOnlyRoute };
          },
          errorElement: <RouteErrorBoundary />,
          children: [
            {
              path: '/sign-in',
              lazy: async () => {
                const { SignInPage } = await import('@/features/auth');
                return { Component: SignInPage };
              },
            },
            {
              path: '/sign-up',
              lazy: async () => {
                const { SignUpPage } = await import('@/features/auth');
                return { Component: SignUpPage };
              },
            },
            {
              path: '/forgot-password',
              lazy: async () => {
                const { ForgotPasswordPage } = await import('@/features/auth');
                return { Component: ForgotPasswordPage };
              },
            },
            {
              path: '/verify-code',
              lazy: async () => {
                const { VerifyCodePage } = await import('@/features/auth');
                return { Component: VerifyCodePage };
              },
            },
            {
              path: '/reset-password',
              lazy: async () => {
                const { ResetPasswordPage } = await import('@/features/auth');
                return { Component: ResetPasswordPage };
              },
            },
          ],
        },
        {
          lazy: async () => {
            const { ProtectedRoute } = await import('./RouteGuards');
            return { Component: ProtectedRoute };
          },
          errorElement: <RouteErrorBoundary />,
          children: [
            {
              index: true,
              lazy: async () => {
                const { DashboardPlaceholderPage } = await import('./PlaceholderPages');
                return { Component: DashboardPlaceholderPage };
              },
            },
            {
              path: '/projects',
              lazy: async () => {
                const { ProjectsPlaceholderPage } = await import('./PlaceholderPages');
                return { Component: ProjectsPlaceholderPage };
              },
            },
            {
              path: '/projects/:projectId',
              lazy: async () => {
                const { ProjectDetailsPlaceholderPage } = await import('./PlaceholderPages');
                return { Component: ProjectDetailsPlaceholderPage };
              },
            },
            {
              path: '/tasks',
              lazy: async () => {
                const { TasksPlaceholderPage } = await import('./PlaceholderPages');
                return { Component: TasksPlaceholderPage };
              },
            },
            {
              path: '/profile',
              lazy: async () => {
                const { ProfilePlaceholderPage } = await import('./PlaceholderPages');
                return { Component: ProfilePlaceholderPage };
              },
            },
            {
              path: '/profile/settings',
              lazy: async () => {
                const { ProfileSettingsPlaceholderPage } = await import('./PlaceholderPages');
                return { Component: ProfileSettingsPlaceholderPage };
              },
            },
          ],
        },
        {
          path: '*',
          lazy: async () => {
            const { NotFoundPage } = await import('./PlaceholderPages');
            return { Component: NotFoundPage };
          },
        },
      ],
    },
  ];
}

/** Creates the browser router for production entry. */
export function createAppBrowserRouter() {
  return createBrowserRouter(createAppRoutes());
}
