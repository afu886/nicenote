import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NoteSelect, NoteUpdateInput } from '@nicenote/shared'

import { attemptSave, MAX_RETRIES, RETRY_DELAYS } from './useDebouncedNoteSave'

function makeSaveNote(responses: Array<'success' | 'failure'>) {
  let call = 0
  return vi.fn(async (_id: string, _updates: NoteUpdateInput): Promise<NoteSelect> => {
    const response = responses[call++] ?? 'failure'
    if (response === 'failure') throw new Error('save failed')
    return {
      id: 'n1',
      title: 'T',
      content: '',
      createdAt: '2026-02-14T00:00:00.000Z',
      updatedAt: '2026-02-14T00:00:00.000Z',
    }
  })
}

describe('attemptSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true on first successful call', async () => {
    const saveNote = makeSaveNote(['success'])
    const result = await attemptSave(saveNote, 'n1', { title: 'T' })

    expect(result).toBe(true)
    expect(saveNote).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and returns true when a retry succeeds', async () => {
    const saveNote = makeSaveNote(['failure', 'failure', 'success'])

    const promise = attemptSave(saveNote, 'n1', { title: 'T' })

    // advance through each retry delay
    await vi.advanceTimersByTimeAsync(RETRY_DELAYS[0])
    await vi.advanceTimersByTimeAsync(RETRY_DELAYS[1])

    const result = await promise
    expect(result).toBe(true)
    expect(saveNote).toHaveBeenCalledTimes(MAX_RETRIES)
  })

  it('returns false after all retries exhausted', async () => {
    const saveNote = makeSaveNote(['failure', 'failure', 'failure'])

    const promise = attemptSave(saveNote, 'n1', { title: 'T' })

    await vi.advanceTimersByTimeAsync(RETRY_DELAYS[0])
    await vi.advanceTimersByTimeAsync(RETRY_DELAYS[1])

    const result = await promise
    expect(result).toBe(false)
    expect(saveNote).toHaveBeenCalledTimes(MAX_RETRIES)
  })

  it('waits RETRY_DELAYS[0] ms before first retry', async () => {
    const saveNote = makeSaveNote(['failure', 'success'])

    const promise = attemptSave(saveNote, 'n1', { title: 'T' })
    expect(saveNote).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(RETRY_DELAYS[0] - 1)
    expect(saveNote).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    await promise
    expect(saveNote).toHaveBeenCalledTimes(2)
  })

  it('passes id and updates to saveNote', async () => {
    const saveNote = makeSaveNote(['success'])
    await attemptSave(saveNote, 'note-xyz', { title: 'Hello', content: 'World' })

    expect(saveNote).toHaveBeenCalledWith('note-xyz', { title: 'Hello', content: 'World' })
  })
})
