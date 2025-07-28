'use client';
import {
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Award,
  Clock,
  Target,
  Shield,
  Star,
  Activity,
  Mail,
  Lock,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function Home() {
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [sessionValidated, setSessionValidated] = useState(false);

  // Redirect if already authenticated, but not if we just signed out
  useEffect(() => {
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const signedOut = urlParams.get('signedOut');
    const errorParam = urlParams.get('error');

    // Handle various error types
    if (errorParam === 'rate_limit') {
      setError('Too many requests. Please wait a moment and try again.');
    } else if (errorParam === 'invalid_session') {
      setError('Your session is invalid. Please sign in again.');
    } else if (errorParam === 'session_expired') {
      setError('Your session has expired. Please sign in again.');
    }

    // If user just signed out, clear the parameter and prevent any redirects
    if (signedOut) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('signedOut');
      window.history.replaceState({}, '', newUrl.toString());

      // Clear the signing-out flag since logout is complete
      sessionStorage.removeItem('signing-out');

      // Don't redirect if user just signed out - exit early
      return;
    }

    // Server restart detection: Check if session appears authenticated but server might be restarted
    if (status === 'authenticated' && !signedOut && !sessionValidated) {
      // Check if we're in the middle of a logout process by checking sessionStorage
      const isSigningOut = sessionStorage.getItem('signing-out');
      if (isSigningOut) {
        // Don't redirect if we're in the middle of signing out
        return;
      }

      // Check if we've already attempted validation to prevent reload loops
      const validationAttempted = sessionStorage.getItem('session-validation-attempted');
      if (validationAttempted) {
        // If validation was attempted but we're still here, clear cookies without reload
        // Previous validation failed, clearing cookies

        // Clear NextAuth cookies
        const cookiesToClear = [
          'next-auth.session-token',
          '__Secure-next-auth.session-token',
          'next-auth.csrf-token',
          '__Secure-next-auth.csrf-token',
          'next-auth.callback-url',
          '__Secure-next-auth.callback-url',
          'authjs.session-token',
          '__Secure-authjs.session-token',
          'authjs.csrf-token',
          '__Secure-authjs.csrf-token',
        ];

        cookiesToClear.forEach(cookieName => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; max-age=0`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}; max-age=0`;
          if (window.location.hostname.includes('.')) {
            const parentDomain = `.${window.location.hostname.split('.').slice(-2).join('.')}`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${parentDomain}; max-age=0`;
          }
        });

        // Clear the validation flag and mark as validated to prevent further attempts
        sessionStorage.removeItem('session-validation-attempted');
        setSessionValidated(true);
        setError('Your session has expired. Please sign in again.');
        return;
      }

      // Test server session validity before redirecting
      const validateServerSession = async () => {
        try {
          // Mark that we're attempting validation
          sessionStorage.setItem('session-validation-attempted', 'true');

          const response = await fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'include',
          });

          if (!response.ok) {
            // Server session is invalid, reload to clear client state
            window.location.reload();
            return;
          }

          // Server session is valid, clear validation flag and proceed with redirect
          sessionStorage.removeItem('session-validation-attempted');
          setSessionValidated(true);
          router.push('/dashboard');
        } catch (error) {
          // Session validation error - log only in development
          if (process.env.NODE_ENV === 'development') {
            console.error('Session validation error:', error);
          }
          // Clear validation flag and stay on landing page
          sessionStorage.removeItem('session-validation-attempted');
          setSessionValidated(true);
        }
      };

      // Add a small delay to ensure session is properly loaded, then validate
      const timer = setTimeout(validateServerSession, 100);

      return () => clearTimeout(timer);
    }

    // If already authenticated and validated, redirect immediately
    if (status === 'authenticated' && sessionValidated && !signedOut) {
      const isSigningOut = sessionStorage.getItem('signing-out');
      if (!isSigningOut) {
        router.push('/dashboard');
      }
    }

    // Return undefined for other cases
    return undefined;
  }, [status, router, sessionValidated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Login successful, redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        setError(result.message || 'Invalid email or password');
      }
    } catch (err) {
      // Login exception - log only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Login exception:', err);
      }
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    setError('');

    try {
      // Use window.location to navigate directly to the Google OAuth URL
      // This avoids CSRF token issues with NextAuth v5
      window.location.href = `/api/auth/signin/google?callbackUrl=${encodeURIComponent('/dashboard')}`;
    } catch (error) {
      // Google sign-in error - log only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Google sign-in error:', error);
      }
      setError('Failed to sign in with Google. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#51B1A8] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Metrics */}
      <div className="w-1/2 bg-gradient-to-br from-[#51B1A8] to-[#449a92] p-12 flex flex-col justify-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-8">
            <Sparkles className="w-6 h-6 text-white/80" />
            <h2 className="text-3xl font-bold text-white">Performance Metrics</h2>
          </div>
          <p className="text-white/90 mb-10 text-lg">
            Monitor and improve agent performance across 8 critical dimensions
          </p>

          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="Service Quality"
              description="Customer satisfaction"
              icon={<Award className="w-6 h-6" />}
              iconColor="#FFD700"
            />
            <MetricCard
              title="Productivity"
              description="Work efficiency"
              icon={<TrendingUp className="w-6 h-6" />}
              iconColor="#00FF88"
            />
            <MetricCard
              title="Quality Assurance"
              description="Accuracy rates"
              icon={<CheckCircle2 className="w-6 h-6" />}
              iconColor="#FF6B6B"
            />
            <MetricCard
              title="Attendance"
              description="Presence tracking"
              icon={<Clock className="w-6 h-6" />}
              iconColor="#4ECDC4"
            />
            <MetricCard
              title="Performance Goals"
              description="Target achievement"
              icon={<Target className="w-6 h-6" />}
              iconColor="#FF8C42"
            />
            <MetricCard
              title="Adherence"
              description="Process compliance"
              icon={<Shield className="w-6 h-6" />}
              iconColor="#A8E6CF"
            />
            <MetricCard
              title="Time Management"
              description="Schedule adherence"
              icon={<Activity className="w-6 h-6" />}
              iconColor="#C7A8FF"
            />
            <MetricCard
              title="Overall Rating"
              description="Performance score"
              icon={<Star className="w-6 h-6" />}
              iconColor="#FFE66D"
            />
          </div>
        </div>
      </div>

      {/* Right Side - Logo and Sign In */}
      <div className="w-1/2 bg-white p-12 flex items-center justify-center">
        <div className="max-w-md w-full">
          {/* Logo and Title */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <Image
                src="/Smartsource logo.jpeg"
                alt="SmartSource"
                width={80}
                height={80}
                className="rounded-2xl shadow-lg"
              />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">SmartSource</h1>
            <p className="text-2xl text-[#51B1A8] font-semibold mb-4">Coaching Hub</p>
            <p className="text-gray-600 mb-8">
              Track agent performance and conduct coaching sessions with our comprehensive platform
            </p>
          </div>

          {/* Sign In Form */}
          <div className="bg-gray-50 rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Welcome Back</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                {error}
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 py-3 px-4 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-md hover:shadow-lg border border-gray-200 mb-6"
            >
              {isGoogleLoading ? (
                'Signing in with Google...'
              ) : (
                <>
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
                  Continue with Google Workspace
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-50 text-gray-500">Or continue with email</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#51B1A8] focus:border-transparent bg-white"
                  placeholder="Email address"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#51B1A8] focus:border-transparent bg-white"
                  placeholder="Password"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full bg-[#51B1A8] hover:bg-[#449a92] text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  'Signing in...'
                ) : (
                  <>
                    Sign In to Dashboard
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  description,
  icon,
  iconColor,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconColor: string;
}) {
  return (
    <div className="group bg-white/10 backdrop-blur-sm rounded-xl p-5 hover:bg-white/20 transition-all duration-300 border border-white/20 hover:border-white/30">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
          <div style={{ color: iconColor }}>{icon}</div>
        </div>
        <div>
          <h4 className="font-semibold text-white text-base mb-1">{title}</h4>
          <p className="text-white/70 text-sm">{description}</p>
        </div>
      </div>
    </div>
  );
}
