import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

import { FontFamily } from '../../constants/theme';
import { useAlert } from '../../contexts/AlertContext';

interface Props {
  eventTitle: string;
  /** Date lisible (ex "sam. 12 juil. · 20:00"). Optionnelle. */
  dateLabel?: string;
  /** Puce en haut de la carte. */
  eyebrow?: string;
  /** Libellé du bouton. */
  label?: string;
}

// Ratio ~9:16 → carte Story-friendly (WhatsApp/Insta/FB stories).
const CARD_W = 340;
const CARD_H = 604;

/**
 * Bouton « Partager en story » : génère une carte de marque « J'y vais » depuis
 * les infos de l'event, la capture en image (react-native-view-shot) et ouvre la
 * feuille de partage (Stories, WhatsApp, etc.). Boucle virale : chaque
 * participant qui partage expose l'event à son réseau.
 *
 * La carte est rendue HORS-ÉCRAN (position absolue) puis capturée à la demande.
 */
export default function ShareTicketCardButton({
  eventTitle,
  dateLabel,
  eyebrow = "J'Y VAIS",
  label = 'Partager en story',
}: Props) {
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const { showError } = useAlert();

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // 2 frames pour garantir que la carte hors-écran est bien layoutée.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partager ma place',
        });
      }
    } catch {
      showError('Partage', 'Impossible de générer la carte pour le moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={handleShare}
        disabled={busy}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={styles.button}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="share-social" size={16} color="#FFFFFF" />
        )}
        <Text style={styles.buttonLabel}>{label}</Text>
      </TouchableOpacity>

      {/* Carte rendue HORS-ÉCRAN. `collapsable={false}` est requis sur Android
          pour capturer une vue non affichée. */}
      <View style={styles.offscreen} pointerEvents="none">
        <View ref={cardRef} collapsable={false} style={styles.card}>
          <LinearGradient
            colors={['#4F46E5', '#A855F7', '#FF6B6B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.cardInner}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{eyebrow}</Text>
            </View>

            <View style={styles.cardMiddle}>
              <Text style={styles.cardTitle} numberOfLines={5}>
                {eventTitle}
              </Text>
              {!!dateLabel && <Text style={styles.cardDate}>{dateLabel}</Text>}
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.brandRow}>
                <Ionicons name="ticket" size={18} color="#FFFFFF" />
                <Text style={styles.brand}>EventEz</Text>
              </View>
              <Text style={styles.cta}>Réserve ta place →</Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: 0,
    width: CARD_W,
    height: CARD_H,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 28,
    overflow: 'hidden',
  },
  cardInner: {
    flex: 1,
    padding: 28,
    justifyContent: 'space-between',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 2,
  },
  cardMiddle: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1,
  },
  cardDate: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    marginTop: 16,
    letterSpacing: 0.3,
  },
  cardFooter: {
    gap: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brand: {
    color: '#FFFFFF',
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 20,
    letterSpacing: -0.5,
  },
  cta: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: FontFamily.medium,
    fontSize: 14,
  },
});
