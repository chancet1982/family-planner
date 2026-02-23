import { useState, useEffect } from 'react'
import { useSchoolRuns, useSchoolRunMutations } from '../../hooks/useSchoolRuns'
import { useSchoolRunTimes, useSchoolRunTimesMutations, DAY_LABELS } from '../../hooks/useSchoolRunTimes'
import { useActivities } from '../../hooks/useActivities'
import { suggestedPickupForDay, parseTime } from '../../lib/schoolRunUtils'

/** Weekdays only (no school on weekends). */
const SCHOOL_DAYS = [1, 2, 3, 4, 5] as const
const DEFAULT_DROP = '08:00'
const DEFAULT_PICKUP = '15:00'

export function AdminSchoolRuns() {
  const { data: schoolRun, isLoading, error } = useSchoolRuns()
  const { data: timesMap, isLoading: timesLoading } = useSchoolRunTimes()
  const { data: activitiesData } = useActivities()
  const activitySlots = activitiesData?.slots ?? []
  const { upsertLabel } = useSchoolRunMutations()
  const { upsertAllDays } = useSchoolRunTimesMutations()
  const [label, setLabel] = useState('School')
  const [dayTimes, setDayTimes] = useState<Record<number, { drop_off_time: string; pick_up_time: string }>>({})

  useEffect(() => {
    if (schoolRun) setLabel(schoolRun.label)
  }, [schoolRun])

  useEffect(() => {
    const next: Record<number, { drop_off_time: string; pick_up_time: string }> = {}
    const legacyDrop = schoolRun?.drop_off_time ?? DEFAULT_DROP
    const legacyPickup = schoolRun?.pick_up_time ?? DEFAULT_PICKUP
    for (const d of SCHOOL_DAYS) {
      const row = timesMap?.[d]
      next[d] = {
        drop_off_time: row?.drop_off_time ?? legacyDrop,
        pick_up_time: row?.pick_up_time ?? legacyPickup,
      }
    }
    setDayTimes(next)
  }, [timesMap, schoolRun?.drop_off_time, schoolRun?.pick_up_time])

  const activitiesByDay: Record<number, { start_time: string }[]> = {}
  for (const d of SCHOOL_DAYS) {
    activitiesByDay[d] = activitySlots.filter((a) => a.day_of_week === d)
  }

  const handleSaveLabel = (e: React.FormEvent) => {
    e.preventDefault()
    upsertLabel.mutate({ label })
  }

  const handleSaveTimes = (e: React.FormEvent) => {
    e.preventDefault()
    const days = SCHOOL_DAYS.map((d) => ({
      day_of_week: d,
      drop_off_time: dayTimes[d]?.drop_off_time ?? DEFAULT_DROP,
      pick_up_time: dayTimes[d]?.pick_up_time ?? DEFAULT_PICKUP,
    }))
    upsertAllDays.mutate(days)
  }

  if (isLoading || timesLoading) {
    return (
      <section aria-labelledby="admin-school-heading">
        <h2 id="admin-school-heading" className="text-lg font-medium text-slate-800 mb-4">School times</h2>
        <p className="text-slate-500">Loading…</p>
      </section>
    )
  }
  if (error) {
    return (
      <section aria-labelledby="admin-school-heading">
        <h2 id="admin-school-heading" className="text-lg font-medium text-slate-800 mb-4">School times</h2>
        <p className="text-red-600" role="alert">Failed to load school times.</p>
      </section>
    )
  }

  return (
    <section aria-labelledby="admin-school-heading">
      <h2 id="admin-school-heading" className="text-lg font-medium text-slate-800 mb-4">
        School times
      </h2>
      <p className="text-slate-600 mb-4">
        Set drop-off and pick-up times per day. Pick-up should be 45 minutes before the first child activity.
      </p>

      <form onSubmit={handleSaveLabel} className="max-w-md space-y-2 mb-6">
        <label htmlFor="school-label" className="block text-sm font-medium text-slate-700 mb-1">
          Label
        </label>
        <div className="flex gap-2">
          <input
            id="school-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. School"
            className="flex-1 min-h-[48px] px-4 rounded-xl border border-slate-300"
          />
          <button
            type="submit"
            disabled={upsertLabel.isPending}
            className="min-h-[48px] px-4 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {upsertLabel.isPending ? 'Saving…' : 'Save label'}
          </button>
        </div>
      </form>

      <form onSubmit={handleSaveTimes} className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[400px]">
          <thead>
            <tr>
              <th className="text-left p-2 border-b border-slate-200 font-medium text-slate-700">Day</th>
              <th className="text-left p-2 border-b border-slate-200 font-medium text-slate-700">Drop-off</th>
              <th className="text-left p-2 border-b border-slate-200 font-medium text-slate-700">Pick-up</th>
              <th className="text-left p-2 border-b border-slate-200 font-medium text-slate-700 text-sm">Hint</th>
            </tr>
          </thead>
          <tbody>
            {SCHOOL_DAYS.map((d) => {
              const suggested = suggestedPickupForDay(activitiesByDay[d] ?? [])
              const currentPickup = dayTimes[d]?.pick_up_time ?? DEFAULT_PICKUP
              const suggestedMins = suggested ? parseTime(suggested) : null
              const currentMins = parseTime(currentPickup)
              const pickupOk =
                !suggestedMins ||
                (currentMins != null && currentMins <= suggestedMins)
              return (
                <tr key={d} className="border-b border-slate-100">
                  <td className="p-2 font-medium text-slate-900">{DAY_LABELS[d]}</td>
                  <td className="p-2">
                    <input
                      type="time"
                      value={dayTimes[d]?.drop_off_time ?? DEFAULT_DROP}
                      onChange={(e) =>
                        setDayTimes((prev) => ({
                          ...prev,
                          [d]: { ...prev[d], drop_off_time: e.target.value, pick_up_time: prev[d]?.pick_up_time ?? DEFAULT_PICKUP },
                        }))
                      }
                      className="min-h-[44px] px-3 rounded-lg border border-slate-300 w-full max-w-[120px]"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="time"
                      value={dayTimes[d]?.pick_up_time ?? DEFAULT_PICKUP}
                      onChange={(e) =>
                        setDayTimes((prev) => ({
                          ...prev,
                          [d]: { drop_off_time: prev[d]?.drop_off_time ?? DEFAULT_DROP, pick_up_time: e.target.value },
                        }))
                      }
                      className={`min-h-[44px] px-3 rounded-lg border w-full max-w-[120px] ${
                        pickupOk ? 'border-slate-300' : 'border-amber-400 bg-amber-50'
                      }`}
                      title={suggested ? `Pick-up 45 min before first activity (by ${suggested})` : undefined}
                    />
                  </td>
                  <td className="p-2 text-sm text-slate-500">
                    {suggested ? (
                      <span className={pickupOk ? '' : 'text-amber-600'}>
                        First activity → pick-up by {suggested}
                      </span>
                    ) : (
                      <span className="text-slate-400">No activities</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {upsertAllDays.isError && (
          <p className="text-sm text-red-600 mt-2" role="alert">
            {(upsertAllDays.error as Error).message}
          </p>
        )}
        <button
          type="submit"
          disabled={upsertAllDays.isPending}
          className="mt-4 min-h-[48px] px-6 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {upsertAllDays.isPending ? 'Saving…' : 'Save times'}
        </button>
      </form>
    </section>
  )
}
