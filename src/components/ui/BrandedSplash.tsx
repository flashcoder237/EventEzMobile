import React from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Écran de chargement brandé — affiché pendant l'initialisation de l'app
 * (auth check, onboarding check, résolution langue). Remplace le spinner
 * générique pour assurer une continuité visuelle avec le splash natif.
 */
export default function BrandedSplash() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image
        source={require('../../../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 64,
  },
  spinner: {
    marginTop: 24,
  },
});
