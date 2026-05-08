import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { SessionForm, SESSION_TYPES } from '../../hooks/useEventForm';
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
}

// ============================================
// Component
// ============================================

export default function EventStep4Sessions({
  sessions,
  onAddSession,
  onUpdateSession,
  onRemoveSession,
}: EventStep4SessionsProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const themed = useEventCreateThemedStyles();
  const [advancedOpen, setAdvancedOpen] = useState<Record<number, boolean>>({});

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

      {sessions.length === 0 ? (
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

                      {/* Niveau */}
                      <View style={styles.inputGroup}>
                        <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step4.levelLabel')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={styles.chipContainer}>
                            {LEVEL_OPTIONS.map((opt) => (
                              <TouchableOpacity
                                key={opt.value}
                                style={[
                                  styles.chip, themed.chip,
                                  session.level === opt.value && [styles.chipActive, themed.chipActive],
                                ]}
                                onPress={() => onUpdateSession(index, 'level', opt.value)}
                              >
                                <Text
                                  style={[
                                    styles.chipText, themed.chipText,
                                    session.level === opt.value && [styles.chipTextActive, themed.chipTextActive],
                                  ]}
                                >
                                  {opt.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>
                      </View>

                      {/* Langue */}
                      <View style={styles.inputGroup}>
                        <Text style={[styles.label, themed.label]}>{t('componentsOrganizer.step4.languageLabel')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={styles.chipContainer}>
                            {LANGUAGE_OPTIONS.map((opt) => (
                              <TouchableOpacity
                                key={opt.value}
                                style={[
                                  styles.chip, themed.chip,
                                  session.language === opt.value && [styles.chipActive, themed.chipActive],
                                ]}
                                onPress={() => onUpdateSession(index, 'language', opt.value)}
                              >
                                <Text
                                  style={[
                                    styles.chipText, themed.chipText,
                                    session.language === opt.value && [styles.chipTextActive, themed.chipTextActive],
                                  ]}
                                >
                                  {opt.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>
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
      )}
    </View>
  );
}
