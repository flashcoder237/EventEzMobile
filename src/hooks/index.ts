/**
 * Export des hooks personnalises
 */

export { useLoadingState, useAsyncOperation } from './useLoadingState';
export { useMessagingWebSocket } from './useMessagingWebSocket';
export { useMessageState } from './useMessageState';
export type { MessageState, AttachedFile } from './useMessageState';
export { useOfflineQueue } from './useOfflineQueue';
export { useOfflineTickets } from './useOfflineTickets';
export type { CachedTicket, CachedTicketIndex } from './useOfflineTickets';
export { useEventReminders } from './useEventReminders';
export type { ScheduledReminder, NotificationSettings } from './useEventReminders';
export { useSavedPaymentMethods, detectPaymentType, maskPhoneNumber, getPaymentMethodLabel } from './useSavedPaymentMethods';
export type { SavedPaymentMethod, PaymentMethodType } from './useSavedPaymentMethods';
