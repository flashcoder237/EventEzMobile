/**
 * Hand-crafted react-native-svg illustrations.
 *
 * Usage:
 *   import { Events, Searching } from '@/components/illustrations';
 *   <Events color="#4F46E5" size={200} />
 *
 * Each component accepts: color (accent), size (width & height).
 * No external illustration library — pure react-native-svg, zero dep risk.
 */

// ─── Events & Discovery ──────────────────────────────────────────────────────
export { default as Events } from './svgs/Events';
export { default as Searching } from './svgs/Searching';
export { default as Conference } from './svgs/Conference';
export { default as Empty } from './svgs/Empty';

// ─── Auth ────────────────────────────────────────────────────────────────────
export { default as Authentication } from './svgs/Authentication';
export { default as AccessDenied } from './svgs/AccessDenied';
export { default as BiometricLock } from './svgs/BiometricLock';

// ─── Messaging ───────────────────────────────────────────────────────────────
export { default as NewMessage } from './svgs/NewMessage';
export { default as PeopleSearch } from './svgs/PeopleSearch';
export { default as Emails } from './svgs/Emails';

// ─── Dashboard ───────────────────────────────────────────────────────────────
export { default as MyNotifications } from './svgs/MyNotifications';
export { default as SaveToBookmarks } from './svgs/SaveToBookmarks';
export { default as OnlinePayments } from './svgs/OnlinePayments';

// ─── Status ──────────────────────────────────────────────────────────────────
export { default as Alert } from './svgs/Alert';
export { default as WellDone } from './svgs/WellDone';

// ─── Animation wrapper ───────────────────────────────────────────────────────
export { default as AnimatedIllustration } from './AnimatedIllustration';
export type { EntryPreset, IdlePreset } from './AnimatedIllustration';
