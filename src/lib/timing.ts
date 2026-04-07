type TimingMeta = Record<string, string | number | boolean | null | undefined>

function formatMeta(meta?: TimingMeta) {
  if (!meta) return ''

  const entries = Object.entries(meta).filter(([, value]) => value !== undefined)
  if (entries.length === 0) return ''

  return ` ${entries.map(([key, value]) => `${key}=${String(value)}`).join(' ')}`
}

export function createTimer(label: string, meta?: TimingMeta) {
  const start = performance.now()

  return {
    end(extra?: TimingMeta) {
      const durationMs = Math.round(performance.now() - start)
      console.info(`[timing] ${label} ${durationMs}ms${formatMeta(meta)}${formatMeta(extra)}`)
      return durationMs
    },
  }
}

