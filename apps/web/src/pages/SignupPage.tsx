import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabaseClient, isSupabaseConfigured } from '@daypilot/lib';
import { Button, Input, Label, Card } from '@daypilot/ui';

export function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const navigate = useNavigate();

  const handleSSO = async (provider: 'google' | 'azure' | 'apple') => {
    setError('');
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/app/today`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || `Failed to sign in with ${provider}`);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) throw error;

      navigate('/app/today');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(180deg, #F5E6D3 0%, #EFEBE2 50%, #F5E6D3 100%)' }}>
        <Card className="max-w-md w-full">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4">
            <p className="font-semibold mb-2">Supabase not configured</p>
            <p className="text-sm">
              Please add your Supabase credentials to{' '}
              <code className="bg-yellow-100 px-1 rounded">apps/web/.env</code>
            </p>
            <p className="text-sm mt-2">
              Required: <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code>
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(180deg, #F5E6D3 0%, #EFEBE2 50%, #F5E6D3 100%)' }}>
      <Card className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-3">
            DayPilot
          </h1>
          <h2 className="text-2xl font-bold text-[#2B3448] mb-2">
            Get Started
          </h2>
          <p className="text-[#4f4f4f] text-base">
            Create your account to start piloting your day
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!showEmailForm ? (
          <>
            {/* SSO Options */}
            <div className="space-y-3 mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-3"
                onClick={() => handleSSO('google')}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-3"
                onClick={() => handleSSO('azure')}
              >
                <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none">
                  <path
                    d="M11.5 0L0 4.5V9.5C0 15.3 3.4 20.5 8.5 22.5L11.5 23V12H23V4.5L11.5 0Z"
                    fill="#F25022"
                  />
                  <path
                    d="M11.5 0V12H23C23 5.4 18.1 0 11.5 0Z"
                    fill="#7FBA00"
                  />
                  <path
                    d="M11.5 23V12H23C23 18.6 18.1 23 11.5 23Z"
                    fill="#00A4EF"
                  />
                  <path
                    d="M11.5 0C5.1 0 0 5.1 0 11.5C0 17.9 5.1 23 11.5 23V12H23V0H11.5Z"
                    fill="#FFB900"
                  />
                </svg>
                Continue with Microsoft
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-3"
                onClick={() => handleSSO('apple')}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Continue with Apple
              </Button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-[#4f4f4f]">Or continue with email</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowEmailForm(true)}
            >
              Sign up with Email
            </Button>
          </>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEmailForm(false)}
              className="mb-2"
            >
              ← Back to SSO options
            </Button>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-[#4f4f4f] mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-[#4FB3B3] hover:text-[#EFBF4D] font-medium">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}

