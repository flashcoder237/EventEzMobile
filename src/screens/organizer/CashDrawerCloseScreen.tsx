import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { boxOfficeAPI, CashDrawerState } from '../../api/boxOffice';
import { useAlert } from '../../contexts/AlertContext';

/**
 * CLÔTURE DE CAISSE — le moment où la caissière rend des comptes.
 *
 * Ce que cet écran doit permettre, dans l'ordre :
 * 1. voir EN GROS ce qu'elle doit avoir dans la sacoche ;
 * 2. saisir ce qu'elle a réellement compté ;
 * 3. expliquer l'écart si le compte ne tombe pas juste.
 *
 * L'écart n'est JAMAIS bloquant. C'est un fait à tracer, pas une faute à
 * empêcher — et le champ d'explication la protège autant qu'il informe
 * l'organisateur. Un écart expliqué le soir même vaut mille fois mieux
 * qu'un écart découvert trois jours plus tard.
 *
 * Le montant attendu ne compte QUE les espèces : une vente Mobile Money
 * n'est pas dans la sacoche, et la compter créerait un manquant fictif.
 */

type Params = { CashDrawerClose: { drawerId: string; eventId?: string } };

export default function CashDrawerCloseScreen() {
  const route = useRoute<RouteProp<Params, 'CashDrawerClose'>>();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { showAlert } = useAlert();
  const { drawerId, eventId } = route.params;

  const [drawer, setDrawer] = useState<CashDrawerState | null>(null);
  const [counted, setCounted] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    try {
      const res = await boxOfficeAPI.getDrawer(eventId);
      if (res.data?.open) setDrawer(res.data as CashDrawerState);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const expected = Number(drawer?.expected_amount ?? 0);
  const currency = drawer?.currency || 'XAF';
  const countedNum = counted === '' ? null : Number(counted);
  const variance = countedNum === null ? null : countedNum - expected;

  const close = async () => {
    if (counted === '' || closing) return;
    setClosing(true);
    try {
      const res = await boxOfficeAPI.closeDrawer({
        drawer: drawerId,
        countedAmount: counted,
        varianceReason: reason,
      });
      AccessibilityInfo.announceForAccessibility(
        t('organizer.cashDrawer.a11y.closed')
      );
      showAlert(
        t('organizer.cashDrawer.closedTitle'),
        t('organizer.cashDrawer.closedMessage', {
          amount: res.data.counted_amount,
          currency,
        }),
        undefined, 'success',
      );
      navigation.goBack();
    } catch {
      showAlert(
        t('organizer.cashDrawer.closeError'),
        t('organizer.cashDrawer.closeErrorDetail'),
        undefined, 'error', 'critical',
      );
    } finally {
      setClosing(false);
    }
  };

  const styles = makeStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        {/* LE chiffre : ce qu'elle doit avoir dans la sacoche. */}
        <View
          style={styles.expectedCard}
          accessibilityLabel={t('organizer.cashDrawer.a11y.expected', {
            amount: expected,
            currency,
          })}
        >
          <Text style={styles.expectedLabel} allowFontScaling maxFontSizeMultiplier={1.4}>
            {t('organizer.cashDrawer.expectedLabel')}
          </Text>
          <Text style={styles.expectedAmount} allowFontScaling maxFontSizeMultiplier={1.3}>
            {expected.toLocaleString('fr-FR')} {currency}
          </Text>
          <Text style={styles.expectedHint} allowFontScaling maxFontSizeMultiplier={1.5}>
            {t('organizer.cashDrawer.cashOnlyHint')}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel} allowFontScaling maxFontSizeMultiplier={1.5}>
            {t('organizer.cashDrawer.openingFloat')}
          </Text>
          <Text style={styles.detailValue} allowFontScaling maxFontSizeMultiplier={1.5}>
            {Number(drawer?.opening_float ?? 0).toLocaleString('fr-FR')} {currency}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel} allowFontScaling maxFontSizeMultiplier={1.5}>
            {t('organizer.cashDrawer.salesCount')}
          </Text>
          <Text style={styles.detailValue} allowFontScaling maxFontSizeMultiplier={1.5}>
            {drawer?.sales_count ?? 0}
          </Text>
        </View>

        <Text style={styles.inputLabel} allowFontScaling maxFontSizeMultiplier={1.5}>
          {t('organizer.cashDrawer.countedLabel')}
        </Text>
        <TextInput
          value={counted}
          onChangeText={setCounted}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.gray400}
          style={styles.countedInput}
          allowFontScaling
          accessibilityLabel={t('organizer.cashDrawer.a11y.countedInput')}
        />

        {/* L'écart s'annonce vocalement ET visuellement, avec un MOT et
            pas seulement une couleur : la nuit, sous les reflets, et pour
            un daltonien, la couleur seule ne transmet rien. */}
        {variance !== null && variance !== 0 && (
          <View
            style={[
              styles.varianceBox,
              variance < 0 ? styles.varianceShort : styles.varianceOver,
            ]}
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.varianceText} allowFontScaling maxFontSizeMultiplier={1.4}>
              {variance < 0
                ? t('organizer.cashDrawer.shortBy', {
                    amount: Math.abs(variance).toLocaleString('fr-FR'),
                    currency,
                  })
                : t('organizer.cashDrawer.overBy', {
                    amount: variance.toLocaleString('fr-FR'),
                    currency,
                  })}
            </Text>
            <Text style={styles.varianceHint} allowFontScaling maxFontSizeMultiplier={1.5}>
              {t('organizer.cashDrawer.varianceHint')}
            </Text>
          </View>
        )}

        <Text style={styles.inputLabel} allowFontScaling maxFontSizeMultiplier={1.5}>
          {t('organizer.cashDrawer.reasonLabel')}
        </Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
          placeholder={t('organizer.cashDrawer.reasonPlaceholder')}
          placeholderTextColor={colors.gray400}
          style={styles.reasonInput}
          allowFontScaling
          accessibilityLabel={t('organizer.cashDrawer.a11y.reasonInput')}
        />

        <TouchableOpacity
          style={[styles.closeButton, counted === '' && styles.closeButtonDisabled]}
          onPress={close}
          disabled={counted === '' || closing}
          accessibilityRole="button"
          accessibilityState={{ disabled: counted === '' || closing }}
          accessibilityLabel={t('organizer.cashDrawer.a11y.confirmClose')}
        >
          {closing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.closeButtonText} allowFontScaling maxFontSizeMultiplier={1.3}>
              {t('organizer.cashDrawer.confirmClose')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    body: { padding: 20, gap: 16, paddingBottom: 48 },

    expectedCard: {
      padding: 24,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      gap: 6,
    },
    expectedLabel: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    // Lisible à bout de bras : c'est le seul chiffre qui compte.
    expectedAmount: { fontSize: 48, fontWeight: '900', color: '#FFFFFF' },
    expectedHint: {
      fontSize: 17,
      color: '#FFFFFF',
      opacity: 0.9,
      textAlign: 'center',
    },

    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 48,
    },
    detailLabel: { fontSize: 18, color: colors.gray600 },
    detailValue: { fontSize: 19, fontWeight: '700', color: colors.text },

    inputLabel: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8 },
    countedInput: {
      minHeight: 72,
      fontSize: 32,
      fontWeight: '800',
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.gray300,
      color: colors.text,
      backgroundColor: colors.card,
    },

    varianceBox: { padding: 16, borderRadius: 16, gap: 4 },
    varianceShort: { backgroundColor: '#FEE2E2' },
    varianceOver: { backgroundColor: '#FEF3C7' },
    varianceText: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
    varianceHint: { fontSize: 17, color: '#334155' },

    reasonInput: {
      minHeight: 96,
      fontSize: 18,
      padding: 16,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.gray300,
      color: colors.text,
      backgroundColor: colors.card,
      textAlignVertical: 'top',
    },

    closeButton: {
      minHeight: 64,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      marginTop: 8,
    },
    closeButtonDisabled: { opacity: 0.4 },
    closeButtonText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  });
