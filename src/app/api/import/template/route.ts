import { NextRequest, NextResponse } from 'next/server'
import { getImportTemplateCsv, getImportTemplateJson } from '@/lib/portability'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get('format')
  if (format !== 'json' && format !== 'csv') {
    return NextResponse.json({ error: 'Unsupported template format.' }, { status: 400 })
  }

  const body = format === 'json' ? getImportTemplateJson() : getImportTemplateCsv()

  return new NextResponse(body, {
    headers: {
      'Content-Type': format === 'json' ? 'application/json; charset=utf-8' : 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="decision-import-template.${format}"`,
    },
  })
}
