/**
 * AdminAdFormScreen — création / édition d'une publicité.
 *
 * Reçoit `adId` optionnel via route params : si fourni, mode édition (fetch +
 * pre-fill) ; sinon mode création.
 *
 * Champs :
 *  - Contenu : title, subtitle, image (picker), cta_label
 *  - Action : target_event_id (string optionnel) OU link_url
 *  - Géo : country, city, lat/lng/radius_km
 *  - Programmation : starts_at, ends_at, is_active, placement, priority
 *
 * À la soumission : multipart/form-data si une nouvelle image a été pickée,
 * JSON sinon. Confirmation biométrique catégorie 'admin' avant envoi.
 *
 * Pas de map picker pour lat/lng dans cette V1 — on saisit en numérique. La
 * V2 pourra réutiliser MapPickerModal de EventCreate.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm';
import { advertisementsAPI, AdvertisementAdmin } from '../../api';
import { RootStackParamList } from '../../types';
import RoleGuard from '../../components/auth/RoleGuard';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'AdminAdForm'>;

type Placement = 'feed_top' | 'feed_inline' | 'feed_bottom';

export default function AdminAdFormScreen() {
  return (
    <RoleGuard allow={['admin', 'moderator']} watermark="ADS" title="Publicité">
      <AdminAdFormContent />
    </RoleGuard>
  );
}

function AdminAdFormContent() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const adId = route.params?.adId;
  const isEdit = !!adId;
  const { colors, isDark } = useTheme();
  const { showSuccess, showError } = useAlert();
  const biometric = useBiometricConfirm();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  // === State du form ===
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [ctaLabel, setCtaLabel] = useState('En savoir plus');
  const [linkUrl, setLinkUrl] = useState('');
  const [targetEventId, setTargetEventId] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusKm, setRadiusKm] = useState('');
  const [placement, setPlacement] = useState<Placement>('feed_inline');
  const [priority, setPriority] = useState('0');
  const [isActive, setIsActive] = useState(true);
  // ImagePicker result
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const fetchAd = useCallback(async () => {
    if (!adId) return;
    try {
      const res = await advertisementsAPI.get(adId);
      const ad = res.data as AdvertisementAdmin;
      setTitle(ad.title);
      setSubtitle(ad.subtitle || '');
      setCtaLabel(ad.cta_label || 'En savoir plus');
      setLinkUrl(ad.link_url || '');
      setTargetEventId(ad.target_event || '');
      setCountry(ad.country || '');
      setCity(ad.city || '');
      setLatitude(ad.latitude != null ? String(ad.latitude) : '');
      setLongitude(ad.longitude != null ? String(ad.longitude) : '');
      setRadiusKm(ad.radius_km != null ? String(ad.radius_km) : '');
      setPlacement(ad.placement);
      setPriority(String(ad.priority));
      setIsActive(ad.is_active);
      setExistingImageUrl(ad.image_url || null);
    } catch (error) {
      if (__DEV__) console.error('Erreur fetch ad:', error);
      showError('Erreur', 'Impossible de charger la publicité');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [adId, navigation, showError]);

  useEffect(() => {
    fetchAd();
  }, [fetchAd]);

  const handlePickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showError('Permission refusée', 'Active l\'accès à la galerie pour choisir une image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        aspect: [16, 9],
        allowsEditing: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        setPickedImageUri(result.assets[0].uri);
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur picker image:', error);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showError('Titre requis', 'Le titre est obligatoire.');
      return;
    }
    if (!isEdit && !pickedImageUri) {
      showError('Image requise', 'Choisis une image bannière pour la pub.');
      return;
    }
    if (latitude && longitude && !radiusKm) {
      showError('Rayon requis', 'Si tu définis lat/lng, indique aussi un rayon en km.');
      return;
    }

    const okBio = await biometric.confirm({
      promptMessage: isEdit ? 'Confirmer la modification' : 'Confirmer la création de la publicité',
      category: 'admin',
    });
    if (!okBio) return;

    setSubmitting(true);
    try {
      // Construire le payload — multipart si nouvelle image, JSON sinon.
      const usesMultipart = !!pickedImageUri;
      let payload: FormData | Record<string, any>;

      const fields: Record<string, any> = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        cta_label: ctaLabel.trim() || 'En savoir plus',
        link_url: linkUrl.trim(),
        target_event: targetEventId.trim() || null,
        country: country.trim().toUpperCase(),
        city: city.trim(),
        latitude: latitude.trim() ? parseFloat(latitude) : null,
        longitude: longitude.trim() ? parseFloat(longitude) : null,
        radius_km: radiusKm.trim() ? parseInt(radiusKm, 10) : null,
        placement,
        priority: parseInt(priority, 10) || 0,
        is_active: isActive,
      };

      if (usesMultipart) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(fields)) {
          if (v === null || v === undefined) continue;
          fd.append(k, typeof v === 'boolean' ? String(v) : String(v));
        }
        fd.append('image', {
          uri: pickedImageUri!,
          name: 'ad.jpg',
          type: 'image/jpeg',
        } as any);
        payload = fd;
      } else {
        payload = fields;
      }

      if (isEdit) {
        await advertisementsAPI.update(adId!, payload);
        showSuccess('Succès', 'Publicité mise à jour');
      } else {
        await advertisementsAPI.create(payload);
        showSuccess('Succès', 'Publicité créée');
      }
      navigation.goBack();
    } catch (error: any) {
      if (__DEV__) console.error('Erreur submit:', error);
      const detail = error?.response?.data?.detail
        || JSON.stringify(error?.response?.data || {})
        || 'Soumission impossible';
      showError('Erreur', detail);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const inputStyle = [styles.input, { backgroundColor: colors.gray50, borderColor: hairline, color: colors.text }];

  const placementOptions: Array<{ value: Placement; label: string }> = [
    { value: 'feed_top', label: 'Haut du feed' },
    { value: 'feed_inline', label: 'Entre sections' },
    { value: 'feed_bottom', label: 'Bas du feed' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{isEdit ? 'ÉDITION' : 'NOUVELLE'}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{isEdit ? 'Modifier la pub' : 'Créer une pub'}</Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* === Image picker === */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Image bannière</Text>
        <TouchableOpacity onPress={handlePickImage} activeOpacity={0.85} style={[styles.imagePicker, { borderColor: hairline }]}>
          {pickedImageUri || existingImageUrl ? (
            <Image
              source={{ uri: pickedImageUri || existingImageUrl! }}
              style={styles.imagePreview}
              contentFit="cover"
              cachePolicy="memory"
            />
          ) : (
            <View style={[styles.imagePickerEmpty, { backgroundColor: colors.gray50 }]}>
              <Ionicons name="image-outline" size={32} color={colors.gray400} />
              <Text style={[styles.imagePickerHint, { color: colors.gray500 }]}>
                Touche pour choisir (16:9 conseillé)
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* === Contenu === */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contenu</Text>

        <Text style={[styles.label, { color: colors.gray700 }]}>Titre *</Text>
        <TextInput
          style={inputStyle}
          value={title}
          onChangeText={setTitle}
          placeholder="Ex : Festival de jazz à Yaoundé"
          placeholderTextColor={colors.gray400}
          maxLength={120}
        />

        <Text style={[styles.label, { color: colors.gray700 }]}>Sous-titre</Text>
        <TextInput
          style={inputStyle}
          value={subtitle}
          onChangeText={setSubtitle}
          placeholder="Ex : Du 12 au 14 juin · 10+ artistes"
          placeholderTextColor={colors.gray400}
          maxLength={200}
        />

        <Text style={[styles.label, { color: colors.gray700 }]}>Label du bouton</Text>
        <TextInput
          style={inputStyle}
          value={ctaLabel}
          onChangeText={setCtaLabel}
          placeholder="En savoir plus"
          placeholderTextColor={colors.gray400}
          maxLength={40}
        />

        {/* === Action === */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Action au tap</Text>
        <Text style={[styles.helpText, { color: colors.gray500 }]}>
          Si target_event est défini, prioritaire sur link_url. Laisse les deux vides pour pub informative.
        </Text>

        <Text style={[styles.label, { color: colors.gray700 }]}>ID de l'événement (UUID)</Text>
        <TextInput
          style={inputStyle}
          value={targetEventId}
          onChangeText={setTargetEventId}
          placeholder="optionnel"
          placeholderTextColor={colors.gray400}
          autoCapitalize="none"
        />

        <Text style={[styles.label, { color: colors.gray700 }]}>URL externe</Text>
        <TextInput
          style={inputStyle}
          value={linkUrl}
          onChangeText={setLinkUrl}
          placeholder="https://..."
          placeholderTextColor={colors.gray400}
          keyboardType="url"
          autoCapitalize="none"
        />

        {/* === Géo === */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ciblage géographique</Text>
        <Text style={[styles.helpText, { color: colors.gray500 }]}>
          Tous champs vides = mondial. Country/city pour cibler un pays/ville. Lat+lng+rayon pour un cercle.
        </Text>

        <Text style={[styles.label, { color: colors.gray700 }]}>Pays (code ISO 2 lettres)</Text>
        <TextInput
          style={inputStyle}
          value={country}
          onChangeText={(t) => setCountry(t.toUpperCase().slice(0, 2))}
          placeholder="CM, FR, ..."
          placeholderTextColor={colors.gray400}
          autoCapitalize="characters"
          maxLength={2}
        />

        <Text style={[styles.label, { color: colors.gray700 }]}>Ville</Text>
        <TextInput
          style={inputStyle}
          value={city}
          onChangeText={setCity}
          placeholder="Douala, Yaoundé, ..."
          placeholderTextColor={colors.gray400}
        />

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={[styles.label, { color: colors.gray700 }]}>Latitude</Text>
            <TextInput
              style={inputStyle}
              value={latitude}
              onChangeText={setLatitude}
              placeholder="4.05"
              placeholderTextColor={colors.gray400}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.col}>
            <Text style={[styles.label, { color: colors.gray700 }]}>Longitude</Text>
            <TextInput
              style={inputStyle}
              value={longitude}
              onChangeText={setLongitude}
              placeholder="9.7"
              placeholderTextColor={colors.gray400}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={[styles.label, { color: colors.gray700 }]}>Rayon (km)</Text>
        <TextInput
          style={inputStyle}
          value={radiusKm}
          onChangeText={setRadiusKm}
          placeholder="5, 10, 50..."
          placeholderTextColor={colors.gray400}
          keyboardType="numeric"
        />

        {/* === Programmation === */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Programmation</Text>

        <Text style={[styles.label, { color: colors.gray700 }]}>Emplacement dans le feed</Text>
        <View style={styles.placementRow}>
          {placementOptions.map((opt) => {
            const active = placement === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setPlacement(opt.value)}
                activeOpacity={0.85}
                style={[
                  styles.placementChip,
                  {
                    backgroundColor: active ? colors.primary : colors.gray50,
                    borderColor: active ? colors.primary : hairline,
                  },
                ]}
              >
                <Text style={[styles.placementChipText, { color: active ? '#FFFFFF' : colors.gray700 }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.gray700 }]}>Priorité (plus élevé = affiché en premier)</Text>
        <TextInput
          style={inputStyle}
          value={priority}
          onChangeText={setPriority}
          placeholder="0"
          placeholderTextColor={colors.gray400}
          keyboardType="numeric"
        />

        {/* Toggle is_active */}
        <TouchableOpacity
          onPress={() => setIsActive((v) => !v)}
          activeOpacity={0.85}
          style={[styles.activeToggle, { backgroundColor: colors.gray50, borderColor: hairline }]}
        >
          <View style={[styles.checkbox, {
            backgroundColor: isActive ? colors.primary : 'transparent',
            borderColor: isActive ? colors.primary : colors.gray300,
          }]}>
            {isActive && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.activeToggleTitle, { color: colors.text }]}>Active</Text>
            <Text style={[styles.activeToggleHint, { color: colors.gray500 }]}>
              {isActive ? 'Affichée dans le feed selon la programmation' : 'Désactivée — pas affichée même dans la fenêtre temporelle'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: Spacing['2xl'] }} />
      </KeyboardAwareScrollView>

      {/* === Bouton submit === */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: hairline }]}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
          style={[styles.submitBtn, { backgroundColor: colors.primary }, submitting && { opacity: 0.6 }]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>{isEdit ? 'Enregistrer' : 'Créer la pub'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  iconDisc: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  headerEyebrow: {
    fontFamily: FontFamily.bold, fontSize: 10, letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold, fontSize: FontSizes.xl, letterSpacing: -0.4,
  },
  scroll: { padding: Spacing.lg, paddingBottom: 100 },
  sectionTitle: {
    fontFamily: FontFamily.displayBold, fontSize: 16, letterSpacing: -0.3,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  helpText: {
    fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 16,
    marginBottom: Spacing.sm,
  },
  label: {
    fontFamily: FontFamily.medium, fontSize: 12,
    marginTop: Spacing.sm, marginBottom: 6,
  },
  input: {
    borderWidth: 1.5, borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontFamily: FontFamily.regular, fontSize: 14,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
  col: { flex: 1 },
  imagePicker: {
    borderRadius: BorderRadius.xl, borderWidth: 1.5, overflow: 'hidden',
    borderStyle: 'dashed', minHeight: 160,
  },
  imagePreview: { width: '100%', height: 180 },
  imagePickerEmpty: {
    height: 180, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  imagePickerHint: {
    fontFamily: FontFamily.regular, fontSize: 12,
  },
  placementRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  placementChip: {
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  placementChipText: { fontFamily: FontFamily.bold, fontSize: 11, letterSpacing: 0.3 },
  activeToggle: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.xl, borderWidth: 1,
    marginTop: Spacing.md,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  activeToggleTitle: {
    fontFamily: FontFamily.semiBold, fontSize: 14,
  },
  activeToggleHint: {
    fontFamily: FontFamily.regular, fontSize: 11, marginTop: 2,
  },
  bottomBar: {
    padding: Spacing.lg, paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  submitBtn: {
    paddingVertical: 16, borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  submitBtnText: {
    fontFamily: FontFamily.bold, fontSize: 14, letterSpacing: 0.3, color: '#FFFFFF',
  },
});
