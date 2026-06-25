import type { Knex } from 'knex'
export async function up(knex: Knex) {
  await knex.schema.createTable('game_players', (t) => {
    t.integer('game_id').notNullable().references('id').inTable('games').onDelete('CASCADE')
    t.integer('player_id').notNullable().references('id').inTable('players').onDelete('CASCADE')
    t.integer('guests_count').notNullable().defaultTo(0)
    t.boolean('paid').notNullable().defaultTo(false)
    t.primary(['game_id', 'player_id'])
  })
}
export async function down(knex: Knex) { await knex.schema.dropTable('game_players') }
