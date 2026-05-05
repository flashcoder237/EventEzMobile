import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image as RNImage,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { sponsorsAPI } from '../../api';
import { RootStackParamList } from '../../types';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing, TextStyles } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface Sponsor {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  website?: string;
  sponsor_level?: string;
  package_name?: string;
  is_active?: boolean;
}

interface SponsorsTabProps {
  eventId: string;
}

// Tier ordering and visual config
const TIER_ORDER = ['platinum', 'platine', 'gold', 'or', 'silver', 'argent', 'bronze', 'partner', 'partenaire'];

function tierConfig(level?: string): { color: string; label: string; weight: number } {
  const lower = (level || '').toLowerCase();
  if (lower.includes('platinum') || lower.includes('platine')) {
    return { color: '#A78BFA', label: 'Platine', weight: 4 };
  }
  if (lower.includes('gold') || lower === 'or') {
    return { color: '#F59E0B', label: 'Or', weight: 3 };
  }
  if (lower.includes('silver') || lower.includes('argent')) {
    return { color: '#94A3B8', label: 'Argent', weight: 2 };
  }
  if (lower.includes('bronze')) {
    return { color: '#D97706', label: 'Bronze', weight: 1 };
  }
  return { color: '#6B7280', label: level || 'Partenaire', weight: 0 };
}

export default function SponsorsTab({ eventId }: SponsorsTabProps) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [sponsors, setSponsors] = useState<Sponsor[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await sponsorsAPI.getByEvent(eventId);
        const data = response.data?.results || response.data || [];
        if (!cancelled) setSponsors(data);
      } catch (error) {
        if (__DEV__) console.error('Erreur chargement sponsors:', error);
        if (!cancelled) setSponsors([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // Group sponsors by tier (descending weight) — keeps platinum first
  const tieredGroups = useMemo(() => {
    if (!sponsors) return [];
    const map = new Map<string, { config: ReturnType<typeof tierConfig>; sponsors: Sponsor[] }>();
    sponsors.forEach(s => {
      const tier = tierConfig(s.sponsor_level || s.package_name);
      const key = tier.label;
      if (!map.has(key)) map.set(key, { config: tier, sponsors: [] });
      map.get(key)!.sponsors.push(s);
    });
    return Array.from(map.values()).sort((a, b) => b.config.weight - a.config.weight);
  }, [sponsors]);

  const handleSponsorPress = (sponsor: Sponsor) => {
    if (!sponsor.website) return;
    sponsorsAPI.trackClick(sponsor.id).catch(() => {});
    const fullUrl = sponsor.website.startsWith('http') ? sponsor.website : `https://${sponsor.website}`;
    navigation.navigate('Browser', { url: fullUrl, title: sponsor.name });
  };

  // ─── AUTO-HIDE: render NOTHING if no sponsors (or while loading) ─────────
  // The user explicitly asked: don't show an empty state, don't show a "no
  // sponsors" message. Just collapse the section entirely.
  if (sponsors === null || sponsors.length === 0) {
    return null;
  }

  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  return (
    <View style={styles.section}>
      {/* === Header === */}
      <Text style={[styles.eyebrow, { color: colors.accent }]}>Sponsors</Text>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Ils soutiennent l&apos;événement
      </Text>

      {/* === Grouped by tier === */}
      {tieredGroups.map(group => {
        // Logo size adapts to tier weight: platinum gets bigger logos
        const logoSize = group.config.weight >= 3 ? 88 : group.config.weight >= 2 ? 72 : 64;

        return (
          <View key={group.config.label} style={styles.tierBlock}>
            {/* Tier label row */}
            <View style={styles.tierLabelRow}>
              <View style={[styles.tierBar, { backgroundColor: group.config.color }]} />
              <Text style={[styles.tierLabel, { color: group.config.color }]}>
                {group.config.label.toUpperCase()}
              </Text>
              <Text style={[styles.tierCount, { color: colors.gray500 }]}>
                {group.sponsors.length} {group.sponsors.length > 1 ? 'sponsors' : 'sponsor'}
              </Text>
            </View>

            {/* Logo grid — wraps */}
            <View style={styles.logoGrid}>
              {group.sponsors.map(sponsor => (
                <TouchableOpacity
                  key={sponsor.id}
                  style={[
                    styles.sponsorCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: hairline,
                      width: logoSize + 32,
                    },
                  ]}
                  onPress={() => handleSponsorPress(sponsor)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Sponsor ${sponsor.name}`}
                  disabled={!sponsor.website}
                >
                  {sponsor.logo ? (
                    <Image
                      source={sponsor.logo}
                      style={{ width: logoSize, height: logoSize * 0.7 }}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                      transition={200}
                    />
                  ) : (
                    <View
                      style={[
                        styles.logoPlaceholder,
                        {
                          width: logoSize,
                          height: logoSize * 0.7,
                          backgroundColor: `${group.config.color}1A`,
                        },
                      ]}
                    >
                      <Text style={[styles.logoPlaceholderText, { color: group.config.color }]}>
                        {sponsor.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.sponsorName, { color: colors.text }]} numberOfLines={1}>
                    {sponsor.name}
                  </Text>
                  {sponsor.website && (
                    <View style={styles.linkRow}>
                      <Ionicons name="open-outline" size={9} color={colors.gray400} />
                      <Text style={[styles.linkText, { color: colors.gray400 }]}>Visiter</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    ...TextStyles.eyebrow,
    marginBottom: 4,
  },
  sectionTitle: {
    ...TextStyles.h3,
    letterSpacing: -0.4,
    marginBottom: Spacing.md,
  },

  // === Tier block ===
  tierBlock: {
    marginBottom: Spacing.lg,
  },
  tierLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  tierBar: {
    width: 24,
    height: 2,
    borderRadius: 1,
  },
  tierLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  tierCount: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    letterSpacing: 0.2,
    marginLeft: 'auto',
  },

  // === Logo grid ===
  logoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  sponsorCard: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  logoPlaceholder: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 28,
    letterSpacing: -0.6,
  },

  sponsorName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: '100%',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  linkText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
