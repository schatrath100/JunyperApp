import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { SignUpForm } from '../components/SignUpForm';

const Auth: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  console.log('Current name state:', name); // Debug log

  const handleSubmit = async (email: string, password: string) => {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          throw new Error('Name is required');
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              phone: phone || null,
              email_verified: false,
              admin_approved: false
            },
            emailRedirectTo: `${window.location.origin}/verify`,
          }
        });

        if (signUpError) throw new Error(signUpError.message);
        if (!signUpData.user) throw new Error('Failed to create account');

        setMessage('Please check your email to verify your account');
        setIsSignUp(false); // Switch back to login view
      } else {
        const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw new Error(signInError.message);

        if (!user?.user_metadata.email_verified) {
          throw new Error('Please verify your email before logging in.');
        }

        if (!user?.user_metadata.admin_approved) {
          throw new Error('Your account is pending admin approval.');
        }

        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      {isSignUp ? (
        <SignUpForm
          name={name}
          phone={phone}
          onNameChange={(value) => {
            console.log('onNameChange called with:', value);
            setName(value);
          }}
          onPhoneChange={setPhone}
          onSubmit={handleSubmit}
          onLogin={() => {
            setIsSignUp(false);
            setError(null);
            setMessage(null);
          }}
          loading={loading}
          error={error}
          message={message}
        />
      ) : (
        <LoginForm
          onSubmit={handleSubmit}
          onSignUp={() => {
            setIsSignUp(true);
            setError(null);
            setMessage(null);
          }}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
};

export default Auth;
