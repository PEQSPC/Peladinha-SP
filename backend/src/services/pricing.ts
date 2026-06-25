/**
 * Pricing Service
 * Handles per-player cost calculations for two modes:
 * - per_player: fixed price per person
 * - total: total field cost split equally by head count (1 + guests)
 */

/** Thrown when pricing math is impossible (e.g. zero attendees) */
export class PricingError extends Error {}

/**
 * Calculates how much a player owes based on price and guest count.
 * Formula: pricePerPlayer × (1 + guestsCount)
 */
export function calculateAmountDue(pricePerPlayer: number, guestsCount: number): number {
  return pricePerPlayer * (1 + guestsCount)
}

/**
 * Calculates the per-head price when splitting a total amount.
 * Head count = Σ(1 + guests_count) for all attendees.
 * Throws PricingError if there are no attendees.
 *
 * @param totalAmount - Total court/field cost
 * @param attendees - Array of { guests_count } objects
 * @returns Price per single person
 */
export function calculatePricePerPlayer(
  totalAmount: number,
  attendees: { guests_count: number }[]
): number {
  const totalHeads = attendees.reduce((sum, a) => sum + 1 + a.guests_count, 0)
  if (totalHeads === 0) throw new PricingError('No players to split cost across')
  return totalAmount / totalHeads
}