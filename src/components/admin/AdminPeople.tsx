import { useState } from 'react'
import { usePeople, usePersonMutations } from '../../hooks/usePeople'
import type { Person, PersonRole } from '../../types'
import type { AvatarColorKey } from '../../types'
import { Avatar } from '../Avatar'
import { AVATAR_COLORS } from '../../lib/avatarColors'
import { isValidEmail } from '../../lib/email'
import { inviteHouseholdMember } from '../../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const DRAG_DATA_KEY = 'application/x-people-id'
const DEFAULT_AVATAR_COLOR: AvatarColorKey = 'blue'

export function AdminPeople() {
  const { data: people, isLoading, error } = usePeople()
  const { create, update, remove, reorder } = usePersonMutations()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftEmail, setDraftEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<PersonRole>('child')
  const [newAvatarColor, setNewAvatarColor] = useState<AvatarColorKey>(DEFAULT_AVATAR_COLOR)
  const [showForm, setShowForm] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [invitePersonId, setInvitePersonId] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  if (isLoading) {
    return (
      <section aria-labelledby="admin-people-heading">
        <h2 id="admin-people-heading" className="text-lg font-medium text-foreground mb-4">
          People
        </h2>
        <p className="text-muted-foreground">Loading…</p>
      </section>
    )
  }
  if (error) {
    return (
      <section aria-labelledby="admin-people-heading">
        <h2 id="admin-people-heading" className="text-lg font-medium text-foreground mb-4">
          People
        </h2>
        <Alert variant="destructive" role="alert">
          <AlertDescription>Failed to load people.</AlertDescription>
        </Alert>
      </section>
    )
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    const email = newEmail.trim()
    if (!name || !email || !isValidEmail(email)) return
    create.mutate(
      { name, email, role: newRole, avatar_color: newAvatarColor },
      {
        onSuccess: () => {
          setNewName('')
          setNewEmail('')
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
    setDraftEmail(p.email ?? '')
  }

  const handleSendInvite = async (person: Person) => {
    if (!person.email || person.user_id) return
    setInviteError(null)
    setInviteSuccess(null)
    setInvitePersonId(person.id)
    try {
      await inviteHouseholdMember(person.id)
      setInviteSuccess(`Invite sent to ${person.email}.`)
    } catch (err) {
      setInviteError((err as Error).message)
    } finally {
      setInvitePersonId(null)
    }
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 id="admin-people-heading" className="text-lg font-medium text-foreground">
            People
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Drag the handle to reorder people.</p>
        </div>
        <Button type="button" onClick={() => setShowForm(true)}>
          + Add person
        </Button>
      </div>
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open)
          if (!open) {
            setNewName('')
            setNewEmail('')
            setNewRole('child')
            setNewAvatarColor(DEFAULT_AVATAR_COLOR)
            create.reset()
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add person</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as PersonRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Avatar color</Label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNewAvatarColor(c.id)}
                    className={`w-9 h-9 rounded-full ${c.bg} ${c.text} shrink-0 ring-offset-2 transition-all ${
                      newAvatarColor === c.id ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-muted-foreground/30'
                    }`}
                    title={c.label}
                    aria-label={`Avatar color ${c.label}`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Preview: <Avatar name={newName || 'Name'} colorKey={newAvatarColor} size="sm" className="align-middle ml-1" />
              </p>
            </div>
            {create.isError && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{(create.error as Error).message}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setNewName('')
                  setNewEmail('')
                  setNewAvatarColor(DEFAULT_AVATAR_COLOR)
                  create.reset()
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  create.isPending ||
                  !newName.trim() ||
                  !newEmail.trim() ||
                  !isValidEmail(newEmail)
                }
              >
                {create.isPending ? 'Adding…' : 'Add person'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {(people ?? []).length === 0 && (
        <p className="text-muted-foreground mb-4">No people yet. Add one with the button above.</p>
      )}
      <ul className="space-y-2 mb-6">
        {(people ?? []).map((person) => (
          <li
            key={person.id}
            onDragOver={(e) => handleDragOver(e, person.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, person.id)}
            className={`rounded-lg overflow-hidden transition-colors  ${
              draggedId === person.id ? 'opacity-50 border-border' : 'border-border'
            } ${dragOverId === person.id && draggedId !== person.id ? 'ring-2 ring-ring ring-offset-2' : ''}`}
          >
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, person.id)}
                    onDragEnd={handleDragEnd}
                    className="touch-none cursor-grab active:cursor-grabbing flex items-center justify-center w-10 h-10 shrink-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded"
                    aria-label="Drag to reorder"
                    title="Drag to reorder"
                  >
                    <span className="text-lg leading-none">⋮⋮</span>
                  </div>
                  <Avatar name={person.name} colorKey={person.avatar_color} size="md" className="shrink-0" />
                  <div className="flex flex-1 flex-wrap items-center gap-2 pr-4 min-w-0">
                    <span className="font-medium text-foreground">{person.name}</span>
                    <span className="text-sm text-muted-foreground capitalize">{person.role}</span>
                    {person.email && (
                      <span className="text-sm text-muted-foreground truncate" title={person.email}>
                        {person.email}
                      </span>
                    )}
                    {person.user_id && (
                      <span className="text-xs text-muted-foreground">· Signed in</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleSaveOrder(person, 'up')}
                      disabled={!people?.length || people.indexOf(person) === 0}
                      aria-label="Move up"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleSaveOrder(person, 'down')}
                      disabled={!people?.length || people.indexOf(person) === people.length - 1}
                      aria-label="Move down"
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleExpand(person)}
                    >
                      {expandedId === person.id ? 'Close' : 'Edit'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (window.confirm(`Remove ${person.name}?`)) remove.mutate(person.id)
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                {expandedId === person.id && (
                  <div className="pt-3 mt-3 border-t border-border space-y-3">
                    {inviteSuccess && (
                      <Alert role="status">
                        <AlertDescription>{inviteSuccess}</AlertDescription>
                      </Alert>
                    )}
                    {inviteError && (
                      <Alert variant="destructive" role="alert">
                        <AlertDescription>{inviteError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        type="text"
                        value={expandedId === person.id ? draftName : person.name}
                        onChange={(e) => expandedId === person.id && setDraftName(e.target.value)}
                        onBlur={() => {
                          const v = draftName.trim()
                          if (v && v !== person.name) update.mutate({ id: person.id, name: v })
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email (required for invite)</Label>
                      <Input
                        type="email"
                        value={expandedId === person.id ? draftEmail : (person.email ?? '')}
                        onChange={(e) => expandedId === person.id && setDraftEmail(e.target.value)}
                        onBlur={() => {
                          const v = draftEmail.trim()
                          const current = person.email ?? ''
                          if (v === current) return
                          if (!v) {
                            update.mutate({ id: person.id, email: null })
                            return
                          }
                          if (isValidEmail(v)) update.mutate({ id: person.id, email: v.toLowerCase() })
                        }}
                        placeholder="email@example.com"
                      />
                      {!person.email && (
                        <p className="text-xs text-muted-foreground">Add an email to send an invite.</p>
                      )}
                    </div>
                    {person.email && (
                      <div className="flex items-center gap-2">
                        {person.user_id ? (
                          <span className="text-sm text-muted-foreground">Invited / signed in</span>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSendInvite(person)}
                            disabled={!!invitePersonId}
                          >
                            {invitePersonId === person.id ? 'Sending…' : 'Send invite'}
                          </Button>
                        )}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={person.role} onValueChange={(v) => update.mutate({ id: person.id, role: v as PersonRole })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="child">Child</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Avatar color</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {AVATAR_COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => update.mutate({ id: person.id, avatar_color: c.id })}
                            className={`w-7 h-7 rounded-full ${c.bg} ${c.text} shrink-0 ring-offset-2 transition-all ${
                              person.avatar_color === c.id ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-muted-foreground/30'
                            }`}
                            title={c.label}
                            aria-label={`Avatar color ${c.label}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {!showForm && (people ?? []).length > 0 && (
        <Button type="button" variant="outline" onClick={() => setShowForm(true)}>
          + Add another person
        </Button>
      )}
    </section>
  )
}
