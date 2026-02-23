import type { Person } from '../types'
import { Avatar } from './Avatar'

interface PersonFilterProps {
  people: Person[]
  /** null or '' = Everyone; otherwise the selected person's id. */
  selectedId: string | null
  onChange: (personId: string | null) => void
  label?: string
}

export function PersonFilter({ people, selectedId, onChange, label = 'Show' }: PersonFilterProps) {
  const isEveryone = selectedId === null || selectedId === ''

  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && (
        <span className="text-sm font-medium text-slate-700">{label}</span>
      )}
      <div
        className="inline-flex rounded-xl border border-slate-300 bg-slate-100 p-1 gap-0.5"
        role="group"
        aria-label="Filter by person"
      >
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`min-h-[40px] px-4 rounded-lg font-medium text-sm transition-colors ${
            isEveryone
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-pressed={isEveryone}
        >
          Everyone
        </button>
        {people.map((p) => {
          const selected = selectedId === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              className={`min-h-[40px] px-4 rounded-lg font-medium text-sm transition-colors inline-flex items-center gap-2 ${
                selected
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-pressed={selected}
            >
              <Avatar name={p.name} colorKey={p.avatar_color} size="sm" />
              {p.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
