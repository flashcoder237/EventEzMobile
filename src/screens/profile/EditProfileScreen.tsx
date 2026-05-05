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
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm';
import { usersAPI } from '../../api';
import { RootStackParamList } from '../../types';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

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
  const { user, updateUser, setUser } = useAuth();
  const { showSuccess, showError } = useAlert();
  const { colors, isDark } = useTheme();
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

  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || '');
  const [country, setCountry] = useState(user?.country || 'Cameroun');
  const [bio, setBio] = useState(user?.bio || '');

  const [companyName, setCompanyName] = useState(user?.company_name || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hasProfileChanges =
    firstName !== (user?.first_name || '') ||
    lastName !== (user?.last_name || '') ||
    phone !== (user?.phone_number || '') ||
    dateOfBirth !== (user?.date_of_birth || '') ||
    address !== (user?.address || '') ||
    city !== (user?.city || '') ||
    country !== (user?.country || 'Cameroun') ||
    bio !== (user?.bio || '') ||
    companyName !== (user?.company_name || '');

  const hasPasswordChanges = currentPassword && newPassword && confirmPassword;

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        showError(
          'Permission requise',
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
      showError('Erreur', "Impossible de sélectionner l'image");
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
        await setUser(response.data);
      }
      showSuccess('Succès', 'Photo de profil mise à jour');
    } catch (error: any) {
      if (__DEV__) console.error('Erreur upload image:', error);
      setProfileImage(user?.profile_picture || user?.image || null);
      const detail = error.response?.data?.detail || error.message || '';
      showError('Erreur', `Impossible de mettre à jour la photo de profil. ${detail}`);
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
      if (address !== (user?.address || '')) updateData.address = address;
      if (city !== (user?.city || '')) updateData.city = city;
      if (country !== (user?.country || 'Cameroun')) updateData.country = country;
      if (bio !== (user?.bio || '')) updateData.bio = bio;
      if (companyName !== (user?.company_name || '')) updateData.company_name = companyName;

      const response = await usersAPI.updateCurrentUser(updateData);
      updateUser(response.data);

      showSuccess('Succès', 'Votre profil a été mis à jour');
    } catch (error: any) {
      if (__DEV__) console.error('Erreur mise à jour profil:', error);
      showError('Erreur', error.response?.data?.detail || 'Impossible de mettre à jour le profil');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showError('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 8) {
      showError('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    // Confirmation biométrique catégorie 'account' avant change password.
    const confirmed = await biometric.confirm({
      promptMessage: 'Confirmer le changement de mot de passe',
      category: 'account',
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      await usersAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      showSuccess('Succès', 'Votre mot de passe a été modifié');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      if (__DEV__) console.error('Erreur changement mot de passe:', error);
      showError(
        'Erreur',
        error.response?.data?.detail || 'Impossible de changer le mot de passe'
      );
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
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray600} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerEyebrow, { color: colors.accent }]}>TON IDENTITÉ • PROFIL</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Modifier profil</Text>
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
          <Text style={[styles.changePhotoText, { color: colors.primary }]}>Changer la photo</Text>
          <Text style={[styles.emailText, { color: colors.gray500 }]}>{user?.email}</Text>
        </View>

        {/* Informations personnelles */}
        <Section title="Informations personnelles" icon="person-outline" defaultExpanded={true}>
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, styles.inputHalf]}>
              <Text style={[styles.label, { color: colors.gray500 }]}>Prénom</Text>
              <TextInput
                style={inputStyle}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Prénom"
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
                placeholder="Nom"
                placeholderTextColor={colors.gray400}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.gray500 }]}>Téléphone</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="call-outline" size={18} color={colors.gray400} style={styles.inputIcon} />
              <TextInput
                style={[inputStyle, styles.inputWithIconPadding]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+237 6XX XXX XXX"
                placeholderTextColor={colors.gray400}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.gray500 }]}>Date de naissance</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="calendar-outline" size={18} color={colors.gray400} style={styles.inputIcon} />
              <TextInput
                style={[inputStyle, styles.inputWithIconPadding]}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={colors.gray400}
              />
            </View>
          </View>
        </Section>

        {/* Adresse */}
        <Section title="Adresse" icon="location-outline">
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.gray500 }]}>Adresse</Text>
            <TextInput
              style={inputStyle}
              value={address}
              onChangeText={setAddress}
              placeholder="Votre adresse"
              placeholderTextColor={colors.gray400}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, styles.inputHalf]}>
              <Text style={[styles.label, { color: colors.gray500 }]}>Ville</Text>
              <TextInput
                style={inputStyle}
                value={city}
                onChangeText={setCity}
                placeholder="Ville"
                placeholderTextColor={colors.gray400}
              />
            </View>
            <View style={[styles.inputGroup, styles.inputHalf]}>
              <Text style={[styles.label, { color: colors.gray500 }]}>Pays</Text>
              <TextInput
                style={inputStyle}
                value={country}
                onChangeText={setCountry}
                placeholder="Pays"
                placeholderTextColor={colors.gray400}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.gray500 }]}>Biographie</Text>
            <TextInput
              style={[inputStyle, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Parlez-nous un peu de vous..."
              placeholderTextColor={colors.gray400}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </Section>

        {/* Organisation */}
        {user?.role === 'organizer' && (
          <Section title="Organisation" icon="business-outline">
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.gray500 }]}>Nom de l'entreprise</Text>
              <TextInput
                style={inputStyle}
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Nom de votre entreprise"
                placeholderTextColor={colors.gray400}
              />
            </View>
          </Section>
        )}

        {/* Sécurité */}
        <Section title="Sécurité" icon="lock-closed-outline">
          <View style={[styles.passwordNotice, { backgroundColor: `${colors.primary}10` }]}>
            <Ionicons name="information-circle" size={16} color={colors.primary} />
            <Text style={[styles.passwordNoticeText, { color: colors.primary }]}>
              Remplissez ces champs uniquement pour changer votre mot de passe
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.gray500 }]}>Mot de passe actuel</Text>
            <View style={styles.passwordInput}>
              <TextInput
                style={[inputStyle, styles.passwordInputField]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.gray400}
                secureTextEntry={!showCurrentPassword}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Ionicons
                  name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.gray400}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.gray500 }]}>Nouveau mot de passe</Text>
            <View style={styles.passwordInput}>
              <TextInput
                style={[inputStyle, styles.passwordInputField]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.gray400}
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.gray400}
                />
              </TouchableOpacity>
            </View>
            <Text style={[styles.helpText, { color: colors.gray500 }]}>
              Minimum 8 caractères avec lettres, chiffres et symboles
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.gray500 }]}>Confirmer le mot de passe</Text>
            <View style={styles.passwordInput}>
              <TextInput
                style={[inputStyle, styles.passwordInputField]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.gray400}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.gray400}
                />
              </TouchableOpacity>
            </View>
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
              <Text style={styles.savePillEyebrow}>SAUVEGARDE</Text>
              <Text style={styles.savePillLabel}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Text>
            </View>
            <View style={styles.savePillArrow}>
              <Ionicons name="checkmark" size={18} color={Colors.white} />
            </View>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

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
  scrollContent: { paddingBottom: Spacing['3xl'] },
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
  inputHalf: { flex: 1 },
  label: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
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
  textArea: { minHeight: 100, paddingTop: Spacing.md },
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
