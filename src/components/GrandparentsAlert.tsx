import { Alert, AlertDescription } from '@/components/ui/alert'

interface GrandparentsAlertProps {
  dayLabel: string
  className?: string
}

export function GrandparentsAlert({ dayLabel, className = '' }: GrandparentsAlertProps) {
  return (
    <Alert
      role="alert"
      className={`border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 ${className}`}
    >
      <AlertDescription>
        <strong>{dayLabel}:</strong> No parent WFH today – consider asking grandparents for help with school run.
      </AlertDescription>
    </Alert>
  )
}
