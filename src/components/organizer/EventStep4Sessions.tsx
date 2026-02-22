import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/theme';
import { SessionForm, SESSION_TYPES } from '../../hooks/useEventForm';
import styles from './eventCreateStyles';

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
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Sessions (optionnel)</Text>
      <Text style={styles.stepDescription}>Ajoutez des sessions \u00e0 votre \u00e9v\u00e9nement</Text>

      {/* Info box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
        <Text style={styles.infoBoxText}>
          Cette \u00e9tape est optionnelle. Vous pouvez ajouter des sessions plus tard depuis votre tableau de bord.
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Titre de la session *</Text>
                <TextInput
                  style={styles.input}
                  value={session.title}
                  onChangeText={(value) => onUpdateSession(index, 'title', value)}
                  placeholder="Ex: Conf\u00e9rence inaugurale"
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
                <Text style={styles.label}>Lieu/Salle</Text>
                <TextInput
                  style={styles.input}
                  value={session.location}
                  onChangeText={(value) => onUpdateSession(index, 'location', value)}
                  placeholder="Ex: Salle A, Amphith\u00e9\u00e2tre"
                  placeholderTextColor={Colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textAreaSmall]}
                  value={session.description}
                  onChangeText={(value) => onUpdateSession(index, 'description', value)}
                  placeholder="D\u00e9crivez le contenu de cette session"
                  placeholderTextColor={Colors.gray400}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Capacit\u00e9 maximale</Text>
                <TextInput
                  style={styles.input}
                  value={session.max_capacity}
                  onChangeText={(value) => onUpdateSession(index, 'max_capacity', value)}
                  placeholder="Ex: 100"
                  placeholderTextColor={Colors.gray400}
                  keyboardType="numeric"
                />
              </View>
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
