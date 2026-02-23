import { useState } from 'react'
import { usePeople, usePersonMutations } from '../../hooks/usePeople'
import type { Person, PersonRole } from '../../types'
import type { AvatarColorKey } from '../../types'
import { Avatar } from '../Avatar'
import { AVATAR_COLORS } from '../../lib/avatarColors'

const DRAG_DATA_KEY = 'application/x-people-id'
const DEFAULT_AVATAR_COLOR: AvatarColorKey = 'blue'

export function AdminPeople() {
  const { data: people, isLoading, error } = usePeople()
  const { create, update, remove, reorder } = usePersonMutations()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<PersonRole>('child')
  const [newAvatarColor, setNewAvatarColor] = useState<AvatarColorKey>(DEFAULT_AVATAR_COLOR)
  const [showForm, setShowForm] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <section aria-labelledby="admin-people-heading">
        <h2 id="admin-people-heading" className="text-lg font-medium text-slate-800 mb-4">
          People
        </h2>
        <p className="text-slate-500">Loading…</p>
      </section>
    )
  }
  if (error) {
    return (
      <section aria-labelledby="admin-people-heading">
        <h2 id="admin-people-heading" className="text-lg font-medium text-slate-800 mb-4">
          People
        </h2>
        <p className="text-red-600" role="alert">Failed to load people.</p>
      </section>
    )
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    create.mutate(
      { name: newName.trim(), role: newRole, avatar_color: newAvatarColor },
      {
        onSuccess: () => {
          setNewName('')
          setNewRole('child')
          setNewAvatarColor(DEFAULT_AVATAR_COLOR)
          setShowForm(false)
        },
      }
    )
  }

  const toggleExpand = (p: Person) => {
    if (expandedId === p.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(p.id)
    setDraftName(p.name)
  }

  const handleSaveOrder = (person: Person, direction: 'up' | 'down') => {
    const list = people ?? []
    const idx = list.findIndex((x) => x.id === person.id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= list.length) return
    const other = list[swapIdx]!
    update.mutate({ id: person.id, display_order: other.display_order })
    update.mutate({ id: other.id, display_order: person.display_order })
  }

  const handleDragStart = (e: React.DragEvent, personId: string) => {
    setDraggedId(personId)
    e.dataTransfer.setData(DRAG_DATA_KEY, personId)
    e.dataTransfer.effectAllowed = 'move'
    const row = (e.target as HTMLElement).closest('li')
    if (row) e.dataTransfer.setDragImage(row, 0, 0)
  }

  const handleDragOver = (e: React.DragEvent, _personId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(_personId)
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault()
    setDragOverId(null)
    setDraggedId(null)
    const draggedId = e.dataTransfer.getData(DRAG_DATA_KEY)
    if (!draggedId || draggedId === dropTargetId) return
    const list = people ?? []
    const ids = list.map((p) => p.id)
    const fromIdx = ids.indexOf(draggedId)
    const toIdx = ids.indexOf(dropTargetId)
    if (fromIdx === -1 || toIdx === -1) return
    const newOrder = [...ids]
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, draggedId)
    reorder.mutate(newOrder)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  return (
    <section aria-labelledby="admin-people-heading">
      <h2 id="admin-people-heading" className="text-lg font-medium text-slate-800 mb-4">
        People
      </h2>
      <p className="text-sm text-slate-500 mb-2">Drag the handle to reorder people.</p>
      <ul className="space-y-2 mb-6">
        {(people ?? []).map((person) => (
          <li
            key={person.id}
            onDragOver={(e) => handleDragOver(e, person.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, person.id)}
            className={`bg-white border rounded-xl overflow-hidden transition-colors ${
              draggedId === person.id ? 'opacity-50 border-slate-300' : 'border-slate-200'
            } ${dragOverId === person.id && draggedId !== person.id ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`}
          >
            <div className="flex items-center gap-2 p-3 min-h-[48px]">
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, person.id)}
                onDragEnd={handleDragEnd}
                className="touch-none cursor-grab active:cursor-grabbing flex items-center justify-center w-10 h-10 shrink-0 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded"
                aria-label="Drag to reorder"
                title="Drag to reorder"
              >
                <span className="text-lg leading-none">⋮⋮</span>
              </div>
              <Avatar name={person.name} colorKey={person.avatar_color} size="md" className="shrink-0" />
              <div className="flex flex-1 flex-wrap items-center gap-2 pr-4 min-w-0">
                <span className="font-medium text-slate-900">{person.name}</span>
                <span className="text-sm text-slate-500 capitalize">{person.role}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSaveOrder(person, 'up')}
                  disabled={!people?.length || people.indexOf(person) === 0}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveOrder(person, 'down')}
                  disabled={!people?.length || people.indexOf(person) === people.length - 1}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => toggleExpand(person)}
                  className="min-h-[44px] px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  {expandedId === person.id ? 'Close' : 'Edit'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Remove ${person.name}?`)) remove.mutate(person.id)
                  }}
                  className="min-h-[44px] px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
            {expandedId === person.id && (
              <div className="px-3 pb-3 pt-0 border-t border-slate-100 space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Name</p>
                  <input
                    type="text"
                    value={expandedId === person.id ? draftName : person.name}
                    onChange={(e) => expandedId === person.id && setDraftName(e.target.value)}
                    onBlur={() => {
                      const v = draftName.trim()
                      if (v && v !== person.name) update.mutate({ id: person.id, name: v })
                    }}
                    className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Role</p>
                  <select
                    value={person.role}
                    onChange={(e) => update.mutate({ id: person.id, role: e.target.value as PersonRole })}
                    className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300"
                  >
                    <option value="parent">Parent</option>
                    <option value="child">Child</option>
                  </select>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Avatar color</p>
                  <div className="flex flex-wrap gap-1.5">
                    {AVATAR_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => update.mutate({ id: person.id, avatar_color: c.id })}
                        className={`w-7 h-7 rounded-full ${c.bg} ${c.text} shrink-0 ring-offset-2 transition-all ${
                          person.avatar_color === c.id ? 'ring-2 ring-slate-600' : 'hover:ring-2 hover:ring-slate-300'
                        }`}
                        title={c.label}
                        aria-label={`Avatar color ${c.label}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {showForm ? (
        <form onSubmit={handleCreate} className="p-4 bg-slate-50 rounded-xl space-y-3 max-w-md">
          <label className="block text-sm font-medium text-slate-700">Name</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300"
            autoFocus
          />
          <label className="block text-sm font-medium text-slate-700">Role</label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as PersonRole)}
            className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300"
          >
            <option value="parent">Parent</option>
            <option value="child">Child</option>
          </select>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Avatar color</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setNewAvatarColor(c.id)}
                  className={`w-9 h-9 rounded-full ${c.bg} ${c.text} shrink-0 ring-offset-2 transition-all ${
                    newAvatarColor === c.id ? 'ring-2 ring-slate-600' : 'hover:ring-2 hover:ring-slate-300'
                  }`}
                  title={c.label}
                  aria-label={`Avatar color ${c.label}`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">Preview: <Avatar name={newName || 'Name'} colorKey={newAvatarColor} size="sm" className="align-middle ml-1" /></p>
          </div>
          {create.isError && (
            <p className="text-sm text-red-600" role="alert">
              {(create.error as Error).message}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={create.isPending || !newName.trim()}
              className="min-h-[48px] px-4 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
            >
              {create.isPending ? 'Adding…' : 'Add person'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setNewName(''); setNewAvatarColor(DEFAULT_AVATAR_COLOR); create.reset(); }}
              className="min-h-[48px] px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="min-h-[48px] px-4 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-100"
        >
          + Add person
        </button>
      )}
    </section>
  )
}
