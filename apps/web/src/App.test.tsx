// Temporary test file to verify React is working
import { StrictMode } from 'react';

export function TestApp() {
  return (
    <StrictMode>
      <div style={{ padding: '2rem' }}>
        <h1>DayPilot Test</h1>
        <p>If you see this, React is working!</p>
      </div>
    </StrictMode>
  );
}
