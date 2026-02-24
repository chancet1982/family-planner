import { usePeople } from '../../hooks/usePeople'
import { useWFH, useWFHMutations } from '../../hooks/useWFH'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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
        <h2 id="admin-wfh-heading" className="text-lg font-medium text-foreground mb-4">Work from home</h2>
        <p className="text-muted-foreground">Loading…</p>
      </section>
    )
  }
  if (error) {
    return (
      <section aria-labelledby="admin-wfh-heading">
        <h2 id="admin-wfh-heading" className="text-lg font-medium text-foreground mb-4">Work from home</h2>
        <p className="text-destructive" role="alert">Failed to load work schedule.</p>
      </section>
    )
  }

  if (parents.length === 0) {
    return (
      <section aria-labelledby="admin-wfh-heading">
        <h2 id="admin-wfh-heading" className="text-lg font-medium text-foreground mb-4">Work from home</h2>
        <p className="text-muted-foreground">Add at least one parent in the People section to set work-from-home days.</p>
      </section>
    )
  }

  return (
    <section aria-labelledby="admin-wfh-heading">
      <h2 id="admin-wfh-heading" className="text-lg font-medium text-foreground mb-4">
        Work from home
      </h2>
      <p className="text-muted-foreground mb-4">
        Tick the days each parent works from home. The app will use this to suggest who drops off and picks up the kids.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Parent</TableHead>
            {DAYS.map((d) => (
              <TableHead key={d} className="text-center">
                {DAY_LABELS[d]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {parents.map((person) => (
            <TableRow key={person.id}>
              <TableCell className="font-medium">{person.name}</TableCell>
              {DAYS.map((d) => (
                <TableCell key={d} className="text-center">
                  <Button
                    type="button"
                    variant={isWFH(person.id, d) ? 'default' : 'outline'}
                    size="icon"
                    className="min-w-[44px] min-h-[44px]"
                    onClick={() => toggle(person.id, d)}
                    aria-pressed={isWFH(person.id, d)}
                    aria-label={`${person.name} ${DAY_LABELS[d]} WFH`}
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
