import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'

export function SetupPage() {
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [householdName, setHouseholdName] = useState('')
  const [yourName, setYourName] = useState('')
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
    // Creator is always a parent in the profile (for auth/permissions).
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
    // Add the creator as a person in the household, always as parent.
    const creatorDisplayName =
      yourName.trim() ||
      (session.user.email?.split('@')[0]) ||
      'Household admin'
    const { error: personErr } = await supabase.from('people').insert({
      household_id: household.id,
      name: creatorDisplayName,
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
    await queryClient.invalidateQueries({ queryKey: ['profile'] })
    setLoading(false)
    navigate('/schedule', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Set up your household</h1>
        <p className="text-slate-600 mb-6">Create a new household or join one with an invite code.</p>
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 min-h-[44px] rounded-xl font-medium ${mode === 'create' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`flex-1 min-h-[44px] rounded-xl font-medium ${mode === 'join' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Join
          </button>
        </div>
        {mode === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="householdName" className="block text-sm font-medium text-slate-700 mb-1">
                Household name
              </label>
              <input
                id="householdName"
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                required
                placeholder="e.g. Smith Family"
                className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label htmlFor="yourName" className="block text-sm font-medium text-slate-700 mb-1">
                Your name
              </label>
              <input
                id="yourName"
                type="text"
                value={yourName}
                onChange={(e) => setYourName(e.target.value)}
                placeholder="e.g. Anna (you'll be added as a parent)"
                className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-400"
              />
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create household'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="inviteCode" className="block text-sm font-medium text-slate-700 mb-1">
                Invite code
              </label>
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                placeholder="Enter code"
                className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-400"
              />
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? 'Joining…' : 'Join household'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
