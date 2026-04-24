import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { usersAPI } from '../../api';
import { RootStackParamList } from '../../types';
import GradientButton from '../../components/ui/GradientButton';
import {
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>TON PROFIL</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Modifier</Text>
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
                cachePolicy="disk"
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
          <GradientButton
            title={saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            onPress={handleSaveProfile}
            disabled={!hasProfileChanges || saving}
            fullWidth
            icon={<Ionicons name="checkmark" size={20} color="#FFFFFF" />}
          />
        </View>
      </KeyboardAwareScrollView>

      {saving && <LoadingSpinner />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  iconDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
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
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
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
    borderRadius: BorderRadius.xl,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.md,
    letterSpacing: -0.2,
  },
  sectionContent: { padding: Spacing.md },
  inputRow: { flexDirection: 'row', gap: Spacing.sm },
  inputGroup: { marginBottom: Spacing.md },
  inputHalf: { flex: 1 },
  label: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  input: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
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
