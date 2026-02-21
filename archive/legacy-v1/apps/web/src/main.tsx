import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tailwind.css';

// Start reminder scheduler (runs in background)
if (typeof window !== 'undefined') {
  import('./utils/reminderScheduler').then(({ startReminderScheduler }) => {
    startReminderScheduler();
  });
}
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
