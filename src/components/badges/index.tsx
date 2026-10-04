/**
 * Badges de gamification, paliers et emblèmes.
 *
 * Source : design-handoff/eventez-svg-redesign/redesign/{badges,emblemes}.
 * Les fichiers de `svgs/` sont GÉNÉRÉS — retouchez le SVG d'origine puis
 * régénérez (voir design-handoff/eventez-svg-redesign/INTEGRATION.md).
 *
 * Trois variantes par badge :
 *   · `BadgeTrophy`        médaillon 96 px, couleurs pleines — badge obtenu
 *   · `BadgeTrophyLocked`  même dessin en gris — badge à débloquer
 *   · `BadgeTrophy24`      pictogramme 24 px en currentColor — listes, puces
 *
 * Le backend stocke des noms au format Lucide (`trophy`, `check-circle`,
 * `thumbs-up`…). `badgeArt()` fait la traduction ; passez par lui plutôt que
 * d'importer un badge en dur, sinon un badge ajouté côté serveur ne
 * s'affichera pas.
 */
import type React from 'react';

type ArtProps = { color?: string; size?: number };

// ─── Badges — médaillon 96 px ────────────────────────────────────────────────
export { default as BadgeAward } from './svgs/BadgeAward';
export { default as BadgeCalendar } from './svgs/BadgeCalendar';
export { default as BadgeCheckCircle } from './svgs/BadgeCheckCircle';
export { default as BadgeCrown } from './svgs/BadgeCrown';
export { default as BadgeFlag } from './svgs/BadgeFlag';
export { default as BadgeHeart } from './svgs/BadgeHeart';
export { default as BadgeMessageCircle } from './svgs/BadgeMessageCircle';
export { default as BadgeRocket } from './svgs/BadgeRocket';
export { default as BadgeStar } from './svgs/BadgeStar';
export { default as BadgeThumbsUp } from './svgs/BadgeThumbsUp';
export { default as BadgeTrendingUp } from './svgs/BadgeTrendingUp';
export { default as BadgeTrophy } from './svgs/BadgeTrophy';
export { default as BadgeUsers } from './svgs/BadgeUsers';
export { default as BadgeZap } from './svgs/BadgeZap';

// ─── Badges — variante verrouillée ───────────────────────────────────────────
export { default as BadgeAwardLocked } from './svgs/BadgeAwardLocked';
export { default as BadgeCalendarLocked } from './svgs/BadgeCalendarLocked';
export { default as BadgeCheckCircleLocked } from './svgs/BadgeCheckCircleLocked';
export { default as BadgeCrownLocked } from './svgs/BadgeCrownLocked';
export { default as BadgeFlagLocked } from './svgs/BadgeFlagLocked';
export { default as BadgeHeartLocked } from './svgs/BadgeHeartLocked';
export { default as BadgeMessageCircleLocked } from './svgs/BadgeMessageCircleLocked';
export { default as BadgeRocketLocked } from './svgs/BadgeRocketLocked';
export { default as BadgeStarLocked } from './svgs/BadgeStarLocked';
export { default as BadgeThumbsUpLocked } from './svgs/BadgeThumbsUpLocked';
export { default as BadgeTrendingUpLocked } from './svgs/BadgeTrendingUpLocked';
export { default as BadgeTrophyLocked } from './svgs/BadgeTrophyLocked';
export { default as BadgeUsersLocked } from './svgs/BadgeUsersLocked';
export { default as BadgeZapLocked } from './svgs/BadgeZapLocked';

// ─── Badges — pictogramme 24 px ──────────────────────────────────────────────
export { default as BadgeAward24 } from './svgs/BadgeAward24';
export { default as BadgeCalendar24 } from './svgs/BadgeCalendar24';
export { default as BadgeCheckCircle24 } from './svgs/BadgeCheckCircle24';
export { default as BadgeCrown24 } from './svgs/BadgeCrown24';
export { default as BadgeFlag24 } from './svgs/BadgeFlag24';
export { default as BadgeHeart24 } from './svgs/BadgeHeart24';
export { default as BadgeMessageCircle24 } from './svgs/BadgeMessageCircle24';
export { default as BadgeRocket24 } from './svgs/BadgeRocket24';
export { default as BadgeStar24 } from './svgs/BadgeStar24';
export { default as BadgeThumbsUp24 } from './svgs/BadgeThumbsUp24';
export { default as BadgeTrendingUp24 } from './svgs/BadgeTrendingUp24';
export { default as BadgeTrophy24 } from './svgs/BadgeTrophy24';
export { default as BadgeUsers24 } from './svgs/BadgeUsers24';
export { default as BadgeZap24 } from './svgs/BadgeZap24';

// ─── Paliers ─────────────────────────────────────────────────────────────────
export { default as Tier1 } from './svgs/Tier1';
export { default as Tier2 } from './svgs/Tier2';
export { default as Tier3 } from './svgs/Tier3';
export { default as Tier4 } from './svgs/Tier4';
export { default as Tier5 } from './svgs/Tier5';

// ─── Emblèmes de scan ────────────────────────────────────────────────────────
export { default as ScanValid } from './svgs/ScanValid';
export { default as ScanAlreadyUsed } from './svgs/ScanAlreadyUsed';
export { default as ScanInvalid } from './svgs/ScanInvalid';

// ─── Emblèmes de moment ──────────────────────────────────────────────────────
export { default as Anniversary } from './svgs/Anniversary';
export { default as WelcomeBack } from './svgs/WelcomeBack';
export { default as HolidayCM } from './svgs/HolidayCM';
export { default as HolidayCI } from './svgs/HolidayCI';
export { default as HolidaySN } from './svgs/HolidaySN';
export { default as HolidayFR } from './svgs/HolidayFR';

// ─── Résolution d'un nom backend vers son visuel ─────────────────────────────

import BadgeAwardArt from './svgs/BadgeAward';
import BadgeCalendarArt from './svgs/BadgeCalendar';
import BadgeCheckCircleArt from './svgs/BadgeCheckCircle';
import BadgeCrownArt from './svgs/BadgeCrown';
import BadgeFlagArt from './svgs/BadgeFlag';
import BadgeHeartArt from './svgs/BadgeHeart';
import BadgeMessageCircleArt from './svgs/BadgeMessageCircle';
import BadgeRocketArt from './svgs/BadgeRocket';
import BadgeStarArt from './svgs/BadgeStar';
import BadgeThumbsUpArt from './svgs/BadgeThumbsUp';
import BadgeTrendingUpArt from './svgs/BadgeTrendingUp';
import BadgeTrophyArt from './svgs/BadgeTrophy';
import BadgeUsersArt from './svgs/BadgeUsers';
import BadgeZapArt from './svgs/BadgeZap';

import BadgeAwardLockedArt from './svgs/BadgeAwardLocked';
import BadgeCalendarLockedArt from './svgs/BadgeCalendarLocked';
import BadgeCheckCircleLockedArt from './svgs/BadgeCheckCircleLocked';
import BadgeCrownLockedArt from './svgs/BadgeCrownLocked';
import BadgeFlagLockedArt from './svgs/BadgeFlagLocked';
import BadgeHeartLockedArt from './svgs/BadgeHeartLocked';
import BadgeMessageCircleLockedArt from './svgs/BadgeMessageCircleLocked';
import BadgeRocketLockedArt from './svgs/BadgeRocketLocked';
import BadgeStarLockedArt from './svgs/BadgeStarLocked';
import BadgeThumbsUpLockedArt from './svgs/BadgeThumbsUpLocked';
import BadgeTrendingUpLockedArt from './svgs/BadgeTrendingUpLocked';
import BadgeTrophyLockedArt from './svgs/BadgeTrophyLocked';
import BadgeUsersLockedArt from './svgs/BadgeUsersLocked';
import BadgeZapLockedArt from './svgs/BadgeZapLocked';

import Tier1Art from './svgs/Tier1';
import Tier2Art from './svgs/Tier2';
import Tier3Art from './svgs/Tier3';
import Tier4Art from './svgs/Tier4';
import Tier5Art from './svgs/Tier5';

type Art = React.ComponentType<ArtProps>;

/**
 * Noms Lucide stockés par le backend → médaillon.
 * Doit rester aligné avec BADGE_ICONS de GamificationScreen : les deux lisent
 * le même champ `badge.icon`.
 */
const BADGE_ART: Record<string, { on: Art; off: Art }> = {
  'award': { on: BadgeAwardArt, off: BadgeAwardLockedArt },
  'calendar': { on: BadgeCalendarArt, off: BadgeCalendarLockedArt },
  'check-circle': { on: BadgeCheckCircleArt, off: BadgeCheckCircleLockedArt },
  'crown': { on: BadgeCrownArt, off: BadgeCrownLockedArt },
  'flag': { on: BadgeFlagArt, off: BadgeFlagLockedArt },
  'heart': { on: BadgeHeartArt, off: BadgeHeartLockedArt },
  'message-circle': { on: BadgeMessageCircleArt, off: BadgeMessageCircleLockedArt },
  'rocket': { on: BadgeRocketArt, off: BadgeRocketLockedArt },
  'star': { on: BadgeStarArt, off: BadgeStarLockedArt },
  'thumbs-up': { on: BadgeThumbsUpArt, off: BadgeThumbsUpLockedArt },
  'trending-up': { on: BadgeTrendingUpArt, off: BadgeTrendingUpLockedArt },
  'trophy': { on: BadgeTrophyArt, off: BadgeTrophyLockedArt },
  'users': { on: BadgeUsersArt, off: BadgeUsersLockedArt },
  'zap': { on: BadgeZapArt, off: BadgeZapLockedArt },
};

const TIER_ART: Art[] = [Tier1Art, Tier2Art, Tier3Art, Tier4Art, Tier5Art];

/**
 * Médaillon d'un badge. `unlocked = false` renvoie la variante grisée.
 * Repli sur « award » si le backend envoie un nom inconnu — un badge ajouté
 * côté serveur s'affiche ainsi au lieu de disparaître.
 */
export function badgeArt(name?: string | null, unlocked = true): Art {
  const key = (name || '').toLowerCase().trim();
  const entry = BADGE_ART[key] ?? BADGE_ART.award;
  return unlocked ? entry.on : entry.off;
}

/** Vrai si le backend a envoyé un nom que l'on sait dessiner. */
export function hasBadgeArt(name?: string | null): boolean {
  return !!BADGE_ART[(name || '').toLowerCase().trim()];
}

/** Visuel d'un palier, de 1 à 5. Hors bornes, on borne au plus proche. */
export function tierArt(level: number): Art {
  const i = Math.min(TIER_ART.length, Math.max(1, Math.round(level))) - 1;
  return TIER_ART[i];
}
