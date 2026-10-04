/**
 * Icônes de catégorie — jeu maison 24 px, trait 2, compatible lucide.
 * Usage : <CategoryIcon name="music" size={16} color="#fff" />
 *
 * Les 13 tracés viennent de design-handoff/eventez-svg-redesign/redesign/
 * icons-categories/ (un fichier .svg par icône, même nom). Pour en retoucher
 * une, modifiez le SVG d'origine puis reportez le tracé ici.
 *
 * BookOpenIcon n'a pas d'équivalent dans le redesign et n'est référencé par
 * aucune clé d'ICON_MAP : il est conservé pour une éventuelle catégorie
 * « Éducation », mais rien ne l'affiche aujourd'hui.
 */

import React, { memo } from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// ---- Individual icon components (lucide paths, viewBox 0 0 24 24) ----

function MusicIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18V5l11-2v13" />
      <Circle cx={6} cy={18} r={3} />
      <Circle cx={17} cy={16} r={3} />
    </Svg>
  );
}

function BriefcaseIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={7} width={18} height={13} rx={3} />
      <Path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3 13h18M11 13v2h2v-2" />
    </Svg>
  );
}

function TrophyIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 3h10v7a5 5 0 0 1-10 0z" />
      <Path d="M7 5H4v2a3 3 0 0 0 3.2 3M17 5h3v2a3 3 0 0 1-3.2 3M12 15v4M8 21h8" />
    </Svg>
  );
}

function PaletteIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-2 0-.6-.3-1-.6-1.4-.3-.4-.6-.8-.6-1.4 0-1.1.9-2 2-2h2.2c2.6 0 4-1.8 4-4.4C21 6 17 3 12 3z" />
      <Circle cx={7.5} cy={11} r={1} />
      <Circle cx={10} cy={7} r={1} />
      <Circle cx={15} cy={7.5} r={1} />
    </Svg>
  );
}

function GraduationCapIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 9l10-5 10 5-10 5z" />
      <Path d="M6 11v5c2 2 10 2 12 0v-5M22 9v6" />
    </Svg>
  );
}

function SparklesIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6z" />
      <Path d="M18 13l.8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8z" />
      <Path d="M18 3v4M16 5h4" />
    </Svg>
  );
}

function CalendarIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={16} rx={3} />
      <Path d="M3 10h18M8 3v4M16 3v4" />
      <Path d="M8 15h2" />
    </Svg>
  );
}

function UtensilsIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M7 12v9M18 21V3c-2.2 1.2-3.5 3.6-3.5 7v3H18" />
    </Svg>
  );
}

function CpuIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={6} y={6} width={12} height={12} rx={2} />
      <Rect x={9.5} y={9.5} width={5} height={5} rx={1} />
      <Path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </Svg>
  );
}

function HeartPulseIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20C5 15.2 3 11.6 3 8.6 3 6 5 4 7.6 4c1.8 0 3.4 1 4.4 2.6C13 5 14.6 4 16.4 4 19 4 21 6 21 8.6c0 3-2 6.6-9 11.4z" />
      <Path d="M4 12h4l2-3 3 5 2-2h5" />
    </Svg>
  );
}

function FilmIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={8} width={18} height={13} rx={2} />
      <Path d="M3 8l16.5-4.5.6 2.5L3.6 10.5M8.5 6.6l2 3M14 5.1l2 3" />
    </Svg>
  );
}

function PartyPopperIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 20l5-13 8 8z" />
      <Path d="M14 4c0 1.5 1 2 2 2M19 9c-1 0-2 .8-2 2M20 4l-1 1M15 2h.01M22 7h.01M21 13h.01" />
    </Svg>
  );
}

function NetworkIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={9} y={2} width={6} height={6} rx={1.5} />
      <Rect x={2} y={16} width={6} height={6} rx={1.5} />
      <Rect x={16} y={16} width={6} height={6} rx={1.5} />
      <Path d="M12 8v4M5 16v-2h14v2" />
    </Svg>
  );
}

function BookOpenIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </Svg>
  );
}

// ---- Icon registry ----

const ICON_MAP: Record<string, React.FC<IconProps>> = {
  music: MusicIcon,
  concert: MusicIcon,
  musique: MusicIcon,
  sport: TrophyIcon,
  sports: TrophyIcon,
  art: PaletteIcon,
  culture: PaletteIcon,
  food: UtensilsIcon,
  gastronomie: UtensilsIcon,
  tech: CpuIcon,
  technologie: CpuIcon,
  business: BriefcaseIcon,
  conference: BriefcaseIcon,
  conférence: BriefcaseIcon,
  education: GraduationCapIcon,
  formation: GraduationCapIcon,
  santé: HeartPulseIcon,
  health: HeartPulseIcon,
  film: FilmIcon,
  cinéma: FilmIcon,
  festival: PartyPopperIcon,
  networking: NetworkIcon,
  default: SparklesIcon,
  calendar: CalendarIcon,
};

// ---- Public API ----

export type CategoryIconName = keyof typeof ICON_MAP;

interface CategoryIconProps extends IconProps {
  name: string;
}

function CategoryIconComponent({ name, size = 24, color = '#000', strokeWidth = 2 }: CategoryIconProps) {
  const key = name.toLowerCase();
  const Icon = ICON_MAP[key] || ICON_MAP.default;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}

export const CategoryIcon = memo(CategoryIconComponent);

/**
 * Get the resolved icon component for a category name.
 * Useful when you need the component ref directly.
 */
export function getCategoryIconComponent(name: string): React.FC<IconProps> {
  return ICON_MAP[name.toLowerCase()] || ICON_MAP.default;
}

export default CategoryIcon;
