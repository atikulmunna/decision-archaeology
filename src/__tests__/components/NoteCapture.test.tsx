import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NoteCapture } from '@/components/notes/NoteCapture'

const options = [{ id: 'd7', label: 'DA-0007 · Accept the senior role at Northwind?' }]
const saved = (body: Record<string, unknown>) => ({
  id: 'n1',
  body: body.body,
  mood: body.mood ?? null,
  energy: body.energy ?? null,
  promoted: false,
  createdAt: '2026-11-13T08:30:00.000Z',
  decision: body.decisionId ? { id: 'd7', catalogNumber: 7, title: 'Accept the senior role at Northwind?' } : null,
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('NoteCapture', () => {
  it('toggles mood and energy chips', async () => {
    render(<NoteCapture decisionOptions={options} decisionHrefPrefix="/decisions/" onSaved={vi.fn()} />)
    const mood = within(screen.getByRole('group', { name: 'Mood' }))
    await userEvent.click(mood.getByRole('button', { name: 'Uneasy' }))
    expect(mood.getByRole('button', { name: 'Uneasy' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(mood.getByRole('button', { name: 'Uneasy' }))
    expect(mood.getByRole('button', { name: 'Uneasy' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('saves once on Ctrl+Enter even when pressed twice, then clears and reports the note', async () => {
    let release: (value: Response) => void = () => {}
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise((resolve) => {
          release = () => resolve(new Response(JSON.stringify(saved(JSON.parse(String(init!.body)))), { status: 201 }))
        })
    )
    const onSaved = vi.fn()
    render(<NoteCapture decisionOptions={options} decisionHrefPrefix="/decisions/" onSaved={onSaved} />)
    const box = screen.getByLabelText('What are you noticing?')
    await userEvent.type(box, 'The team argues well')
    await userEvent.click(within(screen.getByRole('group', { name: 'Energy' })).getByRole('button', { name: 'Tired' }))
    await userEvent.selectOptions(screen.getByLabelText('Link to a decision'), 'd7')
    fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true })
    fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]!.body))).toEqual({ body: 'The team argues well', mood: null, energy: 2, decisionId: 'd7' })
    release(new Response())
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    expect(onSaved.mock.calls[0][0]).toMatchObject({ body: 'The team argues well', decision: { label: 'DA-0007', href: '/decisions/d7' } })
    expect(box).toHaveValue('')
  })

  it('never saves an empty note, and keeps the text when saving fails', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }))
    render(<NoteCapture decisionOptions={options} decisionHrefPrefix="/decisions/" onSaved={vi.fn()} />)
    const box = screen.getByLabelText('What are you noticing?')
    await userEvent.type(box, '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }))
    expect(screen.getByText('Write something first.')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
    await userEvent.type(box, 'Real text')
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }))
    expect(await screen.findByText('Could not save. Try again.')).toBeInTheDocument()
    expect(box).toHaveValue('   Real text')
  })

  it('links to a fixed decision without offering the picker', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (_input, init) => new Response(JSON.stringify(saved(JSON.parse(String(init!.body)))), { status: 201 })
    )
    render(<NoteCapture decisionOptions={[]} fixedDecisionId="d7" decisionHrefPrefix="/decisions/" onSaved={vi.fn()} />)
    expect(screen.queryByLabelText('Link to a decision')).toBeNull()
    await userEvent.type(screen.getByLabelText('What are you noticing?'), 'Evidence')
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }))
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]!.body)).decisionId).toBe('d7')
  })
})
