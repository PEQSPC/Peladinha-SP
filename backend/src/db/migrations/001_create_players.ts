import type { Knex } from 'knex'
export async function up(knex: Knex) {
  await knex.schema.createTable('players', (t) => {
    t.increments('id').primary()
    t.string('name', 100).notNullable()
    t.string('phone', 20).notNullable()
    t.string('photo_url', 500).nullable()
    t.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
  })
}
export async function down(knex: Knex) { await knex.schema.dropTable('players') }
