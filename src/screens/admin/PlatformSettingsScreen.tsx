import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList } from '../../types';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value?: string;
  onPress?: () => void;
}

export default function PlatformSettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();

  const SettingRow = ({ icon, title, subtitle, value, onPress }: SettingRowProps) => (
    <TouchableOpacity
      style={[styles.settingRow, { borderBottomColor: colors.gray100 }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${colors.primary}15` }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, { color: colors.gray900 }]}>{title}</Text>
        <Text style={[styles.settingSubtitle, { color: colors.gray500 }]}>{subtitle}</Text>
      </View>
      {value && <Text style={[styles.settingValue, { color: colors.primary }]}>{value}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={18} color={colors.gray300} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.gray50 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.gray700} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>Le moteur</Text>
          <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Paramètres plateforme</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* General */}
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>General</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingRow
            icon="globe-outline"
            title="Nom de la plateforme"
            subtitle="Nom affiche aux utilisateurs"
            value="EventEz"
          />
          <SettingRow
            icon="time-outline"
            title="Fuseau horaire"
            subtitle="Fuseau horaire par defaut"
            value="Africa/Douala"
          />
          <SettingRow
            icon="language-outline"
            title="Langue"
            subtitle="Langue par defaut"
            value="Francais"
          />
        </View>

        {/* Payments */}
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>Paiements</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingRow
            icon="card-outline"
            title="Passerelle de paiement"
            subtitle="Service de paiement integre"
            value="NotchPay"
          />
          <SettingRow
            icon="cash-outline"
            title="Devise"
            subtitle="Devise par defaut"
            value="XAF (FCFA)"
          />
          <SettingRow
            icon="calculator-outline"
            title="Commission"
            subtitle="Taux de commission plateforme"
            value="Variable"
          />
        </View>

        {/* Security */}
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>Securite</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingRow
            icon="key-outline"
            title="Tokens JWT"
            subtitle="Duree de vie des tokens"
            value="15min / 7j"
          />
          <SettingRow
            icon="shield-checkmark-outline"
            title="Moderation"
            subtitle="Validation requise pour publier"
            value="Active"
          />
          <SettingRow
            icon="document-text-outline"
            title="Audit"
            subtitle="Journalisation des actions"
            value="Active"
          />
        </View>

        {/* Infrastructure */}
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>Infrastructure</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingRow
            icon="server-outline"
            title="Base de donnees"
            subtitle="Type et nom"
            value="PostgreSQL"
          />
          <SettingRow
            icon="flash-outline"
            title="Cache & Queues"
            subtitle="Celery + Redis"
            value="Redis"
          />
          <SettingRow
            icon="wifi-outline"
            title="WebSocket"
            subtitle="Messagerie temps reel"
            value="Channels"
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { alignItems: 'center' },
  headerEyebrow: { fontSize: 10, fontFamily: FontFamily.bold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  headerTitle: { ...TextStyles.h3, letterSpacing: -0.3 },
  scrollContent: { paddingHorizontal: Spacing.lg },
  sectionTitle: { ...TextStyles.eyebrow, letterSpacing: 1.2, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  card: { borderRadius: BorderRadius['2xl'], ...Shadows.card, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, gap: Spacing.md },
  settingIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  settingInfo: { flex: 1 },
  settingTitle: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  settingSubtitle: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: 2 },
  settingValue: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.xs },
});
