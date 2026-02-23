interface GrandparentsAlertProps {
  dayLabel: string
  className?: string
}

export function GrandparentsAlert({ dayLabel, className = '' }: GrandparentsAlertProps) {
  return (
    <div
      role="alert"
      className={`rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 ${className}`}
    >
      <strong>{dayLabel}:</strong> No parent WFH today – consider asking grandparents for help with school run.
    </div>
  )
}
