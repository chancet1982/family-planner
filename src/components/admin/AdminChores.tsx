import { useState } from 'react'
import { useChores, useChoreMutations, useAllChoreAssignments } from '../../hooks/useChores'
import { usePeople } from '../../hooks/usePeople'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const DAY_LABELS: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

const DEFAULT_REPEAT: Record<string, boolean> = {
  mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false,
}

export function AdminChores() {
  const { data: chores, isLoading, error } = useChores()
  const { data: people } = usePeople()
  const { create, update, remove, setAssignments } = useChoreMutations()
  const choreIds = (chores ?? []).map((c) => c.id)
  const { data: assignmentsMap = {} } = useAllChoreAssignments(choreIds)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [draftChoreName, setDraftChoreName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formRepeat, setFormRepeat] = useState<Record<string, boolean>>({ ...DEFAULT_REPEAT })
  const [formTimeOfDay, setFormTimeOfDay] = useState('')
  const [formScheduledTime, setFormScheduledTime] = useState('')
  const [formAssignees, setFormAssignees] = useState<string[]>([])

  if (isLoading) {
    return (
      <section aria-labelledby="admin-chores-heading">
        <h2 id="admin-chores-heading" className="text-lg font-medium text-foreground mb-4">Chores</h2>
        <p className="text-muted-foreground">Loading…</p>
      </section>
    )
  }
  if (error) {
    return (
      <section aria-labelledby="admin-chores-heading">
        <h2 id="admin-chores-heading" className="text-lg font-medium text-foreground mb-4">Chores</h2>
        <Alert variant="destructive" role="alert">
          <AlertDescription>Failed to load chores.</AlertDescription>
        </Alert>
      </section>
    )
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return
    const assigneeIds = [...formAssignees]
    create.mutate(
      {
        name: formName.trim(),
        repeat_pattern: { ...formRepeat },
        time_of_day: formTimeOfDay.trim() || null,
        scheduled_time: formScheduledTime.trim() || null,
      },
      {
        onSuccess: (data) => {
          if (data?.id && assigneeIds.length > 0) {
            setAssignments.mutate({ choreId: data.id, personIds: assigneeIds })
          }
          setFormName('')
          setFormRepeat({ ...DEFAULT_REPEAT })
          setFormTimeOfDay('')
          setFormScheduledTime('')
          setFormAssignees([])
          setShowForm(false)
        },
      }
    )
  }

  const toggleDay = (chore: { id: string; repeat_pattern: Record<string, boolean> }, day: string) => {
    const next = { ...chore.repeat_pattern, [day]: !chore.repeat_pattern[day] }
    update.mutate({ id: chore.id, repeat_pattern: next })
  }

  return (
    <section aria-labelledby="admin-chores-heading">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 id="admin-chores-heading" className="text-lg font-medium text-foreground">
          Chores
        </h2>
        <Button type="button" onClick={() => setShowForm(true)}>
          + Add chore
        </Button>
      </div>
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open)
          if (!open) {
            setFormName('')
            setFormRepeat({ ...DEFAULT_REPEAT })
            setFormTimeOfDay('')
            setFormScheduledTime('')
            setFormAssignees([])
            create.reset()
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add chore</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-2">
              <Label>Chore name</Label>
              <Input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Vacuum"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Time (optional)</Label>
              <Input
                type="time"
                value={formScheduledTime}
                onChange={(e) => setFormScheduledTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Time of day label (optional)</Label>
              <Input
                type="text"
                value={formTimeOfDay}
                onChange={(e) => setFormTimeOfDay(e.target.value)}
                placeholder="e.g. morning, evening"
              />
            </div>
            <div className="space-y-2">
              <Label>Repeat on weekdays</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <Button
                    key={day}
                    type="button"
                    variant={formRepeat[day] ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormRepeat((r) => ({ ...r, [day]: !r[day] }))}
                  >
                    {DAY_LABELS[day]}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assigned to</Label>
              <p className="text-xs text-muted-foreground">Select one or more household members.</p>
              <div className="flex flex-wrap gap-2">
                {(people ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No household members yet. Add people in People first.</p>
                ) : (
                  (people ?? []).map((person) => {
                    const assigned = formAssignees.includes(person.id)
                    return (
                      <Button
                        key={person.id}
                        type="button"
                        variant={assigned ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormAssignees((prev) => assigned ? prev.filter((id) => id !== person.id) : [...prev, person.id])}
                      >
                        {person.name}
                      </Button>
                    )
                  })
                )}
              </div>
            </div>
            {create.isError && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{(create.error as Error).message}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setFormName('')
                  setFormRepeat({ ...DEFAULT_REPEAT })
                  setFormTimeOfDay('')
                  setFormScheduledTime('')
                  setFormAssignees([])
                  create.reset()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || !formName.trim()}>
                {create.isPending ? 'Adding…' : 'Add chore'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {(chores ?? []).length === 0 && !showForm && (
        <p className="text-muted-foreground mb-4">No chores yet. Add one with the button above.</p>
      )}
      <ul className="space-y-2 mb-6">
        {(chores ?? []).map((chore) => (
          <li key={chore.id}>
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-3 min-h-[48px] flex-wrap gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{chore.name}</span>
                    {chore.scheduled_time && (
                      <span className="text-sm text-muted-foreground font-medium">{chore.scheduled_time}</span>
                    )}
                    {chore.time_of_day && (
                      <span className="text-sm text-muted-foreground">{chore.time_of_day}</span>
                    )}
                    <span className="text-sm text-muted-foreground flex flex-wrap items-center gap-1">
                      {(people ?? []).filter((p) => (assignmentsMap[chore.id] ?? []).includes(p.id)).length > 0
                        ? (people ?? []).filter((p) => (assignmentsMap[chore.id] ?? []).includes(p.id)).map((p) => (
                            <Badge key={p.id} variant="secondary">{p.name}</Badge>
                          ))
                        : 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (expandedId === chore.id) {
                          setExpandedId(null)
                        } else {
                          setExpandedId(chore.id)
                          setDraftChoreName(chore.name)
                        }
                      }}
                    >
                      {expandedId === chore.id ? 'Close' : 'Edit'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (window.confirm(`Delete chore "${chore.name}"?`)) remove.mutate(chore.id)
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                {expandedId === chore.id && (
                  <div className="px-3 pb-3 pt-0 border-t border-border space-y-3">
                    <div className="space-y-2">
                      <Label>Chore name</Label>
                      <Input
                        type="text"
                        value={expandedId === chore.id ? draftChoreName : chore.name}
                        onChange={(e) => expandedId === chore.id && setDraftChoreName(e.target.value)}
                        onBlur={() => {
                          const v = draftChoreName.trim()
                          if (v && v !== chore.name) update.mutate({ id: chore.id, name: v })
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time of day label (optional)</Label>
                      <Input
                        type="text"
                        value={chore.time_of_day ?? ''}
                        onChange={(e) => update.mutate({ id: chore.id, time_of_day: e.target.value.trim() || null })}
                        placeholder="e.g. morning, evening"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={chore.scheduled_time ?? ''}
                        onChange={(e) => update.mutate({ id: chore.id, scheduled_time: e.target.value || null })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Repeat on</Label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map((day) => (
                          <Button
                            key={day}
                            type="button"
                            variant={chore.repeat_pattern[day] ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleDay(chore, day)}
                          >
                            {DAY_LABELS[day]}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Assigned to</Label>
                      <p className="text-xs text-muted-foreground">Select one or more household members.</p>
                      <div className="flex flex-wrap gap-2">
                        {(people ?? []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No household members yet. Add people in People to assign this chore.</p>
                        ) : (
                          (people ?? []).map((person) => {
                            const assigned = (assignmentsMap[chore.id] ?? []).includes(person.id)
                            return (
                              <Button
                                key={person.id}
                                type="button"
                                variant={assigned ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                  const current = assignmentsMap[chore.id] ?? []
                                  const next = assigned
                                    ? current.filter((id) => id !== person.id)
                                    : [...current, person.id]
                                  setAssignments.mutate({ choreId: chore.id, personIds: next })
                                }}
                              >
                                {person.name}
                              </Button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {!showForm && (chores ?? []).length > 0 && (
        <Button type="button" variant="outline" onClick={() => setShowForm(true)}>
          + Add another chore
        </Button>
      )}
    </section>
  )
}
