import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sponsorsAPI } from '../../api/client';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import { LoadingSpinner } from '../ui/LoadingOverlay';

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

export default function SponsorsTab({ eventId }: SponsorsTabProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSponsors();
  }, [eventId]);

  const fetchSponsors = async () => {
    setLoading(true);
    try {
      const response = await sponsorsAPI.getByEvent(eventId);
      const data = response.data?.results || response.data || [];
      setSponsors(data);
    } catch (error) {
      console.error('Erreur chargement sponsors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWebsitePress = async (url: string, sponsorId: string) => {
    try {
      sponsorsAPI.trackClick(sponsorId).catch(() => {});
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      await Linking.openURL(fullUrl);
    } catch (error) {
      console.error('Erreur ouverture URL:', error);
    }
  };

  const getSponsorLevelColor = (level?: string): string => {
    switch (level?.toLowerCase()) {
      case 'platinum':
      case 'platine':
        return '#94A3B8';
      case 'gold':
      case 'or':
        return '#F59E0B';
      case 'silver':
      case 'argent':
        return '#9CA3AF';
      case 'bronze':
        return '#D97706';
      default:
        return Colors.primary;
    }
  };

  if (loading) {
    return (
      <View style={styles.emptyTab}>
        <LoadingSpinner />
        <Text style={styles.emptyTabText}>Chargement des sponsors...</Text>
      </View>
    );
  }

  if (!sponsors || sponsors.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sponsors</Text>
        <View style={styles.emptyTab}>
          <Ionicons name="ribbon-outline" size={40} color={Colors.gray300} />
          <Text style={styles.emptyTabText}>Aucun sponsor pour cet evenement</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sponsors</Text>
      {sponsors.map((sponsor) => (
        <View key={sponsor.id} style={styles.sponsorCard}>
          <View style={styles.sponsorHeader}>
            {sponsor.logo ? (
              <Image source={{ uri: sponsor.logo }} style={styles.sponsorLogo} resizeMode="contain" />
            ) : (
              <View style={styles.sponsorLogoPlaceholder}>
                <Ionicons name="ribbon" size={24} color={Colors.primary} />
              </View>
            )}
            <View style={styles.sponsorInfo}>
              <Text style={styles.sponsorName}>{sponsor.name}</Text>
              {(sponsor.sponsor_level || sponsor.package_name) && (
                <View style={[styles.levelBadge, { backgroundColor: getSponsorLevelColor(sponsor.sponsor_level) + '20' }]}>
                  <Text style={[styles.levelBadgeText, { color: getSponsorLevelColor(sponsor.sponsor_level) }]}>
                    {sponsor.sponsor_level || sponsor.package_name}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {sponsor.description && (
            <Text style={styles.sponsorDescription} numberOfLines={3}>
              {sponsor.description}
            </Text>
          )}
          {sponsor.website && (
            <TouchableOpacity
              style={styles.websiteButton}
              onPress={() => handleWebsitePress(sponsor.website!, sponsor.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="globe-outline" size={16} color={Colors.primary} />
              <Text style={styles.websiteButtonText}>Visiter le site</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyTabText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.md,
  },
  sponsorCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sponsorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sponsorLogo: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
  },
  sponsorLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsorInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  sponsorName: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: 4,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  levelBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    textTransform: 'capitalize',
  },
  sponsorDescription: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
  },
  websiteButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
});
