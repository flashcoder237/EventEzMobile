import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { seatingAPI, floorPlansAPI } from '../../api/client';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../ui/LoadingOverlay';

interface SeatingZone {
  id: string;
  name: string;
  color?: string;
  capacity: number;
  reserved_count?: number;
  price_modifier?: number;
}

interface SeatingPlan {
  id: string;
  name: string;
  description?: string;
  total_seats: number;
  reserved_seats?: number;
  is_active?: boolean;
  zones?: SeatingZone[];
}

interface FloorPlanArea {
  id: string;
  name: string;
  area_type: string;
  color?: string;
}

interface FloorPlan {
  id: string;
  name: string;
  description?: string;
  image?: string;
  width?: number;
  height?: number;
  is_published?: boolean;
  areas?: FloorPlanArea[];
}

interface VenueTabProps {
  eventId: string;
}

export default function VenueTab({ eventId }: VenueTabProps) {
  const { colors, isDark } = useTheme();
  const [seatingPlans, setSeatingPlans] = useState<SeatingPlan[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [seatLabel, setSeatLabel] = useState('');
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [seatingRes, floorRes] = await Promise.all([
        seatingAPI.getPlans({ event: eventId }),
        floorPlansAPI.getByEvent(eventId).catch(() => ({ data: [] })),
      ]);
      setSeatingPlans(seatingRes.data?.results || seatingRes.data || []);
      setFloorPlans(floorRes.data?.results || floorRes.data || []);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement venue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async () => {
    if (!selectedPlan || !selectedZone || !seatLabel.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    setReserving(true);
    try {
      await seatingAPI.createReservation({
        seating_plan: selectedPlan,
        zone: selectedZone,
        seat_label: seatLabel.trim(),
      });
      Alert.alert('Succes', 'Votre place a ete reservee !');
      setSeatLabel('');
      setSelectedZone('');
      fetchData();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Erreur lors de la reservation';
      Alert.alert('Erreur', msg);
    } finally {
      setReserving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.emptyTab}>
        <LoadingSpinner />
        <Text style={[styles.emptyTabText, { color: colors.gray500 }]}>Chargement du plan...</Text>
      </View>
    );
  }

  if (seatingPlans.length === 0 && floorPlans.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Placement</Text>
        <View style={styles.emptyTab}>
          <Ionicons name="map-outline" size={40} color={colors.gray300} />
          <Text style={[styles.emptyTabText, { color: colors.gray500 }]}>Aucun plan de salle pour cet evenement</Text>
        </View>
      </View>
    );
  }

  const currentPlan = seatingPlans.find((p) => p.id === selectedPlan);

  return (
    <View style={styles.section}>
      {/* Seating Plans */}
      {seatingPlans.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Plans de salle</Text>
          {seatingPlans.map((plan) => {
            const reserved = plan.reserved_seats || 0;
            const total = plan.total_seats || 0;
            const available = total - reserved;
            const pct = total > 0 ? Math.round((reserved / total) * 100) : 0;

            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, { backgroundColor: colors.gray50 }, selectedPlan === plan.id && { borderColor: colors.primary }]}
                onPress={() => {
                  setSelectedPlan(plan.id === selectedPlan ? '' : plan.id);
                  setSelectedZone('');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, { color: colors.gray900 }]}>{plan.name}</Text>
                  <View style={styles.availBadge}>
                    <Text style={styles.availBadgeText}>
                      {available} dispo.
                    </Text>
                  </View>
                </View>
                {plan.description && (
                  <Text style={[styles.planDescription, { color: colors.gray500 }]} numberOfLines={2}>{plan.description}</Text>
                )}

                {/* Capacity bar */}
                <View style={styles.capacityRow}>
                  <Text style={[styles.capacityText, { color: colors.gray500 }]}>{reserved} / {total} ({pct}%)</Text>
                </View>
                <View style={[styles.capacityBar, { backgroundColor: colors.gray200 }]}>
                  <View
                    style={[
                      styles.capacityFill,
                      { width: `${pct}%` },
                      pct >= 100 && { backgroundColor: Colors.error },
                    ]}
                  />
                </View>

                {/* Zones */}
                {plan.zones && plan.zones.length > 0 && (
                  <View style={styles.zonesRow}>
                    {plan.zones.map((zone) => (
                      <TouchableOpacity
                        key={zone.id}
                        style={[
                          styles.zoneBadge,
                          {
                            backgroundColor: zone.color ? `${zone.color}20` : colors.gray100,
                            borderColor: selectedZone === zone.id ? (zone.color || colors.primary) : 'transparent',
                            borderWidth: selectedPlan === plan.id ? 1.5 : 0,
                          },
                        ]}
                        onPress={() => {
                          if (selectedPlan === plan.id) {
                            setSelectedZone(zone.id === selectedZone ? '' : zone.id);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.zoneBadgeText,
                            { color: zone.color || colors.gray600 },
                          ]}
                        >
                          {zone.name} ({zone.capacity - (zone.reserved_count || 0)} dispo.)
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Reservation form */}
          {selectedPlan && (
            <View style={[styles.reserveCard, { backgroundColor: colors.gray50 }]}>
              <Text style={[styles.reserveTitle, { color: colors.gray900 }]}>Reserver une place</Text>
              <View style={styles.reserveForm}>
                {!selectedZone && currentPlan?.zones && currentPlan.zones.length > 0 && (
                  <Text style={styles.reserveHint}>Selectionnez une zone ci-dessus</Text>
                )}
                <TextInput
                  style={[styles.reserveInput, { backgroundColor: colors.surface, borderColor: colors.gray200, color: colors.gray900 }]}
                  placeholder="Numero de siege (ex: A12)"
                  placeholderTextColor={colors.gray400}
                  value={seatLabel}
                  onChangeText={setSeatLabel}
                />
                <TouchableOpacity
                  style={[styles.reserveButton, (!selectedZone || !seatLabel.trim()) && styles.reserveButtonDisabled]}
                  onPress={handleReserve}
                  disabled={reserving || !selectedZone || !seatLabel.trim()}
                  activeOpacity={0.8}
                >
                  {reserving ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.reserveButtonText}>Reserver</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}

      {/* Floor Plans */}
      {floorPlans.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.gray900 }, seatingPlans.length > 0 && { marginTop: Spacing.lg }]}>
            Plans d'etage
          </Text>
          {floorPlans.map((fp) => (
            <View key={fp.id} style={[styles.floorPlanCard, { backgroundColor: colors.gray50 }]}>
              <Text style={[styles.planName, { color: colors.gray900 }]}>{fp.name}</Text>
              {fp.description && (
                <Text style={[styles.planDescription, { color: colors.gray500 }]} numberOfLines={2}>{fp.description}</Text>
              )}
              {fp.image && (
                <Image
                  source={fp.image}
                  style={[styles.floorPlanImage, { backgroundColor: colors.surface }]}
                  contentFit="contain"
                  cachePolicy="disk"
                  transition={200}
                />
              )}
              {fp.areas && fp.areas.length > 0 && (
                <View style={styles.zonesRow}>
                  {fp.areas.map((area) => (
                    <View
                      key={area.id}
                      style={[
                        styles.zoneBadge,
                        { backgroundColor: area.color ? `${area.color}20` : colors.gray100 },
                      ]}
                    >
                      <Text style={[styles.zoneBadgeText, { color: area.color || colors.gray600 }]}>
                        {area.name} ({area.area_type})
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.floorPlanMeta}>
                {fp.width && fp.height && (
                  <View style={[styles.metaBadge, { backgroundColor: colors.gray200 }]}>
                    <Text style={[styles.metaBadgeText, { color: colors.gray600 }]}>{fp.width} x {fp.height}</Text>
                  </View>
                )}
                {fp.is_published && (
                  <View style={[styles.metaBadge, { backgroundColor: Colors.successLight }]}>
                    <Text style={[styles.metaBadgeText, { color: Colors.success }]}>Publie</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </>
      )}
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
  planCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: Colors.primary,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  planName: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    flex: 1,
  },
  availBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  availBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.success,
  },
  planDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  capacityRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  capacityText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  capacityBar: {
    height: 6,
    backgroundColor: Colors.gray200,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  capacityFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  zonesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  zoneBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  zoneBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
  },
  // Reservation form
  reserveCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  reserveTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  reserveForm: {
    gap: Spacing.sm,
  },
  reserveHint: {
    fontSize: FontSizes.sm,
    color: Colors.warning,
    fontFamily: FontFamily.medium,
  },
  reserveInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
  },
  reserveButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reserveButtonDisabled: {
    opacity: 0.5,
  },
  reserveButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  // Floor Plans
  floorPlanCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  floorPlanImage: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  floorPlanMeta: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  metaBadge: {
    backgroundColor: Colors.gray200,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  metaBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
});
