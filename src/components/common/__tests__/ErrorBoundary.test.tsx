import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '../ErrorBoundary';

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('sync failed');
  return <p>Room restored</p>;
}

function RecoverableRoom({ onReset }: { onReset: () => void }) {
  const [shouldThrow, setShouldThrow] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setShouldThrow(false)}>Restore room</button>
      <ErrorBoundary onReset={onReset}>
        <ThrowingChild shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </>
  );
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a friendly recovery screen when a child render fails', () => {
    render(
      <ErrorBoundary onReset={vi.fn()}>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('We hit a snag keeping the room in sync.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to landing' })).toBeTruthy();
  });

  it('retries rendering after the failed child becomes healthy', () => {
    const onReset = vi.fn();
    render(<RecoverableRoom onReset={onReset} />);

    fireEvent.click(screen.getByRole('button', { name: 'Restore room' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.getByText('Room restored')).toBeTruthy();
    expect(onReset).not.toHaveBeenCalled();
  });

  it('delegates a safe reset to the application', () => {
    const onReset = vi.fn();
    render(
      <ErrorBoundary onReset={onReset}>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back to landing' }));

    expect(onReset).toHaveBeenCalledOnce();
  });
});
