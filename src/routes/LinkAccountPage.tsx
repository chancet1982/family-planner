import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { linkInvitedUser } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function LinkAccountPage() {
  const { session, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)
  const attemptedRef = useRef(false)

  const personId =
    searchParams.get('person_id') ?? (session?.user?.user_metadata?.person_id as string | undefined)

  useEffect(() => {
    if (authLoading || attemptedRef.current) return
    if (!session) {
      navigate('/login', { replace: true })
      return
    }
    if (!personId) {
      setError('Missing invite link. Go to the schedule or try signing in again.')
      return
    }
    attemptedRef.current = true
    setLinking(true)
    setError(null)
    linkInvitedUser(personId)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['profile'] })
        queryClient.invalidateQueries({ queryKey: ['people'] })
        navigate('/schedule', { replace: true })
      })
      .catch((err) => {
        setError((err as Error).message)
        setLinking(false)
      })
  }, [session, authLoading, personId, navigate, queryClient])

  if (authLoading || (session && personId && linking && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Linking your account</CardTitle>
            <p className="text-sm text-muted-foreground">Please wait…</p>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Link account</CardTitle>
          <p className="text-sm text-muted-foreground">
            {error
              ? 'We couldn’t link your account. You can try again or go to the schedule.'
              : 'Redirecting…'}
          </p>
        </CardHeader>
        {error && (
          <CardContent className="space-y-4">
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => navigate('/schedule', { replace: true })}>
                Go to schedule
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => navigate('/login', { replace: true })}>
                Sign in again
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
