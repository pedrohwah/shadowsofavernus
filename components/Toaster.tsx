import React from 'react';
import { Toaster as Sonner } from 'sonner@2.0.3';

export const Toaster: React.FC = () => {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-card-foreground)',
        },
      }}
    />
  );
};