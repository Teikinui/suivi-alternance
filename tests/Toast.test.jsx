import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast from '../src/Toast.jsx';

afterEach(() => {
  vi.useRealTimers();
});

describe('Toast notification component', () => {
  it('renders nothing when message is empty or missing', () => {
    const { container } = render(<Toast message="" onDismiss={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders visible feedback with accessible status role', () => {
    render(<Toast message="Candidature enregistrée." onDismiss={() => {}} />);
    const alert = screen.getByRole('status');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Candidature enregistrée.');
  });

  it('allows manual dismissal via close button', async () => {
    const user = userEvent.setup();
    const handleDismiss = vi.fn();
    render(<Toast message="Candidature supprimée." onDismiss={handleDismiss} />);
    const button = screen.getByRole('button', { name: 'Fermer la notification' });
    await user.click(button);
    expect(handleDismiss).toHaveBeenCalledOnce();
  });

  it('automatically dismisses after the specified duration', () => {
    vi.useFakeTimers();
    const handleDismiss = vi.fn();
    render(<Toast message="Candidature mise à jour." onDismiss={handleDismiss} duration={3000} />);
    expect(handleDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(handleDismiss).toHaveBeenCalledOnce();
  });
});
