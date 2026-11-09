import type { ReactNode } from 'react'

const widths = { reading: 'max-w-[760px]', wide: 'max-w-[1200px]' } as const

export function PageContainer({ width = 'reading', children }: { width?: keyof typeof widths; children: ReactNode }) {
  return <div className={`mx-auto w-full px-4 py-8 ${widths[width]}`}>{children}</div>
}
