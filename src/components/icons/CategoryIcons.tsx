/**
 * SVG Category Icons — aligned with web's lucide-react icons
 * Usage: <CategoryIcon name="music" size={16} color="#fff" />
 */

import React, { memo } from 'react';
import Svg, { Path, Circle, Line, Polyline, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// ---- Individual icon components (lucide paths, viewBox 0 0 24 24) ----

function MusicIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18V5l12-2v13" />
      <Circle cx="6" cy="18" r="3" />
      <Circle cx="18" cy="16" r="3" />
    </Svg>
  );
}

function BriefcaseIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <Path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </Svg>
  );
}

function TrophyIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <Path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <Path d="M4 22h16" />
      <Path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <Path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <Path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </Svg>
  );
}

function PaletteIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="13.5" cy="6.5" r="0.5" fill={color} />
      <Circle cx="17.5" cy="10.5" r="0.5" fill={color} />
      <Circle cx="8.5" cy="7.5" r="0.5" fill={color} />
      <Circle cx="6.5" cy="12.5" r="0.5" fill={color} />
      <Path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z" />
    </Svg>
  );
}

function GraduationCapIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <Path d="M6 12v5c3 3 9 3 12 0v-5" />
    </Svg>
  );
}

function SparklesIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <Path d="M5 3v4" />
      <Path d="M19 17v4" />
      <Path d="M3 5h4" />
      <Path d="M17 19h4" />
    </Svg>
  );
}

function CalendarIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  );
}

function UtensilsIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <Path d="M7 2v20" />
      <Path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </Svg>
  );
}

function CpuIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="4" y="4" width="16" height="16" rx="2" />
      <Rect x="9" y="9" width="6" height="6" />
      <Path d="M15 2v2" />
      <Path d="M15 20v2" />
      <Path d="M2 15h2" />
      <Path d="M2 9h2" />
      <Path d="M20 15h2" />
      <Path d="M20 9h2" />
      <Path d="M9 2v2" />
      <Path d="M9 20v2" />
    </Svg>
  );
}

function HeartPulseIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <Path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
    </Svg>
  );
}

function FilmIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <Line x1="7" y1="2" x2="7" y2="22" />
      <Line x1="17" y1="2" x2="17" y2="22" />
      <Line x1="2" y1="12" x2="22" y2="12" />
      <Line x1="2" y1="7" x2="7" y2="7" />
      <Line x1="2" y1="17" x2="7" y2="17" />
      <Line x1="17" y1="7" x2="22" y2="7" />
      <Line x1="17" y1="17" x2="22" y2="17" />
    </Svg>
  );
}

function PartyPopperIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5.8 11.3 2 22l10.7-3.79" />
      <Path d="M4 3h.01" />
      <Path d="M22 8h.01" />
      <Path d="M15 2h.01" />
      <Path d="M22 20h.01" />
      <Path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
      <Path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17" />
      <Path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7" />
      <Path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" />
    </Svg>
  );
}

function NetworkIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 20a6 6 0 0 0-12 0" />
      <Circle cx="12" cy="10" r="4" />
      <Circle cx="4" cy="8" r="2" />
      <Path d="M4.5 9.5 6 12" />
      <Circle cx="20" cy="8" r="2" />
      <Path d="m19.5 9.5-1.5 2.5" />
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
