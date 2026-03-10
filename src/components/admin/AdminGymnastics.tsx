import { usePeople } from '../../hooks/usePeople'
import { useGymnastics, useGymnasticsMutations } from '../../hooks/useGymnastics'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const DAYS = [1, 2, 3, 4, 5] as const
const DAY_LABELS: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
}

export function AdminGymnastics() {
  const { data: people } = usePeople()
  const { data: gymList, isLoading, error } = useGymnastics()
  const { setDay } = useGymnasticsMutations()

  const children = (people ?? []).filter((p) => p.role === 'child')
  const gymSet = new Set((gymList ?? []).map((g) => `${g.person_id}:${g.day_of_week}`))

  const hasGym = (personId: string, dayOfWeek: number) =>
    gymSet.has(`${personId}:${dayOfWeek}`)

  const toggle = (personId: string, dayOfWeek: number) => {
    setDay.mutate({
      personId,
      dayOfWeek,
      add: !hasGym(personId, dayOfWeek),
    })
  }

  if (isLoading) {
    return (
      <section aria-labelledby="admin-gym-heading">
        <h2 id="admin-gym-heading" className="text-lg font-medium text-foreground mb-4">Gymnastics</h2>
        <p className="text-muted-foreground">Loading…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section aria-labelledby="admin-gym-heading">
        <h2 id="admin-gym-heading" className="text-lg font-medium text-foreground mb-4">Gymnastics</h2>
        <p className="text-destructive" role="alert">Failed to load gymnastics schedule.</p>
      </section>
    )
  }

  if (children.length === 0) {
    return (
      <section aria-labelledby="admin-gym-heading">
        <h2 id="admin-gym-heading" className="text-lg font-medium text-foreground mb-4">Gymnastics</h2>
        <p className="text-muted-foreground">
          Add at least one child in the People section to set gymnastics days.
        </p>
      </section>
    )
  }

  return (
    <section aria-labelledby="admin-gym-heading" className="animate-fade-in-up">
      <h2 id="admin-gym-heading" className="text-lg font-medium text-foreground mb-2">
        Gymnastics
      </h2>
      <p className="text-muted-foreground mb-4 text-sm max-w-xl">
        Mark which weekdays each child has gymnastics. The weekly schedule will automatically add
        chores to pack their gymnastics bag in the morning and empty it in the evening on those days.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Child</TableHead>
            {DAYS.map((d) => (
              <TableHead key={d} className="text-center">
                {DAY_LABELS[d]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {children.map((child, index) => (
            <TableRow
              key={child.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${Math.min(index * 50, 350)}ms` }}
            >
              <TableCell className="font-medium">{child.name}</TableCell>
              {DAYS.map((d) => (
                <TableCell key={d} className="text-center">
                  <Button
                    type="button"
                    variant={hasGym(child.id, d) ? 'default' : 'outline'}
                    size="icon"
                    className="min-w-[44px] min-h-[44px]"
                    onClick={() => toggle(child.id, d)}
                    aria-pressed={hasGym(child.id, d)}
                    aria-label={`${child.name} ${DAY_LABELS[d]} gymnastics`}
                  >
                    ✓
                  </Button>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

