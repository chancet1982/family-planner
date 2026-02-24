import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil } from 'lucide-react'
import type { AllocationResult } from '../types'
import type { Person } from '../types'
import type { SchoolRunTime } from '../types'

export type SetDayAssignments = (input: {
  day_of_week: number
  drop_off_assigned_person_id: string | null
  pick_up_assigned_person_id: string | null
}) => void

export function WhoDoingWhatCard({
  day,
  timesMap,
  allocations,
  parents,
  personName,
  selectOpenDay,
  setSelectOpenDay,
  setDayAssignments,
}: {
  day: number
  timesMap: Record<number, SchoolRunTime> | undefined
  allocations: Record<number, AllocationResult>
  parents: Person[]
  personName: (id: string) => string
  selectOpenDay: number | null
  setSelectOpenDay: (v: number | null) => void
  setDayAssignments: SetDayAssignments
}) {
  const open = selectOpenDay === day
  const hasBoth = timesMap?.[day]?.drop_off_assigned_person_id != null && timesMap?.[day]?.pick_up_assigned_person_id != null
  const dropVal = timesMap?.[day]?.drop_off_assigned_person_id ?? allocations[day]?.drop_off_parent_id ?? ''
  const pickVal = timesMap?.[day]?.pick_up_assigned_person_id ?? allocations[day]?.pick_up_parent_id ?? ''
  return (
    <Card className="text-sm mt-2">
      <CardContent className="px-3 py-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-foreground">Who&apos;s doing what?</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={hasBoth && !open ? 'min-w-9 px-2' : ''}
            onClick={() => setSelectOpenDay(open ? null : day)}
            aria-label={open ? 'Close' : hasBoth ? 'Edit assignments' : 'Select who does drop-off and pick-up'}
            title={open ? 'Close' : hasBoth ? 'Edit' : 'Select'}
          >
            {open ? 'Close' : hasBoth ? <Pencil className="size-4" aria-hidden /> : 'Select'}
          </Button>
        </div>
        {(timesMap?.[day]?.drop_off_assigned_person_id != null || timesMap?.[day]?.pick_up_assigned_person_id != null) && !open && (
          <div className="text-muted-foreground space-y-0.5">
            {timesMap?.[day]?.drop_off_assigned_person_id != null && (
              <div>Drop-off {timesMap[day].drop_off_time}: {personName(timesMap[day].drop_off_assigned_person_id!)}</div>
            )}
            {timesMap?.[day]?.pick_up_assigned_person_id != null && (
              <div>Pick-up {timesMap[day].pick_up_time}: {personName(timesMap[day].pick_up_assigned_person_id!)}</div>
            )}
          </div>
        )}
        {open && (
          <div className="space-y-1.5 pt-0.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Drop-off {timesMap?.[day]?.drop_off_time ?? '08:00'}</span>
              <Select
                value={dropVal || '__none__'}
                onValueChange={(v) => setDayAssignments({ day_of_week: day, drop_off_assigned_person_id: v === '__none__' ? null : v, pick_up_assigned_person_id: timesMap?.[day]?.pick_up_assigned_person_id ?? allocations[day]?.pick_up_parent_id ?? null })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {parents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Pick-up {timesMap?.[day]?.pick_up_time ?? '15:00'}</span>
              <Select
                value={pickVal || '__none__'}
                onValueChange={(v) => setDayAssignments({ day_of_week: day, drop_off_assigned_person_id: timesMap?.[day]?.drop_off_assigned_person_id ?? allocations[day]?.drop_off_parent_id ?? null, pick_up_assigned_person_id: v === '__none__' ? null : v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {parents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
