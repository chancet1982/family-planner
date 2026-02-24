import type { Person } from '../types'
import { Avatar } from './Avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface PersonFilterProps {
  people: Person[]
  /** null or '' = Everyone; otherwise the selected person's id. */
  selectedId: string | null
  onChange: (personId: string | null) => void
  label?: string
}

export function PersonFilter({ people, selectedId, onChange, label = 'Show' }: PersonFilterProps) {
  const value = selectedId === null || selectedId === '' ? 'everyone' : selectedId

  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && (
        <span className="text-sm font-medium text-foreground">{label}</span>
      )}
      <Tabs
        value={value}
        onValueChange={(v) => onChange(v === 'everyone' ? null : v)}
        className="w-auto"
      >
        <TabsList role="group" aria-label="Filter by person" className="inline-flex rounded-lg p-1 h-auto flex-wrap gap-0.5">
          <TabsTrigger value="everyone" className="min-h-[40px] px-4 data-[state=active]:bg-background">
            Everyone
          </TabsTrigger>
          {people.map((p) => (
            <TabsTrigger
              key={p.id}
              value={p.id}
              className={cn('min-h-[40px] px-4 inline-flex items-center gap-2 data-[state=active]:bg-background')}
            >
              <Avatar name={p.name} colorKey={p.avatar_color} size="sm" />
              {p.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
