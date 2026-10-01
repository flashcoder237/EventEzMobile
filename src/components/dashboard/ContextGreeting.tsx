/**
 * Ligne d'accueil contextuelle (R3 W3 + W4/W5).
 *
 * UNE seule ligne sous le prénom, par priorité :
 *   0. une petite attention du jour (anniversaire, ancienneté du compte, fête
 *      nationale, Nouvel An), une fois par jour, si « Petites attentions » ;
 *   1. la météo PRÉVUE au lieu du prochain billet, de J-2 à J0 ;
 *   2. les nouveautés des organisateurs suivis (`/me/since`) ;
 *   3. sinon rien : la salutation horaire au-dessus suffit.
 * Rien n'est inventé : sans donnée, on passe à la ligne suivante. L'âge n'est
 * jamais affiché. Fondu d'opacité seulement.
 */
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily } from '../../constants/theme';
import { Durations } from '../../constants/motion';
import { CELEBRATION_GOLD } from '../../lib/utils/ambience';
import { dailyVariant, ritualForToday, type Ritual } from '../../lib/utils/rituals';
import { claimDaily } from '../../lib/dailyOnce';
import { fetchForecast, weatherKind, type Forecast } from '../../lib/weather';
import { loadNextTicketEvent, type NextTicketEvent } from '../../lib/nextTicket';
import { fetchMeSince } from '../../lib/meSince';
import { getPreviousOpenAt, primeLastOpen } from '../../lib/lastOpen';
import { useSensoryPref } from '../../hooks/useSensoryPrefs';

interface Props {
  user: {
    id?: string | number;
    date_of_birth?: string | null;
    date_joined?: string | null;
    country?: string | null;
  } | null | undefined;
}

// Sans visite précédente connue : nouveautés des 7 derniers jours.
const DEFAULT_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

function ContextGreetingComponent({ user }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [ritualsOn] = useSensoryPref('rituals');
  const [ritual, setRitual] = useState<Ritual | null>(null);
  const [next, setNext] = useState<NextTicketEvent | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [newsCount, setNewsCount] = useState(0);
  const userId = user?.id;

  // 0 — attention du jour (décidée une fois, puis marquée « vue » pour la journée).
  useEffect(() => {
    if (!user || !ritualsOn) {
      setRitual(null);
      return undefined;
    }
    const today = new Date();
    const found = ritualForToday(user, today);
    if (!found) return undefined;
    let alive = true;
    claimDaily('ritual', today).then((ok) => {
      if (alive && ok) setRitual(found);
    });
    return () => {
      alive = false;
    };
  }, [user, ritualsOn]);

  // 1 — prochain billet (J0 → J+2) et sa météo, aux coordonnées de l'événement.
  useEffect(() => {
    if (!userId) return undefined;
    let alive = true;
    loadNextTicketEvent(userId).then(async (ev) => {
      if (!alive || !ev) return;
      setNext(ev);
      const f = await fetchForecast(ev.lat, ev.lng, ev.start_date);
      if (alive) setForecast(f);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  // 2 — nouveautés des organisateurs suivis.
  useEffect(() => {
    if (!userId) return undefined;
    let alive = true;
    primeLastOpen().then(() => {
      const since = getPreviousOpenAt() ?? Date.now() - DEFAULT_LOOKBACK_MS;
      return fetchMeSince(since).then((items) => {
        if (alive) setNewsCount(items.filter((it) => it.reason === 'followed_organizer').length);
      });
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  let line: string | null = null;
  let golden = false;
  if (ritual) {
    golden = ritual.kind === 'birthday' || ritual.kind === 'accountAnniversary';
    if (ritual.kind === 'birthday') line = t('delight.greeting.ritual.birthday');
    else if (ritual.kind === 'accountAnniversary') line = t('delight.greeting.ritual.accountAnniversary', { count: ritual.years });
    else if (ritual.kind === 'nationalDay') line = t('delight.greeting.ritual.nationalDay');
    else line = t('delight.greeting.ritual.newYear', { year: new Date().getFullYear() });
  } else if (next && forecast) {
    const kind = weatherKind(forecast.code, forecast.precip);
    const when = t(`delight.greeting.when.${next.daysAway === 0 ? 'today' : next.daysAway === 1 ? 'tomorrow' : 'dayAfter'}`);
    const values = {
      when,
      title: next.title,
      city: next.city || t('delight.greeting.there'),
      temp: Number.isFinite(forecast.tMax) ? forecast.tMax : '',
      prob: forecast.precip ?? '',
    };
    if (kind === 'rain') {
      line = typeof forecast.precip === 'number'
        ? t('delight.greeting.weather.rainProb', values)
        : t('delight.greeting.weather.rain', values);
    } else if (kind === 'storm') line = t('delight.greeting.weather.storm', values);
    else if (Number.isFinite(forecast.tMax)) {
      line = t(kind === 'clear' ? 'delight.greeting.weather.clear' : 'delight.greeting.weather.cloudy', values);
    }
  }
  if (!line && newsCount > 0) {
    const v = dailyVariant(2, new Date(), 'news');
    line = t(`delight.greeting.news.v${v}`, { count: newsCount });
  }

  if (!line) return null;
  return (
    <Animated.View key={line} entering={FadeIn.duration(Durations.enter)} style={styles.row} testID="context-greeting">
      {golden && <View style={[styles.goldRule, { backgroundColor: CELEBRATION_GOLD }]} />}
      <Text style={[styles.text, { color: colors.gray600 }]} numberOfLines={2}>
        {line}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, maxWidth: 280 },
  goldRule: { width: 2, alignSelf: 'stretch', borderRadius: 1 },
  text: { fontFamily: FontFamily.medium, fontSize: 13, lineHeight: 18, flexShrink: 1 },
});

export const ContextGreeting = memo(ContextGreetingComponent);
export default ContextGreeting;
