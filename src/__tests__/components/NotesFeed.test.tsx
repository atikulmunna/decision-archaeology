import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FieldNoteView } from '@/lib/field-notes'

const nav = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push, refresh: vi.fn() }) }))

import { NotesFeed } from '@/components/notes/NotesFeed'

const at = new Date('2025-09-05T08:30:00.000Z')
const linked: FieldNoteView = {
  id: 'n1',
  body: 'The team argues about tradeoffs.',
  mood: 2,
  energy: 2,
  promoted: false,
  createdAt: at,
  decision: { id: 'd7', label: 'DA-0007', title: 'Accept the senior role at Northwind?', href: '/decisions/d7' },
}
const promoted: FieldNoteView = { ...linked, id: 'n3', body: 'Where it began.', promoted: true, decision: { ...linked.decision!, id: 'd12', label: 'DA-0012', href: '/decisions/d12' } }
const free: FieldNoteView = { ...linked, id: 'n2', body: 'Slept badly.', mood: null, energy: null, decision: null }

const feed = (notes = [linked, free, promoted], canEdit = true) =>
  render(
    <NotesFeed initialNotes={notes} canEdit={canEdit} decisionOptions={[]} decisionHrefPrefix="/decisions/" olderHref={null} />
  )
const item = (text: string) => within(screen.getByText(text).closest('li')!)

afterEach(() => {
  vi.restoreAllMocks()
  nav.push.mockReset()
})

describe('NotesFeed', () => {
  it('shows each note with its chips and link', () => {
    feed()
    expect(item('The team argues about tradeoffs.').getByText('Sep 5, 2025, 08:30')).toBeInTheDocument()
    expect(item('The team argues about tradeoffs.').getByText('Uneasy · Tired')).toBeInTheDocument()
    expect(item('The team argues about tradeoffs.').getByRole('link', { name: 'Evidence for DA-0007' })).toHaveAttribute('href', '/decisions/d7')
    expect(item('Where it began.').getByRole('link', { name: 'Became DA-0012' })).toBeInTheDocument()
  })

  it('edits a note inline', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ...free, body: 'Slept well, actually.', decision: null }))
    )
    feed()
    await userEvent.click(item('Slept badly.').getByRole('button', { name: 'Edit' }))
    const box = screen.getByLabelText('Edit note')
    await userEvent.clear(box)
    await userEvent.type(box, 'Slept well, actually.')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(fetchSpy).toHaveBeenCalledWith('/api/notes/n2', expect.objectContaining({ method: 'PATCH' }))
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]!.body))).toEqual({ body: 'Slept well, actually.', mood: null, energy: null })
    expect(await screen.findByText('Slept well, actually.')).toBeInTheDocument()
  })

  it('unlinks a note and turns a free one into a decision', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) =>
      String(input).endsWith('/promote')
        ? new Response(JSON.stringify({ draftId: 'd9' }), { status: 201 })
        : new Response(JSON.stringify({ ...linked, decision: null }))
    )
    feed()
    await userEvent.click(item('The team argues about tradeoffs.').getByRole('button', { name: 'Unlink' }))
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]!.body))).toEqual({ decisionId: null })
    expect(screen.queryByRole('link', { name: 'Evidence for DA-0007' })).toBeNull()
    expect(item('Where it began.').queryByRole('button', { name: 'Turn into a decision' })).toBeNull()
    await userEvent.click(item('Slept badly.').getByRole('button', { name: 'Turn into a decision' }))
    expect(fetchSpy).toHaveBeenCalledWith('/api/notes/n2/promote', expect.objectContaining({ method: 'POST' }))
    expect(nav.push).toHaveBeenCalledWith('/decisions/new?draftId=d9')
  })

  it('deletes only after the second click, and puts the note back if deleting fails', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }))
    feed()
    await userEvent.click(item('Slept badly.').getByRole('button', { name: 'Delete' }))
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(screen.getByText('Delete this note?')).toBeInTheDocument()
    await userEvent.click(item('Slept badly.').getByRole('button', { name: 'Delete' }))
    expect(fetchSpy).toHaveBeenCalledWith('/api/notes/n2', expect.objectContaining({ method: 'DELETE' }))
    expect(await screen.findByText('Could not save. Try again.')).toBeInTheDocument()
    expect(screen.getByText('Slept badly.')).toBeInTheDocument()
  })

  it('offers readers no actions, and says when there is nothing yet', () => {
    const { unmount } = feed([linked], false)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByLabelText('What are you noticing?')).toBeNull()
    unmount()
    feed([], true)
    expect(screen.getByText("Nothing noted yet. Jot what you're noticing; it can become a decision later.")).toBeInTheDocument()
    expect(screen.getByLabelText('What are you noticing?')).toBeInTheDocument()
  })
})
