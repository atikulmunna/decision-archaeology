/**
 * Per-user catalog numbers (DA-0042). Pure helpers; database access lives in
 * `src/lib/catalog-db.ts` so these stay unit-testable.
 */

export const CATALOG_CONFLICT_MESSAGE = 'Could not assign a catalog number. Please try again.'

export class CatalogNumberConflictError extends Error {
  constructor() {
    super(CATALOG_CONFLICT_MESSAGE)
    this.name = 'CatalogNumberConflictError'
  }
}

export function formatCatalogNumber(n: number): string {
  return `DA-${String(n).padStart(4, '0')}`
}

export function nextCatalogNumber(currentMax: number | null): number {
  return (currentMax ?? 0) + 1
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
}

/**
 * Assigns `max + 1`. If another write claimed that number first (unique index
 * violation), re-reads the max and tries once more before giving up.
 */
export async function withCatalogNumberRetry<T>(
  assign: (next: number) => Promise<T>,
  readMax: () => Promise<number | null>
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await assign(nextCatalogNumber(await readMax()))
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
    }
  }
  throw new CatalogNumberConflictError()
}

/** TypeScript mirror of the backfill SQL in the catalog_numbers migration. */
export function numberByCreation(
  rows: Array<{ id: string; userId: string; createdAt: Date; isDraft: boolean }>
): Map<string, number> {
  const sorted = rows
    .filter((row) => !row.isDraft)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  const counters = new Map<string, number>()
  const numbers = new Map<string, number>()
  for (const row of sorted) {
    const next = (counters.get(row.userId) ?? 0) + 1
    counters.set(row.userId, next)
    numbers.set(row.id, next)
  }
  return numbers
}

export function numberImportBatch<T extends object>(decisions: T[], start: number): Array<T & { catalogNumber: number }> {
  return decisions.map((decision, index) => ({ ...decision, catalogNumber: start + index }))
}
