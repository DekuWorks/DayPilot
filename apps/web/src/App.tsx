import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SiteLayout } from './layouts/SiteLayout';
import { AppLayout } from './layouts/AppLayout';
import { HomePage } from './pages/HomePage';
import { FeaturesPage } from './pages/FeaturesPage';
import { PricingPage } from './pages/PricingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { TodayPage } from './pages/app/TodayPage';
import { CalendarPage } from './pages/app/CalendarPage';
import { SettingsPage } from './pages/app/SettingsPage';
import { OrganizationPage } from './pages/app/OrganizationPage';
import { OrganizationsPage } from './pages/app/OrganizationsPage';
import { BookingLinksPage } from './pages/app/BookingLinksPage';
import { BookingLinkEditPage } from './pages/app/BookingLinkEditPage';
import { BookingPage } from './pages/BookingPage';
import { UIDemoPage } from './pages/UIDemoPage';
import { RequireAuth } from './components/RequireAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OnboardingWrapper } from './components/OnboardingWrapper';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Marketing routes */}
            <Route path="/" element={<SiteLayout />}>
              <Route index element={<HomePage />} />
              <Route path="features" element={<FeaturesPage />} />
              <Route path="pricing" element={<PricingPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignupPage />} />
              <Route path="ui-demo" element={<UIDemoPage />} />
            </Route>

            {/* Public booking page (no auth required) */}
            <Route path="/book/:slug" element={<BookingPage />} />

            {/* App routes (protected) */}
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <OnboardingWrapper />
                </RequireAuth>
              }
            >
              <Route element={<AppLayout />}>
                <Route index element={<TodayPage />} />
                <Route path="today" element={<TodayPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="organizations" element={<OrganizationsPage />} />
                <Route path="organization/:orgId" element={<OrganizationPage />} />
                <Route path="booking-links" element={<BookingLinksPage />} />
                <Route path="booking-links/new" element={<BookingLinkEditPage />} />
                <Route path="booking-links/:id" element={<BookingLinkEditPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
