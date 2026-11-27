import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScaffoldNotice } from '@/shared/ui';
import { expectNoA11yViolations } from '@/test/a11y';

describe('ScaffoldNotice', () => {
  it('renders the semantic heading and passes automated accessibility checks', async () => {
    const { container } = render(
      <ScaffoldNotice apiBaseUrl="https://collabspace.huma-volve.com/api/v1" />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'CollabSpace' })).toBeInTheDocument();
    expect(screen.getByText('https://collabspace.huma-volve.com/api/v1')).toBeInTheDocument();

    await expectNoA11yViolations(container);
  });
});
