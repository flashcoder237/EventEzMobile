// ============================================
// EventEz Mobile API — Barrel Export
// Re-exports everything from all domain modules
// ============================================

// Core — Axios instance, token management, helpers
export { default as api, default } from './instance';
export { setTokens, clearTokens, getAccessToken, getRefreshToken, deduplicatedGet, ensureFreshAccessToken } from './instance';
export { getMediaUrl, API_BASE_URL, SERVER_BASE_URL } from './config';

// Authentication, Users & Verification
export { authAPI, usersAPI, verificationAPI } from './auth';

// Events, Categories & Tags
export { eventsAPI, eventTemplatesAPI, categoriesAPI, tagsAPI } from './events';

// Registrations
export { registrationsAPI } from './registrations';

// Tickets, Transfers & Discounts
export { ticketTypesAPI, ticketPurchasesAPI, ticketsAPI, ticketTransfersAPI, discountsAPI } from './tickets';

// Payments, Refunds, Invoices, Subscriptions, Wallet, Payouts & Commissions
export { paymentsAPI, refundsAPI, invoicesAPI, subscriptionsAPI, walletAPI, payoutsAPI, commissionsAPI } from './payments';

// Messages & Conversations
export { messagesAPI } from './messages';

// User Connections (LinkedIn-style bidirectional links — QR / mutual follow / manual)
export { connectionsAPI } from './connections';
export type { Connection, ConnectionUser, QrTokenResponse } from './connections';

// Notifications & Templates
export { notificationsAPI, notificationTemplatesAPI } from './notifications';

// Sessions, Speakers & Tracks
export { sessionsAPI, sessionRegistrationsAPI, sessionResourcesAPI, speakersAPI, tracksAPI } from './sessions';

// Feedbacks, Flags & Validations
export { feedbacksAPI, flagsAPI, validationsAPI } from './feedback';

// Analytics
export { analyticsAPI } from './analytics';

// Social, Invitations, Referrals, Gamification & Recommendations
export { socialAPI, invitationsAPI, referralsAPI, gamificationAPI, recommendationsAPI, advertisementsAPI } from './social';
export type { AdvertisementPublic, AdvertisementAdmin } from './social';

// Newsletters, Sponsors, Live, CFP, Virtual Rooms & Recordings
export { newslettersAPI, sponsorsAPI, liveAPI, cfpAPI, virtualRoomsAPI, recordingsAPI } from './content';

// Admin — Audit, Treasury & Site Settings
export { auditAPI, treasuryAPI, siteSettingsAPI, publicSettingsAPI } from './admin';

// Misc — Waitlist, Seating, Volunteers, Event Team, Currency, Comparison, Export, AI, UTM & Webhooks
export { waitlistAPI, waitlistSettingsAPI, seatingAPI, floorPlansAPI, volunteersAPI, eventTeamAPI, currencyAPI, comparisonAPI, exportAPI, aiAssistAPI, utmAPI, webhooksAPI } from './misc';
export type { EventStaffRole, EventStaffMember, EventStaffInvitationLookup } from './misc';

// System Status / Incidents
export { statusAPI } from './status';
export { announcementsAPI, clientReleaseAPI } from './announcements';
export type { AnnouncementAdminPayload, ClientReleasePayload } from './announcements';
