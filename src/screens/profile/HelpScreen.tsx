import React, { useState, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  StatusBar,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList } from '../../types';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';

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
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  items: FAQItem[];
}

const FAQ_DATA: FAQCategory[] = [
  {
    id: 'account',
    title: 'Compte & Profil',
    icon: 'person-outline',
    color: '#7C3AED',
    items: [
      {
        question: 'Comment creer un compte ?',
        answer: 'Telecharger l\'application EventEz, appuyez sur "S\'inscrire" et remplissez le formulaire avec votre email et mot de passe. Vous recevrez un email de confirmation.',
      },
      {
        question: 'Comment modifier mon profil ?',
        answer: 'Allez dans Profil > Modifier le profil. Vous pouvez changer votre photo, nom, email et autres informations personnelles.',
      },
      {
        question: 'Comment changer mon mot de passe ?',
        answer: 'Allez dans Profil > Parametres > Securite > Changer le mot de passe. Entrez votre ancien mot de passe puis le nouveau.',
      },
      {
        question: 'Comment devenir organisateur ?',
        answer: 'Depuis votre profil, appuyez sur "Devenir Organisateur". Remplissez les informations requises (type d\'organisation, coordonnees). Votre demande sera traitee rapidement.',
      },
    ],
  },
  {
    id: 'events',
    title: 'Evenements',
    icon: 'calendar-outline',
    color: '#EC4899',
    items: [
      {
        question: 'Comment trouver des evenements ?',
        answer: 'Utilisez l\'onglet "Decouvrir" pour parcourir les evenements. Vous pouvez filtrer par categorie, date, lieu ou utiliser la recherche.',
      },
      {
        question: 'Comment s\'inscrire a un evenement ?',
        answer: 'Ouvrez la page de l\'evenement et appuyez sur le bouton d\'inscription ou d\'achat de billets. Suivez les etapes pour completer votre inscription.',
      },
      {
        question: 'Comment suivre un evenement ?',
        answer: 'Appuyez sur l\'icone coeur/signet sur la page de l\'evenement. Vous retrouverez vos evenements suivis dans l\'onglet "Sauvegardes".',
      },
      {
        question: 'Comment ajouter un evenement a mon calendrier ?',
        answer: 'Sur la page de l\'evenement, appuyez sur l\'icone calendrier dans la section "Partager". Choisissez Google Calendar ou telechargez le fichier iCal.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Paiements',
    icon: 'card-outline',
    color: '#10B981',
    items: [
      {
        question: 'Quels modes de paiement sont acceptes ?',
        answer: 'Nous acceptons MTN Mobile Money, Orange Money, les cartes bancaires (Visa, Mastercard), PayPal et les virements bancaires.',
      },
      {
        question: 'Comment demander un remboursement ?',
        answer: 'Allez dans Profil > Mes paiements, selectionnez le paiement concerne et appuyez sur "Demander un remboursement". Les conditions de remboursement dependent de l\'organisateur.',
      },
      {
        question: 'Mon paiement a echoue, que faire ?',
        answer: 'Verifiez votre solde et reessayez. Si le probleme persiste, contactez le support avec votre numero de transaction. Les paiements en attente expirent apres 30 minutes.',
      },
    ],
  },
  {
    id: 'tickets',
    title: 'Billets & Inscriptions',
    icon: 'ticket-outline',
    color: '#F59E0B',
    items: [
      {
        question: 'Ou trouver mes billets ?',
        answer: 'Vos billets sont dans l\'onglet "Mes Billets". Chaque billet contient un QR code unique pour l\'entree a l\'evenement.',
      },
      {
        question: 'Comment fonctionne le QR code ?',
        answer: 'Presentez votre QR code a l\'entree de l\'evenement. L\'organisateur le scannera pour valider votre inscription. Vous pouvez aussi l\'enregistrer hors ligne.',
      },
      {
        question: 'Puis-je transferer mon billet ?',
        answer: 'Le transfert de billets depend des conditions de l\'organisateur. Si autorise, allez dans les details du billet et utilisez l\'option "Transferer".',
      },
    ],
  },
  {
    id: 'technical',
    title: 'Technique',
    icon: 'construct-outline',
    color: '#6366F1',
    items: [
      {
        question: 'L\'application ne fonctionne pas correctement',
        answer: 'Essayez de fermer et rouvrir l\'application. Verifiez que vous avez la derniere version. Si le probleme persiste, desinstallez et reinstallez l\'application.',
      },
      {
        question: 'Je ne recois pas les notifications',
        answer: 'Verifiez que les notifications sont activees dans les parametres de votre telephone pour EventEz. Allez aussi dans Profil > Parametres > Notifications pour configurer vos preferences.',
      },
      {
        question: 'Comment supprimer mon compte ?',
        answer: 'Allez dans Profil > Parametres > Compte > Supprimer mon compte. Cette action est irreversible. Toutes vos donnees seront supprimees conformement a notre politique de confidentialite.',
      },
    ],
  },
];

const SUPPORT_EMAIL = 'support@eventez.app';

const AccordionItem = memo(({ item, isOpen, onToggle }: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.faqItem, { borderBottomColor: colors.gray100 }]}
      onPress={onToggle}
      activeOpacity={0.6}
    >
      <View style={styles.faqHeader}>
        <Text style={[styles.faqQuestion, { color: colors.gray900 }]}>
          {item.question}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.gray400}
        />
      </View>
      {isOpen && (
        <Text style={[styles.faqAnswer, { color: colors.gray600 }]}>
          {item.answer}
        </Text>
      )}
    </TouchableOpacity>
  );
});

export default function HelpScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleCategory = useCallback((categoryId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategory(prev => prev === categoryId ? null : categoryId);
  }, []);

  const toggleItem = useCallback((key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleContactSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Support EventEz - Demande d\'aide')}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.gray50 }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Centre d'aide</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.card }]}>
          <View style={[styles.heroIcon, { backgroundColor: isDark ? '#2D1B69' : '#EDE9FE' }]}>
            <Ionicons name="help-buoy" size={32} color="#7C3AED" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.gray900 }]}>
            Comment pouvons-nous vous aider ?
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.gray500 }]}>
            Trouvez des reponses a vos questions ou contactez notre equipe
          </Text>
        </View>

        {/* FAQ Categories */}
        {FAQ_DATA.map((category) => (
          <View
            key={category.id}
            style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}
          >
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => toggleCategory(category.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.categoryIcon, { backgroundColor: `${category.color}15` }]}>
                <Ionicons name={category.icon} size={22} color={category.color} />
              </View>
              <Text style={[styles.categoryTitle, { color: colors.gray900 }]}>
                {category.title}
              </Text>
              <View style={[styles.categoryBadge, { backgroundColor: colors.gray100 }]}>
                <Text style={[styles.categoryCount, { color: colors.gray500 }]}>
                  {category.items.length}
                </Text>
              </View>
              <Ionicons
                name={expandedCategory === category.id ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.gray400}
              />
            </TouchableOpacity>

            {expandedCategory === category.id && (
              <View style={[styles.faqList, { borderTopColor: colors.gray100 }]}>
                {category.items.map((item, idx) => {
                  const key = `${category.id}-${idx}`;
                  return (
                    <AccordionItem
                      key={key}
                      item={item}
                      isOpen={expandedItems.has(key)}
                      onToggle={() => toggleItem(key)}
                    />
                  );
                })}
              </View>
            )}
          </View>
        ))}

        {/* Contact Support */}
        <View style={[styles.supportCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.supportTitle, { color: colors.gray900 }]}>
            Besoin d'aide supplementaire ?
          </Text>
          <Text style={[styles.supportSubtitle, { color: colors.gray500 }]}>
            Notre equipe est la pour vous aider
          </Text>
          <TouchableOpacity
            style={[styles.supportButton, { backgroundColor: '#7C3AED' }]}
            onPress={handleContactSupport}
            activeOpacity={0.7}
          >
            <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
            <Text style={styles.supportButtonText}>Contacter le support</Text>
          </TouchableOpacity>
        </View>

        {/* Legal Links */}
        <View style={styles.legalSection}>
          <TouchableOpacity
            style={[styles.legalItem, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}
            onPress={() => navigation.navigate('Terms')}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.gray500} />
            <Text style={[styles.legalText, { color: colors.gray700 }]}>
              Conditions d'utilisation
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.legalItem, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}
            onPress={() => navigation.navigate('Privacy')}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.gray500} />
            <Text style={[styles.legalText, { color: colors.gray700 }]}>
              Politique de confidentialite
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...TextStyles.h3,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  heroCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius['3xl'],
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    ...TextStyles.h3,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    ...TextStyles.body,
    textAlign: 'center',
  },
  categoryCard: {
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.md,
    marginLeft: Spacing.md,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  categoryCount: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
  },
  faqList: {
    borderTopWidth: 1,
  },
  faqItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    marginRight: Spacing.sm,
  },
  faqAnswer: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  supportCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius['3xl'],
    marginTop: Spacing.lg,
    ...Shadows.card,
  },
  supportTitle: {
    ...TextStyles.h4,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  supportSubtitle: {
    ...TextStyles.body,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  supportButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.md,
    color: '#FFFFFF',
  },
  legalSection: {
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.md,
  },
  legalText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },
});
