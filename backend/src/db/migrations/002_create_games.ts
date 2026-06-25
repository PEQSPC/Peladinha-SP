import type { Knex } from 'knex'
export async function up(knex: Knex) {
  await knex.schema.createTable('games', (t) => {
    t.increments('id').primary()
    t.date('date').nullable()
    t.time('time').nullable()
    t.string('location', 200).notNullable()
    t.string('playtomic_url', 500).nullable()
    t.string('status', 20).notNullable().defaultTo('scheduled')
    t.string('pricing_mode', 20).notNullable()
    t.decimal('price_per_player', 8, 2).nullable()
    t.decimal('total_amount', 8, 2).nullable()
    t.timestamp('remind_at').nullable()
    t.timestamp('reminder_sent_at').nullable()
    t.timestamp('completed_at').nullable()
    t.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
  })
}
export async function down(knex: Knex) { await knex.schema.dropTable('games') }
