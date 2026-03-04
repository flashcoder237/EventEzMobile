/**
 * Export des hooks personnalises
 */

export { useReducedMotion } from './useReducedMotion';
export { useTabletLayout } from './useTabletLayout';
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
export { usePaymentVerification, isPaymentSuccess, isPaymentFailed, PAYMENT_STATUS } from './usePaymentVerification';
export type { PaymentVerificationConfig, PaymentVerificationResult, PaymentVerificationStatus } from './usePaymentVerification';
export { useEventForm, STEPS, LOCATION_TYPES, FIELD_TYPES, SESSION_TYPES } from './useEventForm';
export { useCurrencyConversion } from './useCurrencyConversion';
export type {
  TicketTypeForm, FormFieldForm, SessionForm, EventFormState,
  AlertActions, MapLocation, UseEventFormReturn,
} from './useEventForm';
