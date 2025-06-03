import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const token = searchParams.get('token');
        if (!token) {
          throw new Error('Verification token is missing');
        }

        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email',
        });

        if (verifyError) throw verifyError;

        // Update user metadata to mark email as verified
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (user) {
          await supabase.auth.updateUser({
            data: { email_verified: true }
          });
        }

        setTimeout(() => {
          navigate('/auth');
        }, 5000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify email');
      } finally {
        setVerifying(false);
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {verifying ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600">Verifying your email...</p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="text-red-500 text-xl">❌</div>
              <h2 className="text-xl font-semibold text-gray-900">Verification Failed</h2>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-green-500 text-xl">✓</div>
              <h2 className="text-xl font-semibold text-gray-900">Email Verified!</h2>
              <p className="text-gray-600">
                Your email has been verified. Please wait for admin approval to access your account.
                You will be redirected to the login page in 5 seconds.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
