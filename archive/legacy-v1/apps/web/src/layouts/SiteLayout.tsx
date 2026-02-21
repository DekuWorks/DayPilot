import { Outlet } from 'react-router-dom';

export function SiteLayout() {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  );
}
