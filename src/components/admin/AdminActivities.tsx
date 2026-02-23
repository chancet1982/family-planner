import { useState } from 'react'
import { useActivities, useActivityMutations } from '../../hooks/useActivities'
import { usePeople } from '../../hooks/usePeople'
import type { Activity, ActivityOccurrence } from '../../types'

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
  const [formOccurrences, setFormOccurrences] = useState<Array<{ day_of_week: number; start_time: string; end_time: string }>>([
    { day_of_week: 3, start_time: '17:00', end_time: '18:00' },
  ])
  const [editName, setEditName] = useState('')
  const [editPersonId, setEditPersonId] = useState('')
  const [editOccurrences, setEditOccurrences] = useState<Record<string, { day_of_week: number; start_time: string; end_time: string }>>({})

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
        <h2 id="admin-activities-heading" className="text-lg font-medium text-slate-800 mb-4">Activities</h2>
        <p className="text-slate-500">Loading…</p>
      </section>
    )
  }
  if (error) {
    return (
      <section aria-labelledby="admin-activities-heading">
        <h2 id="admin-activities-heading" className="text-lg font-medium text-slate-800 mb-4">Activities</h2>
        <p className="text-red-600" role="alert">Failed to load activities.</p>
      </section>
    )
  }

  const personName = (id: string) => (people ?? []).find((p) => p.id === id)?.name ?? id
  const dayLabel = (d: number) => DAY_OPTIONS.find((o) => o.value === d)?.label ?? ''

  const handleAddTime = () => {
    setFormOccurrences((prev) => [...prev, { day_of_week: 1, start_time: '09:00', end_time: '10:00' }])
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
          setFormOccurrences([{ day_of_week: 3, start_time: '17:00', end_time: '18:00' }])
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
    const next: Record<string, { day_of_week: number; start_time: string; end_time: string }> = {}
    for (const o of occs) {
      next[o.id] = { day_of_week: o.day_of_week, start_time: o.start_time, end_time: o.end_time }
    }
    setEditOccurrences(next)
  }

  const handleSaveActivity = (act: Activity) => {
    if (!editName.trim() || !editPersonId) return
    updateActivity.mutate(
      { id: act.id, name: editName.trim(), person_id: editPersonId },
      { onSuccess: () => setExpandedId(null) }
    )
  }

  const handleSaveOccurrence = (occ: ActivityOccurrence) => {
    const state = editOccurrences[occ.id]
    if (!state) return
    updateOccurrence.mutate(
      { id: occ.id, day_of_week: state.day_of_week, start_time: state.start_time, end_time: state.end_time },
      { onSuccess: () => {} }
    )
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
            [newOcc.id]: { day_of_week: newOcc.day_of_week, start_time: newOcc.start_time, end_time: newOcc.end_time },
          }))
        },
      }
    )
  }

  const formatOccurrences = (act: Activity) => {
    const occs = occurrencesByActivityId.get(act.id) ?? []
    return occs.map((o) => `${dayLabel(o.day_of_week)} ${o.start_time}–${o.end_time}`).join(', ') || 'No times'
  }

  return (
    <section aria-labelledby="admin-activities-heading">
      <h2 id="admin-activities-heading" className="text-lg font-medium text-slate-800 mb-4">
        Activities
      </h2>
      <ul className="space-y-2 mb-6">
        {activities.map((act) => {
          const occs = occurrencesByActivityId.get(act.id) ?? []
          return (
            <li key={act.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-3 min-h-[48px] flex-wrap gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{act.name}</span>
                  <span className="text-sm text-slate-500">{personName(act.person_id)}</span>
                  <span className="text-sm text-slate-500">{formatOccurrences(act)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleExpand(act)}
                    className="min-h-[44px] px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    {expandedId === act.id ? 'Close' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete activity "${act.name}" and all its times?`)) removeActivity.mutate(act.id)
                    }}
                    className="min-h-[44px] px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {expandedId === act.id && (
                <div className="px-3 pb-3 pt-0 border-t border-slate-100 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Activity name</p>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Person</p>
                    <select
                      value={editPersonId}
                      onChange={(e) => setEditPersonId(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300"
                    >
                      <option value="">Select person</option>
                      {(people ?? []).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Times (day + start – end)</p>
                    <div className="space-y-2">
                      {occs.map((occ) => {
                        const state = editOccurrences[occ.id] ?? { day_of_week: occ.day_of_week, start_time: occ.start_time, end_time: occ.end_time }
                        return (
                          <div key={occ.id} className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-slate-50">
                            <select
                              value={state.day_of_week}
                              onChange={(e) =>
                                setEditOccurrences((prev) => ({
                                  ...prev,
                                  [occ.id]: { ...state, day_of_week: Number(e.target.value) },
                                }))
                              }
                              className="min-h-[36px] px-2 rounded border border-slate-300"
                            >
                              {DAY_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                            <input
                              type="time"
                              value={state.start_time}
                              onChange={(e) =>
                                setEditOccurrences((prev) => ({
                                  ...prev,
                                  [occ.id]: { ...state, start_time: e.target.value },
                                }))
                              }
                              className="min-h-[36px] px-2 rounded border border-slate-300"
                            />
                            <span className="text-slate-500">–</span>
                            <input
                              type="time"
                              value={state.end_time}
                              onChange={(e) =>
                                setEditOccurrences((prev) => ({
                                  ...prev,
                                  [occ.id]: { ...state, end_time: e.target.value },
                                }))
                              }
                              className="min-h-[36px] px-2 rounded border border-slate-300"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveOccurrence(occ)}
                              className="min-h-[36px] px-3 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Remove this time slot?')) removeOccurrence.mutate(occ.id)
                              }}
                              className="min-h-[36px] px-3 rounded border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddOccurrence(act.id)}
                      className="mt-2 min-h-[36px] px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-medium"
                    >
                      + Add another time
                    </button>
                  </div>
                  {(updateActivity.isError || updateOccurrence.isError) && (
                    <p className="text-sm text-red-600" role="alert">
                      {(updateActivity.error ?? updateOccurrence.error) instanceof Error
                        ? (updateActivity.error ?? updateOccurrence.error)?.message
                        : 'Save failed'}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveActivity(act)}
                      disabled={updateActivity.isPending || !editName.trim() || !editPersonId}
                      className="min-h-[44px] px-4 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
                    >
                      {updateActivity.isPending ? 'Saving…' : 'Save name & person'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedId(null)}
                      className="min-h-[44px] px-4 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {showForm ? (
        <form onSubmit={handleCreate} className="p-4 bg-slate-50 rounded-xl space-y-3 max-w-md">
          <label className="block text-sm font-medium text-slate-700">Activity name</label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Swimming"
            className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300"
            autoFocus
          />
          <label className="block text-sm font-medium text-slate-700">Person</label>
          <select
            value={formPersonId}
            onChange={(e) => setFormPersonId(e.target.value)}
            className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300"
            required
          >
            <option value="">Select person</option>
            {(people ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Times (day + start – end)</label>
            <div className="space-y-2">
              {formOccurrences.map((occ, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2">
                  <select
                    value={occ.day_of_week}
                    onChange={(e) =>
                      setFormOccurrences((prev) =>
                        prev.map((o, i) => (i === index ? { ...o, day_of_week: Number(e.target.value) } : o))
                      )
                    }
                    className="min-h-[44px] px-3 rounded-xl border border-slate-300"
                  >
                    {DAY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={occ.start_time}
                    onChange={(e) =>
                      setFormOccurrences((prev) =>
                        prev.map((o, i) => (i === index ? { ...o, start_time: e.target.value } : o))
                      )
                    }
                    className="min-h-[44px] px-3 rounded-xl border border-slate-300"
                  />
                  <span className="text-slate-500">–</span>
                  <input
                    type="time"
                    value={occ.end_time}
                    onChange={(e) =>
                      setFormOccurrences((prev) =>
                        prev.map((o, i) => (i === index ? { ...o, end_time: e.target.value } : o))
                      )
                    }
                    className="min-h-[44px] px-3 rounded-xl border border-slate-300"
                  />
                  {formOccurrences.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFormTime(index)}
                      className="min-h-[44px] px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddTime}
              className="mt-2 min-h-[44px] px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              + Add another time (e.g. Wed 17:00–18:00 and Sat 11:00–12:00)
            </button>
          </div>
          {createActivityWithOccurrences.isError && (
            <p className="text-sm text-red-600" role="alert">{(createActivityWithOccurrences.error as Error).message}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createActivityWithOccurrences.isPending || !formName.trim() || !formPersonId || formOccurrences.length === 0}
              className="min-h-[48px] px-4 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
            >
              {createActivityWithOccurrences.isPending ? 'Adding…' : 'Add activity'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                createActivityWithOccurrences.reset()
              }}
              className="min-h-[48px] px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="min-h-[48px] px-4 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-100"
        >
          + Add activity
        </button>
      )}
    </section>
  )
}
