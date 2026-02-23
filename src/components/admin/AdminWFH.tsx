import { usePeople } from '../../hooks/usePeople'
import { useWFH, useWFHMutations } from '../../hooks/useWFH'

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const
const DAY_LABELS: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun',
}

export function AdminWFH() {
  const { data: people } = usePeople()
  const { data: wfhList, isLoading, error } = useWFH()
  const { setDay } = useWFHMutations()
  const parents = (people ?? []).filter((p) => p.role === 'parent')
  const wfhSet = new Set((wfhList ?? []).map((w) => `${w.person_id}:${w.day_of_week}`))

  const isWFH = (personId: string, dayOfWeek: number) =>
    wfhSet.has(`${personId}:${dayOfWeek}`)

  const toggle = (personId: string, dayOfWeek: number) => {
    setDay.mutate({
      personId,
      dayOfWeek,
      add: !isWFH(personId, dayOfWeek),
    })
  }

  if (isLoading) {
    return (
      <section aria-labelledby="admin-wfh-heading">
        <h2 id="admin-wfh-heading" className="text-lg font-medium text-slate-800 mb-4">Work from home</h2>
        <p className="text-slate-500">Loading…</p>
      </section>
    )
  }
  if (error) {
    return (
      <section aria-labelledby="admin-wfh-heading">
        <h2 id="admin-wfh-heading" className="text-lg font-medium text-slate-800 mb-4">Work from home</h2>
        <p className="text-red-600" role="alert">Failed to load work schedule.</p>
      </section>
    )
  }

  if (parents.length === 0) {
    return (
      <section aria-labelledby="admin-wfh-heading">
        <h2 id="admin-wfh-heading" className="text-lg font-medium text-slate-800 mb-4">Work from home</h2>
        <p className="text-slate-600">Add at least one parent in the People section to set work-from-home days.</p>
      </section>
    )
  }

  return (
    <section aria-labelledby="admin-wfh-heading">
      <h2 id="admin-wfh-heading" className="text-lg font-medium text-slate-800 mb-4">
        Work from home
      </h2>
      <p className="text-slate-600 mb-4">
        Tick the days each parent works from home. The app will use this to suggest who drops off and picks up the kids.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[400px]">
          <thead>
            <tr>
              <th className="text-left p-2 border-b border-slate-200 font-medium text-slate-700">Parent</th>
              {DAYS.map((d) => (
                <th key={d} className="p-2 border-b border-slate-200 font-medium text-slate-700 text-center">
                  {DAY_LABELS[d]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parents.map((person) => (
              <tr key={person.id} className="border-b border-slate-100">
                <td className="p-2 font-medium text-slate-900">{person.name}</td>
                {DAYS.map((d) => (
                  <td key={d} className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => toggle(person.id, d)}
                      className={`min-h-[44px] min-w-[44px] rounded-lg border-2 transition-colors ${
                        isWFH(person.id, d)
                          ? 'bg-slate-800 border-slate-800 text-white'
                          : 'border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}
                      aria-pressed={isWFH(person.id, d)}
                      aria-label={`${person.name} ${DAY_LABELS[d]} WFH`}
                    >
                      ✓
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
