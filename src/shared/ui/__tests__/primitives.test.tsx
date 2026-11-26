import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Mail, Plus } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import {
  AccessDeniedState,
  Avatar,
  AvatarStack,
  Badge,
  BlockErrorBoundary,
  BlockErrorState,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Gauge,
  IconCircle,
  Input,
  NotFoundState,
  ProgressBar,
  Skeleton,
  SkeletonRegion,
  StatusText,
  Textarea,
  getInitials,
} from '@/shared/ui';
import { expectNoA11yViolations } from '@/test/a11y';

describe('Button', () => {
  it('renders all documented variants, supports pending state, and passes axe-core', async () => {
    const { container } = render(
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" rightIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
          Create Project
        </Button>
        <Button variant="outline">Cancel</Button>
        <Button variant="dashed">Add Task +</Button>
        <Button variant="dark">Add +</Button>
        <Button variant="link">Forget Password?</Button>
        <Button variant="danger">Delete</Button>
        <Button variant="primary" isLoading loadingText="Saving...">
          Save
        </Button>
      </div>,
    );

    expect(screen.getByRole('button', { name: 'Create Project' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Saving...' })).toHaveAttribute('aria-busy', 'true');

    await expectNoA11yViolations(container);
  });
});

describe('Field, Input, Textarea, Checkbox', () => {
  it('wires notch and top labels, aria-invalid, aria-describedby, and alerts', async () => {
    const { container } = render(
      <form className="space-y-4">
        <Input
          label="Email Address"
          labelVariant="notch"
          leadingIcon={<Mail className="h-4 w-4" />}
          hint="Use your work email"
          error="The email must be a valid email address."
          defaultValue="invalid"
        />
        <Field label="Project Name" labelVariant="top" required hint="Visible to team members">
          <Input defaultValue="CollabSpace" />
        </Field>
        <Textarea label="Description" labelVariant="notch" defaultValue="API-first workspace" />
        <Checkbox label="Remember Me" defaultChecked />
      </form>,
    );

    const emailInput = screen.getByLabelText('Email Address');
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    const describedBy = emailInput.getAttribute('aria-describedby') ?? '';
    expect(describedBy).toContain('-hint');
    expect(describedBy).toContain('-error');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The email must be a valid email address.',
    );
    expect(screen.getByLabelText('Project Name')).toBeRequired();
    expect(screen.getByRole('checkbox', { name: 'Remember Me' })).toBeChecked();

    await expectNoA11yViolations(container);
  });
});

describe('Card, Badge, StatusText, Avatar, Breadcrumb, Progress, Gauge', () => {
  it('renders surface, priority/status/completion badges, avatars, progress, and gauge cleanly', async () => {
    expect(getInitials('Mina Medhat')).toBe('MM');
    expect(getInitials('Admin')).toBe('A');
    expect(getInitials('   ')).toBe('?');

    const { container } = render(
      <main>
        <Breadcrumb items={[{ label: 'Projects', href: '#projects' }, { label: 'Alpha' }]} />
        <Card variant="bordered" header={<h1 className="text-xl font-semibold">Overview</h1>}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="low">Low</Badge>
            <Badge variant="medium">Medium</Badge>
            <Badge variant="high">High</Badge>
            <Badge variant="critical">Critical</Badge>
            <Badge variant="completion">42% Completed</Badge>
            <StatusText tone="in-progress">In Progress</StatusText>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <IconCircle tone="primary" size="md">
              <Mail className="h-4 w-4" aria-hidden="true" />
            </IconCircle>
            <Avatar name="Mina Medhat" src="https://example.com/broken.png" size="md" />
            <AvatarStack
              items={[
                { id: 1, name: 'Alice One' },
                { id: 2, name: 'Bob Two' },
                { id: 3, name: 'Cara Three' },
                { id: 4, name: 'Dan Four' },
              ]}
              max={2}
            />
          </div>
          <div className="mt-4 space-y-3">
            <ProgressBar value={125} label="Task completion" tone="success" />
            <Gauge value={72} label="Overall task completion" caption="Completed tasks" />
          </div>
        </Card>
      </main>,
    );

    const img = screen.getByAltText('Mina Medhat');
    fireEvent.error(img);
    expect(screen.getByRole('img', { name: 'Mina Medhat' })).toHaveTextContent('MM');

    expect(screen.getByText('Alpha')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('progressbar', { name: 'Task completion' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
    expect(screen.getByRole('img', { name: 'Overall task completion: 72%' })).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();

    await expectNoA11yViolations(container);
  });
});

describe('State primitives and BlockErrorBoundary', () => {
  it('renders skeleton, empty, block error, access denied, not found, and isolates child throws', async () => {
    const onRetry = vi.fn();
    let shouldThrow = true;

    function Bomb() {
      if (shouldThrow) {
        throw new Error('SENSITIVE_STACK_DETAIL');
      }
      return <p>Recovered content</p>;
    }

    function Harness() {
      const [resetCount, setResetCount] = useState(0);
      return (
        <div className="space-y-4">
          <SkeletonRegion label="Loading cards">
            <Skeleton variant="card" />
          </SkeletonRegion>
          <EmptyState message="No projects yet" action={<Button>Add Project</Button>} />
          <BlockErrorState onRetry={onRetry} />
          <AccessDeniedState action={<Button variant="outline">Back to Dashboard</Button>} />
          <NotFoundState />
          <BlockErrorBoundary
            resetKeys={[resetCount]}
            onReset={() => {
              shouldThrow = false;
              setResetCount((count) => count + 1);
            }}
          >
            <Bomb />
          </BlockErrorBoundary>
        </div>
      );
    }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { container } = render(<Harness />);

      expect(screen.getByRole('status', { name: 'Loading cards' })).toHaveAttribute(
        'aria-busy',
        'true',
      );
      expect(screen.getByText('No projects yet')).toBeInTheDocument();
      expect(screen.getByText("You don't have access to this page.")).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
      expect(screen.queryByText('SENSITIVE_STACK_DETAIL')).not.toBeInTheDocument();

      const [firstRetry, secondRetry] = screen.getAllByRole('button', { name: 'Retry' });
      if (!firstRetry || !secondRetry) {
        throw new Error('Expected Retry buttons in BlockErrorState and BlockErrorBoundary');
      }
      fireEvent.click(firstRetry);
      expect(onRetry).toHaveBeenCalledTimes(1);

      fireEvent.click(secondRetry);
      expect(screen.getByText('Recovered content')).toBeInTheDocument();

      await expectNoA11yViolations(container);
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
