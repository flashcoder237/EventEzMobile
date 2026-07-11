import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';
import { registrationsAPI } from '../../api';
import { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Proof {
  event_id: string;
  title: string;
  slug?: string;
  banner_image?: string | null;
  banner_placeholder?: string | null;
  start_date?: string | null;
  city?: string;
  attended_at: string;
  serial?: number | null;
  total_attendees: number;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function MemoriesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await registrationsAPI.getAttendanceProofs();
      setProofs(((res.data as any)?.proofs ?? []) as Proof[]);
    } catch {
      setProofs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('memories.title')}</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : proofs.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="ribbon-outline" size={48} color={colors.gray400} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('memories.emptyTitle')}</Text>
          <Text style={[styles.emptyText, { color: colors.gray500 }]}>{t('memories.emptyText')}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('memories.eyebrow')}</Text>
          <Text style={[styles.subtitle, { color: colors.gray500 }]}>
            {t('memories.count', { count: proofs.length })}
          </Text>
          {proofs.map((p) => (
            <MemoryCard key={p.event_id} proof={p} colors={colors} isDark={isDark} t={t} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function MemoryCard({
  proof, colors, isDark, t,
}: {
  proof: Proof; colors: any; isDark: boolean; t: (k: string, o?: any) => string;
}) {
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const serialLabel = proof.serial ? `#${proof.serial}` : '';
  const dateLabel = formatDate(proof.attended_at);

  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('memories.shareTitle') });
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Collectible visuel (capturé pour le partage) */}
      <View ref={cardRef} collapsable={false} style={styles.collectible}>
        {proof.banner_image ? (
          <ExpoImage
            source={{ uri: proof.banner_image }}
            placeholder={proof.banner_placeholder ? { uri: proof.banner_placeholder } : undefined}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={250}
          />
        ) : (
          <LinearGradient
            colors={['#4F46E5', '#A855F7', '#FF6B6B']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.collectibleInner}>
          <View style={styles.badgeRow}>
            <View style={styles.attendedBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#34D399" />
              <Text style={styles.attendedText}>{t('memories.iWasThere')}</Text>
            </View>
            {!!serialLabel && (
              <View style={styles.serialBadge}>
                <Text style={styles.serialText}>{serialLabel}</Text>
              </View>
            )}
          </View>
          <View>
            <Text style={styles.collectibleTitle} numberOfLines={2}>{proof.title}</Text>
            <Text style={styles.collectibleMeta}>
              {dateLabel}{proof.city ? ` · ${proof.city}` : ''}
            </Text>
            <View style={styles.brandRow}>
              <Ionicons name="ticket" size={13} color="#FFFFFF" />
              <Text style={styles.brand}>EventEz</Text>
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={share}
        disabled={busy}
        activeOpacity={0.85}
        style={[styles.shareBtn, { borderTopColor: isDark ? colors.border : colors.gray100 }]}
        accessibilityRole="button"
        accessibilityLabel={t('memories.share')}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="share-social-outline" size={16} color={colors.primary} />
        )}
        <Text style={[styles.shareText, { color: colors.primary }]}>{t('memories.share')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: Spacing.xl },
  emptyTitle: { fontFamily: FontFamily.displayExtraBold, fontSize: 20, letterSpacing: -0.5, marginTop: 4 },
  emptyText: { fontFamily: FontFamily.regular, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 17, letterSpacing: -0.3 },

  content: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2, gap: Spacing.md },
  eyebrow: { fontFamily: FontFamily.bold, fontSize: 11, letterSpacing: 1.6 },
  subtitle: { fontFamily: FontFamily.medium, fontSize: 13, marginTop: -6, marginBottom: 4 },

  card: { borderWidth: 1, borderRadius: BorderRadius['2xl'], overflow: 'hidden' },
  collectible: { height: 200, justifyContent: 'flex-end' },
  collectibleInner: { flex: 1, justifyContent: 'space-between', padding: Spacing.md },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  attendedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  attendedText: { color: '#FFFFFF', fontFamily: FontFamily.bold, fontSize: 10, letterSpacing: 1 },
  serialBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  serialText: { color: '#111110', fontFamily: FontFamily.displayExtraBold, fontSize: 14, letterSpacing: -0.3 },
  collectibleTitle: {
    color: '#FFFFFF', fontFamily: FontFamily.displayExtraBold, fontSize: 22,
    letterSpacing: -0.7, lineHeight: 25,
  },
  collectibleMeta: { color: 'rgba(255,255,255,0.85)', fontFamily: FontFamily.medium, fontSize: 12, marginTop: 4 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  brand: { color: '#FFFFFF', fontFamily: FontFamily.displayExtraBold, fontSize: 13, letterSpacing: -0.3 },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderTopWidth: 1,
  },
  shareText: { fontFamily: FontFamily.semiBold, fontSize: 13, letterSpacing: 0.2 },
});
