/**
 * « Bon retour » (R3 W6).
 *
 * Après plus de 21 jours sans ouvrir l'app : UNE carte en tête de Découvrir,
 * alimentée par `/me/since` (nouveaux événements des organisateurs suivis,
 * nouvelles éditions d'événements vécus). Rien si la réponse est vide ou en
 * 404, rien si une annonce s'affiche déjà, jamais de « vous nous avez manqué ».
 * Masquable ; le masquage vaut pour cette absence.
 */
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useOptionalAnnouncements } from '../../contexts/AnnouncementsContext';
import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';
import { Durations } from '../../constants/motion';
import { fetchMeSince, type SinceItem } from '../../lib/meSince';
import { getPreviousOpenAt, isLongAbsence, primeLastOpen, subscribeLastOpen } from '../../lib/lastOpen';

const MAX_SHOWN = 3;
// Masquage mémorisé pour la session (la prochaine ouverture ne sera plus une
// longue absence : la carte ne reviendra pas).
let dismissedFor: number | null = null;

function WelcomeBackCardComponent({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const announcements = useOptionalAnnouncements();
  const [since, setSince] = useState<number | null>(() => getPreviousOpenAt());
  const [items, setItems] = useState<SinceItem[]>([]);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const sync = () => setSince(getPreviousOpenAt());
    const unsub = subscribeLastOpen(sync);
    primeLastOpen().then(sync).catch(() => {});
    return unsub;
  }, []);

  useEffect(() => {
    if (!enabled || !isLongAbsence(since) || dismissedFor === since) {
      setItems([]);
      return undefined;
    }
    let alive = true;
    fetchMeSince(since as number).then((list) => {
      if (alive) setItems(list);
    });
    return () => {
      alive = false;
    };
  }, [enabled, since]);

  // Une annonce occupe déjà l'écran : on ne cumule pas.
  if (hidden || !items.length || announcements?.next) return null;

  const shown = items.slice(0, MAX_SHOWN);
  const rest = items.length - shown.length;

  const dismiss = () => {
    dismissedFor = since;
    setHidden(true);
  };

  return (
    <Animated.View
      entering={FadeIn.duration(Durations.enter)}
      exiting={FadeOut.duration(Durations.exit)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      testID="welcome-back"
    >
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t('delight.welcomeBack.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.gray500 }]}>
            {t('delight.welcomeBack.subtitle', { count: items.length })}
          </Text>
        </View>
        <TouchableOpacity
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel={t('delight.welcomeBack.dismiss')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color={colors.gray400} />
        </TouchableOpacity>
      </View>
      {shown.map((it) => (
        <TouchableOpacity
          key={it.id}
          style={[styles.item, { borderTopColor: colors.border }]}
          onPress={() => navigation.navigate('EventDetails', { eventId: it.slug || it.id })}
          accessibilityRole="button"
          accessibilityLabel={it.title}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
              {it.title}
            </Text>
            <Text style={[styles.itemMeta, { color: colors.gray500 }]} numberOfLines={1}>
              {it.reason === 'followed_organizer' && it.organizer_name
                ? t('delight.welcomeBack.byOrganizer', { name: it.organizer_name })
                : t(`delight.welcomeBack.reason.${it.reason}`)}
              {it.location_city ? ` · ${it.location_city}` : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
        </TouchableOpacity>
      ))}
      {rest > 0 && (
        <Text style={[styles.more, { color: colors.gray500 }]}>{t('delight.welcomeBack.more', { count: rest })}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  title: { fontFamily: FontFamily.displayBold, fontSize: 17, letterSpacing: -0.3 },
  subtitle: { fontFamily: FontFamily.regular, fontSize: 13, marginTop: 2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemTitle: { fontFamily: FontFamily.semiBold, fontSize: 14 },
  itemMeta: { fontFamily: FontFamily.regular, fontSize: 12, marginTop: 2 },
  more: { fontFamily: FontFamily.regular, fontSize: 12, paddingVertical: 6 },
});

export const WelcomeBackCard = memo(WelcomeBackCardComponent);
export default WelcomeBackCard;
