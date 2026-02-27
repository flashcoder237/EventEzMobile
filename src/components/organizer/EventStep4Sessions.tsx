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

import { Colors } from '../../constants/theme';
import { SessionForm, SESSION_TYPES } from '../../hooks/useEventForm';
import DateTimePickerField from '../ui/DateTimePickerField';
import styles from './eventCreateStyles';

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
  const [advancedOpen, setAdvancedOpen] = useState<Record<number, boolean>>({});

  const toggleAdvanced = (index: number) => {
    setAdvancedOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const isBreakType = (type: string) => type === 'break' || type === 'lunch';

  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Sessions (optionnel)</Text>
      <Text style={styles.stepDescription}>Ajoutez des sessions à votre événement</Text>

      {/* Info box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
        <Text style={styles.infoBoxText}>
          Cette étape est optionnelle. Vous pouvez ajouter des sessions plus tard depuis votre tableau de bord.
        </Text>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="layers-outline" size={40} color={Colors.gray400} />
          </View>
          <Text style={styles.emptyTitle}>Aucune session</Text>
          <Text style={styles.emptyText}>
            Cliquez sur "Ajouter une session" pour commencer
          </Text>
          <TouchableOpacity style={styles.addButton} onPress={onAddSession}>
            <Ionicons name="add" size={20} color={Colors.white} />
            <Text style={styles.addButtonText}>Ajouter une session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {sessions.map((session, index) => (
            <View key={index} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Session {index + 1}</Text>
                <TouchableOpacity onPress={() => onRemoveSession(index)}>
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>

              {/* === Section essentielle === */}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Titre de la session *</Text>
                <TextInput
                  style={styles.input}
                  value={session.title}
                  onChangeText={(value) => onUpdateSession(index, 'title', value)}
                  placeholder="Ex: Conférence inaugurale"
                  placeholderTextColor={Colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Type de session</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    {SESSION_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.chip,
                          session.session_type === type.value && styles.chipActive,
                        ]}
                        onPress={() => onUpdateSession(index, 'session_type', type.value)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            session.session_type === type.value && styles.chipTextActive,
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
                <Text style={styles.label}>Lieu/Bâtiment</Text>
                <TextInput
                  style={styles.input}
                  value={session.location}
                  onChangeText={(value) => onUpdateSession(index, 'location', value)}
                  placeholder="Ex: Bâtiment principal"
                  placeholderTextColor={Colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Salle</Text>
                <TextInput
                  style={styles.input}
                  value={session.room}
                  onChangeText={(value) => onUpdateSession(index, 'room', value)}
                  placeholder="Ex: Salle A, Amphithéâtre"
                  placeholderTextColor={Colors.gray400}
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
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textAreaSmall]}
                  value={session.description}
                  onChangeText={(value) => onUpdateSession(index, 'description', value)}
                  placeholder="Décrivez le contenu de cette session"
                  placeholderTextColor={Colors.gray400}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Capacité maximale</Text>
                <TextInput
                  style={styles.input}
                  value={session.max_capacity}
                  onChangeText={(value) => onUpdateSession(index, 'max_capacity', value)}
                  placeholder="Ex: 100"
                  placeholderTextColor={Colors.gray400}
                  keyboardType="numeric"
                />
              </View>

              {/* === Options avancées (cachées pour break/lunch) === */}
              {!isBreakType(session.session_type) && (
                <View style={{ marginTop: 8 }}>
                  <TouchableOpacity
                    style={styles.advancedToggle}
                    onPress={() => toggleAdvanced(index)}
                  >
                    <Text style={styles.advancedToggleText}>
                      Options avancées
                    </Text>
                    <Ionicons
                      name={advancedOpen[index] ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={Colors.gray500}
                    />
                  </TouchableOpacity>

                  {advancedOpen[index] && (
                    <View style={styles.advancedContent}>

                      {/* Session virtuelle */}
                      <View style={styles.switchRow}>
                        <View style={styles.switchContent}>
                          <Text style={styles.switchLabel}>Session virtuelle</Text>
                          <Text style={styles.switchDescription}>Session en ligne / à distance</Text>
                        </View>
                        <Switch
                          value={session.is_virtual}
                          onValueChange={(value) => onUpdateSession(index, 'is_virtual', value)}
                          trackColor={{ false: Colors.gray200, true: Colors.primary }}
                          thumbColor={Colors.white}
                        />
                      </View>

                      {session.is_virtual && (
                        <View style={styles.inputGroup}>
                          <Text style={styles.label}>Lien de la session virtuelle</Text>
                          <TextInput
                            style={styles.input}
                            value={session.virtual_link}
                            onChangeText={(value) => onUpdateSession(index, 'virtual_link', value)}
                            placeholder="https://meet.google.com/..."
                            placeholderTextColor={Colors.gray400}
                            keyboardType="url"
                            autoCapitalize="none"
                          />
                        </View>
                      )}

                      {/* Niveau */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Niveau</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={styles.chipContainer}>
                            {LEVEL_OPTIONS.map((opt) => (
                              <TouchableOpacity
                                key={opt.value}
                                style={[
                                  styles.chip,
                                  session.level === opt.value && styles.chipActive,
                                ]}
                                onPress={() => onUpdateSession(index, 'level', opt.value)}
                              >
                                <Text
                                  style={[
                                    styles.chipText,
                                    session.level === opt.value && styles.chipTextActive,
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
                        <Text style={styles.label}>Langue</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={styles.chipContainer}>
                            {LANGUAGE_OPTIONS.map((opt) => (
                              <TouchableOpacity
                                key={opt.value}
                                style={[
                                  styles.chip,
                                  session.language === opt.value && styles.chipActive,
                                ]}
                                onPress={() => onUpdateSession(index, 'language', opt.value)}
                              >
                                <Text
                                  style={[
                                    styles.chipText,
                                    session.language === opt.value && styles.chipTextActive,
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
                      <View style={styles.switchRow}>
                        <View style={styles.switchContent}>
                          <Text style={styles.switchLabel}>Inscription requise</Text>
                          <Text style={styles.switchDescription}>Les participants doivent s'inscrire</Text>
                        </View>
                        <Switch
                          value={session.requires_registration}
                          onValueChange={(value) => onUpdateSession(index, 'requires_registration', value)}
                          trackColor={{ false: Colors.gray200, true: Colors.primary }}
                          thumbColor={Colors.white}
                        />
                      </View>

                      {/* Session mise en avant */}
                      <View style={styles.switchRow}>
                        <View style={styles.switchContent}>
                          <Text style={styles.switchLabel}>Mise en avant</Text>
                          <Text style={styles.switchDescription}>Session principale (keynote...)</Text>
                        </View>
                        <Switch
                          value={session.is_featured}
                          onValueChange={(value) => onUpdateSession(index, 'is_featured', value)}
                          trackColor={{ false: Colors.gray200, true: Colors.primary }}
                          thumbColor={Colors.white}
                        />
                      </View>

                      {/* URL des slides */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>URL des slides</Text>
                        <TextInput
                          style={styles.input}
                          value={session.slides_url}
                          onChangeText={(value) => onUpdateSession(index, 'slides_url', value)}
                          placeholder="https://..."
                          placeholderTextColor={Colors.gray400}
                          keyboardType="url"
                          autoCapitalize="none"
                        />
                      </View>

                      {/* URL de l'enregistrement */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>URL de l'enregistrement</Text>
                        <TextInput
                          style={styles.input}
                          value={session.recording_url}
                          onChangeText={(value) => onUpdateSession(index, 'recording_url', value)}
                          placeholder="https://..."
                          placeholderTextColor={Colors.gray400}
                          keyboardType="url"
                          autoCapitalize="none"
                        />
                      </View>

                      {/* Tags */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Tags</Text>
                        <TextInput
                          style={styles.input}
                          value={Array.isArray(session.tags) ? session.tags.join(', ') : ''}
                          onChangeText={(value) => {
                            const tagsArray = value.split(',').map(t => t.trim()).filter(Boolean);
                            onUpdateSession(index, 'tags', tagsArray);
                          }}
                          placeholder="Ex: react, javascript, web"
                          placeholderTextColor={Colors.gray400}
                        />
                        <Text style={styles.inputHint}>Séparez les tags par des virgules</Text>
                      </View>

                    </View>
                  )}
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addAnotherButton} onPress={onAddSession}>
            <Ionicons name="add" size={20} color={Colors.primary} />
            <Text style={styles.addAnotherText}>Ajouter une autre session</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
