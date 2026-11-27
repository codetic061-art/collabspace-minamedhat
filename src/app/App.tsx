import { getPublicEnv } from '@/shared/config';
import { ScaffoldNotice } from '@/shared/ui';

export function App() {
  const { VITE_API_BASE_URL } = getPublicEnv();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <ScaffoldNotice apiBaseUrl={VITE_API_BASE_URL} />
    </main>
  );
}
