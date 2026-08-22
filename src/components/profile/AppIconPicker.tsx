import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FontFamily } from '../../constants/theme';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useTheme } from '../../contexts/ThemeContext';
import { haptics } from '../../utils/haptics';

// Lazy-require : le module natif (config plugin) n'est présent qu'APRÈS un
// rebuild. En Expo Go / build sans le plugin, `require` peut throw → on dégrade
// proprement (le sélecteur affiche une alerte au tap plutôt que de crasher).
function getIconModule(): {
  setAppIcon: (name: string) => string | false;
  getAppIcon: () => string;
} | null {
  try {
    return require('expo-dynamic-app-icon');
  } catch {
    return null;
  }
}

const VARIANT_KEYS = ['nuit', 'ocean', 'or'];

const OPTIONS: { key: string; label: string; source: any }[] = [
  { key: 'DEFAULT', label: 'Défaut', source: require('../../../assets/icon2.png') },
  { key: 'nuit', label: 'Nuit', source: require('../../../assets/icons/icon_nuit.png') },
  { key: 'ocean', label: 'Océan', source: require('../../../assets/icons/icon_ocean.png') },
  { key: 'or', label: 'Or', source: require('../../../assets/icons/icon_or.png') },
];

/**
 * Sélecteur d'icône alternative de l'app (iOS alternate icons / Android
 * activity-alias via expo-dynamic-app-icon). À poser dans l'écran Paramètres.
 * ⚠️ Nécessite un rebuild natif pour être fonctionnel.
 */
export default function AppIconPicker() {
  const { colors } = useTheme();
  const { toastInfo } = useFeedback();

  const [current, setCurrent] = useState<string>(() => {
    const mod = getIconModule();
    try {
      return (mod?.getAppIcon() as string) || 'DEFAULT';
    } catch {
      return 'DEFAULT';
    }
  });

  const select = (key: string) => {
    if (key === current) return;
    const mod = getIconModule();
    try {
      // Retour au défaut : le composant natif est `<pkg>.MainActivity` (sans
      // suffixe). expo-dynamic-app-icon construit `MainActivity${name}`, donc
      // pour le défaut il faut passer une chaîne VIDE (pas 'DEFAULT', qui
      // pointerait vers un alias inexistant `MainActivityDEFAULT` → échec).
      const res = mod?.setAppIcon(key === 'DEFAULT' ? '' : key);
      if (!mod || res === false) throw new Error('unsupported');
      haptics.selection();
      setCurrent(key);
    } catch {
      toastInfo(
        "Le changement d'icône sera disponible après la prochaine mise à jour de l'application.",
      );
    }
  };

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.gray500 }]}>ICÔNE DE L'APP</Text>
      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const active =
            current === opt.key ||
            (opt.key === 'DEFAULT' && !VARIANT_KEYS.includes(current));
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => select(opt.key)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Icône ${opt.label}`}
              style={styles.item}
            >
              <View style={[styles.iconWrap, active && { borderColor: colors.primary }]}>
                <Image source={opt.source} style={styles.iconImg} />
                {active && (
                  <View style={[styles.check, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <Text style={[styles.itemLabel, { color: active ? colors.primary : colors.gray600 }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  item: {
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
    position: 'relative',
  },
  iconImg: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  check: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
});
