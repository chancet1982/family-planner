import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Reset password</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>
              {resetSent && (
                <Alert role="status">
                  <AlertDescription>
                    Check your email for a link to reset your password. You can close this and sign in after resetting.
                  </AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={loading || resetSent} className="w-full">
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setShowForgotPassword(false); setError(null); setResetSent(false); }}
              >
                Back to sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Family Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </Button>
              </div>
            </div>
            {!isSignUp && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm p-0 h-auto"
                  onClick={() => { setShowForgotPassword(true); setError(null); }}
                >
                  Forgot password?
                </Button>
              </div>
            )}
            {signUpSuccess && (
              <Alert role="status">
                <AlertDescription>
                  Please check your email to verify your account. Once verified, you can sign in below.
                </AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (isSignUp ? 'Signing up…' : 'Signing in…') : isSignUp ? 'Sign up' : 'Sign in'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => { setIsSignUp((v) => !v); setError(null); setSignUpSuccess(false); }}
            >
              {isSignUp ? 'Already have an account? Sign in' : 'No account? Sign up'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
