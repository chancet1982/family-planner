import { useState } from 'react'
import { useChores, useChoreMutations, useAllChoreAssignments } from '../../hooks/useChores'
import { usePeople } from '../../hooks/usePeople'

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
        <h2 id="admin-chores-heading" className="text-lg font-medium text-slate-800 mb-4">Chores</h2>
        <p className="text-slate-500">Loading…</p>
      </section>
    )
  }
  if (error) {
    return (
      <section aria-labelledby="admin-chores-heading">
        <h2 id="admin-chores-heading" className="text-lg font-medium text-slate-800 mb-4">Chores</h2>
        <p className="text-red-600" role="alert">Failed to load chores.</p>
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
        <h2 id="admin-chores-heading" className="text-lg font-medium text-slate-800">
          Chores
        </h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="min-h-[48px] px-4 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700"
          >
            + Add chore
          </button>
        )}
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="p-4 bg-slate-50 rounded-xl space-y-3 max-w-md mb-6">
          <label className="block text-sm font-medium text-slate-700">Chore name</label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Vacuum"
            className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300"
            autoFocus
          />
          <label className="block text-sm font-medium text-slate-700">Time (optional)</label>
          <input
            type="time"
            value={formScheduledTime}
            onChange={(e) => setFormScheduledTime(e.target.value)}
            className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300"
          />
          <label className="block text-sm font-medium text-slate-700">Time of day label (optional)</label>
          <input
            type="text"
            value={formTimeOfDay}
            onChange={(e) => setFormTimeOfDay(e.target.value)}
            placeholder="e.g. morning, evening"
            className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300"
          />
          <label className="block text-sm font-medium text-slate-700">Repeat on weekdays</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setFormRepeat((r) => ({ ...r, [day]: !r[day] }))}
                className={`min-h-[40px] min-w-[44px] rounded-lg border text-sm font-medium ${
                  formRepeat[day] ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {DAY_LABELS[day]}
              </button>
            ))}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">Assigned to</p>
            <p className="text-xs text-slate-500 mb-2">Select one or more household members.</p>
            <div className="flex flex-wrap gap-2">
              {(people ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">No household members yet. Add people in People first.</p>
              ) : (
                (people ?? []).map((person) => {
                  const assigned = formAssignees.includes(person.id)
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => setFormAssignees((prev) => assigned ? prev.filter((id) => id !== person.id) : [...prev, person.id])}
                      className={`min-h-[40px] px-3 rounded-lg border text-sm ${
                        assigned ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {person.name}
                    </button>
                  )
                })
              )}
            </div>
          </div>
          {create.isError && (
            <p className="text-sm text-red-600" role="alert">{(create.error as Error).message}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={create.isPending || !formName.trim()}
              className="min-h-[48px] px-4 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
            >
              {create.isPending ? 'Adding…' : 'Add chore'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormName(''); setFormAssignees([]); create.reset(); }}
              className="min-h-[48px] px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {(chores ?? []).length === 0 && !showForm && (
        <p className="text-slate-500 mb-4">No chores yet. Add one with the button above.</p>
      )}
      <ul className="space-y-2 mb-6">
        {(chores ?? []).map((chore) => (
          <li
            key={chore.id}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-3 min-h-[48px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">{chore.name}</span>
                {chore.scheduled_time && (
                  <span className="text-sm text-slate-600 font-medium">{chore.scheduled_time}</span>
                )}
                {chore.time_of_day && (
                  <span className="text-sm text-slate-500">{chore.time_of_day}</span>
                )}
                <span className="text-sm text-slate-500">
                  {(people ?? []).filter((p) => (assignmentsMap[chore.id] ?? []).includes(p.id)).map((p) => p.name).join(', ') || 'Unassigned'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (expandedId === chore.id) {
                      setExpandedId(null)
                    } else {
                      setExpandedId(chore.id)
                      setDraftChoreName(chore.name)
                    }
                  }}
                  className="min-h-[44px] px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  {expandedId === chore.id ? 'Close' : 'Edit'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete chore "${chore.name}"?`)) remove.mutate(chore.id)
                  }}
                  className="min-h-[44px] px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
            {expandedId === chore.id && (
              <div className="px-3 pb-3 pt-0 border-t border-slate-100 space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Chore name</p>
                  <input
                    type="text"
                    value={expandedId === chore.id ? draftChoreName : chore.name}
                    onChange={(e) => expandedId === chore.id && setDraftChoreName(e.target.value)}
                    onBlur={() => {
                      const v = draftChoreName.trim()
                      if (v && v !== chore.name) update.mutate({ id: chore.id, name: v })
                    }}
                    className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Time of day label (optional)</p>
                  <input
                    type="text"
                    value={chore.time_of_day ?? ''}
                    onChange={(e) => update.mutate({ id: chore.id, time_of_day: e.target.value.trim() || null })}
                    placeholder="e.g. morning, evening"
                    className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Time</p>
                  <input
                    type="time"
                    value={chore.scheduled_time ?? ''}
                    onChange={(e) => update.mutate({ id: chore.id, scheduled_time: e.target.value || null })}
                    className="min-h-[44px] px-3 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Repeat on</p>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(chore, day)}
                        className={`min-h-[40px] min-w-[44px] rounded-lg border text-sm font-medium ${
                          chore.repeat_pattern[day] ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {DAY_LABELS[day]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Assigned to</p>
                  <p className="text-xs text-slate-500 mb-2">Select one or more household members.</p>
                  <div className="flex flex-wrap gap-2">
                    {(people ?? []).length === 0 ? (
                      <p className="text-sm text-slate-500">No household members yet. Add people in People to assign this chore.</p>
                    ) : (
                      (people ?? []).map((person) => {
                        const assigned = (assignmentsMap[chore.id] ?? []).includes(person.id)
                        return (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => {
                              const current = assignmentsMap[chore.id] ?? []
                              const next = assigned
                                ? current.filter((id) => id !== person.id)
                                : [...current, person.id]
                              setAssignments.mutate({ choreId: chore.id, personIds: next })
                            }}
                            className={`min-h-[40px] px-3 rounded-lg border text-sm ${
                              assigned ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {person.name}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {!showForm && (chores ?? []).length > 0 && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="min-h-[48px] px-4 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-100"
        >
          + Add another chore
        </button>
      )}
    </section>
  )
}
