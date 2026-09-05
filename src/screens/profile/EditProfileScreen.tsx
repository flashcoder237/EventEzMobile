import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import PhoneNumberInput from '../../components/common/PhoneNumberInput';
import SearchableSelectModal from '../../components/common/SearchableSelectModal';
import { COUNTRIES, Country, countryName, flagEmoji } from '../../constants/countries';
import { extractErrorMessage } from '../../lib/utils/errorHandling';
import { FormErrors } from '../../lib/validation';
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm';
import { usersAPI } from '../../api';
import { RootStackParamList } from '../../types';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import DatePickerField from '../../components/ui/DatePickerField';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SectionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const Section = ({ title, icon, children, defaultExpanded = false }: SectionProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.card, borderColor: hairline },
        Shadows.sm,
      ]}
    >
      <TouchableOpacity
        style={[styles.sectionHeader, expanded && { borderBottomColor: hairline, borderBottomWidth: 1 }]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIconContainer, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name={icon} size={18} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.gray400}
        />
      </TouchableOpacity>
      {expanded && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
};

export default function EditProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, syncUser } = useAuth();
  const { showSuccess, showError } = useAlert();
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const biometric = useBiometricConfirm();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const inputBg = isDark ? colors.gray100 : colors.gray50;

  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.date_of_birth || '');
  const [profileImage, setProfileImage] = useState<string | null>(
    user?.profile_picture || user?.image || null
  );

  // Champ s'appelle `billing_address` côté backend (modèle User), pas `address`.
  // Le state local garde le nom court pour la lisibilité du JSX.
  const [address, setAddress] = useState(user?.billing_address || '');
  const [city, setCity] = useState(user?.city || '');
  // Pas de default 'Cameroun' : on laisse vide pour ne pas imposer un pays à
  // un user venant de l'international ; le placeholder du champ guide la saisie.
  const [country, setCountry] = useState(user?.country || '');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');

  const [companyName, setCompanyName] = useState(user?.company_name || '');
  // Profil organisateur (website, description, logo) — parité web. Édité via
  // l'endpoint dédié /users/update_organizer_profile/ (nested read-only sur /me/).
  const orgProfile: any = (user as any)?.organizer_profile || {};
  const [orgWebsite, setOrgWebsite] = useState(orgProfile.website || '');
  const [orgDescription, setOrgDescription] = useState(orgProfile.description || '');
  const [orgLogo, setOrgLogo] = useState<string | null>(orgProfile.logo || null);
  // true quand orgLogo pointe vers un fichier local fraîchement choisi (à uploader).
  const [orgLogoChanged, setOrgLogoChanged] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Erreurs de validation client, affichées sous le champ fautif (un modal ne
  // peut pas pointer le champ concerné).
  const [passwordErrors, setPasswordErrors] = useState<
    FormErrors<'currentPassword' | 'newPassword' | 'confirmPassword'>
  >({});

  const hasProfileChanges =
    firstName !== (user?.first_name || '') ||
    lastName !== (user?.last_name || '') ||
    phone !== (user?.phone_number || '') ||
    dateOfBirth !== (user?.date_of_birth || '') ||
    address !== (user?.billing_address || '') ||
    city !== (user?.city || '') ||
    country !== (user?.country || '') ||
    bio !== (user?.bio || '') ||
    companyName !== (user?.company_name || '') ||
    orgWebsite !== (orgProfile.website || '') ||
    orgDescription !== (orgProfile.description || '') ||
    orgLogoChanged;

  const hasPasswordChanges = currentPassword && newPassword && confirmPassword;

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        showError(
          t('editProfile.permissionRequired'),
          "Veuillez autoriser l'accès à vos photos pour changer votre image de profil."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
        await handleUploadImage(result.assets[0].uri);
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur sélection image:', error);
      showError(t('common.error'), t('editProfile.imagePickError'));
    }
  };

  // Logo organisateur : on sélectionne un fichier local, envoyé au SAVE (pas
  // d'upload immédiat — c'est le multipart de update_organizer_profile).
  const handlePickOrgLogo = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showError(t('editProfile.permissionRequired'),
          "Veuillez autoriser l'accès à vos photos pour changer le logo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setOrgLogo(result.assets[0].uri);
        setOrgLogoChanged(true);
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur sélection logo:', error);
      showError(t('common.error'), t('editProfile.imagePickError'));
    }
  };

  const handleUploadImage = async (imageUri: string) => {
    try {
      let uploadUri = imageUri;
      if (imageUri.startsWith('content://')) {
        const ext = imageUri.split('.').pop()?.split('?')[0] || 'jpg';
        const cacheUri = `${FileSystem.cacheDirectory}profile_upload_${Date.now()}.${ext}`;
        await FileSystem.copyAsync({ from: imageUri, to: cacheUri });
        uploadUri = cacheUri;
      }

      // Resize + compress AVANT upload : photo galerie typique = 4000×3000 (~4 Mo)
      // pour un usage avatar à ≤96px. On normalise à 512px JPEG q=0.8 → ~50-80 Ko,
      // ce qui rend l'affichage instantané dans la navbar et le ProfileScreen
      // sans dégradation visible (l'avatar est cropped circulairement).
      // Lazy import : ImageManipulator n'est utilisé qu'ici, ne charge pas le bundle initial.
      try {
        const ImageManipulator = await import('expo-image-manipulator');
        const out = await ImageManipulator.manipulateAsync(
          uploadUri,
          [{ resize: { width: 512, height: 512 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        uploadUri = out.uri;
      } catch (compressError) {
        // Fail-safe : si la compression échoue (rare), on upload l'original
        // plutôt que de planter le flow. L'utilisateur préfère un upload lent
        // à un upload bloqué.
        if (__DEV__) console.warn('[EditProfile] compression failed, uploading original:', compressError);
      }

      const formData = new FormData();
      const filename = uploadUri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('profile_picture', {
        uri: uploadUri,
        name: filename,
        type,
      } as any);

      const response = await usersAPI.updateProfileImage(formData);
      if (response.data) {
        // syncUser : pas d'API re-call (le PATCH multipart vient juste de
        // succéder), on sync juste l'état local du contexte.
        syncUser(response.data);
      }
      showSuccess(t('editProfile.successLabel'), t('editProfile.photoUpdated'));
    } catch (error: any) {
      if (__DEV__) console.error('Erreur upload image:', error);
      setProfileImage(user?.profile_picture || user?.image || null);
      showError(t('common.error'), extractErrorMessage(error));
    }
  };

  const handleSaveProfile = async () => {
    if (!hasProfileChanges) return;

    setSaving(true);
    try {
      const updateData: Record<string, string> = {};

      if (firstName !== (user?.first_name || '')) updateData.first_name = firstName;
      if (lastName !== (user?.last_name || '')) updateData.last_name = lastName;
      if (phone !== (user?.phone_number || '')) updateData.phone_number = phone;
      if (dateOfBirth !== (user?.date_of_birth || '')) updateData.date_of_birth = dateOfBirth;
      if (address !== (user?.billing_address || '')) updateData.billing_address = address;
      if (city !== (user?.city || '')) updateData.city = city;
      if (country !== (user?.country || '')) updateData.country = country;
      if (bio !== (user?.bio || '')) updateData.bio = bio;
      if (companyName !== (user?.company_name || '')) updateData.company_name = companyName;

      // N'appeler /users/me/ que s'il y a des champs USER à mettre à jour
      // (sinon un PATCH vide est inutile — l'orga peut ne changer que son site).
      let response: any = null;
      if (Object.keys(updateData).length > 0) {
        response = await usersAPI.updateCurrentUser(updateData);
      }

      // Profil ORGANISATEUR (website/description/logo) — endpoint dédié multipart.
      const orgChanged =
        user?.role === 'organizer' && (
          orgWebsite !== (orgProfile.website || '') ||
          orgDescription !== (orgProfile.description || '') ||
          orgLogoChanged
        );
      if (orgChanged) {
        const fd = new FormData();
        fd.append('website', orgWebsite);
        fd.append('description', orgDescription);
        if (orgLogoChanged && orgLogo) {
          const ext = orgLogo.split('.').pop()?.split('?')[0] || 'jpg';
          fd.append('logo', {
            uri: orgLogo,
            name: `logo.${ext}`,
            type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          } as any);
        }
        const orgRes = await usersAPI.updateOrganizerProfile(fd);
        // Le backend renvoie le USER complet (UserSerializer) avec le
        // organizer_profile à jour → on resynchronise directement le contexte.
        if (orgRes?.data) {
          syncUser(orgRes.data);
        }
        setOrgLogoChanged(false);
      }

      // ⚠️ NE PAS appeler updateUser(response.data) ici : updateUser fait un
      // PATCH /users/me/ avec le payload reçu, qui contient profile_picture
      // sous forme de string URL — le serializer rejette ça avec
      // "La donnée soumise n'est pas un fichier" (400). On utilise syncUser
      // pour sync l'état du contexte sans re-PATCH.
      if (response?.data) syncUser(response.data);

      showSuccess(t('editProfile.successLabel'), t('editProfile.profileUpdated'));
    } catch (error: any) {
      if (__DEV__) console.error('Erreur mise à jour profil:', error);
      // extractErrorMessage gère les erreurs de CHAMP DRF ({"phone_number": [...]}),
      // pas seulement `detail` — sinon l'utilisateur voit un message générique.
      showError(t('common.error'), extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation client → erreurs inline sous le champ fautif.
    const nextErrors: FormErrors<'currentPassword' | 'newPassword' | 'confirmPassword'> = {};

    if (!currentPassword) nextErrors.currentPassword = t('editProfile.fillAllFields');
    if (!newPassword) nextErrors.newPassword = t('editProfile.fillAllFields');
    if (!confirmPassword) nextErrors.confirmPassword = t('editProfile.fillAllFields');

    if (!nextErrors.newPassword && newPassword.length < 8) {
      nextErrors.newPassword = t('editProfile.passwordMinLength');
    }
    if (!nextErrors.confirmPassword && newPassword !== confirmPassword) {
      nextErrors.confirmPassword = t('editProfile.passwordsNotMatching');
    }

    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Confirmation biométrique catégorie 'account' avant change password.
    const confirmed = await biometric.confirm({
      promptMessage: t('editProfile.biometricPasswordChange'),
      category: 'account',
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      await usersAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      showSuccess(t('editProfile.successLabel'), t('editProfile.passwordChangedDetail'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    } catch (error: any) {
      if (__DEV__) console.error('Erreur changement mot de passe:', error);
      showError(t('common.error'), extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    const first = firstName || user?.first_name || '';
    const last = lastName || user?.last_name || '';
    if (first && last) {
      return `${first[0]}${last[0]}`.toUpperCase();
    }
    return (user?.email?.[0] || 'U').toUpperCase();
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: inputBg, color: colors.text, borderColor: hairline },
  ];

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>ME</WatermarkNumeral>
      {/* === EDITORIAL HEADER (tile) === */}
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
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray600} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerEyebrow, { color: colors.accent }]}>TON IDENTITÉ • PROFIL</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('editProfile.editProfileTitle')}</Text>
          </View>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={80}
      >
        <View style={styles.formInner}>
        {/* Profile Image */}
        <View style={styles.imageSection}>
          <TouchableOpacity style={styles.imageContainer} onPress={handlePickImage} activeOpacity={0.85}>
            {profileImage ? (
              <Image
                source={profileImage}
                style={[styles.profileImage, { borderColor: colors.card }]}
                cachePolicy="memory-disk"
                transition={200}
              />
            ) : (
              <View
                style={[
                  styles.initialsContainer,
                  { backgroundColor: `${colors.primary}15`, borderColor: colors.card },
                ]}
              >
                <Text style={[styles.initials, { color: colors.primary }]}>{getInitials()}</Text>
              </View>
            )}
            <View
              style={[
                styles.editBadge,
                { backgroundColor: colors.primary, borderColor: colors.background },
              ]}
            >
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.changePhotoText, { color: colors.primary }]}>{t('editProfile.changePhoto')}</Text>
          <Text style={[styles.emailText, { color: colors.gray500 }]}>{user?.email}</Text>
        </View>

        {/* Informations personnelles */}
        <Section title={t('editProfile.sectionPersonalInfo')} icon="person-outline" defaultExpanded={true}>
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, styles.inputHalf]}>
              <Text style={[styles.label, { color: colors.gray500 }]}>{t('editProfile.firstNameLabel')}</Text>
              <TextInput
                style={inputStyle}
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t('editProfile.firstNameLabel')}
                placeholderTextColor={colors.gray400}
                autoCapitalize="words"
              />
            </View>
            <View style={[styles.inputGroup, styles.inputHalf]}>
              <Text style={[styles.label, { color: colors.gray500 }]}>Nom</Text>
              <TextInput
                style={inputStyle}
                value={lastName}
                onChangeText={setLastName}
                placeholder={t('editProfile.lastNameLabel')}
                placeholderTextColor={colors.gray400}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.gray500 }]}>{t('editProfile.phoneLabel')}</Text>
            {/* Verrouille le champ si l'utilisateur a deja un numero enregistre.
                Pour le modifier ensuite, il doit passer par le support
                (anti-fraude + KYC — un numero validable par OTP). */}
            <PhoneNumberInput
              value={phone}
              onChangeValue={setPhone}
              disabled={!!user?.phone_number}
            />
            <Text style={[styles.fieldHint, { color: colors.gray500 }]}>
              {user?.phone_number
                ? 'Numéro verrouillé — contactez le support pour le modifier.'
                : 'Attention : une fois enregistré, ce numéro ne pourra plus être modifié sans contacter le support.'}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            {/* Vrai sélecteur de date (avant : TextInput texte libre « AAAA-MM-JJ »
                à taper à la main, icône décorative non cliquable). On garde l'état
                string YYYY-MM-DD attendu par le backend, converti ici. */}
            <DatePickerField
              label={t('editProfile.dobLabel')}
              value={dateOfBirth ? new Date(dateOfBirth) : undefined}
              maximumDate={new Date()}
              placeholder={t('editProfile.dobPlaceholder')}
              onChange={(d) => {
                // Format YYYY-MM-DD sans décalage de fuseau (toISOString() peut
                // basculer d'un jour selon l'heure locale).
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                setDateOfBirth(`${y}-${m}-${day}`);
              }}
            />
          </View>
        </Section>

        {/* Adresse */}
        <Section title={t('editProfile.sectionAddress')} icon="location-outline">
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.gray500 }]}>{t('editProfile.addressLabel')}</Text>
            <TextInput
              style={inputStyle}
              value={address}
              onChangeText={setAddress}
              placeholder={t('editProfile.addressPlaceholder')}
              placeholderTextColor={colors.gray400}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, styles.inputHalf]}>
              <Text style={[styles.label, { color: colors.gray500 }]}>{t('editProfile.cityLabel')}</Text>
              <TextInput
                style={inputStyle}
                value={city}
                onChangeText={setCity}
                placeholder={t('editProfile.cityLabel')}
                placeholderTextColor={colors.gray400}
              />
            </View>
            <View style={[styles.inputGroup, styles.inputHalf]}>
              <Text style={[styles.label, { color: colors.gray500 }]}>
                {t('editProfile.countryLabel')}
              </Text>
              {/* Sélecteur (et non saisie libre) : le pays alimente des
                  résolutions côté backend (devise, disponibilité). En texte
                  libre, un « France » saisi à la main ou un endonyme
                  (« Deutschland ») ne matchait pas la liste de référence. */}
              <TouchableOpacity
                style={[inputStyle, styles.selectTrigger]}
                onPress={() => setCountryPickerOpen(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('editProfile.countryLabel')}
                accessibilityValue={{ text: country || t('editProfile.countryPlaceholder') }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: FontFamily.medium,
                    color: country ? colors.text : colors.gray400,
                  }}
                >
                  {country || t('editProfile.countryPlaceholder')}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.gray400} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.gray500 }]}>{t('editProfile.bioLabel')}</Text>
            <TextInput
              style={[inputStyle, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder={t('editProfile.bioPlaceholderLong')}
              placeholderTextColor={colors.gray400}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </Section>

        {/* Organisation */}
        {user?.role === 'organizer' && (
          <Section title={t('editProfile.sectionOrganization')} icon="business-outline">
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.gray500 }]}>{t('editProfile.companyNameLabel')}</Text>
              <TextInput
                style={inputStyle}
                value={companyName}
                onChangeText={setCompanyName}
                placeholder={t('editProfile.companyNamePlaceholder')}
                placeholderTextColor={colors.gray400}
              />
            </View>

            {/* Logo organisateur */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.gray500 }]}>{t('editProfile.orgLogoLabel', { defaultValue: 'Logo' })}</Text>
              <TouchableOpacity
                onPress={handlePickOrgLogo}
                activeOpacity={0.85}
                style={[styles.orgLogoRow, { borderColor: colors.gray200, backgroundColor: colors.gray50 }]}
              >
                {orgLogo ? (
                  <Image source={orgLogo} style={styles.orgLogoImage} cachePolicy="memory-disk" transition={200} />
                ) : (
                  <View style={[styles.orgLogoPlaceholder, { backgroundColor: `${colors.primary}15` }]}>
                    <Ionicons name="image-outline" size={22} color={colors.primary} />
                  </View>
                )}
                <Text style={[styles.orgLogoHint, { color: colors.primary }]}>
                  {orgLogo ? t('editProfile.orgLogoChange', { defaultValue: 'Changer le logo' }) : t('editProfile.orgLogoAdd', { defaultValue: 'Ajouter un logo' })}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Site web */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.gray500 }]}>{t('editProfile.orgWebsiteLabel', { defaultValue: 'Site web' })}</Text>
              <TextInput
                style={inputStyle}
                value={orgWebsite}
                onChangeText={setOrgWebsite}
                placeholder="https://…"
                placeholderTextColor={colors.gray400}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            {/* Description publique */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.gray500 }]}>{t('editProfile.orgDescriptionLabel', { defaultValue: 'Description publique' })}</Text>
              <TextInput
                style={[inputStyle, styles.orgDescriptionInput]}
                value={orgDescription}
                onChangeText={setOrgDescription}
                placeholder={t('editProfile.orgDescriptionPlaceholder', { defaultValue: 'Présentez votre organisation…' })}
                placeholderTextColor={colors.gray400}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </Section>
        )}

        {/* Sécurité */}
        <Section title={t('editProfile.sectionSecurity')} icon="lock-closed-outline">
          <View style={[styles.passwordNotice, { backgroundColor: `${colors.primary}10` }]}>
            <Ionicons name="information-circle" size={16} color={colors.primary} />
            <Text style={[styles.passwordNoticeText, { color: colors.primary }]}>
              Remplissez ces champs uniquement pour changer votre mot de passe
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.gray500 }]}>{t('editProfile.currentPasswordLabel')}</Text>
            <View style={styles.passwordInput}>
              <TextInput
                style={[
                  inputStyle,
                  styles.passwordInputField,
                  passwordErrors.currentPassword && { borderColor: colors.error },
                ]}
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  if (passwordErrors.currentPassword) {
                    setPasswordErrors((prev) => ({ ...prev, currentPassword: undefined }));
                  }
                }}
                placeholder="••••••••"
                placeholderTextColor={colors.gray400}
                secureTextEntry={!showCurrentPassword}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                accessibilityRole="button"
                accessibilityLabel={showCurrentPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                <Ionicons
                  name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.gray400}
                />
              </TouchableOpacity>
            </View>
            {passwordErrors.currentPassword && (
              <Text style={[styles.helpText, { color: colors.error }]}>
                {passwordErrors.currentPassword}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.gray500 }]}>{t('editProfile.newPasswordLabel')}</Text>
            <View style={styles.passwordInput}>
              <TextInput
                style={[
                  inputStyle,
                  styles.passwordInputField,
                  passwordErrors.newPassword && { borderColor: colors.error },
                ]}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (passwordErrors.newPassword) {
                    setPasswordErrors((prev) => ({ ...prev, newPassword: undefined }));
                  }
                }}
                placeholder="••••••••"
                placeholderTextColor={colors.gray400}
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowNewPassword(!showNewPassword)}
                accessibilityRole="button"
                accessibilityLabel={showNewPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.gray400}
                />
              </TouchableOpacity>
            </View>
            {/* L'erreur remplace l'indice statique — deux lignes d'aide
                empilées sous le champ brouilleraient le message. */}
            {passwordErrors.newPassword ? (
              <Text style={[styles.helpText, { color: colors.error }]}>
                {passwordErrors.newPassword}
              </Text>
            ) : (
              <Text style={[styles.helpText, { color: colors.gray500 }]}>
                Minimum 8 caractères avec lettres, chiffres et symboles
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.gray500 }]}>{t('editProfile.confirmPasswordLabel')}</Text>
            <View style={styles.passwordInput}>
              <TextInput
                style={[
                  inputStyle,
                  styles.passwordInputField,
                  passwordErrors.confirmPassword && { borderColor: colors.error },
                ]}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (passwordErrors.confirmPassword) {
                    setPasswordErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                placeholder="••••••••"
                placeholderTextColor={colors.gray400}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.gray400}
                />
              </TouchableOpacity>
            </View>
            {passwordErrors.confirmPassword && (
              <Text style={[styles.helpText, { color: colors.error }]}>
                {passwordErrors.confirmPassword}
              </Text>
            )}
          </View>

          {hasPasswordChanges && (
            <TouchableOpacity
              style={[
                styles.changePasswordButton,
                { backgroundColor: inputBg, borderColor: hairline },
              ]}
              onPress={handleChangePassword}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={[styles.changePasswordButtonText, { color: colors.text }]}>
                Changer le mot de passe
              </Text>
            </TouchableOpacity>
          )}
        </Section>

        <View style={styles.bottomButton}>
          <TouchableOpacity
            style={[
              styles.savePill,
              (!hasProfileChanges || saving) && { opacity: 0.5 },
              Shadows.buttonPrimary,
            ]}
            onPress={handleSaveProfile}
            disabled={!hasProfileChanges || saving}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.savePillEyebrow}>{t('editProfile.saveEyebrow')}</Text>
              <Text style={styles.savePillLabel}>
                {saving ? t('editProfile.saving') : t('editProfile.saveButton')}
              </Text>
            </View>
            <View style={styles.savePillArrow}>
              <Ionicons name="checkmark" size={18} color={Colors.white} />
            </View>
          </TouchableOpacity>
        </View>
        </View>
      </KeyboardAwareScrollView>

      <SearchableSelectModal<Country>
        visible={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        title={t('editProfile.countryLabel')}
        items={COUNTRIES}
        getKey={(c) => c.code}
        getLabel={(c) => `${flagEmoji(c.code)}  ${countryName(c, i18n.language)}`}
        selectedKey={
          COUNTRIES.find(
            (c) =>
              countryName(c, i18n.language) === country ||
              c.name === country ||
              c.nameEn === country,
          )?.code ?? null
        }
        onSelect={(c) => {
          setCountry(countryName(c, i18n.language));
          setCountryPickerOpen(false);
        }}
        onClear={() => {
          setCountry('');
          setCountryPickerOpen(false);
        }}
      />

      {saving && <LoadingSpinner />}
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  headerEyebrow: {
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

  // === SAVE PILL ===
  savePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    minHeight: 56,
  },
  savePillEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  savePillLabel: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  savePillArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginLeft: Spacing.sm,
  },

  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Spacing['3xl'], alignItems: 'center' },
  formInner: { ...centeredContent(CARD_MAX) },
  imageSection: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  imageContainer: { position: 'relative' },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
  },
  initialsContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  initials: {
    fontFamily: FontFamily.displayBold,
    fontSize: 32,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  changePhotoText: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
  emailText: {
    marginTop: 2,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
  },
  section: {
    marginTop: Spacing.md,
    marginHorizontal: Spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 16,
    letterSpacing: -0.4,
  },
  sectionContent: { padding: Spacing.md },
  inputRow: { flexDirection: 'row', gap: Spacing.sm },
  inputGroup: { marginBottom: Spacing.md },
  orgLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  orgLogoImage: { width: 48, height: 48, borderRadius: BorderRadius.md },
  orgLogoPlaceholder: {
    width: 48, height: 48, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  orgLogoHint: { fontSize: FontSizes.sm, fontFamily: FontFamily.semiBold },
  orgDescriptionInput: { minHeight: 96, paddingTop: Spacing.sm },
  inputHalf: { flex: 1 },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  fieldHint: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 6,
  },
  input: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    height: 50,
  },
  inputWithIcon: { position: 'relative' },
  inputIcon: {
    position: 'absolute',
    left: Spacing.md,
    top: '50%',
    transform: [{ translateY: -9 }],
    zIndex: 1,
  },
  inputWithIconPadding: { paddingLeft: Spacing.md + 26 },
  // height:undefined ANNULE le height:50 fixe de `input` (sinon la bio multiligne
  // est rognée à une seule ligne) — laisse minHeight + le contenu piloter la hauteur.
  textArea: { height: undefined, minHeight: 100, paddingTop: Spacing.md },
  helpText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    lineHeight: 16,
    marginTop: Spacing.xs,
  },
  passwordNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  passwordNoticeText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    lineHeight: 18,
  },
  passwordInput: { position: 'relative' },
  passwordInputField: { paddingRight: 50 },
  passwordToggle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePasswordButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  changePasswordButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
  bottomButton: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
});
