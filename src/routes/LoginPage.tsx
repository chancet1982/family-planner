import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signUpSuccess, setSignUpSuccess] = useState(false)
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
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            />
          </div>
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
