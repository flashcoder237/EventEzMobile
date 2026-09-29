/**
 * Primitives « micro-delight » — voir docs/MOBILE_STYLE_GUIDE.md §6.
 *
 * Règles : rien ne bouge au repos, un effet à la fois (`moments.claim`),
 * le dégradé veut dire « actif / réussi », jamais rien par-dessus un QR,
 * l'haptique tombe au pic visuel. Toute boucle passe par `useMotionGate`.
 */
export { useMotionGate, useAppActive, useScreenFocused, useAppWake, moments } from './useMotionGate';
export type { MotionGate } from './useMotionGate';
export { GradientBorder } from './GradientBorder';
export type { GradientBorderProps, GradientBorderMode } from './GradientBorder';
export { GradientIcon } from './GradientIcon';
export type { GradientIconProps, IoniconName } from './GradientIcon';
export { GlintSweep } from './GlintSweep';
export type { GlintSweepProps } from './GlintSweep';
export { RollingText, CountBadge } from './RollingText';
export type { RollingTextProps, CountBadgeProps } from './RollingText';
export { LiveDot } from './LiveDot';
export type { LiveDotProps } from './LiveDot';
export { AnimatedStroke, DrawCheck } from './DrawCheck';
export type { AnimatedStrokeProps, DrawCheckProps } from './DrawCheck';
export { useTilt } from './useTilt';
export type { TiltResult } from './useTilt';
export { RotatingPlaceholder } from './RotatingPlaceholder';
export type { RotatingPlaceholderProps } from './RotatingPlaceholder';
export { SearchAura } from './SearchAura';
export type { SearchAuraProps } from './SearchAura';
export { SwingOnIncrease } from './SwingOnIncrease';
export type { SwingOnIncreaseProps } from './SwingOnIncrease';
export { BurstParticles } from './BurstParticles';
export type { BurstParticlesProps } from './BurstParticles';
export { Stamp, FirstSeenStamp } from './Stamp';
export type { StampProps, FirstSeenStampProps } from './Stamp';
export { HoloSheen } from './HoloSheen';
export type { HoloSheenProps } from './HoloSheen';
export { useFirstSeen, markFirstSeen } from './useFirstSeen';
export { ScanFrameFeedback, PopOnIncrease } from './ScanFrameFeedback';
export { CountUpText } from './CountUpText';
export type { CountUpTextProps } from './CountUpText';
export type { ScanFrameFeedbackProps, ScanFeedbackKind, PopOnIncreaseProps } from './ScanFrameFeedback';
export { SpringChip, EdgeFadeScroll } from './SpringChip';
export type { SpringChipProps, EdgeFadeScrollProps } from './SpringChip';
