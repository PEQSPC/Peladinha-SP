import { parsePlaytomicMessage, ParseError } from './playtomicParser'

const SAMPLE = `JOGO NO FUT7 !

 📅 sexta-feira, 12, 21:00 (15min)
 📍 Braga
 ✅ Teles Gomes
https://app.playtomic.com/matches/7b6c3138-75c6-4e26-b691-ac01e02612c7`

test('parses time, location and URL from a standard Playtomic message', () => {
  const result = parsePlaytomicMessage(SAMPLE)
  expect(result.time).toBe('21:00')
  expect(result.location).toBe('Braga')
  expect(result.playtomicUrl).toContain('7b6c3138')
})

test('returns null playtomicUrl when no URL present', () => {
  const noUrl = SAMPLE.split('\n').filter(l => !l.startsWith('https')).join('\n')
  expect(parsePlaytomicMessage(noUrl).playtomicUrl).toBeNull()
})

test('throws ParseError on garbled input', () => {
  expect(() => parsePlaytomicMessage('random garbage')).toThrow(ParseError)
})

test('handles CRLF line endings', () => {
  const crlf = SAMPLE.replace(/\n/g, '\r\n')
  expect(parsePlaytomicMessage(crlf).location).toBe('Braga')
})

test('parses date from Portuguese format', () => {
  const result = parsePlaytomicMessage(SAMPLE)
  expect(result.date).toBeTruthy()
  expect(result.date).toContain('12')
})
