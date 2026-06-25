/**
 * WhatsApp Service
 * Sends messages via Twilio WhatsApp API.
 * Uses sandbox in development, WhatsApp Business API in production.
 */
import twilio from 'twilio'

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

/**
 * Sends a WhatsApp message to a phone number.
 * The `to` number is automatically prefixed with `whatsapp:`.
 */
export async function sendMessage(to: string, body: string): Promise<void> {
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM!,
    to: `whatsapp:${to}`,
    body,
  })
}

/** Post-game notification template (Portuguese) */
export const gameCompleteMessage = (date: string, location: string) =>
  `O jogo de ${date} em ${location} terminou! Obrigado a todos que jogaram. 🏆`

/** Unpaid reminder template (Portuguese) */
export const unpaidReminderMessage = (date: string, amountDue: string) =>
  `Lembrete: ainda tens ${amountDue}€ por pagar do jogo de ${date}. Obrigado! 💸`