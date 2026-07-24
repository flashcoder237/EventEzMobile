/**
 * WeddingGiftRegistryScreen
 *
 * Cible du deep link `eventez://events/{slug}/gift-registry` (et de l'App Link
 * https://eventez.online/events/{slug}/gift-registry).
 *
 * Liste publique de cadeaux / cagnotte d'un mariage. Un invité (connecté ou non)
 * choisit un cadeau ou un montant et paie via le gateway (in-app browser).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { weddingsAPI } from '../../api';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useTheme } from '../../contexts/ThemeContext';
import { DEEP_LINK_SCHEME } from '../../constants/urls';
import {
  BorderRadius,
  FontFamily,
  FontSizes,
  Spacing,
  TOUCH_OPACITY,
} from '../../constants/theme';
import { RootStackParamList } from '../../types';

type RouteProps = RouteProp<RootStackParamList, 'WeddingGiftRegistry'>;

const PAYMENT_METHODS = [
  { id: 'mtn_money', label: 'MTN Mobile Money' },
  { id: 'orange_money', label: 'Orange Money' },
  { id: 'credit_card', label: 'Carte bancaire' },
];

export default function WeddingGiftRegistryScreen() {
  const route = useRoute<RouteProps>();
  const { slug } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [registry, setRegistry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [method, setMethod] = useState(PAYMENT_METHODS[0].id);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await weddingsAPI.getRegistryByEvent(slug);
      const list = res.data?.results || res.data || [];
      setRegistry(list.length > 0 ? list[0] : null);
    } catch {
      setRegistry(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const openContribute = (item: any | null) => {
    setActiveItem(item);
    setAmount(item && item.kind === 'gift' ? String(item.target_amount) : '');
  };

  const contribute = async () => {
    if (!registry || !amount || Number(amount) <= 0) return;
    setPaying(true);
    try {
      const res = await weddingsAPI.contribute(registry.id, {
        amount,
        payment_method: method,
        item: activeItem?.id,
        contributor_name: name,
      });
      const url = res.data?.payment_url;
      const contributionId = res.data?.contribution_id;
      if (!url) {
        Alert.alert('', t('wedding.giftError', { defaultValue: "Le paiement n'a pas pu démarrer." }));
        return;
      }
      const returnUrl = `${DEEP_LINK_SCHEME}://payment-success/${contributionId}`;
      await WebBrowser.openAuthSessionAsync(url, returnUrl, {
        dismissButtonStyle: 'close',
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        toolbarColor: colors.primary,
      });
      // Au retour : recharger la liste (l'objet réservé/cagnotte à jour).
      setActiveItem(null);
      setAmount('');
      setName('');
      await load();
    } catch {
      Alert.alert('', t('wedding.giftError', { defaultValue: "Le paiement n'a pas pu démarrer." }));
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <LoadingSpinner />
      </EditorialCanvas>
    );
  }

  if (!registry || !registry.is_active) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>GIFTS</WatermarkNumeral>
        <View style={styles.emptyWrap}>
          <Text style={[styles.centerMsg, { color: colors.textSecondary }]}>
            {t('wedding.giftEmpty', { defaultValue: "La liste de cadeaux n'est pas encore disponible." })}
          </Text>
        </View>
      </EditorialCanvas>
    );
  }

  const currency = registry.currency;

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>GIFTS</WatermarkNumeral>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('wedding.giftTitle', { defaultValue: 'Liste de mariage' })}
        </Text>
        {!!registry.description && (
          <Text style={[styles.muted, { color: colors.textSecondary }]}>{registry.description}</Text>
        )}

        {(registry.items || []).map((item: any) => {
          const reserved = item.kind === 'gift' && item.is_reserved;
          return (
            <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHead}>
                <Ionicons
                  name={item.kind === 'cash_fund' ? 'wallet-outline' : 'gift-outline'}
                  size={18}
                  color={colors.primary}
                />
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
              </View>
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                {item.kind === 'cash_fund'
                  ? `${item.amount_collected} ${currency}${Number(item.target_amount) > 0 ? ` / ${item.target_amount} ${currency}` : ''}`
                  : `${item.target_amount} ${currency}`}
              </Text>
              {reserved ? (
                <View style={styles.reservedRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={[styles.reservedText, { color: colors.success }]}>
                    {t('wedding.giftReserved', { defaultValue: 'Déjà offert' })}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={TOUCH_OPACITY}
                  onPress={() => openContribute(item)}
                  style={[styles.contributeBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.contributeText}>
                    {t('wedding.giftContribute', { defaultValue: 'Participer' })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {activeItem !== null && (
          <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {t('wedding.giftContribute', { defaultValue: 'Participer' })} — {activeItem.name}
            </Text>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('wedding.giftAmount', { defaultValue: 'Montant' })} ({currency})
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              editable={activeItem.kind !== 'gift'}
              keyboardType="number-pad"
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, opacity: activeItem.kind === 'gift' ? 0.6 : 1 }]}
            />
            <Text style={[styles.label, { color: colors.text }]}>
              {t('wedding.giftYourName', { defaultValue: 'Votre nom' })}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            />
            <Text style={[styles.label, { color: colors.text }]}>
              {t('wedding.giftMethod', { defaultValue: 'Moyen de paiement' })}
            </Text>
            <View style={styles.methods}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  activeOpacity={TOUCH_OPACITY}
                  onPress={() => setMethod(m.id)}
                  style={[
                    styles.method,
                    {
                      borderColor: method === m.id ? colors.primary : colors.border,
                      backgroundColor: method === m.id ? colors.primary + '14' : 'transparent',
                    },
                  ]}
                >
                  <Text style={[styles.methodText, { color: colors.text }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              activeOpacity={TOUCH_OPACITY}
              onPress={contribute}
              disabled={paying || !amount || Number(amount) <= 0}
              style={[styles.submit, { backgroundColor: colors.primary, opacity: paying || !amount ? 0.5 : 1 }]}
            >
              <Text style={styles.submitText}>
                {paying ? t('common.loading', { defaultValue: 'Chargement…' }) : t('wedding.giftPay', { defaultValue: 'Contribuer' })}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing['2xl'] },
  emptyWrap: { padding: Spacing.xl, alignItems: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: FontSizes.xl, marginBottom: Spacing.xs },
  muted: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm, marginBottom: Spacing.md },
  centerMsg: { fontFamily: FontFamily.regular, fontSize: FontSizes.md, textAlign: 'center' },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md },
  cardMeta: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm, marginTop: 4 },
  reservedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  reservedText: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  contributeBtn: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  contributeText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm, color: '#FFFFFF' },
  form: {
    borderWidth: 1,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  formTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md, marginBottom: Spacing.xs },
  label: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm, marginTop: Spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.md,
  },
  methods: { gap: Spacing.xs },
  method: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  methodText: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm },
  submit: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  submitText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md, color: '#FFFFFF' },
});
