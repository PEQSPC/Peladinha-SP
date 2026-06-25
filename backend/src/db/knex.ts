/**
 * Knex Database Connection
 * Initializes a PostgreSQL connection pool using the DATABASE_URL from env.
 * Import `db` from this module to run queries anywhere.
 */
import 'dotenv/config'
import knex from 'knex'
export const db = knex({ client: 'pg', connection: process.env.DATABASE_URL })