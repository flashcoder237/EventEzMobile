import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import {
  Colors,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { StaggeredItem } from '../../components/ui/Animations';

interface Section {
  num: string;
  title: string;
  content: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SECTIONS: Section[] = [
  {
    num: '01',
    icon: 'information-circle-outline',
    title: 'Introduction',
    content: `La présente Politique de Confidentialité décrit comment EventEz ("nous", "notre") collecte, utilise, stocke et protège vos données personnelles lorsque vous utilisez notre application mobile et nos services.

Nous nous engageons à respecter votre vie privée et à protéger vos données conformément au RGPD et aux lois camerounaises en vigueur.`,
  },
  {
    num: '02',
    icon: 'folder-open-outline',
    title: 'Données collectées',
    content: `Nous collectons :

IDENTIFICATION
• Nom, prénom, adresse email
• Numéro de téléphone
• Photo de profil (optionnel)

COMPTE
• Identifiants de connexion
• Préférences et paramètres
• Historique d'activité

TRANSACTIONS
• Historique des achats de billets
• Informations de paiement (traitées par nos partenaires sécurisés)
• Factures et reçus

LOCALISATION
• Position géographique (avec votre consentement)
• Ville et pays de résidence

TECHNIQUE
• Type d'appareil et OS
• Adresse IP
• Logs d'utilisation`,
  },
  {
    num: '03',
    icon: 'compass-outline',
    title: 'Finalités du traitement',
    content: `Vos données sont utilisées pour :

• Gérer votre compte et l'authentification
• Permettre l'inscription et l'achat de billets
• Traiter les paiements de manière sécurisée
• Envoyer des notifications relatives à vos événements
• Améliorer nos services et l'expérience utilisateur
• Assurer la sécurité de la plateforme
• Respecter nos obligations légales
• Communiquer avec vous concernant le service`,
  },
  {
    num: '04',
    icon: 'document-text-outline',
    title: 'Base légale',
    content: `Le traitement de vos données repose sur :

• EXÉCUTION DU CONTRAT — nécessaire pour fournir nos services
• CONSENTEMENT — pour les notifications marketing et la localisation
• INTÉRÊT LÉGITIME — amélioration du service, sécurité, prévention de fraude
• OBLIGATION LÉGALE — conservation des données de facturation`,
  },
  {
    num: '05',
    icon: 'share-social-outline',
    title: 'Partage des données',
    content: `Nous pouvons partager vos données avec :

• ORGANISATEURS — nom et email pour les inscriptions
• PRESTATAIRES PAIEMENT — NotchPay, Stripe, pour les transactions
• HÉBERGEURS TECHNIQUES — pour le fonctionnement de la plateforme

Nous ne vendons jamais vos données personnelles à des tiers. Tout partage est encadré par des accords de confidentialité stricts.`,
  },
  {
    num: '06',
    icon: 'shield-checkmark-outline',
    title: 'Sécurité des données',
    content: `Nous mettons en œuvre des mesures de sécurité appropriées :

• Chiffrement des données en transit (HTTPS/TLS)
• Stockage sécurisé des mots de passe (hachage)
• Tokens JWT avec expiration
• Journalisation des accès et audit trail
• Sauvegardes régulières et chiffrées
• Contrôle d'accès basé sur les rôles`,
  },
  {
    num: '07',
    icon: 'time-outline',
    title: 'Conservation',
    content: `Vos données sont conservées :

• COMPTE — durée d'inscription + 3 ans après suppression
• TRANSACTIONS — 10 ans (obligations légales)
• LOGS TECHNIQUES — 12 mois
• LOCALISATION — non conservée au-delà de la session

Vous pouvez demander la suppression de votre compte à tout moment.`,
  },
  {
    num: '08',
    icon: 'key-outline',
    title: 'Vos droits',
    content: `Conformément au RGPD, vous disposez des droits suivants :

• ACCÈS — obtenir une copie de vos données
• RECTIFICATION — corriger vos données inexactes
• EFFACEMENT — demander la suppression
• PORTABILITÉ — recevoir vos données dans un format standard
• OPPOSITION — vous opposer à certains traitements
• LIMITATION — restreindre le traitement
• RETRAIT DU CONSENTEMENT — à tout moment

Pour exercer ces droits, contactez : privacy@eventez.online`,
  },
  {
    num: '09',
    icon: 'phone-portrait-outline',
    title: 'Stockage local',
    content: `Notre application mobile utilise des technologies de stockage local (AsyncStorage, SecureStore) pour :

• Maintenir votre session de connexion
• Sauvegarder vos préférences
• Améliorer les performances

Ces données sont stockées localement sur votre appareil et ne sont pas partagées avec des tiers.`,
  },
  {
    num: '10',
    icon: 'globe-outline',
    title: 'Transferts internationaux',
    content: `Vos données peuvent être traitées sur des serveurs situés en dehors du Cameroun. Dans ce cas, nous nous assurons que des garanties appropriées sont en place, conformément au RGPD (clauses contractuelles types, adéquation).`,
  },
  {
    num: '11',
    icon: 'people-outline',
    title: 'Mineurs',
    content: `Notre service n'est pas destiné aux personnes de moins de 16 ans. Nous ne collectons pas sciemment de données concernant des mineurs. Si nous découvrons qu'un mineur nous a fourni des données personnelles, nous les supprimerons immédiatement.`,
  },
  {
    num: '12',
    icon: 'refresh-outline',
    title: 'Modifications',
    content: `Nous pouvons mettre à jour cette Politique de Confidentialité périodiquement. Nous vous informerons de tout changement significatif par notification dans l'application. La date de dernière mise à jour sera toujours indiquée.`,
  },
  {
    num: '13',
    icon: 'mail-outline',
    title: 'Contact',
    content: `Pour toute question relative à vos données personnelles :

• Email : privacy@eventez.online
• Adresse : Douala, Cameroun

Vous avez également le droit d'introduire une réclamation auprès de l'autorité de contrôle compétente.`,
  },
];

export default function PrivacyScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const scrollRef = useRef<ScrollView>(null);
  const sectionPositionsRef = useRef<Record<string, number>>({});
  const [progress, setProgress] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const total = contentSize.height - layoutMeasurement.height;
    if (total > 0) {
      const p = Math.max(0, Math.min(1, contentOffset.y / total));
      setProgress(p);
    }
  };

  const scrollToSection = (num: string) => {
    const y = sectionPositionsRef.current[num] || 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
  };

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>RGPD</WatermarkNumeral>

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
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('privacyLegal.headerEyebrow')}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('privacyLegal.headerTitle')}</Text>
          </View>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.gray100 }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%`, backgroundColor: '#10B981' },
            ]}
          />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* === HERO (green security gradient) === */}
        <View style={[styles.heroCard, Shadows.lg]}>
          <LinearGradient
            colors={['#064E3B', '#065F46', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroCircle1} />
          <View style={styles.heroCircle2} />
          <Text style={styles.heroWatermark}>{'{'}{'}'}</Text>

          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
              <Text style={styles.heroBadgeText}>{t('privacyLegal.heroBadge')}</Text>
            </View>
          </View>
          <Text style={styles.heroEyebrow}>{t('privacyLegal.heroEyebrow')}</Text>
          <Text style={styles.heroTitle} numberOfLines={3}>
            {t('privacyLegal.heroTitle')}
          </Text>
          <View style={styles.heroMeta}>
            <View style={styles.heroMetaItem}>
              <View style={styles.heroMetaDot} />
              <Text style={styles.heroMetaText}>{t('privacyLegal.heroArticles', { count: SECTIONS.length })}</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Ionicons name="lock-closed" size={11} color="rgba(255,255,255,0.85)" />
              <Text style={styles.heroMetaText}>{t('privacyLegal.heroEncryption')}</Text>
            </View>
          </View>
          <View style={styles.heroDateBlock}>
            <Text style={styles.heroDateLabel}>{t('privacyLegal.heroDateLabel')}</Text>
            <Text style={styles.heroDateValue}>{t('privacyLegal.heroDateValue')}</Text>
          </View>
        </View>

        {/* === KEY GUARANTEES === */}
        <View style={styles.guaranteesSection}>
          <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('privacyLegal.guaranteesEyebrow')}</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('privacyLegal.guaranteesTitle')}</Text>
          <View style={styles.guaranteesGrid}>
            {[
              { icon: 'shield-checkmark-outline' as const, label: t('privacyLegal.guarantee1Label'), sub: t('privacyLegal.guarantee1Sub'), color: '#10B981' },
              { icon: 'lock-closed-outline' as const, label: t('privacyLegal.guarantee2Label'), sub: t('privacyLegal.guarantee2Sub'), color: '#3B82F6' },
              { icon: 'eye-off-outline' as const, label: t('privacyLegal.guarantee3Label'), sub: t('privacyLegal.guarantee3Sub'), color: '#A855F7' },
              { icon: 'cloud-done-outline' as const, label: t('privacyLegal.guarantee4Label'), sub: t('privacyLegal.guarantee4Sub'), color: '#F59E0B' },
            ].map((g, idx) => (
              <View
                key={idx}
                style={[styles.guaranteeCard, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
              >
                <View style={[styles.guaranteeIcon, { backgroundColor: `${g.color}15` }]}>
                  <Ionicons name={g.icon} size={16} color={g.color} />
                </View>
                <Text style={[styles.guaranteeLabel, { color: colors.text }]} numberOfLines={1}>
                  {g.label}
                </Text>
                <Text style={[styles.guaranteeSub, { color: colors.gray500 }]} numberOfLines={2}>
                  {g.sub}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* === TOC === */}
        <View style={styles.tocSection}>
          <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('privacyLegal.tocEyebrow')}</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('privacyLegal.tocTitle')}</Text>
          <View style={styles.tocGrid}>
            {SECTIONS.map((section) => (
              <TouchableOpacity
                key={section.num}
                style={[styles.tocChip, { backgroundColor: colors.card, borderColor: hairline }]}
                onPress={() => scrollToSection(section.num)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tocChipNum, { color: '#10B981' }]}>{section.num}</Text>
                <Text style={[styles.tocChipLabel, { color: colors.text }]} numberOfLines={1}>
                  {section.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* === SECTIONS === */}
        {SECTIONS.map((section, idx) => (
          <StaggeredItem key={section.num} index={idx} staggerDelay={50}>
            <View
              style={styles.sectionBlock}
              onLayout={(e) => {
                sectionPositionsRef.current[section.num] = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.sectionBlockHeader}>
                <View style={[styles.sectionNumBox, { backgroundColor: '#10B98115' }]}>
                  <Text style={[styles.sectionNumText, { color: '#10B981' }]}>
                    {section.num}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.sectionIconRow}>
                    <Ionicons name={section.icon} size={14} color={colors.gray500} />
                    <Text style={[styles.sectionIconLabel, { color: colors.gray500 }]}>
                      {t('privacyLegal.articleLabel', { num: section.num })}
                    </Text>
                  </View>
                  <Text style={[styles.sectionBlockTitle, { color: colors.text }]}>
                    {section.title}
                  </Text>
                </View>
              </View>
              <View style={[styles.sectionContentCard, { backgroundColor: colors.card, borderColor: hairline }]}>
                <Text style={[styles.sectionContentText, { color: colors.gray700 }]}>
                  {section.content}
                </Text>
              </View>
            </View>
          </StaggeredItem>
        ))}

        {/* === FINAL CALLOUT === */}
        <View style={[styles.finalCallout, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
          <View style={[styles.finalRail, { backgroundColor: '#10B981' }]} />
          <View style={[styles.finalIcon, { backgroundColor: '#10B981' }]}>
            <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.finalEyebrow}>{t('privacyLegal.finalEyebrow')}</Text>
            <Text style={styles.finalText}>
              {t('privacyLegal.finalText')}
            </Text>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
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
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 26,
  },
  progressBar: {
    height: 3,
    width: '100%',
    overflow: 'hidden',
    marginHorizontal: -Spacing.lg,
    marginTop: -1,
  },
  progressFill: {
    height: 3,
  },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
  },

  // === HERO (green) ===
  heroCard: {
    borderRadius: 28,
    padding: Spacing.lg,
    minHeight: 260,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
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
    backgroundColor: 'rgba(190,255,90,0.18)',
  },
  heroWatermark: {
    position: 'absolute',
    bottom: -10,
    right: 18,
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 130,
    letterSpacing: -8,
    color: 'rgba(255,255,255,0.06)',
    lineHeight: 130,
  },
  heroBadgeRow: {
    marginBottom: Spacing.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 1.4,
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
    fontSize: 30,
    color: '#FFFFFF',
    letterSpacing: -1.2,
    lineHeight: 34,
    marginBottom: Spacing.md,
  },
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.md,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroMetaDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#BEFF5A',
  },
  heroMetaText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.2,
  },
  heroDateBlock: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  heroDateLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  heroDateValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // === SECTIONS HEADERS ===
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 20,
    letterSpacing: -0.6,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },

  // === GUARANTEES GRID ===
  guaranteesSection: {
    marginBottom: Spacing.xl,
  },
  guaranteesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  guaranteeCard: {
    width: '48%',
    flexGrow: 1,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  guaranteeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  guaranteeLabel: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    letterSpacing: -0.4,
    lineHeight: 17,
  },
  guaranteeSub: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: -0.1,
  },

  // === TOC ===
  tocSection: {
    marginBottom: Spacing.xl,
  },
  tocGrid: {
    gap: 6,
  },
  tocChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  tocChipNum: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    letterSpacing: -0.3,
    width: 22,
  },
  tocChipLabel: {
    flex: 1,
    fontFamily: FontFamily.displayBold,
    fontSize: 13,
    letterSpacing: -0.3,
  },

  // === SECTION BLOCK ===
  sectionBlock: {
    marginBottom: Spacing.lg,
  },
  sectionBlockHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: Spacing.sm,
  },
  sectionNumBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumText: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    letterSpacing: -0.5,
  },
  sectionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  sectionIconLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  sectionBlockTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  sectionContentCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.md,
  },
  sectionContentText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 21,
  },

  // === FINAL CALLOUT ===
  finalCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    paddingLeft: Spacing.lg + 6,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: Spacing.lg,
  },
  finalRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  finalIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: '#065F46',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  finalText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: '#064E3B',
    lineHeight: 18,
  },
});
