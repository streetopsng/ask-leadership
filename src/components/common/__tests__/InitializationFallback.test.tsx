import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InitializationFallback from '../InitializationFallback';

describe('InitializationFallback', () => {
  it('explains initialization failures and offers retry', () => {
    const onRetry = vi.fn();

    render(<InitializationFallback state="authError" onRetry={onRetry} />);

    expect(screen.getByText('We could not sign you in.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('distinguishes signing in from joining a room', () => {
    const { rerender } = render(<InitializationFallback state="signingIn" onRetry={vi.fn()} />);

    expect(screen.getByText('Signing you in...')).toBeTruthy();

    rerender(<InitializationFallback state="joining" onRetry={vi.fn()} />);
    expect(screen.getByText('Joining the Session...')).toBeTruthy();
  });
});
