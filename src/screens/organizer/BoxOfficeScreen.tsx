import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  AccessibilityInfo,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';

import { useTheme } from '../../contexts/ThemeContext';
import { boxOfficeAPI, CashDrawerState } from '../../api/boxOffice';
import { ticketTypesAPI } from '../../api';
import { useAlert } from '../../contexts/AlertContext';
import { haptics } from '../../utils/haptics';
import { useBoxOfficeQueue } from '../../hooks/useBoxOfficeQueue';

/**
 * GUICHET — écran d'encaissement sur place.
 *
 * CONTRAINTES DE TERRAIN, qui expliquent chaque choix visuel ci-dessous.
 * Cet écran est tenu debout, la nuit, sous la pluie, avec une file de
 * quarante personnes et une seule main libre (l'autre tient la sacoche
 * ou le parapluie).
 *
 * - DEUX GESTES PAR VENTE : tap sur le tarif, tap sur encaisser. Au-delà
 *   de trois, la caissière décroche et revient au carnet à souches.
 * - AUCUNE SAISIE D'IDENTITÉ. Taper un nom sur un clavier tactile mouillé
 *   coûte 40 secondes et deux fautes ; la file double.
 * - AUCUN ÉCRAN DE CONFIRMATION. La personne est physiquement là.
 * - LE COMPTEUR EST TOUJOURS VISIBLE. Ne plus savoir si la dernière vente
 *   est passée est la première cause de panique.
 *
 * ACCESSIBILITÉ — exigences chiffrées, pas décoratives :
 * - montant à rendre : 48px (lisible à bout de bras) ;
 * - pavés de tarif : 88px de haut, pleine largeur ;
 * - plancher absolu : 17px (le reste de l'app descend à 10-11px) ;
 * - aucune cible sous 48×48, espacées de 12px minimum (doigts mouillés) ;
 * - `allowFontScaling` actif : la caissière a 52 ans et a probablement
 *   agrandi le texte de son téléphone ;
 * - jamais de statut codé par la COULEUR SEULE — toujours icône + mot,
 *   pour la nuit, les reflets et le daltonisme ;
 * - chaque vente est annoncée vocalement (VoiceOver/TalkBack).
 */

type Params = { BoxOffice: { eventId: string; eventTitle?: string } };

interface TicketTypeLite {
  id: string;
  name: string;
  price: string;
  quantity_total: number;
  quantity_sold: number;
}

interface CartLine {
  ticketType: TicketTypeLite;
  quantity: number;
}

export default function BoxOfficeScreen() {
  const route = useRoute<RouteProp<Params, 'BoxOffice'>>();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { showAlert } = useAlert();
  const { eventId } = route.params;

  const [drawer, setDrawer] = useState<CashDrawerState | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeLite[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selling, setSelling] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('');
  const [lastChange, setLastChange] = useState<string | null>(null);

  // La clé d'idempotence est générée UNE SEULE FOIS par vente et
  // conservée jusqu'au succès. La régénérer sur un renvoi ferait
  // encaisser deux fois.
  const saleIdRef = useRef<string | null>(null);

  // File hors ligne : le reseau tombe TOUJOURS pendant un evenement.
  // La vente doit continuer exactement pareil, sans que la caissiere ait
  // a cocher quoi que ce soit — si l'app la bloque, elle pose le
  // telephone et revient au carnet a souches.
  const {
    pendingCount,
    pendingAmount,
    failedCount,
    isOnline,
    enqueue,
  } = useBoxOfficeQueue(eventId);

  const currency = drawer?.currency || 'XAF';

  const total = useMemo(
    () =>
      cart.reduce(
        (sum, line) => sum + Number(line.ticketType.price) * line.quantity,
        0
      ),
    [cart]
  );

  const salesCount = drawer?.sales_count ?? 0;

  const loadState = useCallback(async () => {
    try {
      const [drawerRes, typesRes] = await Promise.all([
        boxOfficeAPI.getDrawer(eventId),
        ticketTypesAPI.getTicketTypes({ event: eventId }),
      ]);
      if (drawerRes.data?.open) {
        setDrawer(drawerRes.data as CashDrawerState);
      }
      const rows = (typesRes.data as any)?.results ?? typesRes.data ?? [];
      setTicketTypes(rows);
    } catch {
      // L'écran doit rester utilisable : on n'affiche pas d'erreur
      // bloquante, la caissière réessaiera.
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const openDrawer = async () => {
    try {
      const res = await boxOfficeAPI.openDrawer(eventId, openingFloat || '0');
      setDrawer(res.data);
      AccessibilityInfo.announceForAccessibility(
        t('organizer.boxOffice.a11y.drawerOpened')
      );
    } catch {
      showAlert(
        t('organizer.boxOffice.openError'),
        t('organizer.boxOffice.openErrorDetail'),
      );
    }
  };

  const addToCart = (ticketType: TicketTypeLite) => {
    haptics.light();
    setCart((prev) => {
      const existing = prev.find((l) => l.ticketType.id === ticketType.id);
      const next = existing
        ? prev.map((l) =>
            l.ticketType.id === ticketType.id
              ? { ...l, quantity: l.quantity + 1 }
              : l
          )
        : [...prev, { ticketType, quantity: 1 }];
      // Annonce vocale : sans elle, un caissier malvoyant ne sait pas
      // que son tap a été pris en compte.
      AccessibilityInfo.announceForAccessibility(
        t('organizer.boxOffice.a11y.added', { name: ticketType.name })
      );
      return next;
    });
  };

  const removeLine = (id: string) => {
    haptics.light();
    setCart((prev) => prev.filter((l) => l.ticketType.id !== id));
  };

  const sell = async (method: 'cash' | 'mtn_money') => {
    if (!drawer || cart.length === 0 || selling) return;
    if (!saleIdRef.current) {
      saleIdRef.current = Crypto.randomUUID();
    }
    setSelling(true);

    const saleItems = cart.map((l) => ({
      ticket_type: l.ticketType.id,
      quantity: l.quantity,
    }));

    // HORS LIGNE : on enfile SANS demander confirmation et sans changer
    // le geste. La vente est reelle — l'argent est dans la sacoche — elle
    // partira au retour du reseau avec la meme cle d'idempotence.
    if (!isOnline) {
      await enqueue({
        clientSaleId: saleIdRef.current,
        drawerId: drawer.id,
        eventId,
        items: saleItems,
        paymentMethod: method,
        amount: total,
      });
      haptics.success();
      AccessibilityInfo.announceForAccessibility(
        t('organizer.boxOffice.a11y.queuedOffline', { amount: total, currency })
      );
      setCart([]);
      saleIdRef.current = null;
      setLastChange(null);
      setSelling(false);
      return;
    }

    try {
      await boxOfficeAPI.sell({
        drawer: drawer.id,
        items: saleItems,
        paymentMethod: method,
        clientSaleId: saleIdRef.current,
      });
      haptics.success();
      // Annonce en `assertive` : c'est l'information critique, elle doit
      // interrompre la lecture en cours.
      AccessibilityInfo.announceForAccessibility(
        t('organizer.boxOffice.a11y.saleDone', { amount: total, currency })
      );
      setCart([]);
      saleIdRef.current = null;
      setLastChange(null);
      loadState();
    } catch {
      haptics.error();
      // La clé N'EST PAS réinitialisée : si la caissière réessaie, la
      // même vente ne doit pas être encaissée deux fois.
      //  : une vente qui echoue alors que le caissier a
      // peut-etre deja pris l'argent merite une modale bloquante, pas un
      // toast qui disparait avant qu'il l'ait lu.
      showAlert(
        t('organizer.boxOffice.saleError'),
        t('organizer.boxOffice.saleErrorDetail'),
        undefined, 'error', 'critical',
      );
    } finally {
      setSelling(false);
    }
  };

  /** Raccourcis de monnaie : la caissière tape ce qu'on lui tend, l'écran
   *  affiche ce qu'elle doit rendre. Elle ne calcule rien à 23 h. */
  const changeShortcuts = useMemo(() => {
    if (total <= 0) return [];
    const steps = [total, 5000, 10000, 20000];
    return Array.from(new Set(steps.filter((s) => s >= total))).slice(0, 4);
  }, [total]);

  const styles = makeStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  // ---- Caisse fermée : ouverture ----
  if (!drawer) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.openWrap}>
          <Text style={styles.openTitle} allowFontScaling maxFontSizeMultiplier={1.6}>
            {t('organizer.boxOffice.openTitle')}
          </Text>
          <Text style={styles.openHelp} allowFontScaling maxFontSizeMultiplier={1.6}>
            {t('organizer.boxOffice.openingFloatHelp')}
          </Text>
          <TextInput
            value={openingFloat}
            onChangeText={setOpeningFloat}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.gray400}
            style={styles.floatInput}
            allowFontScaling
            accessibilityLabel={t('organizer.boxOffice.a11y.openingFloatInput')}
          />
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={openDrawer}
            accessibilityRole="button"
            accessibilityLabel={t('organizer.boxOffice.a11y.openDrawer')}
          >
            <Text style={styles.primaryButtonText} allowFontScaling maxFontSizeMultiplier={1.4}>
              {t('organizer.boxOffice.openDrawer')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- Caisse ouverte : vente ----
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Compteur PERMANENT — ne plus savoir où on en est est la première
          cause de panique en caisse. */}
      <View
        style={styles.counterBar}
        accessibilityLiveRegion="polite"
        accessibilityLabel={t('organizer.boxOffice.a11y.counter', {
          count: salesCount,
          amount: drawer.expected_amount,
          currency,
        })}
      >
        <Text style={styles.counterText} allowFontScaling maxFontSizeMultiplier={1.4}>
          {t('organizer.boxOffice.counter', {
            count: salesCount,
            amount: drawer.expected_amount,
            currency,
          })}
        </Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('CashDrawerClose', { drawerId: drawer.id })
          }
          style={styles.closeLink}
          accessibilityRole="button"
          accessibilityLabel={t('organizer.boxOffice.a11y.closeDrawer')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.closeLinkText} allowFontScaling maxFontSizeMultiplier={1.4}>
            {t('organizer.boxOffice.close')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Etat reseau : un MOT et une icone, jamais la couleur seule —
          la nuit, sous les reflets, et pour un daltonien. Le montant en
          attente est affiche parce qu'il DOIT etre compte dans la caisse
          du soir : l'argent est bien dans la sacoche. */}
      {(!isOnline || pendingCount > 0 || failedCount > 0) && (
        <View
          style={[
            styles.offlineBar,
            failedCount > 0 ? styles.offlineBarAlert : null,
          ]}
          accessibilityLiveRegion="polite"
        >
          <Ionicons
            name={failedCount > 0 ? 'alert-circle' : 'cloud-offline-outline'}
            size={22}
            color="#0F172A"
          />
          <Text style={styles.offlineText} allowFontScaling maxFontSizeMultiplier={1.4}>
            {failedCount > 0
              ? t('organizer.boxOffice.toSettle', { count: failedCount })
              : t('organizer.boxOffice.pendingSales', {
                  count: pendingCount,
                  amount: pendingAmount.toLocaleString('fr-FR'),
                  currency,
                })}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.body}>
        {ticketTypes.map((tt) => (
          <TouchableOpacity
            key={tt.id}
            style={styles.tariffTile}
            onPress={() => addToCart(tt)}
            accessibilityRole="button"
            // Le pavé s'annonce COMPLET : « Standard, 2000 francs, bouton ».
            // Deux éléments séparés obligeraient à naviguer deux fois.
            accessibilityLabel={t('organizer.boxOffice.a11y.tariff', {
              name: tt.name,
              price: tt.price,
              currency,
            })}
          >
            <Text style={styles.tariffName} allowFontScaling maxFontSizeMultiplier={1.5}>
              {tt.name}
            </Text>
            <Text style={styles.tariffPrice} allowFontScaling maxFontSizeMultiplier={1.5}>
              {Number(tt.price).toLocaleString('fr-FR')} {currency}
            </Text>
          </TouchableOpacity>
        ))}

        {cart.length > 0 && (
          <View style={styles.cartBox}>
            {cart.map((line) => (
              <View key={line.ticketType.id} style={styles.cartLine}>
                <Text style={styles.cartText} allowFontScaling maxFontSizeMultiplier={1.5}>
                  {line.quantity} × {line.ticketType.name}
                </Text>
                <TouchableOpacity
                  onPress={() => removeLine(line.ticketType.id)}
                  style={styles.removeButton}
                  accessibilityRole="button"
                  accessibilityLabel={t('organizer.boxOffice.a11y.remove', {
                    name: line.ticketType.name,
                  })}
                >
                  <Ionicons name="close" size={24} color={colors.gray600} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Raccourcis de monnaie : elle tape ce qu'on lui tend. */}
            <View style={styles.changeRow}>
              {changeShortcuts.map((given) => (
                <TouchableOpacity
                  key={given}
                  style={styles.changeChip}
                  onPress={() => setLastChange(String(given - total))}
                  accessibilityRole="button"
                  accessibilityLabel={t('organizer.boxOffice.a11y.given', {
                    amount: given,
                    currency,
                  })}
                >
                  <Text style={styles.changeChipText} allowFontScaling maxFontSizeMultiplier={1.4}>
                    {given.toLocaleString('fr-FR')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {lastChange !== null && (
              <View style={styles.changeBanner} accessibilityLiveRegion="assertive">
                <Text style={styles.changeLabel} allowFontScaling maxFontSizeMultiplier={1.3}>
                  {t('organizer.boxOffice.giveBack')}
                </Text>
                <Text style={styles.changeAmount} allowFontScaling maxFontSizeMultiplier={1.3}>
                  {Number(lastChange).toLocaleString('fr-FR')} {currency}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Barre d'encaissement ancrée en bas : atteignable au pouce. */}
      {cart.length > 0 && (
        <View style={styles.payBar}>
          <Text style={styles.payTotal} allowFontScaling maxFontSizeMultiplier={1.3}>
            {total.toLocaleString('fr-FR')} {currency}
          </Text>
          <View style={styles.payButtons}>
            <TouchableOpacity
              style={[styles.payButton, styles.payCash]}
              onPress={() => sell('cash')}
              disabled={selling}
              accessibilityRole="button"
              accessibilityState={{ disabled: selling }}
              accessibilityLabel={t('organizer.boxOffice.a11y.payCash', {
                amount: total,
                currency,
              })}
            >
              {selling ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.payButtonText} allowFontScaling maxFontSizeMultiplier={1.3}>
                  {t('organizer.boxOffice.cash')}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.payButton, styles.payMomo]}
              onPress={() => sell('mtn_money')}
              disabled={selling}
              accessibilityRole="button"
              accessibilityState={{ disabled: selling }}
              accessibilityLabel={t('organizer.boxOffice.a11y.payMomo')}
            >
              <Text style={styles.payButtonText} allowFontScaling maxFontSizeMultiplier={1.3}>
                {t('organizer.boxOffice.momo')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    // Toutes les tailles ci-dessous sont EN DUR et volontairement plus
    // grandes que le reste de l'app : l'écran est lu à bout de bras, la
    // nuit. Le plancher est 17 (ailleurs l'app descend à 10-11).
    openWrap: { padding: 24, gap: 20 },
    openTitle: { fontSize: 26, fontWeight: '800', color: colors.text },
    openHelp: { fontSize: 17, lineHeight: 24, color: colors.gray600 },
    floatInput: {
      minHeight: 64,
      fontSize: 28,
      fontWeight: '700',
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.gray300,
      color: colors.text,
      backgroundColor: colors.card,
    },
    primaryButton: {
      minHeight: 64,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    primaryButtonText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },

    counterBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.gray200,
    },
    counterText: { fontSize: 20, fontWeight: '800', color: colors.text },
    closeLink: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
    closeLinkText: { fontSize: 17, fontWeight: '700', color: colors.primary },

    offlineBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: '#FEF3C7',
    },
    offlineBarAlert: { backgroundColor: '#FEE2E2' },
    offlineText: { flex: 1, fontSize: 18, fontWeight: '700', color: '#0F172A' },
    body: { padding: 16, gap: 12, paddingBottom: 40 },
    tariffTile: {
      minHeight: 88, // cible principale : volontairement énorme
      borderRadius: 18,
      paddingHorizontal: 20,
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.gray200,
    },
    tariffName: { fontSize: 22, fontWeight: '700', color: colors.text },
    tariffPrice: { fontSize: 24, fontWeight: '800', color: colors.primary, marginTop: 4 },

    cartBox: {
      marginTop: 8,
      padding: 16,
      borderRadius: 18,
      backgroundColor: colors.card,
      gap: 12,
    },
    cartLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
    },
    cartText: { fontSize: 19, fontWeight: '600', color: colors.text },
    removeButton: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    changeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    changeChip: {
      minHeight: 56,
      minWidth: 96,
      paddingHorizontal: 16,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.gray100,
    },
    changeChipText: { fontSize: 19, fontWeight: '700', color: colors.text },
    changeBanner: {
      marginTop: 4,
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    changeLabel: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
    // LE chiffre de l'écran : lisible à bout de bras, sous la pluie.
    changeAmount: { fontSize: 48, fontWeight: '900', color: '#FFFFFF' },

    payBar: {
      padding: 16,
      gap: 12,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.gray200,
    },
    payTotal: { fontSize: 30, fontWeight: '900', color: colors.text, textAlign: 'center' },
    payButtons: { flexDirection: 'row', gap: 12 },
    payButton: {
      flex: 1,
      minHeight: 64,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    payCash: { backgroundColor: colors.primary },
    payMomo: { backgroundColor: colors.gray700 },
    payButtonText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  });
