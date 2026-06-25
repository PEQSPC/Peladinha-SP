/**
 * Playtomic Parser Service
 * Extracts match info from Playtomic share messages using regex.
 * The message format is consistent (Portuguese), so regex is reliable
 * without needing the Playtomic API.
 */

/** Thrown when the input message can't be parsed */
export class ParseError extends Error {}

export interface ParsedPlaytomic {
  date: string | null
  time: string | null
  location: string | null
  playtomicUrl: string | null
}

/**
 * Parses a Playtomic share message and extracts match details.
 * Normalizes CRLF -> LF, then extracts via regex patterns.
 * Throws ParseError if the message is completely garbled.
 *
 * @param text - Raw Playtomic share message text
 * @returns ParsedPlaytomic with extracted fields (some may be null)
 */
export function parsePlaytomicMessage(text: string): ParsedPlaytomic {
  const normalized = text.replace(/\r\n/g, '\n')

  const urlMatch = normalized.match(/https:\/\/app\.playtomic\.com\/matches\/[^\s]+/)
  const playtomicUrl = urlMatch ? urlMatch[0] : null

  const locationMatch = normalized.match(/📍\s*(.+)/)
  const location = locationMatch ? locationMatch[1].trim() : null

  const timeMatch = normalized.match(/(\d{2}:\d{2})/)
  const time = timeMatch ? timeMatch[1] : null

  // Match patterns like "sexta-feira, 12, 21:00" or "sexta-feira, 12"
  const dateMatch = normalized.match(/(\w+-\w+[,\s]+\d+)/)
  const date = dateMatch ? dateMatch[1].trim() : null

  if (!time && !location && !playtomicUrl) {
    throw new ParseError('Could not parse Playtomic message')
  }

  return { date, time, location, playtomicUrl }
}