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
import {
  EditorialCanvas,
  EditorialHeader,
  EditorialPillCTA,
  WatermarkNumeral,
  editorial,
  pickStickyBarBg,
  pickStickyBarBorder,
} from '../../components/ui/editorial';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TransferAccept'>;
type RoutePropType = RouteProp<RootStackParamList, 'TransferAccept'>;

type ScreenState =
  | 'loading'
  | 'ready'
  | 'not_found'
  | 'wrong_recipient'
  | 'already_done'
  | 'accepted'
  | 'declined';

interface TransferInfo {
  id: string;
  event_title?: string;
  ticket_type_name?: string;
  quantity: number;
  status: string;
  message?: string;
  expires_at: string;
  recipient_email?: string;
  sender_detail?: { first_name?: string; last_name?: string; email: string };
  sender?: string;
}

function formatRelativeDate(isoDate: string): string {
  try {
    const diff = new Date(isoDate).getTime() - Date.now();
    if (diff <= 0) return 'expiré';
    const h = Math.round(diff / 3_600_000);
    if (h < 1) return "dans moins d'une heure";
    if (h < 24) return `dans ${h}h`;
    const d = Math.round(h / 24);
    return `dans ${d} jour${d > 1 ? 's' : ''}`;
  } catch {
    return '';
  }
}

export default function TransferAcceptScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { token, action = 'accept' } = route.params || {};
  const { isAuthenticated, user } = useAuth();
  const { colors, isDark } = useTheme();
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
        return;
      }

      // Vérifie que le lien est bien destiné au compte connecté
      if (isAuthenticated && user?.email && data.recipient_email) {
        if (data.recipient_email.toLowerCase() !== user.email.toLowerCase()) {
          setState('wrong_recipient');
          return;
        }
      }

      setState('ready');
    } catch {
      setState('not_found');
    }
  }, [token, isAuthenticated, user?.email]);

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
      'Cette action est irréversible.',
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
      },
    );
  }, [isAuthenticated, navigation, token, showAlert, showConfirm]);

  const senderName = transfer?.sender_detail
    ? (
        `${transfer.sender_detail.first_name ?? ''} ${transfer.sender_detail.last_name ?? ''}`.trim() ||
        transfer.sender_detail.email
      )
    : (transfer?.sender ?? '—');

  const expiresIn = transfer?.expires_at ? formatRelativeDate(transfer.expires_at) : null;
  const isExpiringSoon =
    transfer?.expires_at
      ? new Date(transfer.expires_at).getTime() - Date.now() < 6 * 3_600_000
      : false;

  const alreadyDoneStatusLabel =
    transfer?.status === 'accepted' ? 'accepté' :
    transfer?.status === 'declined' ? 'refusé' : 'expiré';

  // ── Loading ──────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <EditorialCanvas>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </EditorialCanvas>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (state === 'not_found') {
    return (
      <EditorialCanvas>
        <EditorialHeader eyebrow="TRANSFERT" title="Lien invalide" />
        <WatermarkNumeral>??</WatermarkNumeral>
        <View style={s.center}>
          <View style={[s.iconDisc, { backgroundColor: `${colors.error}18` }]}>
            <Ionicons name="close-circle-outline" size={40} color={colors.error} />
          </View>
          <Text style={[s.resultTitle, { color: colors.text }]}>Lien introuvable</Text>
          <Text style={[s.resultSub, { color: colors.textSecondary }]}>
            Ce lien de transfert n'existe pas ou a déjà été utilisé.
          </Text>
          <EditorialPillCTA
            eyebrow="RETOUR"
            label="Accueil"
            onPress={() => navigation.navigate('Main' as any)}
            style={s.resultCTA}
          />
        </View>
      </EditorialCanvas>
    );
  }

  // ── Mauvais destinataire ──────────────────────────────────────────────────
  if (state === 'wrong_recipient') {
    return (
      <EditorialCanvas>
        <EditorialHeader eyebrow="TRANSFERT" title="Accès refusé" />
        <WatermarkNumeral>!!</WatermarkNumeral>
        <View style={s.center}>
          <View style={[s.iconDisc, { backgroundColor: `${colors.warning}18` }]}>
            <Ionicons name="warning-outline" size={40} color={colors.warning} />
          </View>
          <Text style={[s.resultTitle, { color: colors.text }]}>Ce lien ne vous est pas destiné</Text>
          <Text style={[s.resultSub, { color: colors.textSecondary }]}>
            Ce transfert a été envoyé à une autre adresse e-mail. Connectez-vous avec le bon compte pour y accéder.
          </Text>
          <EditorialPillCTA
            eyebrow="COMPTE"
            label="Changer de compte"
            icon="person-outline"
            onPress={() => navigation.navigate('Login', {
              returnScreen: 'TransferAccept',
              returnParams: { token, action },
            })}
            style={s.resultCTA}
          />
        </View>
      </EditorialCanvas>
    );
  }

  // ── Déjà traité ───────────────────────────────────────────────────────────
  if (state === 'already_done') {
    const isAccepted = transfer?.status === 'accepted';
    return (
      <EditorialCanvas>
        <EditorialHeader eyebrow="TRANSFERT" title={`Transfert ${alreadyDoneStatusLabel}`} />
        <WatermarkNumeral>{isAccepted ? 'OK' : 'NO'}</WatermarkNumeral>
        <View style={s.center}>
          <View style={[
            s.iconDisc,
            { backgroundColor: isAccepted ? `${colors.success}18` : `${colors.textSecondary}14` },
          ]}>
            <Ionicons
              name={isAccepted ? 'checkmark-circle-outline' : 'close-circle-outline'}
              size={40}
              color={isAccepted ? colors.success : colors.textSecondary}
            />
          </View>
          <Text style={[s.resultTitle, { color: colors.text }]}>
            Transfert {alreadyDoneStatusLabel}
          </Text>
          <Text style={[s.resultSub, { color: colors.textSecondary }]}>
            Ce transfert a déjà été traité.
          </Text>
          <EditorialPillCTA
            eyebrow="BILLETS"
            label="Mes billets"
            onPress={() => navigation.navigate('PendingTransfers')}
            style={s.resultCTA}
          />
        </View>
      </EditorialCanvas>
    );
  }

  // ── Accepté avec succès ───────────────────────────────────────────────────
  if (state === 'accepted') {
    return (
      <EditorialCanvas>
        <WatermarkNumeral>OK</WatermarkNumeral>
        <View style={s.center}>
          <View style={[s.iconDisc, { backgroundColor: `${colors.success}18` }]}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          </View>
          <Text style={[s.resultTitle, { color: colors.text }]}>Billet reçu !</Text>
          <Text style={[s.resultSub, { color: colors.textSecondary }]}>
            {transfer?.event_title
              ? `Votre billet pour « ${transfer.event_title} » est dans vos billets.`
              : 'Votre billet a bien été transféré sur votre compte.'}
          </Text>
          <EditorialPillCTA
            eyebrow="BILLETS"
            label="Voir mes billets"
            onPress={() => navigation.navigate('PendingTransfers')}
            style={s.resultCTA}
          />
        </View>
      </EditorialCanvas>
    );
  }

  // ── Refusé ────────────────────────────────────────────────────────────────
  if (state === 'declined') {
    return (
      <EditorialCanvas>
        <WatermarkNumeral>NO</WatermarkNumeral>
        <View style={s.center}>
          <View style={[s.iconDisc, { backgroundColor: `${colors.textSecondary}14` }]}>
            <Ionicons name="close-circle-outline" size={48} color={colors.textSecondary} />
          </View>
          <Text style={[s.resultTitle, { color: colors.text }]}>Transfert refusé</Text>
          <Text style={[s.resultSub, { color: colors.textSecondary }]}>
            Vous avez refusé ce transfert de billet.
          </Text>
          <EditorialPillCTA
            eyebrow="RETOUR"
            label="Accueil"
            onPress={() => navigation.navigate('Main' as any)}
            style={s.resultCTA}
          />
        </View>
      </EditorialCanvas>
    );
  }

  // ── Ready — écran principal ───────────────────────────────────────────────
  return (
    <EditorialCanvas edges={['top']}>
      <EditorialHeader
        eyebrow="TRANSFERT DE BILLET"
        title={transfer?.event_title ?? 'Invitation'}
        align="left"
      />
      <WatermarkNumeral>TX</WatermarkNumeral>

      <ScrollView
        style={{ flex: 1, zIndex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Expiry chip */}
        {expiresIn && expiresIn !== 'expiré' && (
          <View style={[
            s.expiryChip,
            { backgroundColor: isExpiringSoon ? `${colors.warning}18` : `${colors.primary}12` },
          ]}>
            <Ionicons
              name="time-outline"
              size={13}
              color={isExpiringSoon ? colors.warning : colors.primary}
            />
            <Text style={[s.expiryText, { color: isExpiringSoon ? colors.warning : colors.primary }]}>
              Expire {expiresIn}
            </Text>
          </View>
        )}

        {/* Info card */}
        <View style={[editorial.card, { backgroundColor: colors.card, borderColor: `${colors.primary}10` }]}>
          {/* Expéditeur */}
          <View style={s.infoRow}>
            <View style={[s.iconDisc32, { backgroundColor: `${colors.primary}14` }]}>
              <Ionicons name="person-outline" size={15} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[editorial.eyebrow, s.infoLabel, { color: colors.textSecondary }]}>
                Envoyé par
              </Text>
              <Text style={[s.infoValue, { color: colors.text }]} numberOfLines={1}>
                {senderName}
              </Text>
            </View>
          </View>

          <View style={[s.divider, { backgroundColor: `${colors.primary}08` }]} />

          {/* Billet */}
          <View style={s.infoRow}>
            <View style={[s.iconDisc32, { backgroundColor: `${colors.primary}14` }]}>
              <Ionicons name="ticket-outline" size={15} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[editorial.eyebrow, s.infoLabel, { color: colors.textSecondary }]}>
                Billet
              </Text>
              <Text style={[s.infoValue, { color: colors.text }]}>
                {(transfer?.quantity ?? 1) > 1
                  ? `${transfer?.quantity}× ${transfer?.ticket_type_name ?? 'Billet'}`
                  : (transfer?.ticket_type_name ?? 'Billet')}
              </Text>
            </View>
          </View>
        </View>

        {/* Message */}
        {transfer?.message ? (
          <View style={[s.messageBox, { backgroundColor: colors.card, borderColor: `${colors.primary}10` }]}>
            <Text style={[editorial.eyebrow, s.infoLabel, { color: colors.textSecondary }]}>
              Message
            </Text>
            <Text style={[s.messageText, { color: colors.text }]}>
              "{transfer.message}"
            </Text>
          </View>
        ) : null}

        {/* Notice connexion */}
        {!isAuthenticated && (
          <View style={[s.authNotice, { backgroundColor: `${colors.primary}10` }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={[s.authNoticeText, { color: colors.primary }]}>
              Connectez-vous pour accepter ou refuser ce billet.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={[
        editorial.stickyBar,
        {
          backgroundColor: pickStickyBarBg(isDark),
          borderTopColor: pickStickyBarBorder(isDark),
        },
      ]}>
        {/* Bouton refuser (ghost) — seulement si authentifié */}
        {isAuthenticated && (
          <TouchableOpacity
            style={[editorial.ghostBack, { opacity: acting ? 0.5 : 1 }]}
            onPress={handleDecline}
            disabled={acting}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={16} color={colors.error} />
            <Text style={[editorial.ghostBackText, { color: colors.error }]}>Refuser</Text>
          </TouchableOpacity>
        )}

        <EditorialPillCTA
          eyebrow={isAuthenticated ? 'ACCEPTER' : 'CONNEXION'}
          label={isAuthenticated ? 'Recevoir le billet' : 'Se connecter pour accepter'}
          onPress={handleAccept}
          loading={acting}
          disabled={acting}
        />
      </View>
    </EditorialCanvas>
  );
}

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    zIndex: 1,
  },
  iconDisc: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  iconDisc32: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  resultTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  resultSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
    maxWidth: '88%',
  },
  resultCTA: {
    alignSelf: 'stretch',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  expiryChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  expiryText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  infoLabel: {
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
  messageBox: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.base,
    borderWidth: 1,
  },
  messageText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: 4,
  },
  authNotice: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  authNoticeText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    flex: 1,
    lineHeight: 20,
  },
});
