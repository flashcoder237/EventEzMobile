import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList } from '../../types';
import RoleGuard from '../../components/auth/RoleGuard';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value?: string;
  color?: string;
  onPress?: () => void;
  isLast?: boolean;
}

export default function PlatformSettingsScreen() {
  return (
    <RoleGuard allow={['admin']} watermark="CFG" title="Paramètres plateforme">
      <PlatformSettingsContent />
    </RoleGuard>
  );
}

function PlatformSettingsContent() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const SettingRow = ({ icon, title, subtitle, value, color, onPress, isLast }: SettingRowProps) => {
    const tint = color || colors.primary;
    return (
      <TouchableOpacity
        style={[
          styles.settingRow,
          !isLast && { borderBottomWidth: 1, borderBottomColor: hairline },
        ]}
        onPress={onPress}
        activeOpacity={onPress ? 0.6 : 1}
        disabled={!onPress}
      >
        <View style={[styles.iconWell, { backgroundColor: `${tint}15` }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.settingSubtitle, { color: colors.gray500 }]}>{subtitle}</Text>
        </View>
        {value && <Text style={[styles.settingValue, { color: tint }]}>{value}</Text>}
        {onPress && <Ionicons name="chevron-forward" size={16} color={colors.gray400} />}
      </TouchableOpacity>
    );
  };

  const sections: {
    title: string;
    rows: (Omit<SettingRowProps, 'isLast'> & { key: string })[];
  }[] = [
    {
      title: 'GÉNÉRAL',
      rows: [
        { key: 'name', icon: 'globe-outline', title: 'Nom de la plateforme', subtitle: 'Nom affiché aux utilisateurs', value: 'EventEz', color: '#4F46E5' },
        { key: 'tz', icon: 'time-outline', title: 'Fuseau horaire', subtitle: 'Fuseau horaire par défaut', value: 'Africa/Douala', color: '#4F46E5' },
        { key: 'lang', icon: 'language-outline', title: 'Langue', subtitle: 'Langue par défaut', value: 'Français', color: '#4F46E5' },
      ],
    },
    {
      title: 'PAIEMENTS',
      rows: [
        { key: 'gateway', icon: 'card-outline', title: 'Passerelle de paiement', subtitle: 'Service de paiement intégré', value: 'NotchPay', color: '#10B981' },
        { key: 'currency', icon: 'cash-outline', title: 'Devise', subtitle: 'Devise par défaut', value: 'XAF (FCFA)', color: '#10B981' },
        { key: 'commission', icon: 'calculator-outline', title: 'Commission', subtitle: 'Taux de commission plateforme', value: 'Variable', color: '#10B981' },
      ],
    },
    {
      title: 'SÉCURITÉ',
      rows: [
        { key: 'jwt', icon: 'key-outline', title: 'Tokens JWT', subtitle: 'Durée de vie des tokens', value: '15min / 7j', color: '#F59E0B' },
        { key: 'mod', icon: 'shield-checkmark-outline', title: 'Modération', subtitle: 'Validation requise pour publier', value: 'Active', color: '#F59E0B' },
        { key: 'audit', icon: 'document-text-outline', title: 'Audit', subtitle: 'Journalisation des actions', value: 'Actif', color: '#F59E0B' },
      ],
    },
    {
      title: 'INFRASTRUCTURE',
      rows: [
        { key: 'db', icon: 'server-outline', title: 'Base de données', subtitle: 'Type et nom', value: 'PostgreSQL', color: '#A855F7' },
        { key: 'cache', icon: 'flash-outline', title: 'Cache & Queues', subtitle: 'Celery + Redis', value: 'Redis', color: '#A855F7' },
        { key: 'ws', icon: 'wifi-outline', title: 'WebSocket', subtitle: 'Messagerie temps réel', value: 'Channels', color: '#A855F7' },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>LE MOTEUR</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Paramètres plateforme</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {sections.map((section) => (
          <React.Fragment key={section.title}>
            <Text style={[styles.sectionEyebrow, { color: colors.gray500 }]}>{section.title}</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
              {section.rows.map((row, idx) => {
                const { key, ...rest } = row;
                return <SettingRow key={key} {...rest} isLast={idx === section.rows.length - 1} />;
              })}
            </View>
          </React.Fragment>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  iconDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
  },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: { flex: 1 },
  settingTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  settingSubtitle: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs, marginTop: 2 },
  settingValue: { fontFamily: FontFamily.bold, fontSize: FontSizes.xs },
});
