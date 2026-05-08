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
    icon: 'checkmark-done-outline',
    title: 'Acceptation des conditions',
    content: `En utilisant l'application EventEz, vous acceptez d'être lié par ces conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre application.

Ces conditions s'appliquent à tous les utilisateurs de l'application, qu'ils soient participants ou organisateurs d'événements.`,
  },
  {
    num: '02',
    icon: 'apps-outline',
    title: 'Description du service',
    content: `EventEz est une plateforme de gestion d'événements permettant aux utilisateurs de :
• Découvrir et s'inscrire à des événements
• Acheter des billets pour des événements
• Créer et gérer leurs propres événements (organisateurs)
• Communiquer avec les organisateurs et autres participants

Nous nous réservons le droit de modifier, suspendre ou interrompre tout aspect du service à tout moment.`,
  },
  {
    num: '03',
    icon: 'person-add-outline',
    title: 'Inscription et compte',
    content: `Pour utiliser certaines fonctionnalités de l'application, vous devez créer un compte. Vous vous engagez à :
• Fournir des informations exactes et complètes
• Maintenir la confidentialité de vos identifiants
• Notifier immédiatement toute utilisation non autorisée
• Ne pas créer de compte pour une autre personne sans autorisation

Vous êtes responsable de toutes les activités effectuées sous votre compte.`,
  },
  {
    num: '04',
    icon: 'card-outline',
    title: 'Achats et paiements',
    content: `Lors de l'achat de billets sur EventEz :
• Tous les prix sont indiqués dans la devise de l'événement et incluent les taxes applicables
• Les paiements sont traités de manière sécurisée via nos partenaires (NotchPay, Stripe)
• Les remboursements sont soumis aux conditions de l'organisateur
• EventEz peut prélever des frais de service sur les transactions

En cas d'annulation d'événement, les remboursements seront effectués selon la politique de l'organisateur.`,
  },
  {
    num: '05',
    icon: 'megaphone-outline',
    title: 'Organisateurs d\'événements',
    content: `En tant qu'organisateur, vous vous engagez à :
• Fournir des informations exactes sur vos événements
• Respecter toutes les lois et réglementations applicables
• Honorer les billets vendus via la plateforme
• Gérer les remboursements selon votre politique annoncée
• Ne pas organiser d'événements illégaux

EventEz se réserve le droit de retirer tout événement ne respectant pas ces conditions.`,
  },
  {
    num: '06',
    icon: 'images-outline',
    title: 'Contenu utilisateur',
    content: `En publiant du contenu (commentaires, avis, photos), vous :
• Conservez vos droits de propriété intellectuelle
• Accordez à EventEz une licence non exclusive d'utilisation
• Garantissez ne pas publier de contenu illégal, offensant ou trompeur

Nous nous réservons le droit de supprimer tout contenu inapproprié.`,
  },
  {
    num: '07',
    icon: 'shield-outline',
    title: 'Protection des données',
    content: `Nous prenons la protection de vos données au sérieux :
• Données traitées conformément au RGPD
• Nous ne vendons pas vos données à des tiers
• Vous pouvez demander accès, modification ou suppression
• Consultez notre Politique de Confidentialité pour plus de détails`,
  },
  {
    num: '08',
    icon: 'warning-outline',
    title: 'Limitation de responsabilité',
    content: `EventEz est fourni "tel quel" sans garantie d'aucune sorte. Nous ne sommes pas responsables :
• Des dommages résultant de l'utilisation
• De la qualité ou tenue d'événements de tiers
• Des pertes de données ou interruptions
• Des litiges entre utilisateurs et organisateurs

Notre responsabilité totale ne peut excéder le montant que vous nous avez payé.`,
  },
  {
    num: '09',
    icon: 'lock-closed-outline',
    title: 'Propriété intellectuelle',
    content: `L'application EventEz, son logo et tout son contenu sont protégés. Vous n'êtes pas autorisé à :
• Copier, modifier ou distribuer l'application
• Utiliser nos marques sans autorisation
• Décompiler ou désassembler l'application`,
  },
  {
    num: '10',
    icon: 'refresh-outline',
    title: 'Modifications',
    content: `Nous pouvons modifier ces conditions à tout moment. Les modifications prennent effet dès leur publication. Votre utilisation continue après modification constitue votre acceptation des nouvelles conditions.`,
  },
  {
    num: '11',
    icon: 'close-circle-outline',
    title: 'Résiliation',
    content: `Nous pouvons suspendre ou résilier votre accès si vous violez ces conditions. Vous pouvez supprimer votre compte à tout moment depuis les paramètres.`,
  },
  {
    num: '12',
    icon: 'mail-outline',
    title: 'Contact',
    content: `Pour toute question concernant ces conditions :
• Email : support@eventez.com
• Adresse : Douala, Cameroun

Ces conditions sont régies par les lois camerounaises.`,
  },
];

export default function TermsScreen() {
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
      <WatermarkNumeral>TOS</WatermarkNumeral>

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
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('termsLegal.headerEyebrow')}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('termsLegal.headerTitle')}</Text>
          </View>
        </View>

        {/* Reading progress bar */}
        <View style={[styles.progressBar, { backgroundColor: colors.gray100 }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%`, backgroundColor: colors.primary },
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
        {/* === HERO === */}
        <View style={[styles.heroCard, Shadows.lg]}>
          <LinearGradient
            colors={['#0F172A', '#1E1B4B', colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroCircle1} />
          <View style={styles.heroCircle2} />
          <Text style={styles.heroWatermark}>§</Text>

          <Text style={styles.heroEyebrow}>{t('termsLegal.heroEyebrow')}</Text>
          <Text style={styles.heroTitle} numberOfLines={3}>
            {t('termsLegal.heroTitle')}
          </Text>
          <View style={styles.heroMeta}>
            <View style={styles.heroMetaItem}>
              <View style={styles.heroMetaDot} />
              <Text style={styles.heroMetaText}>{t('termsLegal.heroSections', { count: SECTIONS.length })}</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.85)" />
              <Text style={styles.heroMetaText}>{t('termsLegal.heroReadingTime')}</Text>
            </View>
          </View>
          <View style={styles.heroDateBlock}>
            <Text style={styles.heroDateLabel}>{t('termsLegal.heroDateLabel')}</Text>
            <Text style={styles.heroDateValue}>{t('termsLegal.heroDateValue')}</Text>
          </View>
        </View>

        {/* === TOC (Table of Contents) === */}
        <View style={styles.tocSection}>
          <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('termsLegal.tocEyebrow')}</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('termsLegal.tocTitle')}</Text>
          <View style={styles.tocGrid}>
            {SECTIONS.map((section) => (
              <TouchableOpacity
                key={section.num}
                style={[styles.tocChip, { backgroundColor: colors.card, borderColor: hairline }]}
                onPress={() => scrollToSection(section.num)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tocChipNum, { color: colors.accent }]}>{section.num}</Text>
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
                <View style={[styles.sectionNumBox, { backgroundColor: `${colors.primary}15` }]}>
                  <Text style={[styles.sectionNumText, { color: colors.primary }]}>
                    {section.num}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.sectionIconRow}>
                    <Ionicons name={section.icon} size={14} color={colors.gray500} />
                    <Text style={[styles.sectionIconLabel, { color: colors.gray500 }]}>
                      {t('termsLegal.articleLabel', { num: section.num })}
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

        {/* === ACCEPTANCE CALLOUT === */}
        <View style={[styles.acceptCallout, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
          <View style={[styles.acceptRail, { backgroundColor: '#10B981' }]} />
          <View style={[styles.acceptIcon, { backgroundColor: '#10B981' }]}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.acceptEyebrow}>{t('termsLegal.acceptEyebrow')}</Text>
            <Text style={styles.acceptText}>
              {t('termsLegal.acceptText')}
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
    fontSize: 24,
    letterSpacing: -0.9,
    lineHeight: 28,
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

  // === HERO ===
  heroCard: {
    borderRadius: 28,
    padding: Spacing.lg,
    minHeight: 240,
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
    backgroundColor: 'rgba(190,255,90,0.12)',
  },
  heroWatermark: {
    position: 'absolute',
    bottom: -20,
    right: 18,
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 200,
    letterSpacing: -10,
    color: 'rgba(255,255,255,0.06)',
    lineHeight: 200,
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

  // === TOC ===
  tocSection: {
    marginBottom: Spacing.xl,
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
    fontSize: 20,
    letterSpacing: -0.6,
    lineHeight: 24,
    marginBottom: Spacing.md,
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

  // === ACCEPT CALLOUT ===
  acceptCallout: {
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
  acceptRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  acceptIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: '#065F46',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  acceptText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: '#064E3B',
    lineHeight: 18,
  },
});
