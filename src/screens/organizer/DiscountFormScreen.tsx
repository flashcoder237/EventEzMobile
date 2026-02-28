import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';

import { useAlert } from '../../contexts/AlertContext';
import { discountsAPI, ticketTypesAPI } from '../../api/client';
import { RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import DateTimePickerField from '../../components/ui/DateTimePickerField';
import { GradientButton } from '../../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'DiscountForm'>;

interface TicketType {
  id: string;
  name: string;
  price: number;
}

export default function DiscountFormScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { eventId, discountId } = route.params;
  const { showSuccess, showError } = useAlert();

  const isEditing = !!discountId;

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(isEditing);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [validFrom, setValidFrom] = useState<Date | undefined>(undefined);
  const [validUntil, setValidUntil] = useState<Date | undefined>(undefined);
  const [maxUses, setMaxUses] = useState('');
  const [selectedTicketTypes, setSelectedTicketTypes] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [eventId, discountId]);

  const loadData = async () => {
    try {
      const ticketTypesRes = await ticketTypesAPI.getTicketTypes({ event: eventId });
      setTicketTypes(ticketTypesRes.data?.results || ticketTypesRes.data || []);

      if (isEditing && discountId) {
        const discountRes = await discountsAPI.getDiscount(String(discountId));
        const d = discountRes.data;
        setCode(d.code);
        setDiscountType(d.discount_type);
        setValue(String(d.value));
        setValidFrom(d.valid_from ? new Date(d.valid_from) : undefined);
        setValidUntil(d.valid_until ? new Date(d.valid_until) : undefined);
        setMaxUses(String(d.max_uses));
        setSelectedTicketTypes(d.applicable_ticket_types || []);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setFetchingData(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
    setErrors(prev => ({ ...prev, code: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!code.trim()) {
      newErrors.code = 'Le code est requis';
    } else if (code.length > 20) {
      newErrors.code = 'Max 20 caractères';
    }

    const numValue = parseFloat(value);
    if (!value || isNaN(numValue) || numValue <= 0) {
      newErrors.value = 'La valeur doit être > 0';
    } else if (discountType === 'percentage' && numValue > 100) {
      newErrors.value = 'Max 100%';
    }

    if (!validFrom) {
      newErrors.valid_from = 'Date de début requise';
    }
    if (!validUntil) {
      newErrors.valid_until = 'Date de fin requise';
    }
    if (validFrom && validUntil && validFrom >= validUntil) {
      newErrors.valid_until = 'Doit être après la date de début';
    }

    const numMaxUses = parseInt(maxUses);
    if (!maxUses || isNaN(numMaxUses) || numMaxUses < 1) {
      newErrors.max_uses = 'Minimum 1 utilisation';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        event: eventId,
        code: code.toUpperCase().trim(),
        discount_type: discountType,
        value: parseFloat(value),
        valid_from: validFrom!.toISOString(),
        valid_until: validUntil!.toISOString(),
        max_uses: parseInt(maxUses),
        applicable_ticket_types: selectedTicketTypes,
      };

      if (isEditing && discountId) {
        await discountsAPI.updateDiscount(String(discountId), payload);
        showSuccess('Code promo mis à jour');
      } else {
        await discountsAPI.createDiscount(payload);
        showSuccess('Code promo créé');
      }
      navigation.goBack();
    } catch (error: any) {
      const detail = error.response?.data?.code?.[0] || error.response?.data?.detail || '';
      if (detail.toLowerCase().includes('unique') || detail.toLowerCase().includes('existe')) {
        showError('Ce code promo existe déjà');
      } else {
        showError(detail || 'Erreur lors de la sauvegarde');
      }
      console.error('Erreur sauvegarde:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTicketType = (id: number) => {
    setSelectedTicketTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  if (fetchingData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Modifier le code' : 'Nouveau code promo'}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Code */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Code promo</Text>
            <View style={styles.codeRow}>
              <TextInput
                style={[styles.input, styles.codeInput, errors.code ? styles.inputError : null]}
                value={code}
                onChangeText={(t) => {
                  setCode(t.toUpperCase());
                  setErrors(prev => ({ ...prev, code: '' }));
                }}
                placeholder="EX: PROMO25"
                autoCapitalize="characters"
                maxLength={20}
              />
              <TouchableOpacity style={styles.generateButton} onPress={generateCode}>
                <Ionicons name="refresh" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            {errors.code ? <Text style={styles.errorText}>{errors.code}</Text> : null}
          </View>

          {/* Type toggle */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Type de réduction</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleOption, discountType === 'percentage' && styles.toggleOptionActive]}
                onPress={() => setDiscountType('percentage')}
              >
                <Ionicons
                  name="trending-down"
                  size={18}
                  color={discountType === 'percentage' ? Colors.white : Colors.gray600}
                />
                <Text style={[styles.toggleText, discountType === 'percentage' && styles.toggleTextActive]}>
                  Pourcentage (%)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleOption, discountType === 'fixed' && styles.toggleOptionActive]}
                onPress={() => setDiscountType('fixed')}
              >
                <Ionicons
                  name="cash-outline"
                  size={18}
                  color={discountType === 'fixed' ? Colors.white : Colors.gray600}
                />
                <Text style={[styles.toggleText, discountType === 'fixed' && styles.toggleTextActive]}>
                  Montant fixe (FCFA)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Value */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              Valeur {discountType === 'percentage' ? '(%)' : '(FCFA)'}
            </Text>
            <TextInput
              style={[styles.input, errors.value ? styles.inputError : null]}
              value={value}
              onChangeText={(t) => {
                setValue(t);
                setErrors(prev => ({ ...prev, value: '' }));
              }}
              placeholder={discountType === 'percentage' ? '25' : '5000'}
              keyboardType="numeric"
            />
            {errors.value ? <Text style={styles.errorText}>{errors.value}</Text> : null}
          </View>

          {/* Date début */}
          <View style={styles.fieldContainer}>
            <DateTimePickerField
              label="Date de début"
              value={validFrom}
              onChange={(date) => {
                setValidFrom(date);
                setErrors(prev => ({ ...prev, valid_from: '' }));
              }}
              placeholder="Sélectionner la date de début"
              error={errors.valid_from}
            />
          </View>

          {/* Date fin */}
          <View style={styles.fieldContainer}>
            <DateTimePickerField
              label="Date de fin"
              value={validUntil}
              onChange={(date) => {
                setValidUntil(date);
                setErrors(prev => ({ ...prev, valid_until: '' }));
              }}
              minimumDate={validFrom}
              placeholder="Sélectionner la date de fin"
              error={errors.valid_until}
            />
          </View>

          {/* Max uses */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Utilisations max</Text>
            <TextInput
              style={[styles.input, errors.max_uses ? styles.inputError : null]}
              value={maxUses}
              onChangeText={(t) => {
                setMaxUses(t);
                setErrors(prev => ({ ...prev, max_uses: '' }));
              }}
              placeholder="100"
              keyboardType="numeric"
            />
            {errors.max_uses ? <Text style={styles.errorText}>{errors.max_uses}</Text> : null}
          </View>

          {/* Ticket types */}
          {ticketTypes.length > 0 && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Tickets applicables</Text>
              <Text style={styles.fieldHint}>Laisser vide = tous les tickets</Text>
              <View style={styles.ticketTypesList}>
                {ticketTypes.map((tt) => {
                  const selected = selectedTicketTypes.includes(Number(tt.id));
                  return (
                    <TouchableOpacity
                      key={tt.id}
                      style={[styles.ticketTypeChip, selected && styles.ticketTypeChipActive]}
                      onPress={() => toggleTicketType(Number(tt.id))}
                    >
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={selected ? Colors.primary : Colors.gray400}
                      />
                      <Text style={[styles.ticketTypeText, selected && styles.ticketTypeTextActive]}>
                        {tt.name} — {tt.price.toLocaleString()} FCFA
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Submit */}
          <View style={styles.submitContainer}>
            <GradientButton
              title={loading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer le code promo'}
              onPress={handleSubmit}
              disabled={loading}
              icon={loading ? undefined : 'checkmark'}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray400,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: FontSizes.md,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
  },
  inputError: {
    borderColor: Colors.error,
  },
  codeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  codeInput: {
    flex: 1,
    letterSpacing: 2,
    fontFamily: FontFamily.bold,
  },
  generateButton: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: BorderRadius.lg,
  },
  errorText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.error,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  toggleOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  toggleTextActive: {
    color: Colors.white,
  },
  ticketTypesList: {
    gap: Spacing.sm,
  },
  ticketTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  ticketTypeChipActive: {
    backgroundColor: '#F3E8FF',
    borderColor: Colors.primaryLight,
  },
  ticketTypeText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
  },
  ticketTypeTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.medium,
  },
  submitContainer: {
    marginTop: Spacing.md,
  },
});
