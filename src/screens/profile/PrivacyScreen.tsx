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

export default function PrivacyScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const sections = [
    {
      title: "1. Introduction",
      content: `La presente Politique de Confidentialite decrit comment EventEz (\"nous\", \"notre\") collecte, utilise, stocke et protege vos donnees personnelles lorsque vous utilisez notre application mobile et nos services.

Nous nous engageons a respecter votre vie privee et a proteger vos donnees conformement au Reglement General sur la Protection des Donnees (RGPD) et aux lois camerounaises en vigueur.`
    },
    {
      title: "2. Donnees collectees",
      content: `Nous collectons les categories de donnees suivantes :

Donnees d'identification :
- Nom, prenom, adresse email
- Numero de telephone
- Photo de profil (optionnel)

Donnees de compte :
- Identifiants de connexion
- Preferences et parametres
- Historique d'activite

Donnees transactionnelles :
- Historique des achats de billets
- Informations de paiement (traitees par nos partenaires securises)
- Factures et reçus

Donnees de localisation :
- Position geographique (avec votre consentement)
- Ville et pays de residence

Donnees techniques :
- Type d'appareil et systeme d'exploitation
- Adresse IP
- Logs d'utilisation`
    },
    {
      title: "3. Finalites du traitement",
      content: `Vos donnees sont utilisees pour :

- Gerer votre compte et votre authentification
- Permettre l'inscription et l'achat de billets pour des evenements
- Traiter les paiements de maniere securisee
- Envoyer des notifications relatives a vos evenements
- Ameliorer nos services et l'experience utilisateur
- Assurer la securite de la plateforme
- Respecter nos obligations legales
- Communiquer avec vous concernant le service`
    },
    {
      title: "4. Base legale du traitement",
      content: `Le traitement de vos donnees repose sur :

- L'execution du contrat : necessaire pour fournir nos services
- Votre consentement : pour les notifications marketing et la localisation
- L'interet legitime : amelioration du service, securite, prevention de la fraude
- L'obligation legale : conservation des donnees de facturation`
    },
    {
      title: "5. Partage des donnees",
      content: `Nous pouvons partager vos donnees avec :

- Les organisateurs d'evenements : nom et email pour les inscriptions
- Nos prestataires de paiement : NotchPay, pour le traitement securise des transactions
- Nos hebergeurs et prestataires techniques : pour le fonctionnement de la plateforme

Nous ne vendons jamais vos donnees personnelles a des tiers. Tout partage est encadre par des accords de confidentialite stricts.`
    },
    {
      title: "6. Securite des donnees",
      content: `Nous mettons en oeuvre des mesures de securite appropriees :

- Chiffrement des donnees en transit (HTTPS/TLS)
- Stockage securise des mots de passe (hachage)
- Tokens d'authentification JWT avec expiration
- Journalisation des acces et audit trail
- Sauvegardes regulieres et chiffrees
- Controle d'acces base sur les roles`
    },
    {
      title: "7. Conservation des donnees",
      content: `Vos donnees sont conservees :

- Donnees de compte : pendant la duree de votre inscription et 3 ans apres la suppression
- Donnees transactionnelles : 10 ans (obligations legales de facturation)
- Logs techniques : 12 mois
- Donnees de localisation : non conservees au-dela de la session

Vous pouvez demander la suppression de votre compte a tout moment depuis les parametres de l'application.`
    },
    {
      title: "8. Vos droits",
      content: `Conformement au RGPD, vous disposez des droits suivants :

- Droit d'acces : obtenir une copie de vos donnees
- Droit de rectification : corriger vos donnees inexactes
- Droit a l'effacement : demander la suppression de vos donnees
- Droit a la portabilite : recevoir vos donnees dans un format standard
- Droit d'opposition : vous opposer a certains traitements
- Droit a la limitation : restreindre le traitement de vos donnees
- Droit de retrait du consentement : a tout moment

Pour exercer ces droits, contactez-nous a : privacy@eventez.com`
    },
    {
      title: "9. Cookies et traceurs",
      content: `Notre application mobile utilise des technologies de stockage local (AsyncStorage, SecureStore) pour :

- Maintenir votre session de connexion
- Sauvegarder vos preferences
- Ameliorer les performances de l'application

Ces donnees sont stockees localement sur votre appareil et ne sont pas partagees avec des tiers.`
    },
    {
      title: "10. Transferts internationaux",
      content: `Vos donnees peuvent etre traitees sur des serveurs situes en dehors du Cameroun. Dans ce cas, nous nous assurons que des garanties appropriees sont en place, conformement au RGPD (clauses contractuelles types, adequation).`
    },
    {
      title: "11. Mineurs",
      content: `Notre service n'est pas destine aux personnes de moins de 16 ans. Nous ne collectons pas sciemment de donnees concernant des mineurs. Si nous decouvrons qu'un mineur nous a fourni des donnees personnelles, nous les supprimerons immediatement.`
    },
    {
      title: "12. Modifications",
      content: `Nous pouvons mettre a jour cette Politique de Confidentialite periodiquement. Nous vous informerons de tout changement significatif par notification dans l'application. La date de derniere mise a jour sera toujours indiquee.`
    },
    {
      title: "13. Contact",
      content: `Pour toute question relative a vos donnees personnelles :

- Email : privacy@eventez.com
- Adresse : Douala, Cameroun

Vous avez egalement le droit d'introduire une reclamation aupres de l'autorite de controle competente.`
    },
  ];

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>GDPR</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.gray50 }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Politique de confidentialite</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Introduction */}
        <View style={[styles.introCard, { backgroundColor: colors.gray50 }]}>
          <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
          <Text style={styles.introTitle}>Politique de Confidentialite</Text>
          <Text style={styles.introText}>
            Derniere mise a jour : Janvier 2026
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
        <View style={[styles.footer, { backgroundColor: colors.primaryBg }]}>
          <Ionicons name="lock-closed" size={24} color={colors.primary} />
          <Text style={styles.footerText}>
            Vos donnees sont protegees. Nous prenons votre vie privee au serieux.
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
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
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  footerText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
  },
});
