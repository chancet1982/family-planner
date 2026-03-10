import { useState } from 'react'
import { useActivities, useActivityMutations } from '../../hooks/useActivities'
import { usePeople } from '../../hooks/usePeople'
import type { Activity, ActivityOccurrence } from '../../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'

const DAY_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
]

export function AdminActivities() {
  const { data, isLoading, error } = useActivities()
  const activities = data?.activities ?? []
  const occurrences = data?.occurrences ?? []
  const { data: people } = usePeople()
  const {
    createActivityWithOccurrences,
    addOccurrence,
    updateOccurrence,
    updateActivity,
    removeOccurrence,
    removeActivity,
  } = useActivityMutations()

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formPersonId, setFormPersonId] = useState('')
  const [formOccurrences, setFormOccurrences] = useState<
    Array<{
      day_of_week: number
      start_time: string
      end_time: string
      drop_off_mode?: 'parent' | 'grandparents' | 'alone'
      pick_up_mode?: 'parent' | 'grandparents' | 'alone'
      drop_off_parent_id?: string | null
      pick_up_parent_id?: string | null
    }>
  >([
    { day_of_week: 3, start_time: '17:00', end_time: '18:00', drop_off_mode: 'parent', pick_up_mode: 'parent' },
  ])
  const [editName, setEditName] = useState('')
  const [editPersonId, setEditPersonId] = useState('')
  const [editOccurrences, setEditOccurrences] = useState<
    Record<
      string,
      {
        day_of_week: number
        start_time: string
        end_time: string
        drop_off_mode?: 'parent' | 'grandparents' | 'alone'
        pick_up_mode?: 'parent' | 'grandparents' | 'alone'
        drop_off_parent_id?: string | null
        pick_up_parent_id?: string | null
        separate_pick_up?: boolean
      }
    >
  >({})

  const occurrencesByActivityId = new Map<string, ActivityOccurrence[]>()
  for (const occ of occurrences) {
    const list = occurrencesByActivityId.get(occ.activity_id) ?? []
    list.push(occ)
    occurrencesByActivityId.set(occ.activity_id, list)
  }
  for (const list of occurrencesByActivityId.values()) {
    list.sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
  }

  if (isLoading) {
    return (
      <section aria-labelledby="admin-activities-heading">
        <h2 id="admin-activities-heading" className="text-lg font-medium text-foreground mb-4">Activities</h2>
        <p className="text-muted-foreground">Loading…</p>
      </section>
    )
  }
  if (error) {
    return (
      <section aria-labelledby="admin-activities-heading">
        <h2 id="admin-activities-heading" className="text-lg font-medium text-foreground mb-4">Activities</h2>
        <Alert variant="destructive" role="alert">
          <AlertDescription>Failed to load activities.</AlertDescription>
        </Alert>
      </section>
    )
  }

  const personName = (id: string) => (people ?? []).find((p) => p.id === id)?.name ?? id
  const dayLabel = (d: number) => DAY_OPTIONS.find((o) => o.value === d)?.label ?? ''

  const handleAddTime = () => {
    setFormOccurrences((prev) => [
      ...prev,
      { day_of_week: 1, start_time: '09:00', end_time: '10:00', drop_off_mode: 'parent', pick_up_mode: 'parent' },
    ])
  }

  const handleRemoveFormTime = (index: number) => {
    setFormOccurrences((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formPersonId || formOccurrences.length === 0) return
    createActivityWithOccurrences.mutate(
      {
        name: formName.trim(),
        person_id: formPersonId,
        occurrences: formOccurrences,
      },
      {
        onSuccess: () => {
          setFormName('')
          setFormPersonId('')
          setFormOccurrences([...defaultFormOccurrences])
          setShowForm(false)
        },
      }
    )
  }

  const toggleExpand = (act: Activity) => {
    if (expandedId === act.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(act.id)
    setEditName(act.name)
    setEditPersonId(act.person_id)
    const occs = occurrencesByActivityId.get(act.id) ?? []
    const next: typeof editOccurrences = {}
    for (const o of occs) {
      next[o.id] = {
        day_of_week: o.day_of_week,
        start_time: o.start_time,
        end_time: o.end_time,
        drop_off_mode: o.drop_off_mode ?? 'parent',
        pick_up_mode: o.pick_up_mode ?? 'parent',
        drop_off_parent_id: o.drop_off_parent_id ?? null,
        pick_up_parent_id: o.pick_up_parent_id ?? null,
      }
    }
    setEditOccurrences(next)
  }

  const saveActivity = (act: Activity, name: string, personId: string) => {
    if (!name.trim() || !personId) return
    updateActivity.mutate({ id: act.id, name: name.trim(), person_id: personId })
  }

  const handleSaveOccurrence = (occ: ActivityOccurrence) => {
    const state = editOccurrences[occ.id]
    if (!state) return
    const separate = state.separate_pick_up ?? false
    const dropOffMode = state.drop_off_mode ?? 'parent'
    const pickUpMode = separate ? state.pick_up_mode ?? 'parent' : dropOffMode
    const dropOffParentId = state.drop_off_parent_id ?? null
    const pickUpParentId = separate ? state.pick_up_parent_id ?? null : dropOffParentId
    updateOccurrence.mutate({
      id: occ.id,
      day_of_week: state.day_of_week,
      start_time: state.start_time,
      end_time: state.end_time,
      drop_off_mode: dropOffMode,
      pick_up_mode: pickUpMode,
      drop_off_parent_id: dropOffParentId,
      pick_up_parent_id: pickUpParentId,
    })
  }

  const handleAddOccurrence = (activityId: string) => {
    addOccurrence.mutate(
      {
        activity_id: activityId,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:00',
      },
      {
        onSuccess: (newOcc) => {
          setEditOccurrences((prev) => ({
            ...prev,
            [newOcc.id]: {
              day_of_week: newOcc.day_of_week,
              start_time: newOcc.start_time,
              end_time: newOcc.end_time,
              drop_off_mode: newOcc.drop_off_mode ?? 'parent',
              pick_up_mode: newOcc.pick_up_mode ?? 'parent',
              drop_off_parent_id: newOcc.drop_off_parent_id ?? null,
              pick_up_parent_id: newOcc.pick_up_parent_id ?? null,
            },
          }))
        },
      }
    )
  }

  const formatOccurrences = (act: Activity) => {
    const occs = occurrencesByActivityId.get(act.id) ?? []
    return occs.map((o) => `${dayLabel(o.day_of_week)} ${o.start_time}–${o.end_time}`).join(', ') || 'No times'
  }

  const defaultFormOccurrences: Array<{
    day_of_week: number
    start_time: string
    end_time: string
    drop_off_mode?: 'parent' | 'grandparents' | 'alone'
    pick_up_mode?: 'parent' | 'grandparents' | 'alone'
    drop_off_parent_id?: string | null
    pick_up_parent_id?: string | null
  }> = [
    { day_of_week: 3, start_time: '17:00', end_time: '18:00', drop_off_mode: 'parent', pick_up_mode: 'parent' },
  ]

  return (
    <section aria-labelledby="admin-activities-heading">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 id="admin-activities-heading" className="text-lg font-medium text-foreground">
          Activities
        </h2>
        <Button type="button" onClick={() => setShowForm(true)}>
          + Add activity
        </Button>
      </div>
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open)
          if (!open) {
            setFormName('')
            setFormPersonId('')
            setFormOccurrences([...defaultFormOccurrences])
            createActivityWithOccurrences.reset()
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add activity</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-2">
              <Label>Activity name</Label>
              <Input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Swimming"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Person</Label>
              <Select value={formPersonId || undefined} onValueChange={setFormPersonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {(people ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Times (day + start – end)</Label>
              <div className="space-y-2">
                {formOccurrences.map((occ, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <Select
                      value={String(occ.day_of_week)}
                      onValueChange={(v) =>
                        setFormOccurrences((prev) =>
                          prev.map((o, i) => (i === index ? { ...o, day_of_week: Number(v) } : o))
                        )
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="time"
                      value={occ.start_time}
                      onChange={(e) =>
                        setFormOccurrences((prev) =>
                          prev.map((o, i) => (i === index ? { ...o, start_time: e.target.value } : o))
                        )
                      }
                      className="w-[100px]"
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="time"
                      value={occ.end_time}
                      onChange={(e) =>
                        setFormOccurrences((prev) =>
                          prev.map((o, i) => (i === index ? { ...o, end_time: e.target.value } : o))
                        )
                      }
                      className="w-[100px]"
                    />
                    {formOccurrences.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-destructive/50 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveFormTime(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddTime}>
                + Add another occurance
              </Button>
            </div>
            {createActivityWithOccurrences.isError && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{(createActivityWithOccurrences.error as Error).message}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setFormName('')
                    setFormPersonId('')
                    setFormOccurrences([
                      { day_of_week: 3, start_time: '17:00', end_time: '18:00', drop_off_mode: 'parent', pick_up_mode: 'parent' },
                    ])
                    createActivityWithOccurrences.reset()
                  }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createActivityWithOccurrences.isPending || !formName.trim() || !formPersonId || formOccurrences.length === 0}
              >
                {createActivityWithOccurrences.isPending ? 'Adding…' : 'Add activity'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {activities.length === 0 && (
        <p className="text-muted-foreground mb-4">No activities yet. Add one with the button above.</p>
      )}
      <ul className="space-y-2 mb-6">
        {activities.map((act, index) => {
          const occs = occurrencesByActivityId.get(act.id) ?? []
          return (
            <li
              key={act.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
            >
              <Card className="transition-all duration-200">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-3 min-h-[48px] flex-wrap gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{act.name}</span>
                      <span className="text-sm text-muted-foreground">{personName(act.person_id)}</span>
                      <span className="text-sm text-muted-foreground">{formatOccurrences(act)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExpand(act)}
                      >
                        {expandedId === act.id ? 'Close' : 'Edit'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-destructive/50 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (window.confirm(`Delete activity "${act.name}" and all its times?`)) removeActivity.mutate(act.id)
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  {expandedId === act.id && (
                    <div
                      className="px-3 pb-3 pt-4 border-t border-border space-y-3 animate-fade-in-up"
                      style={{ animationDuration: '0.25s' }}
                    >
                      <div className="space-y-2">
                        <Label>Activity name</Label>
                        <Input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => saveActivity(act, editName, editPersonId)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Person</Label>
                        <Select
                          value={editPersonId}
                          onValueChange={(v) => {
                            setEditPersonId(v)
                            saveActivity(act, editName, v)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select person" />
                          </SelectTrigger>
                          <SelectContent>
                            {(people ?? []).map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Times (day + start – end)</Label>
                        <div className="space-y-2">
                          {occs.map((occ) => {
                            const activityPerson = (people ?? []).find((p) => p.id === act.person_id)
                            const isChildActivity = activityPerson?.role === 'child'
                            const state = editOccurrences[occ.id] ?? {
                              day_of_week: occ.day_of_week,
                              start_time: occ.start_time,
                              end_time: occ.end_time,
                              drop_off_mode: occ.drop_off_mode ?? 'parent',
                              pick_up_mode: occ.pick_up_mode ?? 'parent',
                              drop_off_parent_id: occ.drop_off_parent_id ?? null,
                              pick_up_parent_id: occ.pick_up_parent_id ?? null,
                              separate_pick_up:
                                (occ.drop_off_mode ?? 'parent') !== (occ.pick_up_mode ?? 'parent') ||
                                occ.drop_off_parent_id !== occ.pick_up_parent_id,
                            }
                            const parents = (people ?? []).filter((p) => p.role === 'parent')
                            const separate =
                              state.separate_pick_up ??
                              ((state.drop_off_mode ?? 'parent') !== (state.pick_up_mode ?? 'parent') ||
                                state.drop_off_parent_id !== state.pick_up_parent_id)
                            return (
                              <div key={occ.id} className="space-y-2 p-2 rounded-lg bg-muted border border-border/60">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Select
                                    value={String(state.day_of_week)}
                                    onValueChange={(v) =>
                                      setEditOccurrences((prev) => ({
                                        ...prev,
                                        [occ.id]: { ...state, day_of_week: Number(v) },
                                      }))
                                    }
                                    onOpenChange={(open) => {
                                      if (!open) handleSaveOccurrence(occ)
                                    }}
                                  >
                                    <SelectTrigger className="w-[140px] bg-background">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {DAY_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="time"
                                    value={state.start_time}
                                    onChange={(e) =>
                                      setEditOccurrences((prev) => ({
                                        ...prev,
                                        [occ.id]: { ...state, start_time: e.target.value },
                                      }))
                                    }
                                    onBlur={() => handleSaveOccurrence(occ)}
                                    className="w-[100px] bg-background"
                                  />
                                  <span className="text-muted-foreground">–</span>
                                  <Input
                                    type="time"
                                    value={state.end_time}
                                    onChange={(e) =>
                                      setEditOccurrences((prev) => ({
                                        ...prev,
                                        [occ.id]: { ...state, end_time: e.target.value },
                                      }))
                                    }
                                    onBlur={() => handleSaveOccurrence(occ)}
                                    className="w-[100px] bg-background"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      if (window.confirm('Remove this time slot?')) removeOccurrence.mutate(occ.id)
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </div>
                                {isChildActivity && (
                                  <div className="space-y-2">
                                    {!separate ? (
                                      <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Drop-off &amp; pick-up</Label>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Select
                                            value={state.drop_off_mode ?? 'parent'}
                                            onValueChange={(v) =>
                                              setEditOccurrences((prev) => ({
                                                ...prev,
                                                [occ.id]: {
                                                  ...state,
                                                  drop_off_mode: v as 'parent' | 'grandparents' | 'alone',
                                                  pick_up_mode: v as 'parent' | 'grandparents' | 'alone',
                                                },
                                              }))
                                            }
                                            onOpenChange={(open) => {
                                              if (!open) handleSaveOccurrence(occ)
                                            }}
                                          >
                                            <SelectTrigger className="bg-background">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="parent">Parent</SelectItem>
                                              <SelectItem value="grandparents">Grandparents</SelectItem>
                                              <SelectItem value="alone">Child goes alone</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          {state.drop_off_mode === 'parent' && (
                                            <Select
                                              value={state.drop_off_parent_id ?? undefined}
                                              onValueChange={(v) =>
                                                setEditOccurrences((prev) => ({
                                                  ...prev,
                                                  [occ.id]: {
                                                    ...state,
                                                    drop_off_parent_id: v || null,
                                                    pick_up_parent_id: v || null,
                                                  },
                                                }))
                                              }
                                              onOpenChange={(open) => {
                                                if (!open) handleSaveOccurrence(occ)
                                              }}
                                            >
                                              <SelectTrigger className="bg-background">
                                                <SelectValue placeholder="Select parent" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {parents.map((p) => (
                                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <div className="space-y-1">
                                          <Label className="text-xs text-muted-foreground">Drop-off</Label>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <Select
                                              value={state.drop_off_mode ?? 'parent'}
                                              onValueChange={(v) =>
                                                setEditOccurrences((prev) => ({
                                                  ...prev,
                                                  [occ.id]: { ...state, drop_off_mode: v as 'parent' | 'grandparents' | 'alone' },
                                                }))
                                              }
                                              onOpenChange={(open) => {
                                                if (!open) handleSaveOccurrence(occ)
                                              }}
                                            >
                                              <SelectTrigger className="bg-background">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="parent">Parent</SelectItem>
                                                <SelectItem value="grandparents">Grandparents</SelectItem>
                                                <SelectItem value="alone">Child goes alone</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            {state.drop_off_mode === 'parent' && (
                                              <Select
                                                value={state.drop_off_parent_id ?? undefined}
                                                onValueChange={(v) =>
                                                  setEditOccurrences((prev) => ({
                                                    ...prev,
                                                    [occ.id]: { ...state, drop_off_parent_id: v || null },
                                                  }))
                                                }
                                                onOpenChange={(open) => {
                                                  if (!open) handleSaveOccurrence(occ)
                                                }}
                                              >
                                                <SelectTrigger className="bg-background">
                                                  <SelectValue placeholder="Select parent" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {parents.map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            )}
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs text-muted-foreground">Pick-up</Label>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <Select
                                              value={state.pick_up_mode ?? 'parent'}
                                              onValueChange={(v) =>
                                                setEditOccurrences((prev) => ({
                                                  ...prev,
                                                  [occ.id]: { ...state, pick_up_mode: v as 'parent' | 'grandparents' | 'alone' },
                                                }))
                                              }
                                              onOpenChange={(open) => {
                                                if (!open) handleSaveOccurrence(occ)
                                              }}
                                            >
                                              <SelectTrigger className="bg-background">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="parent">Parent</SelectItem>
                                                <SelectItem value="grandparents">Grandparents</SelectItem>
                                                <SelectItem value="alone">Child goes alone</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            {state.pick_up_mode === 'parent' && (
                                              <Select
                                                value={state.pick_up_parent_id ?? undefined}
                                                onValueChange={(v) =>
                                                  setEditOccurrences((prev) => ({
                                                    ...prev,
                                                    [occ.id]: { ...state, pick_up_parent_id: v || null },
                                                  }))
                                                }
                                                onOpenChange={(open) => {
                                                  if (!open) handleSaveOccurrence(occ)
                                                }}
                                              >
                                                <SelectTrigger className="bg-background">
                                                  <SelectValue placeholder="Select parent" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {parents.map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                                      <Switch
                                        checked={separate}
                                        onCheckedChange={(nextSeparate) => {
                                          setEditOccurrences((prev) => {
                                            const current = prev[occ.id] ?? state
                                            if (!nextSeparate) {
                                              // When turning off separate, align pick-up with drop-off.
                                              return {
                                                ...prev,
                                                [occ.id]: {
                                                  ...current,
                                                  separate_pick_up: false,
                                                  pick_up_mode: current.drop_off_mode ?? 'parent',
                                                  pick_up_parent_id: current.drop_off_parent_id ?? null,
                                                },
                                              }
                                            }
                                            return {
                                              ...prev,
                                              [occ.id]: {
                                                ...current,
                                                separate_pick_up: true,
                                              },
                                            }
                                          })
                                        }}
                                        className="h-4 w-7"
                                      />
                                      <span>Different parent for pick-up</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleAddOccurrence(act.id)}>
                          + Add another occurance
                        </Button>
                      </div>
                      {(updateActivity.isError || updateOccurrence.isError) && (
                        <Alert variant="destructive" role="alert">
                          <AlertDescription>
                            {(updateActivity.error ?? updateOccurrence.error) instanceof Error
                              ? (updateActivity.error ?? updateOccurrence.error)?.message
                              : 'Save failed'}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>
      {!showForm && activities.length > 0 && (
        <Button type="button" variant="outline" onClick={() => setShowForm(true)}>
          + Add another activity
        </Button>
      )}
    </section>
  )
}
