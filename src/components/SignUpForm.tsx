import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert } from './Alert';

interface SignUpFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onLogin: () => void;
  name: string;
  phone: string;
  onNameChange?: (name: string) => void;
  onPhoneChange?: (phone: string) => void;
  loading: boolean;
  error: string | null;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onSubmit,
  onLogin,
  phone,
  onNameChange,
  onPhoneChange,
  loading,
  error
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [localName, setLocalName] = useState(name);

  useEffect(() => {
    setLocalName(name);
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters long');
      return;
    }
    setValidationError(null);
    await onSubmit(email, password);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold text-center mb-6">Create an Account</h2>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="p-3 mb-4 text-sm text-red-800 rounded-lg bg-red-50\" role="alert">
            {error}
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            value={localName}
            onChange={(e) => {
              setLocalName(e.target.value);
              onNameChange?.(e.target.value);
            }}
            placeholder="John Doe"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          {validationError && (
            <div className="text-sm text-red-600 mt-1">
              {validationError}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone (Optional)</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange?.(e.target.value)}
            placeholder="+1 (555) 000-0000"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <button
          onClick={onLogin}
          className="text-blue-600 hover:text-blue-800 font-medium"
          type="button"
        >
          Log in
        </button>
      </p>
    </div>
  );
};