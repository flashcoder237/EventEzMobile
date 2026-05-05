// ============================================
// SimilarEventsSection — events recommandés en bas de EventDetails
// ============================================
//
// Consomme `recommendationsAPI.getSimilar(eventId)` (route /recommendations/similar/{id}/).
// Strategy : silently no-op si l'endpoint retourne 0 events ou échoue — le but
// est d'enrichir la page si possible, jamais de bloquer le contenu principal.

import React, { useEffect, useState, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { recommendationsAPI, getMediaUrl } from '../../api';
import { Event, RootStackParamList } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  eventId: string;
  /** Limite affichée — par défaut 5 events latéraux. */
  limit?: number;
}

const CARD_WIDTH = 220;
const CARD_HEIGHT = 130;

// Mémoïsé : rendu en boucle dans FlatList, props stables côté parent
const SimilarEventCard = memo(function SimilarEventCard({
  event,
  onPress,
}: {
  event: Event;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const banner = getMediaUrl(event.banner_image || event.display_image);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: 'rgba(0,0,0,0.06)' }, Shadows.sm]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Voir ${event.title}`}
    >
      <Image
        source={banner || require('../../../assets/defaults/default-event.png')}
        style={styles.cardImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
      />
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
          {event.title}
        </Text>
        {event.location_city && (
          <Text style={[styles.cardCity, { color: colors.gray500 }]} numberOfLines={1}>
            {event.location_city}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

export default function SimilarEventsSection({ eventId, limit = 5 }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [items, setItems] = useState<Event[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await recommendationsAPI.getSimilar(eventId, { limit });
        const data: Event[] = res.data?.results || res.data || [];
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setItems([]); // silencieux — section facultative
      }
    })();
    return () => { cancelled = true; };
  }, [eventId, limit]);

  if (!items || items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.eyebrow, { color: colors.accent }]}>RECOMMANDATIONS</Text>
      <Text style={[styles.title, { color: colors.text }]}>Événements similaires</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <SimilarEventCard
            event={item}
            onPress={() => navigation.push('EventDetails', { eventId: String(item.id) })}
          />
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: Spacing.sm }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.6,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  list: {
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: CARD_HEIGHT,
  },
  cardBody: {
    padding: Spacing.md,
  },
  cardTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  cardCity: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    marginTop: 4,
  },
});
