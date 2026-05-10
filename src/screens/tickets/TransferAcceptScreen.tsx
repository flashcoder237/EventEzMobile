/**
 * TransferAcceptScreen — consomme le deep link
 * `https://eventez.online/transfer/{token}/accept|decline` (Universal Link / App Link).
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { ticketTransfersAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { RootStackParamList } from '../../types';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import { EditorialCanvas, WatermarkNumeral, EditorialPillCTA } from '../../components/ui/editorial';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TransferAccept'>;
type RoutePropType = RouteProp<RootStackParamList, 'TransferAccept'>;

type ScreenState = 'loading' | 'ready' | 'not_found' | 'already_done' | 'accepted' | 'declined';

interface TransferInfo {
  id: string;
  event_title?: string;
  ticket_type_name?: string;
  quantity: number;
  status: string;
  message?: string;
  expires_at: string;
  sender_detail?: { first_name?: string; last_name?: string; email: string };
  sender?: string;
}

function formatRelativeDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffH = Math.round(diffMs / (1000 * 60 * 60));
    if (diffH < 0) return 'expiré';
    if (diffH < 1) return 'dans moins d\'une heure';
    if (diffH < 24) return `dans ${diffH}h`;
    const diffD = Math.round(diffH / 24);
    return `dans ${diffD} jour${diffD > 1 ? 's' : ''}`;
  } catch {
    return '';
  }
}

export default function TransferAcceptScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { token, action = 'accept' } = route.params || {};
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { showAlert, showConfirm } = useAlert();

  const [state, setState] = useState<ScreenState>('loading');
  const [transfer, setTransfer] = useState<TransferInfo | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!token) { setState('not_found'); return; }
    try {
      const res = await ticketTransfersAPI.getByToken(token);
      const data: TransferInfo = res.data;
      setTransfer(data);
      if (['accepted', 'declined', 'cancelled', 'expired'].includes(data.status)) {
        setState('already_done');
      } else {
        setState('ready');
      }
    } catch {
      setState('not_found');
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleAccept = useCallback(async () => {
    if (!isAuthenticated) {
      navigation.navigate('Login', {
        returnScreen: 'TransferAccept',
        returnParams: { token, action: 'accept' },
      });
      return;
    }
    setActing(true);
    try {
      const res = await ticketTransfersAPI.acceptByToken(token);
      if (res.data?.requires_account) {
        navigation.navigate('Register', {
          returnScreen: 'TransferAccept',
          returnParams: { token, action: 'accept' },
        });
        return;
      }
      setState('accepted');
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Erreur lors de l'acceptation.";
      showAlert('Erreur', msg, undefined, 'error');
    } finally {
      setActing(false);
    }
  }, [isAuthenticated, navigation, token, showAlert]);

  const handleDecline = useCallback(async () => {
    if (!isAuthenticated) {
      navigation.navigate('Login', {
        returnScreen: 'TransferAccept',
        returnParams: { token, action: 'decline' },
      });
      return;
    }
    showConfirm(
      'Refuser le transfert ?',
      'Vous ne pourrez pas annuler cette action.',
      async () => {
        setActing(true);
        try {
          await ticketTransfersAPI.declineByToken(token);
          setState('declined');
        } catch (err: any) {
          const msg =
            err?.response?.data?.error ||
            err?.response?.data?.detail ||
            'Erreur lors du refus.';
          showAlert('Erreur', msg, undefined, 'error');
        } finally {
          setActing(false);
        }
      }
    );
  }, [isAuthenticated, navigation, token, showAlert, showConfirm]);

  const senderName = transfer?.sender_detail
    ? (`${transfer.sender_detail.first_name ?? ''} ${transfer.sender_detail.last_name ?? ''}`.trim() ||
        transfer.sender_detail.email)
    : (transfer?.sender ?? '');

  const expiresIn = transfer?.expires_at ? formatRelativeDate(transfer.expires_at) : null;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    backBtn: {
      position: 'absolute',
      top: 56,
      left: Spacing.md,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    centerText: {
      color: colors.textSecondary,
      fontFamily: FontFamily.regular,
      fontSize: FontSizes.md,
      textAlign: 'center',
      marginTop: Spacing.md,
    },
    scroll: { flex: 1 },
    inner: { padding: Spacing.lg, paddingTop: 100, paddingBottom: Spacing.xl },
    eyebrow: {
      fontFamily: FontFamily.semiBold,
      fontSize: FontSizes.xs,
      color: colors.primary,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: Spacing.xs,
    },
    title: {
      fontFamily: FontFamily.displayBold,
      fontSize: FontSizes['2xl'],
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: Spacing.lg,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.xl,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      gap: Spacing.sm,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    iconDisc: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${colors.primary}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, color: colors.textSecondary },
    value: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm, color: colors.text },
    messageBox: {
      backgroundColor: colors.surface ?? colors.background,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    messageLabel: {
      fontFamily: FontFamily.semiBold,
      fontSize: FontSizes.xs,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    messageText: {
      fontFamily: FontFamily.regular,
      fontSize: FontSizes.sm,
      color: colors.text,
      fontStyle: 'italic',
    },
    expiryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: Spacing.md,
    },
    expiryText: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, color: '#D97706' },
    authNotice: {
      backgroundColor: `${colors.primary}12`,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    authNoticeText: {
      fontFamily: FontFamily.regular,
      fontSize: FontSizes.sm,
      color: colors.primary,
      flex: 1,
    },
    btnAccept: {
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.xl,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      alignItems: 'center',
      marginBottom: Spacing.sm,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.sm,
    },
    btnAcceptText: { fontFamily: FontFamily.bold, fontSize: FontSizes.md, color: '#fff' },
    btnDecline: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.xl,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      alignItems: 'center',
    },
    btnDeclineText: {
      fontFamily: FontFamily.semiBold,
      fontSize: FontSizes.md,
      color: colors.textSecondary,
    },
    resultTitle: {
      fontFamily: FontFamily.displayBold,
      fontSize: FontSizes['2xl'],
      color: colors.text,
      textAlign: 'center',
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
    },
    resultSub: {
      fontFamily: FontFamily.regular,
      fontSize: FontSizes.md,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: Spacing.xl,
    },
  });

  const BackBtn = () => (
    <TouchableOpacity
      style={s.backBtn}
      onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main' as any)}
    >
      <Ionicons name="arrow-back" size={20} color={colors.text} />
    </TouchableOpacity>
  );

  if (state === 'loading') {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (state === 'not_found') {
    return (
      <EditorialCanvas>
        <BackBtn />
        <WatermarkNumeral>??</WatermarkNumeral>
        <View style={s.center}>
          <Ionicons name="close-circle-outline" size={56} color="#EF4444" />
          <Text style={s.centerText}>Ce lien de transfert n'existe pas ou a expiré.</Text>
          <EditorialPillCTA
            eyebrow="ACCUEIL"
            label="Retour"
            onPress={() => navigation.navigate('Main' as any)}
            style={{ marginTop: Spacing.xl }}
          />
        </View>
      </EditorialCanvas>
    );
  }

  if (state === 'already_done') {
    const statusLabel =
      transfer?.status === 'accepted' ? 'accepté' :
      transfer?.status === 'declined' ? 'refusé' : 'expiré';
    return (
      <EditorialCanvas>
        <BackBtn />
        <WatermarkNumeral>OK</WatermarkNumeral>
        <View style={s.center}>
          <Ionicons name="checkmark-circle-outline" size={56} color={colors.textSecondary} />
          <Text style={s.resultTitle}>Transfert {statusLabel}</Text>
          <Text style={s.centerText}>Ce transfert a déjà été traité.</Text>
          <EditorialPillCTA
            eyebrow="BILLETS"
            label="Mes billets"
            onPress={() => navigation.navigate('PendingTransfers')}
            style={{ marginTop: Spacing.xl }}
          />
        </View>
      </EditorialCanvas>
    );
  }

  if (state === 'accepted') {
    return (
      <EditorialCanvas>
        <WatermarkNumeral>OK</WatermarkNumeral>
        <View style={s.center}>
          <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          <Text style={s.resultTitle}>Billet reçu !</Text>
          <Text style={s.resultSub}>
            {transfer?.event_title
              ? `Votre billet pour « ${transfer.event_title} » est dans vos billets.`
              : 'Votre billet a bien été transféré sur votre compte.'}
          </Text>
          <EditorialPillCTA
            eyebrow="BILLETS"
            label="Voir mes billets"
            onPress={() => navigation.navigate('PendingTransfers')}
          />
        </View>
      </EditorialCanvas>
    );
  }

  if (state === 'declined') {
    return (
      <EditorialCanvas>
        <WatermarkNumeral>NO</WatermarkNumeral>
        <View style={s.center}>
          <Ionicons name="close-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={s.resultTitle}>Transfert refusé</Text>
          <Text style={s.resultSub}>Vous avez refusé ce transfert de billet.</Text>
          <EditorialPillCTA
            eyebrow="RETOUR"
            label="Accueil"
            onPress={() => navigation.navigate('Main' as any)}
          />
        </View>
      </EditorialCanvas>
    );
  }

  // state === 'ready'
  return (
    <EditorialCanvas>
      <BackBtn />
      <WatermarkNumeral>TX</WatermarkNumeral>
      <ScrollView style={s.scroll} contentContainerStyle={s.inner} showsVerticalScrollIndicator={false}>
        <Text style={s.eyebrow}>Transfert de billet</Text>
        <Text style={s.title} numberOfLines={2}>
          {transfer?.event_title ?? 'Invitation à un événement'}
        </Text>

        <View style={s.card}>
          <View style={s.row}>
            <View style={s.iconDisc}>
              <Ionicons name="person-outline" size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={s.label}>Envoyé par</Text>
              <Text style={s.value}>{senderName}</Text>
            </View>
          </View>

          <View style={s.row}>
            <View style={s.iconDisc}>
              <Ionicons name="ticket-outline" size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={s.label}>Billet</Text>
              <Text style={s.value}>
                {(transfer?.quantity ?? 1) > 1
                  ? `${transfer?.quantity}× ${transfer?.ticket_type_name ?? 'Billet'}`
                  : (transfer?.ticket_type_name ?? 'Billet')}
              </Text>
            </View>
          </View>
        </View>

        {transfer?.message ? (
          <View style={s.messageBox}>
            <Text style={s.messageLabel}>Message</Text>
            <Text style={s.messageText}>"{transfer.message}"</Text>
          </View>
        ) : null}

        {expiresIn && expiresIn !== 'expiré' && (
          <View style={s.expiryRow}>
            <Ionicons name="time-outline" size={14} color="#D97706" />
            <Text style={s.expiryText}>Ce transfert expire {expiresIn}</Text>
          </View>
        )}

        {!isAuthenticated && (
          <View style={s.authNotice}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={s.authNoticeText}>
              Connectez-vous pour accepter ou refuser ce billet.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.btnAccept, acting && { opacity: 0.6 }]}
          onPress={handleAccept}
          disabled={acting}
          activeOpacity={0.85}
        >
          {acting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
          )}
          <Text style={s.btnAcceptText}>
            {isAuthenticated ? 'Accepter le billet' : 'Se connecter pour accepter'}
          </Text>
        </TouchableOpacity>

        {isAuthenticated && (
          <TouchableOpacity
            style={[s.btnDecline, acting && { opacity: 0.6 }]}
            onPress={handleDecline}
            disabled={acting}
            activeOpacity={0.85}
          >
            <Text style={s.btnDeclineText}>Refuser</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </EditorialCanvas>
  );
}
