import { calculateAmountDue, calculatePricePerPlayer, PricingError } from './pricing'

test('amount due is price × (1 + guests)', () => {
  expect(calculateAmountDue(7.5, 0)).toBe(7.5)
  expect(calculateAmountDue(10, 1)).toBe(20)
})

test('splits total evenly with no guests', () => {
  const attendees = [{ guests_count: 0 }, { guests_count: 0 }, { guests_count: 0 }]
  expect(calculatePricePerPlayer(60, attendees)).toBe(20)
})

test('counts guests in the split', () => {
  const attendees = [
    { guests_count: 0 }, { guests_count: 0 }, { guests_count: 0 },
    { guests_count: 0 }, { guests_count: 1 },
  ]
  expect(calculatePricePerPlayer(60, attendees)).toBe(10)
})

test('throws PricingError when no attendees', () => {
  expect(() => calculatePricePerPlayer(60, [])).toThrow(PricingError)
})
