import { config } from 'dotenv'
config({ path: '/mnt/c/Users/TelesGomes/Documents/learnByDoing/Peladinha-SP/backend/.env' })
import type { Knex } from 'knex'
const knexConfig: Knex.Config = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  migrations: { directory: './migrations', extension: 'ts' },
}
export default knexConfig
