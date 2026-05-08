import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { RootStackParamList } from '../../types';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTranslation } from 'react-i18next';
import ConfettiEffect from '../../components/ui/ConfettiEffect';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { getEventUrl } from '../../constants/urls';
import { paymentsAPI, invoicesAPI } from '../../api';
import { getMediaUrl } from '../../api/config';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PaymentSuccessRouteProp = RouteProp<RootStackParamList, 'PaymentSuccess'>;

interface SuccessContent {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconColorDark: string;
  eyebrow: string;
  title: string;
  watermark: string;
  subtitle: string;
  infoItems: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    eyebrow: string;
    title: string;
    description: string;
  }>;
  primaryButtonText: string;
  primaryButtonIcon: keyof typeof Ionicons.glyphMap;
  isSuccess: boolean;
}

export default function PaymentSuccessScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaymentSuccessRouteProp>();
  const { eventType, approvalStatus, eventTitle, registrationId, amount, currency, eventStartDate, eventId, referenceCode, paymentId } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  // Hooks d'auth/sound déclarés tôt — utilisés par handleInviteFriend ci-dessous
  const { isGuest, user, upgradeGuest } = useAuth();

  // Invoice download — l'ID de la facture est exposé via PaymentSerializer
  // (`invoice = InvoiceSerializer(read_only=True)`), donc on récupère le payment
  // pour extraire invoice.id, puis on appelle invoicesAPI.downloadPdf qui
  // retourne `{ pdf_url }` qu'on ouvre via Linking. La facture peut ne pas
  // exister immédiatement (générée async par Celery) → bouton désactivé jusqu'à
  // ce que l'invoice ID soit disponible.
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const isPaidEvent = amount !== undefined && amount > 0 && approvalStatus !== 'pending';

  useEffect(() => {
    if (!paymentId || !isPaidEvent) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await paymentsAPI.getPayment(paymentId);
        const id = res.data?.invoice?.id;
        if (!cancelled && id) setInvoiceId(String(id));
      } catch {
        // La facture peut être générée plus tard (async). On laisse le bouton
        // caché plutôt que d'afficher une erreur — l'utilisateur la trouvera
        // dans MyPayments si besoin.
      }
    })();
    return () => { cancelled = true; };
  }, [paymentId, isPaidEvent]);

  const handleDownloadInvoice = useCallback(async () => {
    if (!invoiceId || invoiceLoading) return;
    setInvoiceLoading(true);
    try {
      const res = await invoicesAPI.downloadPdf(invoiceId);
      const rawUrl = res.data?.pdf_url;
      const absoluteUrl = getMediaUrl(rawUrl);
      if (!absoluteUrl) {
        showError(t('payment.invoice'), t('errors.loadingFailed'));
        return;
      }
      const supported = await Linking.canOpenURL(absoluteUrl);
      if (!supported) {
        showError(t('common.error'), t('errors.actionFailed'));
        return;
      }
      await Linking.openURL(absoluteUrl);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      showError(t('payment.invoice'), String(detail || t('errors.downloadFailed')));
    } finally {
      setInvoiceLoading(false);
    }
  }, [invoiceId, invoiceLoading]);

  // Partage l'event via le système OS (whatsapp/sms/etc) avec un deep-link.
  // Le ref encode l'ID utilisateur pour tracker la viralité côté backend, mais
  // ne contient AUCUNE donnée sensible (pas d'email, pas de paymentId).
  const handleInviteFriend = useCallback(async () => {
    if (!eventId) return;
    try {
      const refSegment = user?.id ? `?ref=u${String(user.id).slice(0, 12)}` : '';
      const url = `${getEventUrl(String(eventId))}${refSegment}`;
      const message = eventTitle
        ? `Je viens de prendre ma place pour « ${eventTitle} » sur EventEz 🎫\n\nViens avec moi : ${url}`
        : `Je viens de prendre ma place sur EventEz 🎫\n\nDécouvre l'événement : ${url}`;
      await Share.share({
        message,
        // iOS : permet d'ouvrir le lien comme URL distincte du texte
        url,
        title: eventTitle || 'Mon événement EventEz',
      });
    } catch {
      // L'utilisateur a fermé le bottom sheet — pas une erreur à reporter
    }
  }, [eventId, eventTitle, user?.id]);

  // Construit l'URL Google Calendar à partir des params reçus (start +2h par défaut)
  const handleAddToCalendar = useCallback(() => {
    if (!eventStartDate || !eventTitle) return;
    try {
      const start = new Date(eventStartDate);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      const fmt = (d: Date) =>
        d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        eventTitle,
      )}&dates=${fmt(start)}/${fmt(end)}`;
      Linking.openURL(url).catch(() => {
        /* user can retry from MyTickets if browser fails to open */
      });
    } catch {
      /* ignore parse errors */
    }
  }, [eventStartDate, eventTitle]);

  // Compte à rebours en jours jusqu'à l'événement (si date fournie)
  const daysUntil = useMemo(() => {
    if (!eventStartDate) return null;
    try {
      const target = new Date(eventStartDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const ms = target.getTime() - now.getTime();
      const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
      return days >= 0 ? days : null;
    } catch {
      return null;
    }
  }, [eventStartDate]);

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const { play: playSound, enabled: soundEnabled, setEnabled: setSoundEnabled } = useSoundEffect();
  const { showError, showSuccess } = useAlert();

  // Upgrade-guest modal
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [upgradePassword, setUpgradePassword] = useState('');
  const [upgradeConfirm, setUpgradeConfirm] = useState('');
  const [upgradeLastName, setUpgradeLastName] = useState('');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeDismissed, setUpgradeDismissed] = useState(false);

  const handleUpgrade = async () => {
    if (upgradePassword.length < 8) {
      showError(t('payment.successUpgradePasswordTooShort'), t('payment.successUpgradePasswordTooShortDetail'));
      return;
    }
    if (upgradePassword !== upgradeConfirm) {
      showError(t('payment.successUpgradePasswordMismatch'), t('payment.successUpgradePasswordMismatchDetail'));
      return;
    }
    setUpgradeLoading(true);
    try {
      await upgradeGuest({
        password: upgradePassword,
        confirm_password: upgradeConfirm,
        last_name: upgradeLastName.trim() || undefined,
      });
      setUpgradeModalVisible(false);
      showSuccess(t('payment.successUpgradeAccountCreated'), t('payment.successUpgradeAccountCreatedDetail'));
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.response?.data?.password?.[0] || t('payment.successUpgradeError');
      showError(t('common.error'), String(detail));
    } finally {
      setUpgradeLoading(false);
    }
  };

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });
    opacity.value = withDelay(300, withSpring(1));
    ringScale.value = withRepeat(
      withTiming(1.4, { duration: 1800, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
      -1,
      false,
    );
    // Son de confirmation paiement (respecte la pref utilisateur)
    playSound('payment-success');
  }, []);

  const handleViewTicket = async () => {
    if (!registrationId) {
      navigation.replace('Main', { screen: 'MyTickets' } as any);
      return;
    }
    navigation.replace('RegistrationDetails', { registrationId });
  };

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: 1 - (ringScale.value - 1) / 0.4,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const content: SuccessContent = useMemo(() => {
    const isInscription = eventType === 'inscription';
    const isPendingApproval = approvalStatus === 'pending';

    if (isInscription) {
      const eventClause = eventTitle ? t('payment.successEventClause', { title: eventTitle }) : '';
      if (isPendingApproval) {
        return {
          icon: 'time',
          iconColor: '#F59E0B',
          iconColorDark: '#D97706',
          eyebrow: t('payment.successPendingEyebrow'),
          watermark: 'WAIT',
          title: t('payment.successPendingTitle'),
          subtitle: t('payment.successPendingSubtitle', { eventClause }),
          infoItems: [
            { icon: 'hourglass-outline', eyebrow: t('payment.successPendingStep1Eyebrow'), title: t('payment.successPendingStep1Title'), description: t('payment.successPendingStep1Desc') },
            { icon: 'notifications-outline', eyebrow: t('payment.successPendingStep2Eyebrow'), title: t('payment.successPendingStep2Title'), description: t('payment.successPendingStep2Desc') },
          ],
          primaryButtonText: t('payment.successPendingButton'),
          primaryButtonIcon: 'list',
          isSuccess: false,
        };
      } else {
        return {
          icon: 'checkmark',
          iconColor: '#10B981',
          iconColorDark: '#059669',
          eyebrow: t('payment.successInscriptionEyebrow'),
          watermark: 'OK!',
          title: t('payment.successInscriptionTitle'),
          subtitle: t('payment.successInscriptionSubtitle', { eventClause }),
          infoItems: [
            { icon: 'calendar', eyebrow: t('payment.successInscriptionStep1Eyebrow'), title: t('payment.successInscriptionStep1Title'), description: t('payment.successInscriptionStep1Desc') },
            { icon: 'qr-code', eyebrow: t('payment.successInscriptionStep2Eyebrow'), title: t('payment.successInscriptionStep2Title'), description: t('payment.successInscriptionStep2Desc') },
          ],
          primaryButtonText: t('payment.successInscriptionButton'),
          primaryButtonIcon: 'list',
          isSuccess: true,
        };
      }
    } else {
      return {
        icon: 'checkmark',
        iconColor: '#10B981',
        iconColorDark: '#059669',
        eyebrow: t('payment.successPaidEyebrow'),
        watermark: 'OK!',
        title: t('payment.successPaidTitle'),
        subtitle: t('payment.successPaidSubtitle'),
        infoItems: [
          { icon: 'ticket', eyebrow: t('payment.successPaidStep1Eyebrow'), title: t('payment.successPaidStep1Title'), description: t('payment.successPaidStep1Desc') },
          { icon: 'qr-code', eyebrow: t('payment.successPaidStep2Eyebrow'), title: t('payment.successPaidStep2Title'), description: t('payment.successPaidStep2Desc') },
        ],
        primaryButtonText: t('payment.successPaidButton'),
        primaryButtonIcon: 'ticket',
        isSuccess: true,
      };
    }
  }, [eventType, approvalStatus, eventTitle, t]);

  const showConfetti = content.isSuccess;

  return (
    <EditorialCanvas edges={['top', 'bottom']}>
      <WatermarkNumeral>{content.watermark}</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
        {showConfetti && <ConfettiEffect />}

        {/* Mini sound toggle — discreet, top-right */}
        <TouchableOpacity
          onPress={() => setSoundEnabled(!soundEnabled)}
          style={[styles.muteToggle, { backgroundColor: colors.gray100 }]}
          accessibilityRole="switch"
          accessibilityState={{ checked: soundEnabled }}
          accessibilityLabel={soundEnabled ? t('payment.successSoundOnAccessibility') : t('payment.successSoundOffAccessibility')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={soundEnabled ? 'volume-high-outline' : 'volume-mute-outline'}
            size={14}
            color={colors.gray600}
          />
          <Text style={[styles.muteToggleText, { color: colors.gray600 }]}>
            {soundEnabled ? t('payment.successSoundOn') : t('payment.successSoundOff')}
          </Text>
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* === ANIMATED ICON HERO === */}
          <View style={styles.iconWrap}>
            <Animated.View
              style={[
                styles.iconRing,
                { borderColor: content.iconColor },
                ringStyle,
              ]}
            />
            <Animated.View style={[styles.iconContainer, iconStyle]}>
              <View style={[styles.iconCircle, Shadows.lg]}>
                <LinearGradient
                  colors={[content.iconColor, content.iconColorDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name={content.icon} size={56} color={Colors.white} />
              </View>
            </Animated.View>
          </View>

          {/* === EYEBROW + TITLE === */}
          <Animated.View style={[styles.textContainer, contentStyle]} accessibilityRole="alert">
            <Text style={[styles.eyebrow, { color: content.iconColor }]}>{content.eyebrow}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{content.title}</Text>
            <Text style={[styles.subtitle, { color: colors.gray500 }]}>{content.subtitle}</Text>
          </Animated.View>

          {/* === MINI RECAP — concrete proof of what was just paid === */}
          {(amount !== undefined || eventTitle || daysUntil !== null || referenceCode) && (
            <Animated.View
              style={[
                styles.recapCard,
                { backgroundColor: colors.card, borderColor: 'rgba(0,0,0,0.06)' },
                contentStyle,
              ]}
            >
              {amount !== undefined && amount > 0 && (
                <View style={styles.recapRow}>
                  <Text style={[styles.recapLabel, { color: colors.gray500 }]}>{t('payment.successAmount')}</Text>
                  <Text style={[styles.recapValue, { color: colors.text }]}>
                    {amount.toLocaleString()} {currency || ''}
                  </Text>
                </View>
              )}
              {eventTitle && (
                <View style={styles.recapRow}>
                  <Text style={[styles.recapLabel, { color: colors.gray500 }]}>{t('payment.successEvent')}</Text>
                  <Text style={[styles.recapValue, { color: colors.text }]} numberOfLines={1}>
                    {eventTitle}
                  </Text>
                </View>
              )}
              {referenceCode && (
                <View style={styles.recapRow}>
                  <Text style={[styles.recapLabel, { color: colors.gray500 }]}>{t('payment.successReference')}</Text>
                  <Text
                    style={[styles.recapValue, { color: colors.text, fontFamily: FontFamily.bold, letterSpacing: 0.5 }]}
                    selectable
                    numberOfLines={1}
                  >
                    EZ-{referenceCode}
                  </Text>
                </View>
              )}
              {daysUntil !== null && (
                <View style={styles.recapRow}>
                  <Text style={[styles.recapLabel, { color: colors.gray500 }]}>{t('payment.successCountdown')}</Text>
                  <Text style={[styles.recapValue, { color: content.iconColor }]}>
                    {daysUntil === 0 ? t('payment.successToday') : t('payment.successDDay', { days: daysUntil })}
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* === GUEST UPGRADE PROMPT === */}
          {isGuest && !upgradeDismissed && (
            <Animated.View
              style={[
                styles.upgradeBanner,
                { backgroundColor: colors.card, borderColor: `${colors.primary}40` },
                contentStyle,
              ]}
            >
              <View style={[styles.upgradeBannerIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="key" size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.upgradeBannerEyebrow, { color: colors.primary }]}>
                  {t('payment.successUpgradeEyebrow')}
                </Text>
                <Text style={[styles.upgradeBannerTitle, { color: colors.text }]} numberOfLines={2}>
                  {t('payment.successUpgradeBannerTitle')}
                </Text>
                <Text style={[styles.upgradeBannerHint, { color: colors.gray500 }]} numberOfLines={2}>
                  {t('payment.successUpgradeBannerHint')}
                </Text>
              </View>
              <View style={styles.upgradeBannerActions}>
                <TouchableOpacity
                  onPress={() => setUpgradeModalVisible(true)}
                  style={[styles.upgradeCta, { backgroundColor: colors.primary }]}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={t('payment.successUpgradeAccessibility')}
                >
                  <Text style={styles.upgradeCtaText}>{t('payment.successUpgradeCtaShort')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setUpgradeDismissed(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={t('payment.successUpgradeDismissAccessibility')}
                >
                  <Text style={[styles.upgradeDismiss, { color: colors.gray500 }]}>{t('payment.successUpgradeDismiss')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* === INFO CARDS === */}
          <Animated.View style={[styles.infoCardsCol, contentStyle]}>
            {content.infoItems.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.infoCard,
                  { backgroundColor: colors.card, borderColor: 'rgba(0,0,0,0.06)' },
                  Shadows.sm,
                ]}
              >
                <View style={[styles.infoIconBox, { backgroundColor: `${content.iconColor}15` }]}>
                  <Ionicons name={item.icon} size={20} color={content.iconColor} />
                </View>
                <View style={styles.infoText}>
                  <Text style={[styles.infoEyebrow, { color: content.iconColor }]}>{item.eyebrow}</Text>
                  <Text style={[styles.infoTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.infoDescription, { color: colors.gray500 }]}>{item.description}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        </ScrollView>

        {/* === BOTTOM BUTTONS === */}
        <View style={[styles.bottomButtons, { backgroundColor: colors.background, paddingBottom: insets.bottom + Spacing.md }]}>
          <TouchableOpacity
            style={[styles.primaryPill, Shadows.buttonPrimary]}
            onPress={handleViewTicket}
            activeOpacity={0.9}
            accessibilityLabel={t('payment.successViewTicketAccessibility')}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.primaryPillEyebrow}>{t('payment.successNextStep')}</Text>
              <Text style={styles.primaryPillLabel}>{content.primaryButtonText}</Text>
            </View>
            <View style={styles.primaryPillArrow}>
              <Ionicons name={content.primaryButtonIcon} size={18} color={Colors.white} />
            </View>
          </TouchableOpacity>

          {eventStartDate && eventTitle && (
            <TouchableOpacity
              style={[styles.calendarPill, { borderColor: colors.primary }]}
              onPress={handleAddToCalendar}
              activeOpacity={0.85}
              accessibilityLabel={t('payment.successAddToCalendarAccessibility')}
              accessibilityRole="button"
            >
              <Ionicons name="calendar-outline" size={14} color={colors.primary} />
              <Text style={[styles.calendarPillText, { color: colors.primary }]}>
                {t('payment.successAddToCalendarLabel')}
              </Text>
            </TouchableOpacity>
          )}

          {invoiceId && (
            <TouchableOpacity
              style={[styles.calendarPill, { borderColor: colors.gray400 }, invoiceLoading && { opacity: 0.6 }]}
              onPress={handleDownloadInvoice}
              activeOpacity={0.85}
              disabled={invoiceLoading}
              accessibilityLabel={t('payment.successDownloadInvoiceAccessibility')}
              accessibilityRole="button"
            >
              {invoiceLoading ? (
                <ActivityIndicator size="small" color={colors.gray700} />
              ) : (
                <Ionicons name="document-text-outline" size={14} color={colors.gray700} />
              )}
              <Text style={[styles.calendarPillText, { color: colors.gray700 }]}>
                {t('payment.successDownloadInvoiceLabel')}
              </Text>
            </TouchableOpacity>
          )}

          {eventId && (
            <TouchableOpacity
              style={[styles.invitePill, { backgroundColor: `${colors.accent}15`, borderColor: colors.accent }]}
              onPress={handleInviteFriend}
              activeOpacity={0.85}
              accessibilityLabel={t('payment.successInviteAccessibility')}
              accessibilityRole="button"
            >
              <Ionicons name="people-outline" size={14} color={colors.accent} />
              <Text style={[styles.invitePillText, { color: colors.accent }]}>
                {t('payment.successInviteLabel')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.secondaryPill, { backgroundColor: colors.gray100 }]}
            onPress={() => navigation.replace('Main', { screen: 'Discover' } as any)}
            activeOpacity={0.85}
            accessibilityLabel={t('payment.successHomeAccessibility')}
          >
            <Ionicons name="home-outline" size={14} color={colors.gray700} />
            <Text style={[styles.secondaryPillText, { color: colors.gray700 }]}>
              {t('payment.backHome')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* === UPGRADE MODAL — guest -> compte complet (pose un mot de passe) === */}
      <Modal
        visible={upgradeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUpgradeModalVisible(false)}
      >
        <Pressable style={styles.upgradeBackdrop} onPress={() => setUpgradeModalVisible(false)}>
          <Pressable
            style={[styles.upgradeCard, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.upgradeEyebrow, { color: colors.primary }]}>{t('payment.successUpgradeEyebrow')}</Text>
            <Text style={[styles.upgradeTitle, { color: colors.text }]}>
              {t('payment.successUpgradeModalTitle')}
            </Text>
            <Text style={[styles.upgradeSubtitle, { color: colors.gray500 }]}>
              {user?.email ? t('payment.successUpgradeModalSubtitleAuth', { email: user.email }) : t('payment.successUpgradeModalSubtitleAnon')}
            </Text>

            <View style={styles.upgradeField}>
              <Text style={[styles.upgradeFieldLabel, { color: colors.gray700 }]}>
                {t('payment.successUpgradeLastNameLabel')}
              </Text>
              <TextInput
                style={[styles.upgradeInput, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.text }]}
                value={upgradeLastName}
                onChangeText={setUpgradeLastName}
                placeholder={t('payment.successUpgradeLastNamePlaceholder')}
                placeholderTextColor={colors.gray400}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.upgradeField}>
              <Text style={[styles.upgradeFieldLabel, { color: colors.gray700 }]}>
                {t('payment.successUpgradePasswordLabel')}
              </Text>
              <TextInput
                style={[styles.upgradeInput, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.text }]}
                value={upgradePassword}
                onChangeText={setUpgradePassword}
                placeholder={t('payment.successUpgradePasswordPlaceholder')}
                placeholderTextColor={colors.gray400}
                secureTextEntry
              />
            </View>

            <View style={styles.upgradeField}>
              <Text style={[styles.upgradeFieldLabel, { color: colors.gray700 }]}>
                {t('payment.successUpgradeConfirmLabel')}
              </Text>
              <TextInput
                style={[styles.upgradeInput, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.text }]}
                value={upgradeConfirm}
                onChangeText={setUpgradeConfirm}
                placeholder={t('payment.successUpgradeConfirmPlaceholder')}
                placeholderTextColor={colors.gray400}
                secureTextEntry
              />
            </View>

            <View style={styles.upgradeActions}>
              <TouchableOpacity
                style={[styles.upgradeBtn, { backgroundColor: colors.gray100 }]}
                onPress={() => setUpgradeModalVisible(false)}
                disabled={upgradeLoading}
                activeOpacity={0.85}
              >
                <Text style={[styles.upgradeBtnText, { color: colors.gray700 }]}>{t('payment.successUpgradeCancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.upgradeBtn, { backgroundColor: colors.primary }, upgradeLoading && { opacity: 0.6 }]}
                onPress={handleUpgrade}
                disabled={upgradeLoading}
                activeOpacity={0.85}
              >
                {upgradeLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.upgradeBtnText, { color: '#fff' }]}>{t('payment.successUpgradeCreate')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    width: 160,
    height: 160,
  },
  iconRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  iconContainer: {},
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 34,
    letterSpacing: -1.3,
    lineHeight: 38,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
  },
  infoCardsCol: {
    width: '100%',
    gap: Spacing.sm,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
  },
  infoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
  },
  infoEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  infoTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 15,
    letterSpacing: -0.4,
    lineHeight: 18,
  },
  infoDescription: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },

  // Mini sound toggle (top-right corner)
  muteToggle: {
    position: 'absolute',
    top: 12,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 5,
  },
  muteToggleText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  // Mini recap card
  recapCard: {
    width: '100%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  recapLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    letterSpacing: 0.1,
  },
  recapValue: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: -0.1,
    flexShrink: 1,
    textAlign: 'right',
  },
  // Bottom buttons
  bottomButtons: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  primaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    minHeight: 56,
  },
  primaryPillEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  primaryPillLabel: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  primaryPillArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginLeft: Spacing.sm,
  },
  calendarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  calendarPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  invitePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  invitePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  secondaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
  },
  secondaryPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  // Guest upgrade banner (visible when isGuest=true)
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1.5,
    width: '100%',
    marginBottom: Spacing.md,
  },
  upgradeBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBannerEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  upgradeBannerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
    letterSpacing: -0.3,
    lineHeight: 17,
    marginTop: 2,
  },
  upgradeBannerHint: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  upgradeBannerActions: {
    alignItems: 'center',
    gap: 4,
  },
  upgradeCta: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  upgradeCtaText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: '#fff',
    letterSpacing: 0.2,
  },
  upgradeDismiss: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    textDecorationLine: 'underline',
  },
  // Upgrade modal
  upgradeBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  upgradeCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
  },
  upgradeEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  upgradeTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 26,
    marginBottom: 6,
  },
  upgradeSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  upgradeField: {
    marginBottom: Spacing.md,
  },
  upgradeFieldLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    marginBottom: 6,
  },
  upgradeInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
    fontFamily: FontFamily.regular,
  },
  upgradeActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  upgradeBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
