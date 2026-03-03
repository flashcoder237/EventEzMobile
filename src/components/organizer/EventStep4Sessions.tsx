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

import { useTheme } from '../../contexts/ThemeContext';
import { SessionForm, SESSION_TYPES } from '../../hooks/useEventForm';
import DateTimePickerField from '../ui/DateTimePickerField';
import styles from './eventCreateStyles';
import { useEventCreateThemedStyles } from './useEventCreateThemedStyles';

// ============================================
// Constants
// ============================================

const LEVEL_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
];

const LANGUAGE_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'Anglais' },
  { value: 'es', label: 'Espagnol' },
  { value: 'de', label: 'Allemand' },
];

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
  const { colors, isDark } = useTheme();
  const themed = useEventCreateThemedStyles();
  const [advancedOpen, setAdvancedOpen] = useState<Record<number, boolean>>({});

  const toggleAdvanced = (index: number) => {
    setAdvancedOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const isBreakType = (type: string) => type === 'break' || type === 'lunch';

  return (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, themed.stepTitle]}>Sessions (optionnel)</Text>
      <Text style={[styles.stepDescription, themed.stepDescription]}>Ajoutez des sessions à votre événement</Text>

      {/* Info box */}
      <View style={[styles.infoBox, themed.infoBox]}>
        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
        <Text style={[styles.infoBoxText, themed.infoBoxText]}>
          Cette étape est optionnelle. Vous pouvez ajouter des sessions plus tard depuis votre tableau de bord.
        </Text>
      </View>

      {sessions.length === 0 ? (
        <View style={[styles.emptyContainer, themed.emptyContainer]}>
          <View style={[styles.emptyIcon, themed.emptyIcon]}>
            <Ionicons name="layers-outline" size={40} color={colors.gray400} />
          </View>
          <Text style={[styles.emptyTitle, themed.emptyTitle]}>Aucune session</Text>
          <Text style={[styles.emptyText, themed.emptyText]}>
            Cliquez sur "Ajouter une session" pour commencer
          </Text>
          <TouchableOpacity style={[styles.addButton, themed.addButton]} onPress={onAddSession}>
            <Ionicons name="add" size={20} color={colors.white} />
            <Text style={[styles.addButtonText, themed.addButtonText]}>Ajouter une session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {sessions.map((session, index) => (
            <View key={index} style={[styles.card, themed.card]}>
              <View style={[styles.cardHeader, themed.cardHeader]}>
                <Text style={[styles.cardTitle, themed.cardTitle]}>Session {index + 1}</Text>
                <TouchableOpacity onPress={() => onRemoveSession(index)}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>

              {/* === Section essentielle === */}

              <View style={styles.inputGroup}>
                <Text style={[styles.label, themed.label]}>Titre de la session *</Text>
                <TextInput
                  style={[styles.input, themed.input]}
                  value={session.title}
                  onChangeText={(value) => onUpdateSession(index, 'title', value)}
                  placeholder="Ex: Conférence inaugurale"
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, themed.label]}>Type de session</Text>
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
                <Text style={[styles.label, themed.label]}>Lieu/Bâtiment</Text>
                <TextInput
                  style={[styles.input, themed.input]}
                  value={session.location}
                  onChangeText={(value) => onUpdateSession(index, 'location', value)}
                  placeholder="Ex: Bâtiment principal"
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, themed.label]}>Salle</Text>
                <TextInput
                  style={[styles.input, themed.input]}
                  value={session.room}
                  onChangeText={(value) => onUpdateSession(index, 'room', value)}
                  placeholder="Ex: Salle A, Amphithéâtre"
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <DateTimePickerField
                  label="Heure de début"
                  value={session.start_time || undefined}
                  onChange={(date) => onUpdateSession(index, 'start_time', date)}
                  placeholder="Sélectionner date et heure de début"
                />
              </View>

              <View style={styles.inputGroup}>
                <DateTimePickerField
                  label="Heure de fin"
                  value={session.end_time || undefined}
                  onChange={(date) => onUpdateSession(index, 'end_time', date)}
                  minimumDate={session.start_time || undefined}
                  placeholder="Sélectionner date et heure de fin"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, themed.label]}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textAreaSmall, themed.input]}
                  value={session.description}
                  onChangeText={(value) => onUpdateSession(index, 'description', value)}
                  placeholder="Décrivez le contenu de cette session"
                  placeholderTextColor={colors.gray400}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, themed.label]}>Capacité maximale</Text>
                <TextInput
                  style={[styles.input, themed.input]}
                  value={session.max_capacity}
                  onChangeText={(value) => onUpdateSession(index, 'max_capacity', value)}
                  placeholder="Ex: 100"
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
                      Options avancées
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
                          <Text style={[styles.switchLabel, themed.switchLabel]}>Session virtuelle</Text>
                          <Text style={[styles.switchDescription, themed.switchDescription]}>Session en ligne / à distance</Text>
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
                          <Text style={[styles.label, themed.label]}>Lien de la session virtuelle</Text>
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
                        <Text style={[styles.label, themed.label]}>Niveau</Text>
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
                        <Text style={[styles.label, themed.label]}>Langue</Text>
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
                          <Text style={[styles.switchLabel, themed.switchLabel]}>Inscription requise</Text>
                          <Text style={[styles.switchDescription, themed.switchDescription]}>Les participants doivent s'inscrire</Text>
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
                          <Text style={[styles.switchLabel, themed.switchLabel]}>Mise en avant</Text>
                          <Text style={[styles.switchDescription, themed.switchDescription]}>Session principale (keynote...)</Text>
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
                        <Text style={[styles.label, themed.label]}>URL des slides</Text>
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
                        <Text style={[styles.label, themed.label]}>URL de l'enregistrement</Text>
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
                        <Text style={[styles.label, themed.label]}>Tags</Text>
                        <TextInput
                          style={[styles.input, themed.input]}
                          value={Array.isArray(session.tags) ? session.tags.join(', ') : ''}
                          onChangeText={(value) => {
                            const tagsArray = value.split(',').map(t => t.trim()).filter(Boolean);
                            onUpdateSession(index, 'tags', tagsArray);
                          }}
                          placeholder="Ex: react, javascript, web"
                          placeholderTextColor={colors.gray400}
                        />
                        <Text style={[styles.inputHint, themed.inputHint]}>Séparez les tags par des virgules</Text>
                      </View>

                    </View>
                  )}
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={[styles.addAnotherButton, themed.addAnotherButton]} onPress={onAddSession}>
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text style={[styles.addAnotherText, themed.addAnotherText]}>Ajouter une autre session</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
