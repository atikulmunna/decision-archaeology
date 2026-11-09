import { describe, expect, it, vi } from 'vitest'
import {
  CatalogNumberConflictError,
  formatCatalogNumber,
  nextCatalogNumber,
  numberByCreation,
  numberImportBatch,
  withCatalogNumberRetry,
} from '@/lib/catalog'

describe('catalog number helpers', () => {
  it('formats catalog numbers', () => {
    expect(formatCatalogNumber(1)).toBe('DA-0001')
    expect(formatCatalogNumber(42)).toBe('DA-0042')
    expect(formatCatalogNumber(12345)).toBe('DA-12345')
  })

  it('starts at 1 for an archive with no numbered records', () => {
    expect(nextCatalogNumber(null)).toBe(1)
    expect(nextCatalogNumber(41)).toBe(42)
  })

  it('numbers each user separately by creation time, skipping drafts, ties broken by id', () => {
    const t = (d: string) => new Date(d)
    const result = numberByCreation([
      { id: 'b', userId: 'u1', createdAt: t('2026-01-02'), isDraft: false },
      { id: 'x', userId: 'u2', createdAt: t('2026-01-01'), isDraft: false },
      { id: 'a', userId: 'u1', createdAt: t('2026-01-02'), isDraft: false },
      { id: 'c', userId: 'u1', createdAt: t('2026-01-01'), isDraft: true },
      { id: 'd', userId: 'u1', createdAt: t('2026-01-01'), isDraft: false },
    ])
    expect(Object.fromEntries(result)).toEqual({ d: 1, a: 2, b: 3, x: 1 })
  })

  it('numbers an import batch contiguously in input order', () => {
    expect(numberImportBatch([{ t: 'a' }, { t: 'b' }, { t: 'c' }], 42).map((d) => d.catalogNumber)).toEqual([42, 43, 44])
    expect(numberImportBatch([], 1)).toEqual([])
  })
})

describe('withCatalogNumberRetry', () => {
  it('assigns on the first try when there is no conflict', async () => {
    const assign = vi.fn().mockResolvedValue('ok')
    const readMax = vi.fn().mockResolvedValue(41)
    await expect(withCatalogNumberRetry(assign, readMax)).resolves.toBe('ok')
    expect(assign).toHaveBeenCalledExactlyOnceWith(42)
  })

  it('retries once with a fresh max after a unique violation', async () => {
    const assign = vi.fn().mockRejectedValueOnce({ code: 'P2002' }).mockResolvedValueOnce('ok')
    const readMax = vi.fn().mockResolvedValueOnce(41).mockResolvedValueOnce(42)
    await expect(withCatalogNumberRetry(assign, readMax)).resolves.toBe('ok')
    expect(assign.mock.calls).toEqual([[42], [43]])
  })

  it('gives up after a second collision', async () => {
    const assign = vi.fn().mockRejectedValue({ code: 'P2002' })
    const readMax = vi.fn().mockResolvedValue(1)
    await expect(withCatalogNumberRetry(assign, readMax)).rejects.toBeInstanceOf(CatalogNumberConflictError)
    expect(assign).toHaveBeenCalledTimes(2)
  })

  it('rethrows other errors without retrying', async () => {
    const assign = vi.fn().mockRejectedValue(new Error('db down'))
    await expect(withCatalogNumberRetry(assign, vi.fn().mockResolvedValue(null))).rejects.toThrow('db down')
    expect(assign).toHaveBeenCalledTimes(1)
  })
})
