import React, { useEffect } from 'react';

export default function Toast({ message, onDismiss, duration = 3500 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onDismiss?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  return (
    <div className="toast-notification" role="status" aria-live="polite">
      <span className="toast-icon" aria-hidden="true">✓</span>
      <span className="toast-message">{message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={onDismiss}
        aria-label="Fermer la notification"
      >
        ×
      </button>
    </div>
  );
}
