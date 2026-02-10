import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { usersAPI } from '../../api/client';
import { RootStackParamList } from '../../types';
import GradientButton from '../../components/ui/GradientButton';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
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

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionIconContainer}>
            <Ionicons name={icon} size={20} color={Colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.gray400}
        />
      </TouchableOpacity>
      {expanded && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
};

export default function EditProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, updateUser } = useAuth();
  const { showSuccess, showError } = useAlert();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Informations personnelles
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.date_of_birth || '');
  const [profileImage, setProfileImage] = useState<string | null>(
    user?.profile_picture || user?.image || null
  );

  // Adresse
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || '');
  const [country, setCountry] = useState(user?.country || 'Cameroun');
  const [bio, setBio] = useState(user?.bio || '');

  // Organisateur
  const [companyName, setCompanyName] = useState(user?.company_name || '');

  // Mot de passe
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
          'Veuillez autoriser l\'accès à vos photos pour changer votre image de profil.'
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
        // Upload image
        await handleUploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      showError('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const handleUploadImage = async (imageUri: string) => {
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('profile_picture', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const response = await usersAPI.updateProfileImage(formData);
      if (response.data) {
        updateUser(response.data);
      }
    } catch (error) {
      console.error('Erreur upload image:', error);
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
      console.error('Erreur mise à jour profil:', error);
      showError(
        'Erreur',
        error.response?.data?.detail || 'Impossible de mettre à jour le profil'
      );
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
      console.error('Erreur changement mot de passe:', error);
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={80}
      >
          {/* Profile Image Header */}
          <View style={styles.imageSection}>
            <TouchableOpacity
              style={styles.imageContainer}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.initialsContainer}>
                  <Text style={styles.initials}>{getInitials()}</Text>
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={16} color={Colors.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Changer la photo</Text>
            <Text style={styles.emailText}>{user?.email}</Text>
          </View>

          {/* Informations personnelles */}
          <Section title="Informations personnelles" icon="person-outline" defaultExpanded={true}>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Prénom</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Prénom"
                  placeholderTextColor={Colors.gray400}
                  autoCapitalize="words"
                />
              </View>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Nom</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Nom"
                  placeholderTextColor={Colors.gray400}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="call-outline" size={18} color={Colors.gray400} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputWithIconPadding]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+237 6XX XXX XXX"
                  placeholderTextColor={Colors.gray400}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date de naissance</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="calendar-outline" size={18} color={Colors.gray400} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputWithIconPadding]}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={Colors.gray400}
                />
              </View>
            </View>
          </Section>

          {/* Adresse */}
          <Section title="Adresse" icon="location-outline">
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Votre adresse"
                placeholderTextColor={Colors.gray400}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Ville</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Ville"
                  placeholderTextColor={Colors.gray400}
                />
              </View>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Pays</Text>
                <TextInput
                  style={styles.input}
                  value={country}
                  onChangeText={setCountry}
                  placeholder="Pays"
                  placeholderTextColor={Colors.gray400}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Biographie</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Parlez-nous un peu de vous..."
                placeholderTextColor={Colors.gray400}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </Section>

          {/* Organisateur */}
          {user?.role === 'organizer' && (
            <Section title="Organisation" icon="business-outline">
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nom de l'entreprise</Text>
                <TextInput
                  style={styles.input}
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder="Nom de votre entreprise"
                  placeholderTextColor={Colors.gray400}
                />
              </View>
            </Section>
          )}

          {/* Sécurité - Mot de passe */}
          <Section title="Sécurité" icon="lock-closed-outline">
            <View style={styles.passwordNotice}>
              <Ionicons name="information-circle" size={18} color={Colors.primary} />
              <Text style={styles.passwordNoticeText}>
                Remplissez ces champs uniquement si vous souhaitez changer votre mot de passe
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe actuel</Text>
              <View style={styles.passwordInput}>
                <TextInput
                  style={[styles.input, styles.passwordInputField]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.gray400}
                  secureTextEntry={!showCurrentPassword}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <Ionicons
                    name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.gray400}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nouveau mot de passe</Text>
              <View style={styles.passwordInput}>
                <TextInput
                  style={[styles.input, styles.passwordInputField]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.gray400}
                  secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Ionicons
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.gray400}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.helpText}>
                Minimum 8 caractères avec lettres, chiffres et symboles
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <View style={styles.passwordInput}>
                <TextInput
                  style={[styles.input, styles.passwordInputField]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.gray400}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.gray400}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {hasPasswordChanges && (
              <TouchableOpacity
                style={styles.changePasswordButton}
                onPress={handleChangePassword}
                disabled={saving}
              >
                <Text style={styles.changePasswordButtonText}>
                  Changer le mot de passe
                </Text>
              </TouchableOpacity>
            )}
          </Section>

          {/* Save Button */}
          <View style={styles.bottomButton}>
            <GradientButton
              title={saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              onPress={handleSaveProfile}
              disabled={!hasProfileChanges || saving}
              fullWidth
              icon={<Ionicons name="checkmark" size={20} color={Colors.white} />}
            />
          </View>
      </KeyboardAwareScrollView>

      {saving && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['3xl'],
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  initialsContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray200,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  initials: {
    fontFamily: FontFamily.displayBold,
    fontSize: 36,
    color: Colors.gray600,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  changePhotoText: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  emailText: {
    marginTop: Spacing.xs,
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },

  // Sections
  section: {
    marginTop: Spacing.md,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray100,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  sectionTitle: {
    ...TextStyles.bodyBold,
  },
  sectionContent: {
    padding: Spacing.md,
  },

  // Inputs
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputHalf: {
    flex: 1,
  },
  label: {
    ...TextStyles.label,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.gray900,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: Spacing.md,
    top: '50%',
    transform: [{ translateY: -9 }],
    zIndex: 1,
  },
  inputWithIconPadding: {
    paddingLeft: Spacing.md + 26,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.md,
  },
  helpText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginTop: Spacing.xs,
  },

  // Password
  passwordNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  passwordNoticeText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  passwordInput: {
    position: 'relative',
  },
  passwordInputField: {
    paddingRight: 50,
  },
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
    backgroundColor: Colors.gray100,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  changePasswordButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.gray700,
  },

  // Bottom
  bottomButton: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
