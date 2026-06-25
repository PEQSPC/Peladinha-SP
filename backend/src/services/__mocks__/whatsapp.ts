export const sendMessage = jest.fn().mockResolvedValue(undefined)
export const gameCompleteMessage = jest.requireActual('../whatsapp').gameCompleteMessage
export const unpaidReminderMessage = jest.requireActual('../whatsapp').unpaidReminderMessage
