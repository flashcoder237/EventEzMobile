import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList } from '../../types';
import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Stat {
  value: number | string;
  label: string;
}

interface Props {
  stats: {
    tickets: number;
    favorites: number;
    reviews: number;
  };
}

/**
 * Card vedette qui pousse l'utilisateur vers son tableau de bord personnel.
 * 3 stats cles + CTA "Voir tout" + degrade indigo→violet pour ressortir.
 */
export default function DashboardHeroCard({ stats }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const cells: Stat[] = [
    { value: stats.tickets, label: t('componentsProfile.dashboardStatTickets') },
    { value: stats.favorites, label: t('componentsProfile.dashboardStatFavorites') },
    { value: stats.reviews, label: t('componentsProfile.dashboardStatReviews') },
  ];

  const gradientColors = isDark
    ? (['#3730A3', '#6D28D9'] as const)
    : (['#4F46E5', '#7C3AED'] as const);

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('UserDashboard')}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={t('componentsProfile.dashboardA11y')}
      style={styles.wrapper}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.eyebrow}>{t('componentsProfile.dashboardEyebrow')}</Text>
            <Text style={styles.title}>{t('componentsProfile.dashboardTitle')}</Text>
          </View>
          <View style={styles.iconDisc}>
            <Ionicons name="grid" size={18} color="#FFFFFF" />
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsRow}>
          {cells.map((cell, idx) => (
            <React.Fragment key={cell.label}>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{cell.value}</Text>
                <Text style={styles.statLabel}>{cell.label}</Text>
              </View>
              {idx < cells.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Footer CTA */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('componentsProfile.dashboardFooterText')}</Text>
          <View style={styles.ctaArrow}>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
  card: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
  },
  title: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 24,
    color: '#FFFFFF',
    letterSpacing: -0.7,
  },
  iconDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 30,
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 32,
  },
  statLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  footerText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  ctaArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
