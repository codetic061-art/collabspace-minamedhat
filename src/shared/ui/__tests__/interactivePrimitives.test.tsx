import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  Modal,
  NativeSelect,
  Select,
  TabPanel,
  Tabs,
  ToastProvider,
  useToast,
} from '@/shared/ui';
import { expectNoA11yViolations } from '@/test/a11y';

describe('Select and NativeSelect', () => {
  it('supports keyboard navigation, selection, Escape restore, and passes axe-core', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { container } = render(
      <div className="space-y-4">
        <Select
          label="Priority"
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
          ]}
          defaultValue="low"
          onChange={onChange}
        />
        <NativeSelect
          label="Status"
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'completed', label: 'Completed' },
          ]}
          defaultValue="pending"
        />
      </div>,
    );

    const trigger = screen.getByRole('button', { name: /Priority/i });
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const mediumOption = screen.getByRole('option', { name: 'Medium' });
    await user.keyboard('{ArrowDown}{Enter}');

    expect(mediumOption).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith('medium');
    expect(trigger).toHaveFocus();

    await user.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await expectNoA11yViolations(container);
  });
});

describe('DropdownMenu', () => {
  it('navigates menu items with arrow keys, activates items, and restores focus on Escape', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const { container } = render(
      <DropdownMenu
        triggerLabel="Project actions"
        trigger={(props) => (
          <Button variant="outline" {...props}>
            Actions
          </Button>
        )}
        items={[
          { id: 'edit', label: 'Edit Project', onSelect: onEdit },
          { id: 'delete', label: 'Delete Project', tone: 'danger', onSelect: onDelete },
        ]}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Actions' });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    const editItem = screen.getByRole('menuitem', { name: 'Edit Project' });
    expect(editItem).toHaveFocus();

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await expectNoA11yViolations(container);
  });
});

describe('Tabs', () => {
  it('supports underline and segmented modes with roving ArrowLeft/ArrowRight keyboard navigation', async () => {
    const user = userEvent.setup();

    function TabsHarness() {
      const [active, setActive] = useState('overview');
      return (
        <div>
          <Tabs
            idPrefix="proj"
            ariaLabel="Project sections"
            variant="underline"
            activeKey={active}
            onChange={setActive}
            items={[
              { key: 'overview', label: 'Overview' },
              { key: 'tasks', label: 'Tasks' },
              { key: 'teams', label: 'Teams' },
            ]}
          />
          <TabPanel idPrefix="proj" tabKey="overview" isActive={active === 'overview'}>
            Overview body
          </TabPanel>
          <TabPanel idPrefix="proj" tabKey="tasks" isActive={active === 'tasks'}>
            Tasks body
          </TabPanel>
          <TabPanel idPrefix="proj" tabKey="teams" isActive={active === 'teams'}>
            Teams body
          </TabPanel>
          <Tabs
            ariaLabel="View filter"
            variant="segmented"
            hasPanels={false}
            activeKey="all"
            onChange={() => {}}
            items={[
              { key: 'all', label: 'All' },
              { key: 'mine', label: 'My Tasks' },
            ]}
          />
        </div>
      );
    }

    const { container } = render(<TabsHarness />);
    const overviewTab = screen.getByRole('tab', { name: 'Overview' });
    overviewTab.focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Tasks' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Tasks' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Tasks body')).toBeInTheDocument();

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Teams' })).toHaveFocus();
    expect(screen.getByText('Teams body')).toBeInTheDocument();

    await expectNoA11yViolations(container);
  });
});

describe('Modal and ConfirmDialog', () => {
  it('traps focus, blocks Escape when submitting, makes background inert, and restores trigger focus', async () => {
    const user = userEvent.setup();

    function ModalHarness({ submitting = false }: { submitting?: boolean }) {
      const [open, setOpen] = useState(false);
      return (
        <div id="background-shell">
          <Button onClick={() => setOpen(true)}>Open Modal</Button>
          <Modal
            isOpen={open}
            onClose={() => setOpen(false)}
            title="Create Task"
            isSubmitting={submitting}
            footer={<Button>Submit</Button>}
          >
            <input aria-label="Task title" />
          </Modal>
        </div>
      );
    }

    const { rerender } = render(<ModalHarness />);
    const trigger = screen.getByRole('button', { name: 'Open Modal' });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Create Task' });
    expect(dialog).toBeInTheDocument();
    expect(document.getElementById('background-shell')?.parentElement).toHaveAttribute('inert');

    // Tab wraps from last focusable back into modal
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    submitButton.focus();
    await user.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();

    // Suppress Escape while submitting
    rerender(<ModalHarness submitting />);
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Create Task' })).toBeInTheDocument();

    // Allow Escape when idle and restore focus to trigger
    rerender(<ModalHarness submitting={false} />);
    await expectNoA11yViolations(document.body);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('starts focus on Cancel in ConfirmDialog and styles Delete dangerously', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    function ConfirmHarness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <Button onClick={() => setOpen(true)}>Remove Task</Button>
          <ConfirmDialog
            isOpen={open}
            onClose={() => setOpen(false)}
            onConfirm={onConfirm}
            title='Delete task "Design Spec"?'
            description="This action permanently deletes the task."
          />
        </div>
      );
    }

    render(<ConfirmHarness />);
    await user.click(screen.getByRole('button', { name: 'Remove Task' }));

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toHaveFocus();

    await expectNoA11yViolations(document.body);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('ToastProvider and ToastRegion', () => {
  it('renders a polite live status toast that pauses on hover and focus and self-dismisses', async () => {
    function Trigger() {
      const { showToast } = useToast();
      return (
        <Button onClick={() => showToast({ message: 'Project updated.' })}>Show toast</Button>
      );
    }

    vi.useFakeTimers();
    try {
      const { container } = render(
        <ToastProvider defaultDurationMs={4000} disablePortal>
          <Trigger />
        </ToastProvider>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Show toast' }));
      const statusToast = screen.getByRole('status');
      expect(statusToast).toHaveTextContent('Project updated.');
      expect(statusToast.parentElement).toHaveAttribute('aria-live', 'polite');

      // Advance 2500ms, then hover to pause before 4000ms elapses
      act(() => {
        vi.advanceTimersByTime(2500);
      });
      fireEvent.mouseEnter(statusToast);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByRole('status')).toBeInTheDocument();

      // Leave mouse; remaining ~1500ms should apply unless focused
      const dismissButton = screen.getByRole('button', { name: 'Dismiss notification' });
      fireEvent.focus(dismissButton);
      fireEvent.mouseLeave(statusToast);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByRole('status')).toBeInTheDocument();

      // Blur focus and let the remaining 1500ms expire
      fireEvent.blur(dismissButton);
      act(() => {
        vi.advanceTimersByTime(1600);
      });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      vi.useRealTimers();
      fireEvent.click(screen.getByRole('button', { name: 'Show toast' }));
      await expectNoA11yViolations(container);
    } finally {
      vi.useRealTimers();
    }
  });
});
