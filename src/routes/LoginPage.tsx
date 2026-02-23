import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signUpSuccess, setSignUpSuccess] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSignUpSuccess(false)
    setLoading(true)
    const { error: err } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    if (isSignUp) {
      setSignUpSuccess(true)
      return
    }
    navigate('/schedule', { replace: true })
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResetSent(false)
    if (!email.trim()) {
      setError('Enter your email address.')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/schedule`,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setResetSent(true)
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2 text-center">
            Reset password
          </h1>
          <p className="text-sm text-slate-600 mb-6 text-center">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              />
            </div>
            {resetSent && (
              <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800" role="status">
                Check your email for a link to reset your password. You can close this and sign in after resetting.
              </div>
            )}
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || resetSent}
              className="w-full min-h-[48px] rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForgotPassword(false); setError(null); setResetSent(false); }}
              className="w-full text-sm text-slate-500 hover:text-slate-700"
            >
              Back to sign in
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-6 text-center">
          Family Schedule
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                className="w-full min-h-[48px] px-4 pr-12 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {!isSignUp && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setError(null); }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Forgot password?
              </button>
            </div>
          )}
          {signUpSuccess && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800" role="status">
              Please check your email to verify your account. Once verified, you can sign in below.
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? (isSignUp ? 'Signing up…' : 'Signing in…') : isSignUp ? 'Sign up' : 'Sign in'}
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp((v) => !v); setError(null); setSignUpSuccess(false); }}
            className="w-full text-sm text-slate-500 hover:text-slate-700"
          >
            {isSignUp ? 'Already have an account? Sign in' : 'No account? Sign up'}
          </button>
        </form>
      </div>
    </div>
  )
}
