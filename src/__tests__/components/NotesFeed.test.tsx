import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FieldNoteView } from '@/lib/field-notes'

const nav = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push, refresh: vi.fn() }) }))

import { NotesFeed } from '@/components/notes/NotesFeed'
import { NotesView } from '@/components/notes/NotesView'

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

const options = [{ id: 'd7', label: 'DA-0007 · Accept the senior role at Northwind?' }, { id: 'd9', label: 'DA-0009 · Start seeing a therapist?' }]
const feed = (notes = [linked, free, promoted], canEdit = true, decisionOptions: typeof options = []) =>
  render(
    <NotesFeed initialNotes={notes} canEdit={canEdit} decisionOptions={decisionOptions} decisionHrefPrefix="/decisions/" olderHref={null} />
  )
const item = (text: string) => within(screen.getByText(text).closest('li')!)

afterEach(() => {
  vi.restoreAllMocks()
  nav.push.mockReset()
})

describe('NotesFeed', () => {
  it('shows each note with its chips and link', () => {
    feed()
    expect(item('The team argues about tradeoffs.').getByText('Sep 5, 2025, 08:30 UTC')).toBeInTheDocument()
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

  it('sends one promote while the first is still saving, and says why the server refused', async () => {
    let answer: (response: Response) => void = () => {}
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>((resolve) => (answer = resolve)))
    feed()
    const button = item('Slept badly.').getByRole('button', { name: 'Turn into a decision' })
    await userEvent.click(button)
    await userEvent.click(button)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(button).toBeDisabled()
    await act(async () => answer(new Response(JSON.stringify({ error: 'This note is already linked to a decision.' }), { status: 409 })))
    expect(await item('Slept badly.').findByText('This note is already linked to a decision.')).toBeInTheDocument()
    expect(nav.push).not.toHaveBeenCalled()
    expect(button).toBeEnabled()
  })

  it('links only once a decision is chosen and confirmed, and Cancel closes the picker', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ ...free, decision: { id: 'd9', catalogNumber: 9, title: 'Start seeing a therapist?', isDraft: false } }))
    )
    feed([free], true, options)
    // The capture box has its own picker with the same label, so ask within the note.
    const row = item('Slept badly.')
    await userEvent.click(row.getByRole('button', { name: 'Link' }))
    await userEvent.click(row.getByRole('button', { name: 'Cancel' }))
    expect(row.queryByLabelText('Link to a decision')).toBeNull()
    await userEvent.click(row.getByRole('button', { name: 'Link' }))
    await userEvent.selectOptions(row.getByLabelText('Link to a decision'), 'd9')
    expect(fetchSpy).not.toHaveBeenCalled()
    await userEvent.click(row.getByRole('button', { name: 'Link note' }))
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]!.body))).toEqual({ decisionId: 'd9' })
    expect(await screen.findByRole('link', { name: 'Evidence for DA-0009' })).toHaveAttribute('href', '/decisions/d9')
  })

  it('shows the page it was given when the Notes link brings back the newest notes', () => {
    const view = (notes: FieldNoteView[], olderHref: string | null) => (
      <NotesView mode="owner" notes={notes} olderHref={olderHref} decisionOptions={[]} decisionHrefPrefix="/decisions/" />
    )
    const { rerender } = render(view([free], null))
    rerender(view([linked], '?before=2025-09-01T00%3A00%3A00.000Z'))
    expect(screen.getByText('The team argues about tradeoffs.')).toBeInTheDocument()
    expect(screen.queryByText('Slept badly.')).toBeNull()
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
