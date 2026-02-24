import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { volunteersAPI } from '../../api/client';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import { LoadingSpinner } from '../ui/LoadingOverlay';

interface VolunteerRole {
  id: string;
  title: string;
  description?: string;
  responsibilities?: string[];
  max_volunteers: number;
  is_active: boolean;
  accepted_count?: number;
  is_full?: boolean;
}

interface VolunteersTabProps {
  eventId: string;
}

export default function VolunteersTab({ eventId }: VolunteersTabProps) {
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [applyingRole, setApplyingRole] = useState<string | null>(null);
  const [motivation, setMotivation] = useState('');
  const [availability, setAvailability] = useState('');
  const [experience, setExperience] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myApplications, setMyApplications] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, appsRes] = await Promise.all([
        volunteersAPI.getRoles({ event: eventId }),
        volunteersAPI.getMyApplications().catch(() => ({ data: [] })),
      ]);
      const rolesData = rolesRes.data?.results || rolesRes.data || [];
      setRoles(rolesData.filter((r: VolunteerRole) => r.is_active));

      const appsData = appsRes.data?.results || appsRes.data || [];
      setMyApplications(appsData.map((a: any) => a.role));
    } catch (error) {
      console.error('Erreur chargement roles benevoles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (roleId: string) => {
    setSubmitting(true);
    try {
      await volunteersAPI.apply({
        role: roleId,
        motivation: motivation || undefined,
        availability: availability || undefined,
        experience: experience || undefined,
      });
      Alert.alert('Succes', 'Votre candidature a ete envoyee !');
      setMyApplications((prev) => [...prev, roleId]);
      setApplyingRole(null);
      setMotivation('');
      setAvailability('');
      setExperience('');
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Erreur lors de la candidature';
      Alert.alert('Erreur', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.emptyTab}>
        <LoadingSpinner />
        <Text style={styles.emptyTabText}>Chargement...</Text>
      </View>
    );
  }

  if (roles.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Benevoles</Text>
        <View style={styles.emptyTab}>
          <Ionicons name="people-outline" size={40} color={Colors.gray300} />
          <Text style={styles.emptyTabText}>Aucun poste de benevole pour cet evenement</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Postes de benevoles</Text>

      {roles.map((role) => {
        const hasApplied = myApplications.includes(role.id);
        const isFull = role.is_full;
        const spotsLeft = role.max_volunteers - (role.accepted_count || 0);
        const isExpanded = expandedRole === role.id;
        const isApplying = applyingRole === role.id;
        const pct = Math.min(100, ((role.accepted_count || 0) / role.max_volunteers) * 100);

        return (
          <View key={role.id} style={styles.roleCard}>
            <TouchableOpacity
              style={styles.roleHeader}
              onPress={() => setExpandedRole(isExpanded ? null : role.id)}
              activeOpacity={0.7}
            >
              <View style={styles.roleInfo}>
                <Text style={styles.roleTitle}>{role.title}</Text>
                {role.description && (
                  <Text style={styles.roleDescription} numberOfLines={isExpanded ? undefined : 2}>
                    {role.description}
                  </Text>
                )}
              </View>
              <View style={styles.roleStatus}>
                {hasApplied ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#DBEAFE' }]}>
                    <Ionicons name="time-outline" size={12} color="#3B82F6" />
                    <Text style={[styles.statusBadgeText, { color: '#3B82F6' }]}>Envoye</Text>
                  </View>
                ) : isFull ? (
                  <View style={[styles.statusBadge, { backgroundColor: Colors.errorLight }]}>
                    <Text style={[styles.statusBadgeText, { color: Colors.error }]}>Complet</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: Colors.successLight }]}>
                    <Text style={[styles.statusBadgeText, { color: Colors.success }]}>
                      {spotsLeft} place{spotsLeft !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.gray400}
                />
              </View>
            </TouchableOpacity>

            {/* Capacity bar */}
            <View style={styles.capacityBarContainer}>
              <View style={styles.capacityBar}>
                <View
                  style={[
                    styles.capacityFill,
                    { width: `${pct}%` },
                    isFull && { backgroundColor: Colors.error },
                  ]}
                />
              </View>
              <Text style={styles.capacityText}>
                {role.accepted_count || 0} / {role.max_volunteers}
              </Text>
            </View>

            {/* Expanded content */}
            {isExpanded && (
              <View style={styles.expandedContent}>
                {/* Responsibilities */}
                {role.responsibilities && role.responsibilities.length > 0 && (
                  <View style={styles.responsibilitiesSection}>
                    <Text style={styles.subsectionTitle}>Responsabilites</Text>
                    {role.responsibilities.map((resp, idx) => (
                      <View key={idx} style={styles.responsibilityRow}>
                        <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                        <Text style={styles.responsibilityText}>{resp}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Apply form or button */}
                {!hasApplied && !isFull && (
                  <>
                    {isApplying ? (
                      <View style={styles.applyForm}>
                        <Text style={styles.subsectionTitle}>Postuler</Text>
                        <TextInput
                          style={[styles.applyInput, styles.applyTextarea]}
                          placeholder="Pourquoi souhaitez-vous etre benevole ?"
                          placeholderTextColor={Colors.gray400}
                          multiline
                          numberOfLines={3}
                          value={motivation}
                          onChangeText={setMotivation}
                          textAlignVertical="top"
                        />
                        <TextInput
                          style={styles.applyInput}
                          placeholder="Disponibilite (ex: Samedi 9h-18h)"
                          placeholderTextColor={Colors.gray400}
                          value={availability}
                          onChangeText={setAvailability}
                        />
                        <TextInput
                          style={styles.applyInput}
                          placeholder="Experience (ex: 2 ans evenementiel)"
                          placeholderTextColor={Colors.gray400}
                          value={experience}
                          onChangeText={setExperience}
                        />
                        <View style={styles.applyActions}>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                              setApplyingRole(null);
                              setMotivation('');
                              setAvailability('');
                              setExperience('');
                            }}
                          >
                            <Text style={styles.cancelButtonText}>Annuler</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.submitButton}
                            onPress={() => handleApply(role.id)}
                            disabled={submitting}
                          >
                            {submitting ? (
                              <ActivityIndicator size="small" color={Colors.white} />
                            ) : (
                              <>
                                <Ionicons name="send" size={16} color={Colors.white} />
                                <Text style={styles.submitButtonText}>Envoyer</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.applyButton}
                        onPress={() => setApplyingRole(role.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="hand-left-outline" size={18} color={Colors.white} />
                        <Text style={styles.applyButtonText}>Devenir benevole</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  subsectionTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
  },
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyTabText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.md,
  },
  roleCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roleInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  roleTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    lineHeight: 18,
  },
  roleStatus: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
  },
  capacityBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  capacityBar: {
    flex: 1,
    height: 5,
    backgroundColor: Colors.gray200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  capacityText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    fontFamily: FontFamily.medium,
  },
  expandedContent: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    paddingTop: Spacing.md,
  },
  responsibilitiesSection: {
    marginBottom: Spacing.md,
  },
  responsibilityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  responsibilityText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 18,
  },
  // Apply Button
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  applyButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  // Apply Form
  applyForm: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  applyInput: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
  },
  applyTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  applyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  cancelButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  cancelButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    minWidth: 100,
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
});
