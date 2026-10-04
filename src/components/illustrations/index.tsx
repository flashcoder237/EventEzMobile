/**
 * Illustrations react-native-svg.
 *
 * Usage :
 *   import { Events, TicketInPocket } from '@/components/illustrations';
 *   <Events color="#4F46E5" size={200} />
 *
 * Chaque composant accepte : color (l'accent) et size (largeur & hauteur).
 * Aucune dépendance d'illustration externe — react-native-svg pur.
 *
 * Source : design-handoff/eventez-svg-redesign/redesign/illustrations (97 SVG,
 * viewBox 0 0 200 200). Les fichiers de svgs/ sont GÉNÉRÉS — pour en modifier
 * une, retouchez le SVG d'origine puis relancez la conversion, sinon la
 * correction sera perdue à la prochaine régénération.
 *
 * Certaines illustrations exposent des groupes `g#anim-*` (float, twinkle,
 * pulse, wave, draw-check…) prévus pour être animés ; voir le README du
 * dossier de handoff pour la table des mouvements.
 */

// ─── Événements & découverte ─────────────────────────────────────────────────
export { default as Events } from './svgs/Events';
export { default as Searching } from './svgs/Searching';
export { default as Conference } from './svgs/Conference';
export { default as Empty } from './svgs/Empty';
export { default as CityNoEvents } from './svgs/CityNoEvents';
export { default as InviteOnly } from './svgs/InviteOnly';
export { default as Schedule } from './svgs/Schedule';
export { default as Selecting } from './svgs/Selecting';
export { default as WaitInLine } from './svgs/WaitInLine';

// ─── Billets ─────────────────────────────────────────────────────────────────
export { default as TicketInPocket } from './svgs/TicketInPocket';
export { default as TicketsOffline } from './svgs/TicketsOffline';
export { default as TicketsSaveOffline } from './svgs/TicketsSaveOffline';
export { default as LostTicket } from './svgs/LostTicket';
export { default as TicketGift } from './svgs/TicketGift';
export { default as TicketGiftAccepted } from './svgs/TicketGiftAccepted';
export { default as TicketGiftDeclined } from './svgs/TicketGiftDeclined';
export { default as TicketGiftExpired } from './svgs/TicketGiftExpired';
export { default as SaveToBookmarks } from './svgs/SaveToBookmarks';

// ─── Check-in & sur place ────────────────────────────────────────────────────
export { default as CheckinWelcome } from './svgs/CheckinWelcome';
export { default as ConnectionBump } from './svgs/ConnectionBump';
export { default as MemoriesEmpty } from './svgs/MemoriesEmpty';
export { default as LighterFlame } from './svgs/LighterFlame';

// ─── Paiement & argent ───────────────────────────────────────────────────────
export { default as OnlinePayments } from './svgs/OnlinePayments';
export { default as PaymentPending } from './svgs/PaymentPending';
export { default as PaymentNotCharged } from './svgs/PaymentNotCharged';
export { default as RefundRequested } from './svgs/RefundRequested';
export { default as RefundUnavailable } from './svgs/RefundUnavailable';
export { default as Wallet } from './svgs/Wallet';
export { default as TransferMoney } from './svgs/TransferMoney';
export { default as Revenue } from './svgs/Revenue';
export { default as Investing } from './svgs/Investing';
export { default as PersonalFinance } from './svgs/PersonalFinance';
export { default as FinancialData } from './svgs/FinancialData';

// ─── Authentification & compte ───────────────────────────────────────────────
export { default as Authentication } from './svgs/Authentication';
export { default as AccessDenied } from './svgs/AccessDenied';
export { default as BiometricLock } from './svgs/BiometricLock';
export { default as SecurityOn } from './svgs/SecurityOn';
export { default as ForgotPassword } from './svgs/ForgotPassword';
export { default as LinkExpired } from './svgs/LinkExpired';
export { default as EmailPending } from './svgs/EmailPending';
export { default as EmailLinkInvalid } from './svgs/EmailLinkInvalid';
export { default as Confirmed } from './svgs/Confirmed';
export { default as CompleteProfile } from './svgs/CompleteProfile';
export { default as BecomeOrganizer } from './svgs/BecomeOrganizer';
export { default as BecomeOrganizerSent } from './svgs/BecomeOrganizerSent';

// ─── Permissions système ─────────────────────────────────────────────────────
export { default as CameraPermission } from './svgs/CameraPermission';
export { default as LocationPermission } from './svgs/LocationPermission';
export { default as CalendarPermission } from './svgs/CalendarPermission';

// ─── Messagerie & social ─────────────────────────────────────────────────────
export { default as NewMessage } from './svgs/NewMessage';
export { default as MessageSent } from './svgs/MessageSent';
export { default as OnlineChat } from './svgs/OnlineChat';
export { default as PeopleSearch } from './svgs/PeopleSearch';
export { default as AddFriends } from './svgs/AddFriends';
export { default as Connection } from './svgs/Connection';
export { default as Emails } from './svgs/Emails';
export { default as PersonalEmail } from './svgs/PersonalEmail';
export { default as EmailCapture } from './svgs/EmailCapture';
export { default as ShareLink } from './svgs/ShareLink';
export { default as ShareOnline } from './svgs/ShareOnline';
export { default as SocialShare } from './svgs/SocialShare';
export { default as GroupVideo } from './svgs/GroupVideo';
export { default as Podcast } from './svgs/Podcast';

// ─── Mariage & célébration ───────────────────────────────────────────────────
export { default as RsvpConfirmed } from './svgs/RsvpConfirmed';
export { default as GiftFund } from './svgs/GiftFund';
export { default as WeddingGuests } from './svgs/WeddingGuests';
export { default as SeatingPlan } from './svgs/SeatingPlan';

// ─── Exposants & salon ───────────────────────────────────────────────────────
export { default as ExhibitorStand } from './svgs/ExhibitorStand';
export { default as ExhibitorReview } from './svgs/ExhibitorReview';
export { default as LeadsEmpty } from './svgs/LeadsEmpty';

// ─── Tableau de bord & analytics ─────────────────────────────────────────────
export { default as MyNotifications } from './svgs/MyNotifications';
export { default as FreshNotification } from './svgs/FreshNotification';
export { default as GrowthAnalytics } from './svgs/GrowthAnalytics';
export { default as GrowthCurve } from './svgs/GrowthCurve';
export { default as SetupAnalytics } from './svgs/SetupAnalytics';
export { default as Projections } from './svgs/Projections';
export { default as Percentages } from './svgs/Percentages';
export { default as PieGraph } from './svgs/PieGraph';
export { default as Report } from './svgs/Report';
export { default as Observations } from './svgs/Observations';

// ─── Équipe & organisation ───────────────────────────────────────────────────
export { default as Team } from './svgs/Team';
export { default as TeamCollaboration } from './svgs/TeamCollaboration';
export { default as TeamInvitation } from './svgs/TeamInvitation';
export { default as Agreement } from './svgs/Agreement';
export { default as Tasks } from './svgs/Tasks';
export { default as AcceptTasks } from './svgs/AcceptTasks';
export { default as FillIn } from './svgs/FillIn';
export { default as Feedback } from './svgs/Feedback';
export { default as ContactUs } from './svgs/ContactUs';
export { default as InteriorDesign } from './svgs/InteriorDesign';

// ─── États système ───────────────────────────────────────────────────────────
export { default as Alert } from './svgs/Alert';
export { default as WellDone } from './svgs/WellDone';
export { default as Winners } from './svgs/Winners';
export { default as Offline } from './svgs/Offline';
export { default as Maintenance } from './svgs/Maintenance';
export { default as ForceUpdate } from './svgs/ForceUpdate';
export { default as UnexpectedError } from './svgs/UnexpectedError';
export { default as DownloadApp } from './svgs/DownloadApp';

// ─── Enveloppe d'animation ───────────────────────────────────────────────────
export { default as AnimatedIllustration } from './AnimatedIllustration';
export type { EntryPreset, IdlePreset } from './AnimatedIllustration';
