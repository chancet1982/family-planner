import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function SetupPage() {
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [householdName, setHouseholdName] = useState('')
  const [yourName, setYourName] = useState('')
  const [joinYourName, setJoinYourName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { session } = useAuth()
  const queryClient = useQueryClient()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user?.id || !householdName.trim()) return
    setError(null)
    setLoading(true)
    const { data: household, error: houseErr } = await supabase
      .from('households')
      .insert({
        name: householdName.trim(),
        created_by: session.user.id,
      })
      .select('id')
      .single()
    if (houseErr || !household) {
      setError(houseErr?.message ?? 'Failed to create household')
      setLoading(false)
      return
    }
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: session.user.id,
      household_id: household.id,
      role: 'parent',
    }, { onConflict: 'id' })
    if (profileErr) {
      setError(profileErr.message)
      setLoading(false)
      return
    }
    const creatorDisplayName =
      yourName.trim() ||
      (session.user.email?.split('@')[0]) ||
      'Household admin'
    const creatorEmail = (session.user.email ?? '').trim().toLowerCase() || null
    const { error: personErr } = await supabase.from('people').insert({
      household_id: household.id,
      name: creatorDisplayName,
      email: creatorEmail,
      user_id: session.user.id,
      role: 'parent',
      display_order: 0,
      avatar_color: 'blue',
    })
    if (personErr) {
      setError(personErr.message)
      setLoading(false)
      return
    }
    await queryClient.invalidateQueries({ queryKey: ['profile'] })
    await queryClient.invalidateQueries({ queryKey: ['people'] })
    setLoading(false)
    navigate('/schedule', { replace: true })
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user?.id || !inviteCode.trim()) return
    setError(null)
    setLoading(true)
    const { data: household, error: houseErr } = await supabase
      .from('households')
      .select('id')
      .eq('invite_code', inviteCode.trim())
      .single()
    if (houseErr || !household) {
      setError('Invalid invite code')
      setLoading(false)
      return
    }
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: session.user.id,
      household_id: household.id,
      role: 'child',
    }, { onConflict: 'id' })
    if (profileErr) {
      setError(profileErr.message)
      setLoading(false)
      return
    }
    const userEmail = (session.user.email ?? '').trim().toLowerCase()
    const { data: existingPerson } = await supabase
      .from('people')
      .select('id')
      .eq('household_id', household.id)
      .ilike('email', userEmail)
      .maybeSingle()
    if (existingPerson) {
      await supabase.from('people').update({ user_id: session.user.id }).eq('id', existingPerson.id)
    } else {
      const { data: max } = await supabase
        .from('people')
        .select('display_order')
        .eq('household_id', household.id)
        .order('display_order', { ascending: false })
        .limit(1)
        .single()
      const nextOrder = (max?.display_order ?? -1) + 1
      const displayName =
        joinYourName.trim() || session.user.email?.split('@')[0] || 'Member'
      await supabase.from('people').insert({
        household_id: household.id,
        name: displayName,
        email: userEmail || null,
        user_id: session.user.id,
        role: 'child',
        display_order: nextOrder,
        avatar_color: 'blue',
      })
    }
    await queryClient.invalidateQueries({ queryKey: ['profile'] })
    await queryClient.invalidateQueries({ queryKey: ['people'] })
    setLoading(false)
    navigate('/schedule', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set up your household</CardTitle>
          <p className="text-sm text-muted-foreground">Create a new household or join one with an invite code.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'create' ? 'default' : 'secondary'}
              className="flex-1"
              onClick={() => setMode('create')}
            >
              Create
            </Button>
            <Button
              type="button"
              variant={mode === 'join' ? 'default' : 'secondary'}
              className="flex-1"
              onClick={() => setMode('join')}
            >
              Join
            </Button>
          </div>
          {mode === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="householdName">Household name</Label>
                <Input
                  id="householdName"
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  required
                  placeholder="e.g. Smith Family"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yourName">Your name</Label>
                <Input
                  id="yourName"
                  type="text"
                  value={yourName}
                  onChange={(e) => setYourName(e.target.value)}
                  placeholder="e.g. Anna (you'll be added as a parent)"
                />
              </div>
              {error && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Creating…' : 'Create household'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite code</Label>
                <Input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  placeholder="Enter code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="joinYourName">Your name (optional)</Label>
                <Input
                  id="joinYourName"
                  type="text"
                  value={joinYourName}
                  onChange={(e) => setJoinYourName(e.target.value)}
                  placeholder="How you'll appear in the schedule"
                />
              </div>
              {error && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Joining…' : 'Join household'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
