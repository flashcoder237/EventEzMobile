import React, { useEffect, useState } from 'react';
import {
  Platform,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ticketsAPI } from '../../api';
import { ACCESS_TOKEN_KEY } from '../../api/config';
import { useAlert } from '../../contexts/AlertContext';
import { FontFamily } from '../../constants/theme';
import { officialWalletBadge } from '../../../assets/wallet/badges';

interface Props {
  ticketId: string;
}

/**
 * Bouton « Ajouter à Wallet », platform-aware :
 *   - iOS  → télécharge le .pkpass (authentifié) puis présente la feuille
 *            d'ajout Apple Wallet via expo-sharing.
 *   - Android → ouvre l'URL « Enregistrer dans Google Wallet » (lien public).
 *
 * Self-fetch du statut serveur : si l'intégration n'est pas configurée pour la
 * plateforme courante, le bouton ne s'affiche PAS (pas de bouton cassé). Tant
 * que les certs Wallet ne sont pas posés, `wallet-status` renvoie false → rien.
 */
export default function AddToWalletButton({ ticketId }: Props) {
  const { showError } = useAlert();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  const isIOS = Platform.OS === 'ios';
  const badge = officialWalletBadge(isIOS ? 'apple' : 'google', i18n.language);

  useEffect(() => {
    let cancelled = false;
    ticketsAPI
      .getWalletStatus()
      .then((res) => {
        if (cancelled) return;
        const data = res.data || {};
        setEnabled(isIOS ? !!data.apple_enabled : !!data.google_enabled);
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isIOS]);

  const handleApple = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const url = ticketsAPI.applePassUrl(ticketId);
      const target = `${FileSystem.cacheDirectory}eventez-${ticketId}.pkpass`;
      const res = await FileSystem.downloadAsync(url, target, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(res.uri, {
          mimeType: 'application/vnd.apple.pkpass',
          UTI: 'com.apple.pkpass',
          dialogTitle: 'Ajouter à Apple Wallet',
        });
      } else {
        await Linking.openURL(res.uri);
      }
    } catch {
      showError('Wallet', "Impossible d'ajouter le billet à Apple Wallet pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const res = await ticketsAPI.getGooglePassUrl(ticketId);
      const saveUrl: string | undefined = res.data?.save_url;
      if (saveUrl) {
        await Linking.openURL(saveUrl);
      } else {
        throw new Error('no save_url');
      }
    } catch {
      showError('Wallet', "Impossible d'enregistrer dans Google Wallet pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  if (!enabled) return null;

  const label = isIOS ? t('wallet.addToApple') : t('wallet.saveToGoogle');
  const onPress = isIOS ? handleApple : handleGoogle;

  // Badge officiel présent → on le rend tel quel (conforme store). L'artwork
  // porte son propre texte localisé ; on ne superpose rien dessus.
  if (badge) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={loading}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={styles.badgeWrap}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Image source={badge} style={styles.badgeImage} resizeMode="contain" />
        )}
      </TouchableOpacity>
    );
  }

  // Fallback : bouton stylé générique tant que le badge officiel n'est pas fourni.
  // Fonctionnel, mais À REMPLACER par le badge officiel avant publication store
  // (déposer l'artwork dans assets/wallet/ — cf. son README).
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.button}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Ionicons name={isIOS ? 'wallet' : 'logo-google'} size={18} color="#FFFFFF" />
      )}
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Conteneur du badge officiel. L'artwork gère son propre fond/coins/typo ; on
  // impose juste une hauteur conforme (≥ 44 pt, guidelines Apple & Google) et on
  // laisse la largeur suivre le ratio de l'image (resizeMode="contain").
  badgeWrap: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeImage: {
    height: 48,
    width: '100%',
  },
  // Fallback générique (fond noir = convention Wallet). NON conforme store —
  // remplacé automatiquement dès qu'un badge officiel est déposé dans assets/wallet/.
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
