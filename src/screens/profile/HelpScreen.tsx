import React, { useState, memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList } from '../../types';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { StaggeredItem } from '../../components/ui/Animations';
import {
  Colors,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { centeredContent } from '../../constants/layout';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  eyebrow: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  items: FAQItem[];
}

// FAQ static structure (questions/answers translated via t() in component).
// Each item uses i18n keys under helpCenter.faq.<categoryId>.
const FAQ_STATIC = [
  {
    id: 'account',
    eyebrow: 'CAT 01',
    icon: 'person-outline' as const,
    color: '#4F46E5',
    itemKeys: ['createAccount', 'editProfile', 'changePassword', 'becomeOrganizer'],
  },
  {
    id: 'events',
    eyebrow: 'CAT 02',
    icon: 'calendar-outline' as const,
    color: '#A855F7',
    itemKeys: ['findEvents', 'registerEvent', 'followEvent', 'addToCalendar'],
  },
  {
    id: 'payments',
    eyebrow: 'CAT 03',
    icon: 'card-outline' as const,
    color: '#10B981',
    itemKeys: ['paymentMethods', 'requestRefund', 'paymentFailed'],
  },
  {
    id: 'tickets',
    eyebrow: 'CAT 04',
    icon: 'ticket-outline' as const,
    color: '#F59E0B',
    itemKeys: ['findTickets', 'qrCodeWorks', 'transferTicket'],
  },
  {
    id: 'technical',
    eyebrow: 'CAT 05',
    icon: 'construct-outline' as const,
    color: '#6366F1',
    itemKeys: ['appNotWorking', 'noNotifications', 'deleteAccount'],
  },
  {
    id: 'messaging',
    eyebrow: 'CAT 06',
    icon: 'chatbubble-ellipses-outline' as const,
    color: '#EC4899',
    itemKeys: ['sendMessage', 'messageRequests', 'reportBlock', 'attachments', 'encryption'],
  },
  {
    id: 'organizer',
    eyebrow: 'CAT 07',
    icon: 'briefcase-outline' as const,
    color: '#F97316',
    itemKeys: ['requirements', 'validation', 'firstEvent', 'drafts', 'platformFees'],
  },
  {
    id: 'wallet',
    eyebrow: 'CAT 08',
    icon: 'wallet-outline' as const,
    color: '#14B8A6',
    itemKeys: ['walletBasics', 'mobileMoneyWithdraw', 'withdrawTime', 'minWithdraw', 'kyc'],
  },
  {
    id: 'sessions',
    eyebrow: 'CAT 09',
    icon: 'time-outline' as const,
    color: '#8B5CF6',
    itemKeys: ['whatAreSessions', 'registerSession', 'parallelSessions', 'sessionReminders'],
  },
  {
    id: 'transfers',
    eyebrow: 'CAT 10',
    icon: 'swap-horizontal-outline' as const,
    color: '#06B6D4',
    itemKeys: ['sendTicket', 'receiverAccount', 'transferExpiry', 'cancelTransfer', 'transferFees'],
  },
  {
    id: 'security',
    eyebrow: 'CAT 11',
    icon: 'shield-checkmark-outline' as const,
    color: '#DC2626',
    itemKeys: ['blockUser', 'deleteAccountFull', 'dataSharing', 'exportData', 'twoFactor'],
  },
  {
    id: 'events_management',
    eyebrow: 'CAT 12',
    icon: 'create-outline' as const,
    color: '#0EA5E9',
    itemKeys: ['publishEvent', 'editAfterPublish', 'duplicateEvent', 'cancelEvent', 'archiveEvent'],
  },
  {
    id: 'discounts_promos',
    eyebrow: 'CAT 13',
    icon: 'pricetag-outline' as const,
    color: '#EAB308',
    itemKeys: ['createDiscount', 'discountTypes', 'codeNotWorking', 'deactivateCode'],
  },
  {
    id: 'team_management',
    eyebrow: 'CAT 14',
    icon: 'people-outline' as const,
    color: '#7C3AED',
    itemKeys: ['inviteCoOrganizer', 'teamRoles', 'removeMember', 'permissionMatrix'],
  },
  {
    id: 'analytics',
    eyebrow: 'CAT 15',
    icon: 'analytics-outline' as const,
    color: '#0891B2',
    itemKeys: ['viewSales', 'exportData', 'attendeeDemographics', 'scheduledReports'],
  },
  {
    id: 'notifications_prefs',
    eyebrow: 'CAT 16',
    icon: 'notifications-outline' as const,
    color: '#F59E0B',
    itemKeys: ['notificationTypes', 'manageEmail', 'pushNotifs', 'smsCharges', 'unsubscribe'],
  },
  {
    id: 'reviews_ratings',
    eyebrow: 'CAT 17',
    icon: 'star-outline' as const,
    color: '#E11D48',
    itemKeys: ['leaveReview', 'editReview', 'organizerResponse', 'reportReview'],
  },
];

const SUPPORT_EMAIL = 'support@eventez.online';
// ⚠️ PLACEHOLDER — remplacer par le VRAI numéro WhatsApp support (format
// international sans + ni espaces, ex. 2376XXXXXXXX).
const SUPPORT_WHATSAPP = '237688009657';

const AccordionItem = memo(({ item, isOpen, onToggle, idx }: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
  idx: number;
}) => {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  return (
    <TouchableOpacity
      style={[styles.faqItem, { borderBottomColor: hairline }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.faqHeader}>
        <Text style={[styles.faqIndex, { color: colors.accent }]}>
          {String(idx + 1).padStart(2, '0')}
        </Text>
        <Text style={[styles.faqQuestion, { color: colors.text }]} numberOfLines={isOpen ? undefined : 2}>
          {item.question}
        </Text>
        <View style={[styles.faqChevron, { backgroundColor: isOpen ? colors.primary : colors.gray100 }]}>
          <Ionicons
            name={isOpen ? 'remove' : 'add'}
            size={14}
            color={isOpen ? Colors.white : colors.gray700}
          />
        </View>
      </View>
      {isOpen && (
        <View style={[styles.faqAnswerBlock, { borderLeftColor: colors.primary }]}>
          <Text style={[styles.faqAnswer, { color: colors.gray600 }]}>
            {item.answer}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

export default function HelpScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const FAQ_DATA: FAQCategory[] = useMemo(
    () =>
      FAQ_STATIC.map((cat) => ({
        id: cat.id,
        eyebrow: cat.eyebrow,
        icon: cat.icon,
        color: cat.color,
        title: t(`helpCenter.categories.${cat.id}`),
        items: cat.itemKeys.map((k) => ({
          question: t(`helpCenter.faq.${cat.id}.${k}.question`),
          answer: t(`helpCenter.faq.${cat.id}.${k}.answer`),
        })),
      })),
    [t],
  );

  const toggleItem = useCallback((key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Filter categories + items by search query and active category
  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return FAQ_DATA
      .filter((cat) => activeCategory === null || activeCategory === cat.id)
      .map((cat) => ({
        ...cat,
        items: query
          ? cat.items.filter(
              (i) =>
                i.question.toLowerCase().includes(query) ||
                i.answer.toLowerCase().includes(query),
            )
          : cat.items,
      }))
      .filter((cat) => cat.items.length > 0);
  }, [searchQuery, activeCategory, FAQ_DATA]);

  const totalItems = useMemo(
    () => FAQ_DATA.reduce((sum, cat) => sum + cat.items.length, 0),
    [FAQ_DATA],
  );
  const filteredCount = useMemo(
    () => filteredData.reduce((sum, cat) => sum + cat.items.length, 0),
    [filteredData],
  );

  const handleContactEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('helpCenter.emailSubject'))}`);
  };
  const handleContactWhatsApp = () => {
    Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(t('helpCenter.whatsappMessage'))}`);
  };

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>FAQ</WatermarkNumeral>

      {/* === HEADER === */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.6)',
            borderBottomColor: hairline,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray600} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('helpCenter.headerEyebrow')}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('helpCenter.headerTitle')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* === HERO QUESTION CARD === */}
        <StaggeredItem index={0}>
          <View style={[styles.heroCard, Shadows.lg]}>
            <LinearGradient
              colors={['#0F172A', '#1E1B4B', colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroCircle1} />
            <View style={styles.heroCircle2} />
            <Text style={styles.heroWatermark}>?</Text>

            <Text style={styles.heroEyebrow}>{t('helpCenter.heroEyebrow')}</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {t('helpCenter.heroTitle')}
            </Text>

            {/* Search inside hero */}
            <View style={[styles.heroSearchBox, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
              <Ionicons name="search" size={16} color={colors.gray500} />
              <TextInput
                style={styles.heroSearchInput}
                placeholder={t('helpCenter.searchPlaceholder')}
                placeholderTextColor={colors.gray400}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={colors.gray400} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.heroCounter}>
              <View style={styles.heroCounterDot} />
              <Text style={styles.heroCounterText}>
                {searchQuery
                  ? t('helpCenter.resultsCount', { count: filteredCount })
                  : t('helpCenter.questionsAvailable', { count: totalItems })}
              </Text>
            </View>
          </View>
        </StaggeredItem>

        {/* === CONTACT CARDS === */}
        <StaggeredItem index={1}>
          <View style={styles.contactRow}>
            <TouchableOpacity
              style={[styles.contactCard, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
              onPress={handleContactEmail}
              activeOpacity={0.85}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#3B82F615' }]}>
                <Ionicons name="mail" size={18} color="#3B82F6" />
              </View>
              <Text style={[styles.contactEyebrow, { color: colors.accent }]}>{t('helpCenter.contactEmailEyebrow')}</Text>
              <Text style={[styles.contactLabel, { color: colors.text }]}>{t('helpCenter.contactEmailLabel')}</Text>
              <Text style={[styles.contactSub, { color: colors.gray500 }]} numberOfLines={1}>
                {t('helpCenter.contactEmailSub')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactCard, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
              onPress={handleContactWhatsApp}
              activeOpacity={0.85}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#10B98115' }]}>
                <Ionicons name="logo-whatsapp" size={18} color="#10B981" />
              </View>
              <Text style={[styles.contactEyebrow, { color: colors.accent }]}>{t('helpCenter.contactWhatsappEyebrow')}</Text>
              <Text style={[styles.contactLabel, { color: colors.text }]}>{t('helpCenter.contactWhatsappLabel')}</Text>
              <Text style={[styles.contactSub, { color: colors.gray500 }]} numberOfLines={1}>
                {t('helpCenter.contactWhatsappSub')}
              </Text>
            </TouchableOpacity>
          </View>
        </StaggeredItem>

        {/* === CATEGORY FILTER CHIPS === */}
        <StaggeredItem index={2}>
          <View style={styles.categorySection}>
            <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('helpCenter.filterEyebrow')}</Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('helpCenter.filterTitle')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryChipsScroll}
              contentContainerStyle={styles.categoryChipsRow}
            >
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  activeCategory === null
                    ? { backgroundColor: colors.text, ...Shadows.sm }
                    : { backgroundColor: colors.card, borderColor: hairline, borderWidth: 1 },
                ]}
                onPress={() => setActiveCategory(null)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: activeCategory === null ? Colors.white : colors.gray700 },
                  ]}
                >
                  {t('helpCenter.filterAll')}
                </Text>
              </TouchableOpacity>
              {FAQ_DATA.map((cat) => {
                const active = activeCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      active
                        ? { backgroundColor: cat.color, ...Shadows.sm }
                        : { backgroundColor: colors.card, borderColor: hairline, borderWidth: 1 },
                    ]}
                    onPress={() => setActiveCategory(active ? null : cat.id)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={12}
                      color={active ? Colors.white : cat.color}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: active ? Colors.white : colors.gray700 },
                      ]}
                    >
                      {cat.title}
                    </Text>
                    <View
                      style={[
                        styles.categoryChipBadge,
                        { backgroundColor: active ? 'rgba(255,255,255,0.22)' : `${cat.color}15` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryChipBadgeText,
                          { color: active ? Colors.white : cat.color },
                        ]}
                      >
                        {cat.items.length}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </StaggeredItem>

        {/* === FAQ CATEGORIES === */}
        {filteredData.length === 0 ? (
          <View style={styles.emptyBlock}>
            <View style={[styles.emptyIconBox, { backgroundColor: `${colors.primary}10` }]}>
              <Ionicons name="search-outline" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyEyebrow, { color: colors.accent }]}>{t('helpCenter.emptyEyebrow')}</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('helpCenter.emptyTitle')}</Text>
            <Text style={[styles.emptyText, { color: colors.gray500 }]}>
              {t('helpCenter.emptyText')}
            </Text>
          </View>
        ) : (
          filteredData.map((category, catIdx) => (
            <StaggeredItem key={category.id} index={catIdx + 3}>
              <View style={styles.categoryBlock}>
                <View style={styles.categoryBlockHeader}>
                  <View style={[styles.categoryBlockIcon, { backgroundColor: `${category.color}15` }]}>
                    <Ionicons name={category.icon} size={18} color={category.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.categoryBlockEyebrow, { color: category.color }]}>
                      {category.eyebrow}
                    </Text>
                    <Text style={[styles.categoryBlockTitle, { color: colors.text }]}>
                      {category.title}
                    </Text>
                  </View>
                  <View style={[styles.categoryBlockCount, { backgroundColor: colors.gray100 }]}>
                    <Text style={[styles.categoryBlockCountText, { color: colors.gray700 }]}>
                      {category.items.length}
                    </Text>
                  </View>
                </View>
                <View style={[styles.faqList, { backgroundColor: colors.card, borderColor: hairline }]}>
                  {category.items.map((item, idx) => {
                    const key = `${category.id}-${idx}`;
                    return (
                      <AccordionItem
                        key={key}
                        item={item}
                        isOpen={expandedItems.has(key)}
                        onToggle={() => toggleItem(key)}
                        idx={idx}
                      />
                    );
                  })}
                </View>
              </View>
            </StaggeredItem>
          ))
        )}

        {/* === CONTACT SUPPORT CTA === */}
        <View style={styles.supportSection}>
          <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('helpCenter.supportEyebrow')}</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('helpCenter.supportTitle')}</Text>
          <TouchableOpacity
            style={[styles.supportPill, Shadows.buttonPrimary]}
            onPress={handleContactEmail}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.supportPillEyebrow}>{t('helpCenter.supportPillEyebrow')}</Text>
              <Text style={styles.supportPillLabel}>{t('helpCenter.supportPillLabel')}</Text>
            </View>
            <View style={styles.supportPillArrow}>
              <Ionicons name="mail" size={18} color={Colors.white} />
            </View>
          </TouchableOpacity>
        </View>

        {/* === LEGAL LINKS === */}
        <View style={styles.legalSection}>
          <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('helpCenter.legalEyebrow')}</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('helpCenter.legalTitle')}</Text>
          <View style={[styles.legalCard, { backgroundColor: colors.card, borderColor: hairline }, Shadows.xs]}>
            <TouchableOpacity
              style={[styles.legalRow, { borderBottomColor: hairline }]}
              onPress={() => navigation.navigate('Terms')}
              activeOpacity={0.85}
            >
              <View style={[styles.legalIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="document-text-outline" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.legalEyebrow, { color: colors.accent }]}>{t('helpCenter.legalDoc1Eyebrow')}</Text>
                <Text style={[styles.legalLabel, { color: colors.text }]}>{t('helpCenter.legalDoc1Label')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.legalRow}
              onPress={() => navigation.navigate('Privacy')}
              activeOpacity={0.85}
            >
              <View style={[styles.legalIcon, { backgroundColor: '#10B98115' }]}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.legalEyebrow, { color: colors.accent }]}>{t('helpCenter.legalDoc2Eyebrow')}</Text>
                <Text style={[styles.legalLabel, { color: colors.text }]}>{t('helpCenter.legalDoc2Label')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  // === HEADER ===
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 30,
    letterSpacing: -1.2,
    lineHeight: 34,
  },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 100,
    ...centeredContent(620),
  },

  // === HERO ===
  heroCard: {
    borderRadius: 28,
    padding: Spacing.lg,
    minHeight: 240,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  heroCircle1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,107,107,0.18)',
  },
  heroWatermark: {
    position: 'absolute',
    bottom: 8,
    right: 18,
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 140,
    letterSpacing: -8,
    color: 'rgba(255,255,255,0.06)',
    lineHeight: 130,
  },
  heroEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 32,
    color: '#FFFFFF',
    letterSpacing: -1.4,
    lineHeight: 36,
    marginBottom: Spacing.lg,
  },
  heroSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  heroSearchInput: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: '#111',
    padding: 0,
  },
  heroCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroCounterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#BEFF5A',
  },
  heroCounterText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
  },

  // === CONTACT CARDS ===
  contactRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  contactCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
  },
  contactIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  contactEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  contactLabel: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 16,
    letterSpacing: -0.5,
    lineHeight: 19,
  },
  contactSub: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
  },

  // === CATEGORY SECTION ===
  categorySection: {
    marginBottom: Spacing.lg,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 26,
    marginBottom: Spacing.md,
  },
  categoryChipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  categoryChipText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  categoryChipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  categoryChipBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
  },

  // === CATEGORY BLOCK ===
  categoryBlock: {
    marginBottom: Spacing.lg,
  },
  categoryBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.sm,
  },
  categoryBlockIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBlockEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  categoryBlockTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    letterSpacing: -0.5,
  },
  categoryBlockCount: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  categoryBlockCountText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  faqList: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // === FAQ ITEM ===
  faqItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  faqIndex: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    letterSpacing: -0.3,
    width: 22,
  },
  faqQuestion: {
    flex: 1,
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
    letterSpacing: -0.3,
    lineHeight: 18,
  },
  faqChevron: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqAnswerBlock: {
    marginTop: 8,
    marginLeft: 32,
    paddingLeft: 12,
    paddingVertical: 8,
    borderLeftWidth: 2,
  },
  faqAnswer: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
  },

  // === EMPTY ===
  emptyBlock: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },

  // === SUPPORT CTA ===
  supportSection: {
    marginTop: Spacing.lg,
  },
  supportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    minHeight: 56,
  },
  supportPillEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  supportPillLabel: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  supportPillArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginLeft: Spacing.sm,
  },

  // === LEGAL ===
  legalSection: {
    marginTop: Spacing.xl,
  },
  legalCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  legalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  legalLabel: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
    letterSpacing: -0.3,
  },
});
