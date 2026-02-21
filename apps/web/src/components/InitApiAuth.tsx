import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { setApiConfig } from '@daypilot/lib';

const API_TOKEN_KEY = 'daypilot_api_token';

export function getStoredApiToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(API_TOKEN_KEY) : null;
}

export function setStoredApiToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(API_TOKEN_KEY, token);
  else localStorage.removeItem(API_TOKEN_KEY);
}

/**
 * When VITE_API_URL is set: configures lib to use DayPilot API for auth/integrations,
 * and captures ?token= from Google sign-in callback.
 */
export function InitApiAuth() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
    if (!apiUrl) return;

    setApiConfig({
      apiUrl: apiUrl.replace(/\/$/, ''),
      getToken: () => localStorage.getItem(API_TOKEN_KEY),
    });

    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem(API_TOKEN_KEY, token);
      searchParams.delete('token');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return null;
}
