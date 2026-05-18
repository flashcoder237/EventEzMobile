import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';

// Activer LayoutAnimation sur Android (no-op iOS)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { useTheme } from '../../contexts/ThemeContext';
import { SessionForm, TrackForm, SpeakerForm, SESSION_TYPES } from '../../hooks/useEventForm';
import DateTimePickerField from '../ui/DateTimePickerField';
import styles from './eventCreateStyles';
import { useEventCreateThemedStyles } from './useEventCreateThemedStyles';

// ============================================
// Props
// ============================================

interface EventStep4SessionsProps {
  sessions: SessionForm[];
  onAddSession: () => void;
  onUpdateSession: (index: number, field: string, value: any) => void;
  onRemoveSession: (index: number) => void;
  tracks: TrackForm[];
  onAddTrack: () => void;
  onUpdateTrack: (index: number, field: string, value: any) => void;
  onRemoveTrack: (index: number) => void;
  speakers: SpeakerForm[];
  onAddSpeaker: () => void;
  onUpdateSpeaker: (index: number, field: string, value: any) => void;
  onRemoveSpeaker: (index: number) => void;
}

// ============================================
// Component
// ============================================

export default function EventStep4Sessions({
  sessions,
  onAddSession,
  onUpdateSession,
  onRemoveSession,
  tracks,
  onAddTrack,
  onUpdateTrack,
  onRemoveTrack,
  speakers,
  onAddSpeaker,
  onUpdateSpeaker,
  onRemoveSpeaker,
}: EventStep4SessionsProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const themed = useEventCreateThemedStyles();
  const [advancedOpen, setAdvancedOpen] = useState<Record<number, boolean>>({});
  // Sections collapsibles : Tracks, Speakers, Sessions. Par defaut tout ferme
  // sauf Sessions (le user passe ici principalement pour des sessions).
  const [tracksExpanded, setTracksExpanded] = useState(false);
  const [speakersExpanded, setSpeakersExpanded] = useState(false);
  const [sessionsExpanded, setSessionsExpanded] = useState(true);
  // Advanced open per track / per speaker (idem que sessions).
  const [trackAdvancedOpen, setTrackAdvancedOpen] = useState<Record<number, boolean>>({});
  const [speakerAdvancedOpen, setSpeakerAdvancedOpen] = useState<Record<number, boolean>>({});
  // Pour la saisie libre Level/Language (chip "Personnalise" → input)
  const [levelCustom, setLevelCustom] = useState<Record<number, boolean>>({});
  const [languageCustom, setLanguageCustom] = useState<Record<number, boolean>>({});

  const toggleSection = (setter: React.Dispatch<React.SetStateAction<boolean>>) => () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter(prev => !prev);
  };
  const toggleTrackAdvanced = (idx: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTrackAdvancedOpen(prev => ({ ...prev, [idx]: !prev[idx] }));
  };
  const toggleSpeakerAdvanced = (idx: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSpeakerAdvancedOpen(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Image picker pour photo intervenant. Lance la galerie, retourne un URI
  // file:// que le submit uploadera via PATCH multipart.
  const pickSpeakerPhoto = async (idx: number) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        onUpdateSpeaker(idx, 'photo', result.assets[0].uri);
      }
    } catch (e) {
      if (__DEV__) console.warn('[Speaker] photo pick failed', e);
    }
  };

  const LEVEL_OPTIONS = [
    { value: 'all', label: t('componentsOrganizer.step4.levelAll') },
    { value: 'beginner', label: t('componentsOrganizer.step4.levelBeginner') },
    { value: 'intermediate', label: t('componentsOrganizer.step4.levelIntermediate') },
    { value: 'advanced', label: t('componentsOrganizer.step4.levelAdvanced') },
  ];

  const LANGUAGE_OPTIONS = [
    { value: 'fr', label: t('componentsOrganizer.step4.languageFr') },
    { value: 'en', label: t('componentsOrganizer.step4.languageEn') },
    { value: 'es', label: t('componentsOrganizer.step4.languageEs') },
    { value: 'de', label: t('componentsOrganizer.step4.languageDe') },
  ];

  const toggleAdvanced = (index: number) => {
    setAdvancedOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const isBreakType = (type: string) => type === 'break' || type === 'lunch';

  return (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, themed.stepTitle]}>{t('componentsOrganizer.step4.title')}</Text>
      <Text style={[styles.stepDescription, themed.stepDescription]}>{t('componentsOrganizer.step4.description')}</Text>

      {/* Info box */}
      <View style={[styles.infoBox, themed.infoBox]}>
        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
        <Text style={[styles.infoBoxText, themed.infoBoxText]}>
          {t('componentsOrganizer.step4.infoBox')}
        </Text>
      </View>

      {/* === SECTION TRACKS (accordeon) === */}
      <View style={{ marginTop: 20, marginBottom: 12 }}>
        <TouchableOpacity
          onPress={toggleSection(setTracksExpanded)}
          style={[styles.advancedToggle, themed.advancedToggle, { marginBottom: 0 }]}
          accessibilityRole="button"
          accessibilityLabel={t('componentsOrganizer.step4.tracksSectionLabel')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Ionicons name={tracksExpanded ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.gray600} />
            <Text style={[styles.advancedToggleText, themed.advancedToggleText]}>
              {t('componentsOrganizer.step4.tracksSectionLabel')}
            </Text>
            <View style={{
              minWidth: 22, height: 20, borderRadius: 10, backgroundColor: colors.gray100,
              alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
            }}>
              <Text style={{ fontSize: 11, color: colors.gray700, fontWeight: '600' }}>{tracks.length}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              if (!tracksExpanded) toggleSection(setTracksExpanded)();
              onAddTrack();
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            hitSlop={8}
          >
            <Ionicons name="add-circle" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
              {t('componentsOrganizer.step4.addTrack')}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {tracksExpanded && (
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.inputHint, themed.inputHint, { marginBottom: 8 }]}>
              {t('componentsOrganizer.step4.tracksHint')}
            </Text>
            {tracks.length === 0 && (
              <Text style={[styles.inputHint, themed.inputHint, { fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 }]}>
                {t('componentsOrganizer.step4.tracksEmpty')}
              </Text>
            )}
            {tracks.map((track, idx) => (
              <View key={idx} style={[styles.card, themed.card, { marginBottom: 8, padding: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: track.color }} />
                  <TextInput
                    style={[styles.input, themed.input, { flex: 1 }]}
                    value={track.name}
                    onChangeText={(v) => onUpdateTrack(idx, 'name', v)}
                    placeholder={t('componentsOrganizer.step4.trackNamePlaceholder')}
                    placeholderTextColor={colors.gray400}
                  />
                  <TouchableOpacity onPress={() => onRemoveTrack(idx)}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
                {/* Color picker simple : 6 couleurs predefinies */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {['#4F46E5', '#FF6B6B', '#10B981', '#F59E0B', '#A855F7', '#06B6D4'].map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => onUpdateTrack(idx, 'color', c)}
                      style={{
                        width: 28, height: 28, borderRadius: 14, backgroundColor: c,
                        borderWidth: track.color === c ? 3 : 0,
                        borderColor: colors.gray900,
                      }}
                    />
                  ))}
                </View>
                {/* Track advanced : description + reorder */}
                <TouchableOpacity
                  onPress={() => toggleTrackAdvanced(idx)}
                  style={[styles.advancedToggle, themed.advancedToggle, { marginTop: 8 }]}
                >
                  <Text style={[styles.advancedToggleText, themed.advancedToggleText]}>
                    {t('componentsOrganizer.step4.advancedOptions')}
                  </Text>
                  <Ionicons
                    name={trackAdvancedOpen[idx] ? 'chevron-up' : 'chevron-down'}
                    size={16} color={colors.gray500}
                  />
                </TouchableOpacity>
                {trackAdvancedOpen[idx] && (
                  <View style={{ marginTop: 8, gap: 8 }}>
                    <TextInput
                      style={[styles.input, styles.textAreaSmall, themed.input]}
                      value={track.description}
                      onChangeText={(v) => onUpdateTrack(idx, 'description', v)}
                      placeholder={t('componentsOrganizer.step4.trackDescriptionPlaceholder')}
                      placeholderTextColor={colors.gray400}
                      multiline numberOfLines={2} textAlignVertical="top"
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* === SECTION SPEAKERS (accordeon) === */}
      <View style={{ marginBottom: 12 }}>
        <TouchableOpacity
          onPress={toggleSection(setSpeakersExpanded)}
          style={[styles.advancedToggle, themed.advancedToggle, { marginBottom: 0 }]}
          accessibilityRole="button"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Ionicons name={speakersExpanded ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.gray600} />
            <Text style={[styles.advancedToggleText, themed.advancedToggleText]}>
              {t('componentsOrganizer.step4.speakersSectionLabel')}
            </Text>
            <View style={{
              minWidth: 22, height: 20, borderRadius: 10, backgroundColor: colors.gray100,
              alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
            }}>
              <Text style={{ fontSize: 11, color: colors.gray700, fontWeight: '600' }}>{speakers.length}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              if (!speakersExpanded) toggleSection(setSpeakersExpanded)();
              onAddSpeaker();
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            hitSlop={8}
          >
            <Ionicons name="add-circle" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
              {t('componentsOrganizer.step4.addSpeaker')}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {speakersExpanded && (
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.inputHint, themed.inputHint, { marginBottom: 8 }]}>
              {t('componentsOrganizer.step4.speakersHint')}
            </Text>
            {speakers.length === 0 && (
              <Text style={[styles.inputHint, themed.inputHint, { fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 }]}>
                {t('componentsOrganizer.step4.speakersEmpty')}
              </Text>
            )}
            {speakers.map((speaker, idx) => (
              <View key={idx} style={[styles.card, themed.card, { marginBottom: 8, padding: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={[styles.cardTitle, themed.cardTitle, { fontSize: 14 }]}>
                    {speaker.first_name || speaker.last_name
                      ? `${speaker.first_name} ${speaker.last_name}`.trim()
                      : t('componentsOrganizer.step4.speakerPlaceholder', { index: idx + 1 })}
                  </Text>
                  <TouchableOpacity onPress={() => onRemoveSpeaker(idx)}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
                {/* Photo + champs essentiels */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => pickSpeakerPhoto(idx)} style={{
                    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.gray100,
                    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    borderWidth: 1, borderColor: colors.gray200,
                  }}>
                    {speaker.photo ? (
                      <Image source={{ uri: speaker.photo }} style={{ width: 64, height: 64 }} />
                    ) : (
                      <Ionicons name="camera-outline" size={22} color={colors.gray500} />
                    )}
                  </TouchableOpacity>
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        style={[styles.input, themed.input, { flex: 1 }]}
                        value={speaker.first_name}
                        onChangeText={(v) => onUpdateSpeaker(idx, 'first_name', v)}
                        placeholder={t('componentsOrganizer.step4.speakerFirstName')}
                        placeholderTextColor={colors.gray400}
                      />
                      <TextInput
                        style={[styles.input, themed.input, { flex: 1 }]}
                        value={speaker.last_name}
                        onChangeText={(v) => onUpdateSpeaker(idx, 'last_name', v)}
                        placeholder={t('componentsOrganizer.step4.speakerLastName')}
                        placeholderTextColor={colors.gray400}
                      />
                    </View>
                    <TextInput
                      style={[styles.input, themed.input]}
                      value={speaker.title}
                      onChangeText={(v) => onUpdateSpeaker(idx, 'title', v)}
                      placeholder={t('componentsOrganizer.step4.speakerTitle')}
                      placeholderTextColor={colors.gray400}
                    />
                  </View>
                </View>
                <TextInput
                  style={[styles.input, themed.input]}
                  value={speaker.company}
                  onChangeText={(v) => onUpdateSpeaker(idx, 'company', v)}
                  placeholder={t('componentsOrganizer.step4.speakerCompany')}
                  placeholderTextColor={colors.gray400}
                />
                {/* Speaker advanced : bio, email, phone, website, linkedin, twitter */}
                <TouchableOpacity
                  onPress={() => toggleSpeakerAdvanced(idx)}
                  style={[styles.advancedToggle, themed.advancedToggle, { marginTop: 8 }]}
                >
                  <Text style={[styles.advancedToggleText, themed.advancedToggleText]}>
                    {t('componentsOrganizer.step4.advancedOptions')}
                  </Text>
                  <Ionicons
                    name={speakerAdvancedOpen[idx] ? 'chevron-up' : 'chevron-down'}
                    size={16} color={colors.gray500}
                  />
                </TouchableOpacity>
                {speakerAdvancedOpen[idx] && (
                  <View style={{ marginTop: 8, gap: 8 }}>
                    <TextInput
                      style={[styles.input, styles.textAreaSmall, themed.input]}
                      value={speaker.bio}
                      onChangeText={(v) => onUpdateSpeaker(idx, 'bio', v)}
                      placeholder={t('componentsOrganizer.step4.speakerBio')}
                      placeholderTextColor={colors.gray400}
                      multiline numberOfLines={3} textAlignVertical="top"
                    />
                    <TextInput
                      style={[styles.input, themed.input]}
                      value={speaker.email}
                      onChangeText={(v) => onUpdateSpeaker(idx, 'email', v)}
                      placeholder={t('componentsOrganizer.step4.speakerEmail')}
                      placeholderTextColor={colors.gray400}
                      keyboardType="email-address" autoCapitalize="none"
                    />
                    <TextInput
                      style={[styles.input, themed.input]}
                      value={speaker.phone}
                      onChangeText={(v) => onUpdateSpeaker(idx, 'phone', v)}
                      placeholder={t('componentsOrganizer.step4.speakerPhone')}
                      placeholderTextColor={colors.gray400}
                      keyboardType="phone-pad"
                    />
                    <TextInput
                      style={[styles.input, themed.input]}
                      value={speaker.website}
                      onChangeText={(v) => onUpdateSpeaker(idx, 'website', v)}
                      placeholder={t('componentsOrganizer.step4.speakerWebsite')}
                      placeholderTextColor={colors.gray400}
                      keyboardType="url" autoCapitalize="none"
                    />
                    <TextInput
                      style={[styles.input, themed.input]}
                      value={speaker.linkedin}
                      onChangeText={(v) => onUpdateSpeaker(idx, 'linkedin', v)}
                      placeholder={t('componentsOrganizer.step4.speakerLinkedin')}
                      placeholderTextColor={colors.gray400}
                      autoCapitalize="none"
                    />
                    <TextInput
                      style={[styles.input, themed.input]}
                      value={speaker.twitter}
                      onChangeText={(v) => onUpdateSpeaker(idx, 'twitter', v)}
                      placeholder={t('componentsOrganizer.step4.speakerTwitter')}
                      placeholderTextColor={colors.gray400}
                      autoCapitalize="none"
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* === SECTION SESSIONS (accordeon, ouvert par defaut) === */}
      <TouchableOpacity
        onPress={toggleSection(setSessionsExpanded)}
        style={[styles.advancedToggle, themed.advancedToggle, { marginBottom: 0 }]}
        accessibilityRole="button"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <Ionicons name={sessionsExpanded ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.gray600} />
          <Text style={[styles.advancedToggleText, themed.advancedToggleText]}>
            {t('componentsOrganizer.step4.sessionsSectionLabel')}
          </Text>
          <View style={{
            minWidth: 22, height: 20, borderRadius: 10, backgroundColor: colors.gray100,
            alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
          }}>
            <Text style={{ fontSize: 11, color: colors.gray700, fontWeight: '600' }}>{sessions.length}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (!sessionsExpanded) toggleSection(setSessionsExpanded)();
            onAddSession();
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          hitSlop={8}
        >
          <Ionicons name="add-circle" size={20} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
            {t('componentsOrganizer.step4.addSession')}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {sessionsExpanded && (sessions.length === 0 ? (
        <View style={[styles.emptyContainer, themed.emptyContainer]}>
          <View style={[styles.emptyIcon, themed.emptyIcon]}>
            <Ionicons name="layers-outline" size={40} color={colors.gray400} />
          </View>
          <Text style={[styles.emptyTitle, themed.emptyTitle]}>{t('componentsOrganizer.step4.noSessionsTitle')}</Text>
          <Text style={[styles.emptyText, themed.emptyText]}>
            {t('componentsOrganizer.step4.noSessionsText')}
          </Text>
          <TouchableOpacity style={[styles.addButton, themed.addButton]} onPress={onAddSession}>
            <Ionicons name="add" size={20} color={colors.white} />
            <Text style={[styles.addButtonText, themed.addButtonText]}>{t('componentsOrganizer.step4.addSession')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {sessions.map((session, index) => (
            <View key={index} style={[styles.card, themed.card]}>
              <View style={[styles.cardHeader, themed.cardHeader]}>
                <Text style={[styles.cardTitle, themed.cardTitle]}>{t('componentsOrganizer.step4.sessionIndex', { index: index + 1 })}</Text>
                <TouchableOpacity onPress={() => onRemoveSession(index)}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>

              {/* === Section essentielle === */}

              <View style={styles.inputGroup}>
                <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step4.sessionTitleLabel')}</Text>
                <TextInput
                  style={[styles.input, themed.input]}
                  value={session.title}
                  onChangeText={(value) => onUpdateSession(index, 'title', value)}
                  placeholder={t('componentsOrganizer.step4.sessionTitlePlaceholder')}
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step4.sessionTypeLabel')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    {SESSION_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.chip, themed.chip,
                          session.session_type === type.value && [styles.chipActive, themed.chipActive],
                        ]}
                        onPress={() => onUpdateSession(index, 'session_type', type.value)}
                      >
                        <Text
                          style={[
                            styles.chipText, themed.chipText,
                            session.session_type === type.value && [styles.chipTextActive, themed.chipTextActive],
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step4.venueLabel')}</Text>
                <TextInput
                  style={[styles.input, themed.input]}
                  value={session.location}
                  onChangeText={(value) => onUpdateSession(index, 'location', value)}
                  placeholder={t('componentsOrganizer.step4.venuePlaceholder')}
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step4.roomLabel')}</Text>
                <TextInput
                  style={[styles.input, themed.input]}
                  value={session.room}
                  onChangeText={(value) => onUpdateSession(index, 'room', value)}
                  placeholder={t('componentsOrganizer.step4.roomPlaceholder')}
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <DateTimePickerField
                  label={t('componentsOrganizer.step4.startTimeLabel')}
                  value={session.start_time || undefined}
                  onChange={(date) => onUpdateSession(index, 'start_time', date)}
                  placeholder={t('componentsOrganizer.step4.startTimePlaceholder')}
                />
              </View>

              <View style={styles.inputGroup}>
                <DateTimePickerField
                  label={t('componentsOrganizer.step4.endTimeLabel')}
                  value={session.end_time || undefined}
                  onChange={(date) => onUpdateSession(index, 'end_time', date)}
                  minimumDate={session.start_time || undefined}
                  placeholder={t('componentsOrganizer.step4.endTimePlaceholder')}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step4.descriptionLabel')}</Text>
                <TextInput
                  style={[styles.input, styles.textAreaSmall, themed.input]}
                  value={session.description}
                  onChangeText={(value) => onUpdateSession(index, 'description', value)}
                  placeholder={t('componentsOrganizer.step4.descriptionPlaceholder')}
                  placeholderTextColor={colors.gray400}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step4.maxCapacityLabel')}</Text>
                <TextInput
                  style={[styles.input, themed.input]}
                  value={session.max_capacity}
                  onChangeText={(value) => onUpdateSession(index, 'max_capacity', value)}
                  placeholder={t('componentsOrganizer.step4.maxCapacityPlaceholder')}
                  placeholderTextColor={colors.gray400}
                  keyboardType="numeric"
                />
              </View>

              {/* === Options avancées (cachées pour break/lunch) === */}
              {!isBreakType(session.session_type) && (
                <View style={{ marginTop: 8 }}>
                  <TouchableOpacity
                    style={[styles.advancedToggle, themed.advancedToggle]}
                    onPress={() => toggleAdvanced(index)}
                  >
                    <Text style={[styles.advancedToggleText, themed.advancedToggleText]}>
                      {t('componentsOrganizer.step4.advancedOptions')}
                    </Text>
                    <Ionicons
                      name={advancedOpen[index] ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.gray500}
                    />
                  </TouchableOpacity>

                  {advancedOpen[index] && (
                    <View style={styles.advancedContent}>

                      {/* Session virtuelle */}
                      <View style={[styles.switchRow, themed.switchRow]}>
                        <View style={styles.switchContent}>
                          <Text style={[styles.switchLabel, themed.switchLabel]}>{t('componentsOrganizer.step4.virtualSessionLabel')}</Text>
                          <Text style={[styles.switchDescription, themed.switchDescription]}>{t('componentsOrganizer.step4.virtualSessionDesc')}</Text>
                        </View>
                        <Switch
                          value={session.is_virtual}
                          onValueChange={(value) => onUpdateSession(index, 'is_virtual', value)}
                          trackColor={{ false: colors.gray200, true: colors.primary }}
                          thumbColor={colors.white}
                        />
                      </View>

                      {session.is_virtual && (
                        <View style={styles.inputGroup}>
                          <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step4.virtualLinkLabel')}</Text>
                          <TextInput
                            style={[styles.input, themed.input]}
                            value={session.virtual_link}
                            onChangeText={(value) => onUpdateSession(index, 'virtual_link', value)}
                            placeholder="https://meet.google.com/..."
                            placeholderTextColor={colors.gray400}
                            keyboardType="url"
                            autoCapitalize="none"
                          />
                        </View>
                      )}

                      {/* Niveau — chips suggestions + chip "Personnalise" qui ouvre un input libre */}
                      <View style={styles.inputGroup}>
                        <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step4.levelLabel')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={styles.chipContainer}>
                            {LEVEL_OPTIONS.map((opt) => {
                              const isSelected = !levelCustom[index] && session.level === opt.value;
                              return (
                                <TouchableOpacity
                                  key={opt.value}
                                  style={[styles.chip, themed.chip, isSelected && [styles.chipActive, themed.chipActive]]}
                                  onPress={() => {
                                    setLevelCustom(prev => ({ ...prev, [index]: false }));
                                    onUpdateSession(index, 'level', opt.value);
                                  }}
                                >
                                  <Text style={[styles.chipText, themed.chipText, isSelected && [styles.chipTextActive, themed.chipTextActive]]}>
                                    {opt.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                            {/* Chip "Personnalise" : actif si la valeur n'est pas dans LEVEL_OPTIONS */}
                            {(() => {
                              const isPreset = LEVEL_OPTIONS.some(o => o.value === session.level);
                              const isCustomActive = levelCustom[index] || !isPreset;
                              return (
                                <TouchableOpacity
                                  style={[styles.chip, themed.chip, isCustomActive && [styles.chipActive, themed.chipActive]]}
                                  onPress={() => {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    setLevelCustom(prev => ({ ...prev, [index]: !prev[index] }));
                                  }}
                                >
                                  <Ionicons name="create-outline" size={12}
                                    color={isCustomActive ? colors.white : colors.gray700}
                                    style={{ marginRight: 4 }} />
                                  <Text style={[styles.chipText, themed.chipText, isCustomActive && [styles.chipTextActive, themed.chipTextActive]]}>
                                    {t('componentsOrganizer.step4.customOption')}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })()}
                          </View>
                        </ScrollView>
                        {(levelCustom[index] || !LEVEL_OPTIONS.some(o => o.value === session.level)) && (
                          <TextInput
                            style={[styles.input, themed.input, { marginTop: 6 }]}
                            value={LEVEL_OPTIONS.some(o => o.value === session.level) ? '' : session.level}
                            onChangeText={(v) => onUpdateSession(index, 'level', v)}
                            placeholder={t('componentsOrganizer.step4.levelCustomPlaceholder')}
                            placeholderTextColor={colors.gray400}
                          />
                        )}
                      </View>

                      {/* Langue — chips suggestions + chip "Personnalise" qui ouvre un input libre */}
                      <View style={styles.inputGroup}>
                        <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step4.languageLabel')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={styles.chipContainer}>
                            {LANGUAGE_OPTIONS.map((opt) => {
                              const isSelected = !languageCustom[index] && session.language === opt.value;
                              return (
                                <TouchableOpacity
                                  key={opt.value}
                                  style={[styles.chip, themed.chip, isSelected && [styles.chipActive, themed.chipActive]]}
                                  onPress={() => {
                                    setLanguageCustom(prev => ({ ...prev, [index]: false }));
                                    onUpdateSession(index, 'language', opt.value);
                                  }}
                                >
                                  <Text style={[styles.chipText, themed.chipText, isSelected && [styles.chipTextActive, themed.chipTextActive]]}>
                                    {opt.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                            {(() => {
                              const isPreset = LANGUAGE_OPTIONS.some(o => o.value === session.language);
                              const isCustomActive = languageCustom[index] || !isPreset;
                              return (
                                <TouchableOpacity
                                  style={[styles.chip, themed.chip, isCustomActive && [styles.chipActive, themed.chipActive]]}
                                  onPress={() => {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    setLanguageCustom(prev => ({ ...prev, [index]: !prev[index] }));
                                  }}
                                >
                                  <Ionicons name="create-outline" size={12}
                                    color={isCustomActive ? colors.white : colors.gray700}
                                    style={{ marginRight: 4 }} />
                                  <Text style={[styles.chipText, themed.chipText, isCustomActive && [styles.chipTextActive, themed.chipTextActive]]}>
                                    {t('componentsOrganizer.step4.customOption')}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })()}
                          </View>
                        </ScrollView>
                        {(languageCustom[index] || !LANGUAGE_OPTIONS.some(o => o.value === session.language)) && (
                          <TextInput
                            style={[styles.input, themed.input, { marginTop: 6 }]}
                            value={LANGUAGE_OPTIONS.some(o => o.value === session.language) ? '' : session.language}
                            onChangeText={(v) => onUpdateSession(index, 'language', v)}
                            placeholder={t('componentsOrganizer.step4.languageCustomPlaceholder')}
                            placeholderTextColor={colors.gray400}
                          />
                        )}
                      </View>

                      {/* Inscription requise */}
                      <View style={[styles.switchRow, themed.switchRow]}>
                        <View style={styles.switchContent}>
                          <Text style={[styles.switchLabel, themed.switchLabel]}>{t('componentsOrganizer.step4.regRequiredLabel')}</Text>
                          <Text style={[styles.switchDescription, themed.switchDescription]}>{t('componentsOrganizer.step4.regRequiredDesc')}</Text>
                        </View>
                        <Switch
                          value={session.requires_registration}
                          onValueChange={(value) => onUpdateSession(index, 'requires_registration', value)}
                          trackColor={{ false: colors.gray200, true: colors.primary }}
                          thumbColor={colors.white}
                        />
                      </View>

                      {/* Session mise en avant */}
                      <View style={[styles.switchRow, themed.switchRow]}>
                        <View style={styles.switchContent}>
                          <Text style={[styles.switchLabel, themed.switchLabel]}>{t('componentsOrganizer.step4.featuredLabel')}</Text>
                          <Text style={[styles.switchDescription, themed.switchDescription]}>{t('componentsOrganizer.step4.featuredDesc')}</Text>
                        </View>
                        <Switch
                          value={session.is_featured}
                          onValueChange={(value) => onUpdateSession(index, 'is_featured', value)}
                          trackColor={{ false: colors.gray200, true: colors.primary }}
                          thumbColor={colors.white}
                        />
                      </View>

                      {/* URL des slides */}
                      <View style={styles.inputGroup}>
                        <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step4.slidesUrlLabel')}</Text>
                        <TextInput
                          style={[styles.input, themed.input]}
                          value={session.slides_url}
                          onChangeText={(value) => onUpdateSession(index, 'slides_url', value)}
                          placeholder="https://..."
                          placeholderTextColor={colors.gray400}
                          keyboardType="url"
                          autoCapitalize="none"
                        />
                      </View>

                      {/* URL de l'enregistrement */}
                      <View style={styles.inputGroup}>
                        <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step4.recordingUrlLabel')}</Text>
                        <TextInput
                          style={[styles.input, themed.input]}
                          value={session.recording_url}
                          onChangeText={(value) => onUpdateSession(index, 'recording_url', value)}
                          placeholder="https://..."
                          placeholderTextColor={colors.gray400}
                          keyboardType="url"
                          autoCapitalize="none"
                        />
                      </View>

                      {/* Tags */}
                      <View style={styles.inputGroup}>
                        <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step4.tagsLabel')}</Text>
                        <TextInput
                          style={[styles.input, themed.input]}
                          value={Array.isArray(session.tags) ? session.tags.join(', ') : ''}
                          onChangeText={(value) => {
                            const tagsArray = value.split(',').map(tag => tag.trim()).filter(Boolean);
                            onUpdateSession(index, 'tags', tagsArray);
                          }}
                          placeholder={t('componentsOrganizer.step4.tagsPlaceholder')}
                          placeholderTextColor={colors.gray400}
                        />
                        <Text style={[styles.inputHint, themed.inputHint]}>{t('componentsOrganizer.step4.tagsHint')}</Text>
                      </View>

                      {/* === Track picker (single) === */}
                      {tracks.length > 0 && (
                        <View style={styles.inputGroup}>
                          <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step4.trackLabel')}</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.chipContainer}>
                              <TouchableOpacity
                                style={[styles.chip, themed.chip, (session.track_index ?? null) === null && [styles.chipActive, themed.chipActive]]}
                                onPress={() => onUpdateSession(index, 'track_index', null)}
                              >
                                <Text style={[styles.chipText, themed.chipText, (session.track_index ?? null) === null && [styles.chipTextActive, themed.chipTextActive]]}>
                                  {t('componentsOrganizer.step4.noTrack')}
                                </Text>
                              </TouchableOpacity>
                              {tracks.map((track, tIdx) => (
                                <TouchableOpacity
                                  key={tIdx}
                                  style={[styles.chip, themed.chip, session.track_index === tIdx && [styles.chipActive, themed.chipActive]]}
                                  onPress={() => onUpdateSession(index, 'track_index', tIdx)}
                                >
                                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: track.color, marginRight: 6 }} />
                                  <Text style={[styles.chipText, themed.chipText, session.track_index === tIdx && [styles.chipTextActive, themed.chipTextActive]]}>
                                    {track.name || t('componentsOrganizer.step4.trackPlaceholder', { index: tIdx + 1 })}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </ScrollView>
                        </View>
                      )}

                      {/* === Speakers picker (multi) === */}
                      {speakers.length > 0 && (
                        <View style={styles.inputGroup}>
                          <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step4.speakersLabel')}</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.chipContainer}>
                              {speakers.map((speaker, sIdx) => {
                                // Defensif : sessions chargees depuis un draft pre-existant
                                // ou en mode edition peuvent avoir speaker_indices undefined.
                                const selectedIndices = session.speaker_indices || [];
                                const isSelected = selectedIndices.includes(sIdx);
                                return (
                                  <TouchableOpacity
                                    key={sIdx}
                                    style={[styles.chip, themed.chip, isSelected && [styles.chipActive, themed.chipActive]]}
                                    onPress={() => {
                                      const next = isSelected
                                        ? selectedIndices.filter(i => i !== sIdx)
                                        : [...selectedIndices, sIdx];
                                      onUpdateSession(index, 'speaker_indices', next);
                                    }}
                                  >
                                    {isSelected && <Ionicons name="checkmark" size={14} color={colors.white} style={{ marginRight: 4 }} />}
                                    <Text style={[styles.chipText, themed.chipText, isSelected && [styles.chipTextActive, themed.chipTextActive]]}>
                                      {`${speaker.first_name} ${speaker.last_name}`.trim()
                                        || t('componentsOrganizer.step4.speakerPlaceholder', { index: sIdx + 1 })}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </ScrollView>
                        </View>
                      )}

                      {/* === Moderator picker (single, parmi les speakers de la session) === */}
                      {session.session_type === 'panel' && (session.speaker_indices || []).length > 0 && (
                        <View style={styles.inputGroup}>
                          <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step4.moderatorLabel')}</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.chipContainer}>
                              <TouchableOpacity
                                style={[styles.chip, themed.chip, (session.moderator_index ?? null) === null && [styles.chipActive, themed.chipActive]]}
                                onPress={() => onUpdateSession(index, 'moderator_index', null)}
                              >
                                <Text style={[styles.chipText, themed.chipText, (session.moderator_index ?? null) === null && [styles.chipTextActive, themed.chipTextActive]]}>
                                  {t('componentsOrganizer.step4.noModerator')}
                                </Text>
                              </TouchableOpacity>
                              {(session.speaker_indices || []).map((sIdx) => {
                                const speaker = speakers[sIdx];
                                if (!speaker) return null;
                                const isSelected = session.moderator_index === sIdx;
                                return (
                                  <TouchableOpacity
                                    key={sIdx}
                                    style={[styles.chip, themed.chip, isSelected && [styles.chipActive, themed.chipActive]]}
                                    onPress={() => onUpdateSession(index, 'moderator_index', sIdx)}
                                  >
                                    <Text style={[styles.chipText, themed.chipText, isSelected && [styles.chipTextActive, themed.chipTextActive]]}>
                                      {`${speaker.first_name} ${speaker.last_name}`.trim()}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </ScrollView>
                        </View>
                      )}

                      {/* === Resources [{title, url}] === */}
                      <View style={styles.inputGroup}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={[styles.label, themed.label, { marginBottom: 0 }]}>{t('componentsOrganizer.step4.resourcesLabel')}</Text>
                          <TouchableOpacity
                            onPress={() => {
                              const next = [...(session.resources || []), { title: '', url: '' }];
                              onUpdateSession(index, 'resources', next);
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                          >
                            <Ionicons name="add-circle" size={18} color={colors.primary} />
                            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                              {t('componentsOrganizer.step4.addResource')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {(session.resources || []).map((rawRes, rIdx) => {
                          // Defensif : un draft ancien peut contenir resources en string[]
                          // (ancien format). On lit/ecrit toujours en {title, url}.
                          const res = typeof rawRes === 'string'
                            ? { title: rawRes, url: '' }
                            : (rawRes || { title: '', url: '' });
                          return (
                          <View key={rIdx} style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                            <TextInput
                              style={[styles.input, themed.input, { flex: 1 }]}
                              value={res.title}
                              onChangeText={(v) => {
                                const next = [...(session.resources || [])];
                                next[rIdx] = { ...res, title: v };
                                onUpdateSession(index, 'resources', next);
                              }}
                              placeholder={t('componentsOrganizer.step4.resourceTitlePlaceholder')}
                              placeholderTextColor={colors.gray400}
                            />
                            <TextInput
                              style={[styles.input, themed.input, { flex: 1.4 }]}
                              value={res.url}
                              onChangeText={(v) => {
                                const next = [...(session.resources || [])];
                                next[rIdx] = { ...res, url: v };
                                onUpdateSession(index, 'resources', next);
                              }}
                              placeholder="https://..."
                              placeholderTextColor={colors.gray400}
                              keyboardType="url"
                              autoCapitalize="none"
                            />
                            <TouchableOpacity
                              onPress={() => {
                                const next = (session.resources || []).filter((_, i) => i !== rIdx);
                                onUpdateSession(index, 'resources', next);
                              }}
                              style={{ justifyContent: 'center' }}
                            >
                              <Ionicons name="close-circle" size={20} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                          );
                        })}
                      </View>

                    </View>
                  )}
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={[styles.addAnotherButton, themed.addAnotherButton]} onPress={onAddSession}>
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text style={[styles.addAnotherText, themed.addAnotherText]}>{t('componentsOrganizer.step4.addAnotherSession')}</Text>
          </TouchableOpacity>
        </>
      ))}
    </View>
  );
}
