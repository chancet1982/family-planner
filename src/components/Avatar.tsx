import { getAvatarStyles, getInitials } from '../lib/avatarColors'
import type { AvatarColorKey } from '../types'

interface AvatarProps {
  name: string
  colorKey?: AvatarColorKey
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function Avatar({ name, colorKey, size = 'md', className = '' }: AvatarProps) {
  const { bg, text } = getAvatarStyles(colorKey ?? 'blue')
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizeClasses[size]} ${bg} ${text} ${className}`}
      aria-hidden
    >
      {getInitials(name)}
    </span>
  )
}
