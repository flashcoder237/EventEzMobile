import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';

export default function TermsScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();

  const sections = [
    {
      title: "1. Acceptation des conditions",
      content: `En utilisant l'application EventEz, vous acceptez d'être lié par ces conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre application.

Ces conditions s'appliquent à tous les utilisateurs de l'application, qu'ils soient participants ou organisateurs d'événements.`
    },
    {
      title: "2. Description du service",
      content: `EventEz est une plateforme de gestion d'événements permettant aux utilisateurs de :
- Découvrir et s'inscrire à des événements
- Acheter des billets pour des événements
- Créer et gérer leurs propres événements (pour les organisateurs)
- Communiquer avec les organisateurs et autres participants

Nous nous réservons le droit de modifier, suspendre ou interrompre tout aspect du service à tout moment.`
    },
    {
      title: "3. Inscription et compte",
      content: `Pour utiliser certaines fonctionnalités de l'application, vous devez créer un compte. Vous vous engagez à :
- Fournir des informations exactes et complètes
- Maintenir la confidentialité de vos identifiants
- Notifier immédiatement toute utilisation non autorisée de votre compte
- Ne pas créer de compte pour une autre personne sans autorisation

Vous êtes responsable de toutes les activités effectuées sous votre compte.`
    },
    {
      title: "4. Achats et paiements",
      content: `Lors de l'achat de billets sur EventEz :
- Tous les prix sont indiqués en FCFA et incluent les taxes applicables
- Les paiements sont traités de manière sécurisée via nos partenaires de paiement
- Les remboursements sont soumis aux conditions de l'organisateur de l'événement
- EventEz peut prélever des frais de service sur les transactions

En cas d'annulation d'événement, les remboursements seront effectués selon la politique de l'organisateur.`
    },
    {
      title: "5. Organisateurs d'événements",
      content: `En tant qu'organisateur sur EventEz, vous vous engagez à :
- Fournir des informations exactes sur vos événements
- Respecter toutes les lois et réglementations applicables
- Honorer les billets vendus via la plateforme
- Gérer les remboursements conformément à votre politique annoncée
- Ne pas organiser d'événements illégaux ou contraires aux bonnes mœurs

EventEz se réserve le droit de retirer tout événement ne respectant pas ces conditions.`
    },
    {
      title: "6. Contenu utilisateur",
      content: `En publiant du contenu sur EventEz (commentaires, avis, photos), vous :
- Conservez vos droits de propriété intellectuelle
- Accordez à EventEz une licence non exclusive pour utiliser ce contenu
- Garantissez ne pas publier de contenu illégal, offensant ou trompeur

Nous nous réservons le droit de supprimer tout contenu inapproprié.`
    },
    {
      title: "7. Protection des données",
      content: `Nous prenons la protection de vos données au sérieux :
- Vos données personnelles sont traitées conformément au RGPD
- Nous ne vendons pas vos données à des tiers
- Vous pouvez demander l'accès, la modification ou la suppression de vos données
- Consultez notre Politique de Confidentialité pour plus de détails`
    },
    {
      title: "8. Limitation de responsabilité",
      content: `EventEz est fourni "tel quel" sans garantie d'aucune sorte. Nous ne sommes pas responsables :
- Des dommages résultant de l'utilisation de l'application
- De la qualité ou de la tenue des événements organisés par des tiers
- Des pertes de données ou interruptions de service
- Des litiges entre utilisateurs et organisateurs

Notre responsabilité totale ne peut excéder le montant que vous nous avez payé.`
    },
    {
      title: "9. Propriété intellectuelle",
      content: `L'application EventEz, son logo, et tout son contenu sont protégés par les droits de propriété intellectuelle. Vous n'êtes pas autorisé à :
- Copier, modifier ou distribuer l'application
- Utiliser nos marques sans autorisation
- Décompiler ou désassembler l'application`
    },
    {
      title: "10. Modifications des conditions",
      content: `Nous pouvons modifier ces conditions à tout moment. Les modifications prennent effet dès leur publication dans l'application. Votre utilisation continue de l'application après modification constitue votre acceptation des nouvelles conditions.`
    },
    {
      title: "11. Résiliation",
      content: `Nous pouvons suspendre ou résilier votre accès à EventEz si vous violez ces conditions. Vous pouvez supprimer votre compte à tout moment depuis les paramètres de l'application.`
    },
    {
      title: "12. Contact",
      content: `Pour toute question concernant ces conditions, contactez-nous :
- Email : support@eventez.com
- Adresse : Douala, Cameroun

Ces conditions sont régies par les lois camerounaises.`
    },
  ];

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>TOS</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.gray50 }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Conditions d'utilisation</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Introduction */}
        <View style={[styles.introCard, { backgroundColor: colors.gray50 }]}>
          <Ionicons name="document-text" size={32} color={colors.primary} />
          <Text style={[styles.introTitle, { color: colors.gray900 }]}>Conditions Générales d'Utilisation</Text>
          <Text style={[styles.introText, { color: colors.gray500 }]}>
            Dernière mise à jour : Janvier 2026
          </Text>
        </View>

        {/* Sections */}
        {sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>{section.title}</Text>
            <Text style={[styles.sectionContent, { color: colors.gray600 }]}>{section.content}</Text>
          </View>
        ))}

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5' }]}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          <Text style={[styles.footerText, { color: isDark ? colors.success : '#047857' }]}>
            En utilisant EventEz, vous acceptez ces conditions d'utilisation.
          </Text>
        </View>
      </ScrollView>
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.bold,
    color: Colors.gray900,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  introCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  introTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.bold,
    color: Colors.gray900,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  introText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.bold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  sectionContent: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  footerText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: '#047857',
  },
});
