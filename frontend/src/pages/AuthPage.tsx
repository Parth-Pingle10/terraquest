import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/auth-api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Compass, KeyRound, User, Lock, AlertCircle, ArrowLeft } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const initialMode = queryParams.get('mode') === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Please provide username and password.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const tokenResp = await authApi.register({
          username: username.trim(),
          password,
          display_name: displayName.trim() || username.trim()
        });
        login(tokenResp.token.access_token, tokenResp.user);
        navigate('/');
      } else {
        const tokenResp = await authApi.login({
          username: username.trim(),
          password
        });
        login(tokenResp.token.access_token, tokenResp.user);
        navigate('/');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-parchment-100/50 dark:bg-charcoal-950">
      <Card className="max-w-md w-full p-6 sm:p-8 border border-parchment-200 dark:border-charcoal-800 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-forest-900 text-parchment-100 flex items-center justify-center shadow-md">
            <Compass className="w-6 h-6 text-moss-300" />
          </div>
          <h1 className="font-serif font-bold text-2xl text-charcoal-900 dark:text-parchment-50">
            {mode === 'login' ? 'Welcome Back, Explorer' : 'Create TerraQuest Account'}
          </h1>
          <p className="text-xs text-charcoal-600 dark:text-parchment-300">
            {mode === 'login'
              ? 'Sign in to access your cloud atlas and synchronized discoveries.'
              : 'Register to unlock persistent progression, skill tree rewards, and map sharing.'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl text-xs border border-red-200 dark:border-red-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
                Display Name (Field Moniker)
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-charcoal-400" />
                <input
                  type="text"
                  placeholder="e.g. Rowan The Wayfarer"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100 focus:ring-2 focus:ring-forest-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-2.5 text-charcoal-400" />
              <input
                type="text"
                required
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100 focus:ring-2 focus:ring-forest-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-charcoal-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100 focus:ring-2 focus:ring-forest-600 focus:outline-none"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            fullWidth
            className="mt-2"
          >
            {mode === 'login' ? 'Sign In to Atlas' : 'Complete Registration'}
          </Button>
        </form>

        <div className="pt-2 border-t border-parchment-200 dark:border-charcoal-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            className="text-forest-700 dark:text-moss-400 font-semibold hover:underline"
          >
            {mode === 'login' ? "Don't have an account? Register" : 'Already registered? Sign in'}
          </button>

          <Link
            to="/"
            className="text-charcoal-500 hover:text-charcoal-800 flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Continue as Guest
          </Link>
        </div>
      </Card>
    </div>
  );
};
