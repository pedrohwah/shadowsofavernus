import React from 'react';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { StartingPage } from './components/StartingPage';
import { GMPanel } from './components/GMPanel';
import { PlayerPanel } from './components/PlayerPanel';
import { Toaster } from './components/Toaster';

const AppContent: React.FC = () => {
  const { state } = useAppContext();

  switch (state) {
    case 'start':
      return <StartingPage />;
    case 'gm-panel':
      return <GMPanel />;
    case 'player-panel':
      return <PlayerPanel />;
    default:
      return <StartingPage />;
  }
};

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen">
        <AppContent />
        <Toaster />
      </div>
    </AppProvider>
  );
}