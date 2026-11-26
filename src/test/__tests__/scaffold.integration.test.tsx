import { useQuery } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { mswServer } from '@/test/setup';

interface UpProbeResponse {
  success: boolean;
  message: string;
  data: {
    status: string;
  };
}

function UpProbeHarness() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['scaffold', 'up-probe'],
    queryFn: async ({ signal }) => {
      const response = await fetch('https://collabspace.huma-volve.com/api/v1/up-probe', {
        headers: { Accept: 'application/json' },
        signal,
      });
      if (!response.ok) {
        throw new Error(`Probe failed with status ${response.status}`);
      }
      // Response.json() returns any; narrowed to the mocked E1 probe envelope.
      return (await response.json()) as UpProbeResponse;
    },
  });

  if (isPending) {
    return <p>Loading probe...</p>;
  }

  if (isError || !data) {
    return <p role="alert">Probe failed</p>;
  }

  return <p>API status: {data.data.status}</p>;
}

describe('Scaffold MSW + TanStack Query integration', () => {
  it('transitions from loading to mocked network response', async () => {
    mswServer.use(
      http.get('https://collabspace.huma-volve.com/api/v1/up-probe', () =>
        HttpResponse.json({
          success: true,
          message: 'ok',
          data: { status: 'ready' },
        }),
      ),
    );

    renderWithProviders(<UpProbeHarness />);

    expect(screen.getByText('Loading probe...')).toBeInTheDocument();
    expect(await screen.findByText('API status: ready')).toBeInTheDocument();
  });
});
