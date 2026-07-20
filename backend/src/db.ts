import pg from 'pg'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import run from 'node-pg-migrate'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function runMigrations() {
  const client = await pool.connect()
  try {
    await run({
      direction: 'up',
      count: Infinity,
      dbClient: client,
      dir: join(__dirname, '..', 'migrations'),
      migrationsTable: 'pgmigrations',
    })
  } finally {
    client.release()
  }
}
