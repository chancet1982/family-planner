import type { AvatarColorKey } from '../types'

export const AVATAR_COLORS: { id: AvatarColorKey; label: string; bg: string; text: string; cardBg: string; cardBorder: string }[] = [
  { id: 'blue', label: 'Blue', bg: 'bg-blue-500', text: 'text-white', cardBg: 'bg-blue-50', cardBorder: 'border-blue-200' },
  { id: 'green', label: 'Green', bg: 'bg-green-500', text: 'text-white', cardBg: 'bg-green-50', cardBorder: 'border-green-200' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500', text: 'text-white', cardBg: 'bg-emerald-50', cardBorder: 'border-emerald-200' },
  { id: 'teal', label: 'Teal', bg: 'bg-teal-500', text: 'text-white', cardBg: 'bg-teal-50', cardBorder: 'border-teal-200' },
  { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-500', text: 'text-white', cardBg: 'bg-cyan-50', cardBorder: 'border-cyan-200' },
  { id: 'violet', label: 'Violet', bg: 'bg-violet-500', text: 'text-white', cardBg: 'bg-violet-50', cardBorder: 'border-violet-200' },
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', text: 'text-white', cardBg: 'bg-indigo-50', cardBorder: 'border-indigo-200' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500', text: 'text-white', cardBg: 'bg-rose-50', cardBorder: 'border-rose-200' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500', text: 'text-slate-900', cardBg: 'bg-amber-50', cardBorder: 'border-amber-200' },
  { id: 'orange', label: 'Orange', bg: 'bg-orange-500', text: 'text-white', cardBg: 'bg-orange-50', cardBorder: 'border-orange-200' },
]

const COLOR_MAP = Object.fromEntries(AVATAR_COLORS.map((c) => [c.id, c])) as Record<AvatarColorKey, (typeof AVATAR_COLORS)[0]>

export function getAvatarStyles(colorKey: AvatarColorKey | undefined) {
  const c = colorKey ? COLOR_MAP[colorKey] : AVATAR_COLORS[0]
  return { bg: c.bg, text: c.text }
}

/** Light background and border for activity cards keyed by person avatar color */
export function getActivityCardStyles(colorKey: AvatarColorKey | undefined) {
  const c = colorKey ? COLOR_MAP[colorKey] : AVATAR_COLORS[0]
  return { cardBg: c.cardBg, cardBorder: c.cardBorder }
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
  return (name.trim().slice(0, 2) || '?').toUpperCase()
}
