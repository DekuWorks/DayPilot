import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function GoogleOAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    const success = searchParams.get('success');

    if (error) {
      navigate('/app/integrations?error=' + encodeURIComponent(error));
    } else if (success) {
      navigate('/app/integrations?success=connected');
    } else {
      navigate('/app/integrations');
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4FB3B3] mx-auto mb-4"></div>
        <p className="text-gray-600">Completing connection...</p>
      </div>
    </div>
  );
}
