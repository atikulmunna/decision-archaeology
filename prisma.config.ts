import * as fs from 'fs'
import * as path from 'path'

// Load .env.local first (Next.js convention), fall back to .env
const envLocalPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  const { config } = await import('dotenv')
  config({ path: envLocalPath })
} else {
  const { config } = await import('dotenv')
  config()
}

import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
