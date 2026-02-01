import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../contexts/AuthContext';
import { usersAPI } from '../../api/client';
import { RootStackParamList } from '../../types';
import GradientButton from '../../components/ui/GradientButton';
import {
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function EditProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, updateUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [companyName, setCompanyName] = useState(user?.company_name || '');
  const [profileImage, setProfileImage] = useState<string | null>(
    user?.profile_picture || user?.image || null
  );

  const hasChanges =
    firstName !== (user?.first_name || '') ||
    lastName !== (user?.last_name || '') ||
    phone !== (user?.phone_number || '') ||
    companyName !== (user?.company_name || '');

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSave}
          disabled={!hasChanges || loading}
        >
          <Text
            style={[
              styles.saveButton,
              (!hasChanges || loading) && styles.saveButtonDisabled,
            ]}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [hasChanges, loading, firstName, lastName, phone, companyName]);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
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
        // TODO: Upload image to server
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setLoading(true);
    try {
      const updateData: Record<string, string> = {};

      if (firstName !== (user?.first_name || '')) {
        updateData.first_name = firstName;
      }
      if (lastName !== (user?.last_name || '')) {
        updateData.last_name = lastName;
      }
      if (phone !== (user?.phone_number || '')) {
        updateData.phone_number = phone;
      }
      if (companyName !== (user?.company_name || '')) {
        updateData.company_name = companyName;
      }

      const response = await usersAPI.updateCurrentUser(updateData);
      updateUser(response.data);

      Alert.alert('Succès', 'Votre profil a été mis à jour', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Erreur mise à jour profil:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Impossible de mettre à jour le profil'
      );
    } finally {
      setLoading(false);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Image */}
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
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Prénom</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Entrez votre prénom"
                placeholderTextColor={Colors.gray400}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Entrez votre nom"
                placeholderTextColor={Colors.gray400}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={user?.email}
                editable={false}
              />
              <Text style={styles.helpText}>
                L'email ne peut pas être modifié
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+237 6XX XXX XXX"
                placeholderTextColor={Colors.gray400}
                keyboardType="phone-pad"
              />
            </View>

            {user?.role === 'organizer' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nom de l'entreprise</Text>
                <TextInput
                  style={styles.input}
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder="Entrez le nom de votre entreprise"
                  placeholderTextColor={Colors.gray400}
                />
              </View>
            )}
          </View>

          {/* Save Button (for Android/bottom) */}
          {Platform.OS === 'android' && (
            <View style={styles.bottomButton}>
              <GradientButton
                title={loading ? 'Enregistrement...' : 'Enregistrer'}
                onPress={handleSave}
                disabled={!hasChanges || loading}
                fullWidth
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {loading && (
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
    backgroundColor: Colors.white,
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
  saveButton: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  saveButtonDisabled: {
    color: Colors.gray400,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.gray100,
  },
  initialsContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray200,
    borderWidth: 3,
    borderColor: Colors.gray100,
  },
  initials: {
    fontSize: 40,
    fontWeight: FontWeights.bold,
    color: Colors.gray600,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  changePhotoText: {
    marginTop: Spacing.sm,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  form: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
    marginLeft: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.gray900,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  inputDisabled: {
    backgroundColor: Colors.gray100,
    color: Colors.gray500,
  },
  helpText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginLeft: Spacing.xs,
  },
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
