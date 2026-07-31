import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { discountsAPI, ticketTypesAPI, eventsAPI } from '../../api';
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
import { displayCurrency } from '../../lib/utils/priceFormatters';
import { centeredContent, FORM_MAX } from '../../constants/layout';

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
  const { t } = useTranslation();
  const { showSuccess, showError } = useAlert();
  const { colors, isDark } = useTheme();

  const isEditing = !!discountId;

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(isEditing);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  // Strategie "Event mono-devise" : la devise du code promo = devise de l'evenement
  const [eventCurrency, setEventCurrency] = useState<string>('XAF');
  const platformCurrency = displayCurrency(eventCurrency);

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
      const [ticketTypesRes, eventRes] = await Promise.all([
        ticketTypesAPI.getTicketTypes({ event: eventId }),
        eventsAPI.getEvent(eventId).catch(() => null),
      ]);
      setTicketTypes(ticketTypesRes.data?.results || ticketTypesRes.data || []);
      const ev: any = eventRes?.data;
      if (ev?.currency) setEventCurrency(String(ev.currency).toUpperCase());

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
      if (__DEV__) console.error('Erreur chargement données:', error);
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
      newErrors.code = t('organizer.discountForm.errCodeRequired');
    } else if (code.length > 20) {
      newErrors.code = t('organizer.discountForm.errCodeMax');
    }

    const numValue = parseFloat(value);
    if (!value || isNaN(numValue) || numValue <= 0) {
      newErrors.value = t('organizer.discountForm.errValuePositive');
    } else if (discountType === 'percentage' && numValue > 100) {
      newErrors.value = t('organizer.discountForm.errValueMaxPercent');
    }

    if (!validFrom) {
      newErrors.valid_from = t('organizer.discountForm.errStartRequired');
    }
    if (!validUntil) {
      newErrors.valid_until = t('organizer.discountForm.errEndRequired');
    }
    if (validFrom && validUntil && validFrom >= validUntil) {
      newErrors.valid_until = t('organizer.discountForm.errEndAfterStart');
    }

    const numMaxUses = parseInt(maxUses);
    if (!maxUses || isNaN(numMaxUses) || numMaxUses < 1) {
      newErrors.max_uses = t('organizer.discountForm.errMaxUsesMin');
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
        showSuccess(t('organizer.discountForm.updated'));
      } else {
        await discountsAPI.createDiscount(payload);
        showSuccess(t('organizer.discountForm.created'));
      }
      navigation.goBack();
    } catch (error: any) {
      const detail = error.response?.data?.code?.[0] || error.response?.data?.detail || '';
      if (detail.toLowerCase().includes('unique') || detail.toLowerCase().includes('existe')) {
        showError(t('organizer.discountForm.errCodeExists'));
      } else {
        showError(detail || t('organizer.discountForm.errSave'));
      }
      if (__DEV__) console.error('Erreur sauvegarde:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTicketType = (id: number) => {
    setSelectedTicketTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  if (fetchingData) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>-%</WatermarkNumeral>
        <View style={[styles.loadingContainer, { zIndex: 1 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>-%</WatermarkNumeral>

      {/* === EDITORIAL HEADER (tile) === */}
      <View
        style={[
          styles.headerE,
          {
            backgroundColor: colors.background,
            borderBottomColor: hairline,
          },
        ]}
      >
        <View style={styles.headerTopRowE}>
          <TouchableOpacity
            style={[styles.iconDiscE, { backgroundColor: colors.gray100 }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray600} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerEyebrowE, { color: colors.accent }]}>
              {isEditing ? t('organizer.discountForm.editEyebrow') : t('organizer.discountForm.newEyebrow')}
            </Text>
            <Text style={[styles.headerTitleE, { color: colors.text }]}>
              {isEditing ? t('organizer.discountForm.editTitle') : t('organizer.discountForm.newTitle')}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* === CODE === */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldEyebrow, { color: colors.accent }]}>{t('organizer.discountForm.step01')}</Text>
            <Text style={[styles.fieldTitle, { color: colors.text }]}>{t('organizer.discountForm.codeStepTitle')}</Text>
            <View style={styles.codeRow}>
              <TextInput
                style={[
                  styles.codeInputE,
                  { backgroundColor: colors.card, borderColor: errors.code ? '#FECACA' : hairline, color: colors.text },
                ]}
                value={code}
                onChangeText={(t) => {
                  setCode(t.toUpperCase());
                  setErrors(prev => ({ ...prev, code: '' }));
                }}
                placeholder={t('organizer.discountForm.codePlaceholder')}
                placeholderTextColor={colors.gray400}
                autoCapitalize="characters"
                maxLength={20}
              />
              <TouchableOpacity style={[styles.generateBtn, { backgroundColor: colors.primary }]} onPress={generateCode}>
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {errors.code ? (
              <View style={[styles.errorBox, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="warning" size={11} color="#DC2626" />
                <Text style={styles.errorTextE}>{errors.code}</Text>
              </View>
            ) : null}
          </View>

          {/* === TYPE === */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldEyebrow, { color: colors.accent }]}>{t('organizer.discountForm.step02')}</Text>
            <Text style={[styles.fieldTitle, { color: colors.text }]}>{t('organizer.discountForm.typeStepTitle')}</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: discountType === 'percentage' ? colors.primary : hairline,
                  },
                  discountType === 'percentage' && { ...colors.primary ? {} : {} },
                ]}
                onPress={() => setDiscountType('percentage')}
                activeOpacity={0.85}
              >
                <Text style={[styles.typeBigSign, { color: discountType === 'percentage' ? colors.primary : colors.gray400 }]}>%</Text>
                <Text style={[styles.typeLabel, { color: colors.text }]}>{t('organizer.discountForm.percentage')}</Text>
                <Text style={[styles.typeSub, { color: colors.gray500 }]}>{t('organizer.discountForm.percentageEx')}</Text>
                {discountType === 'percentage' && (
                  <View style={[styles.typeCheck, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: discountType === 'fixed' ? colors.primary : hairline,
                  },
                ]}
                onPress={() => setDiscountType('fixed')}
                activeOpacity={0.85}
              >
                <Text style={[styles.typeBigSign, { color: discountType === 'fixed' ? colors.primary : colors.gray400 }]}>{platformCurrency}</Text>
                <Text style={[styles.typeLabel, { color: colors.text }]}>{t('organizer.discountForm.fixedAmount')}</Text>
                <Text style={[styles.typeSub, { color: colors.gray500 }]}>{t('organizer.discountForm.fixedAmountEx')}</Text>
                {discountType === 'fixed' && (
                  <View style={[styles.typeCheck, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* === VALUE === */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldEyebrow, { color: colors.accent }]}>{t('organizer.discountForm.step03')}</Text>
            <Text style={[styles.fieldTitle, { color: colors.text }]}>
              {t('organizer.discountForm.valueStepTitle')}
            </Text>
            <View style={styles.valueInputRow}>
              <TextInput
                style={[
                  styles.inputE,
                  { backgroundColor: colors.card, borderColor: errors.value ? '#FECACA' : hairline, color: colors.text, flex: 1 },
                ]}
                value={value}
                onChangeText={(t) => {
                  setValue(t);
                  setErrors(prev => ({ ...prev, value: '' }));
                }}
                placeholder={discountType === 'percentage' ? '25' : '5000'}
                placeholderTextColor={colors.gray400}
                keyboardType="numeric"
              />
              <View style={[styles.valueSuffix, { backgroundColor: colors.gray100 }]}>
                <Text style={[styles.valueSuffixText, { color: colors.gray700 }]}>
                  {discountType === 'percentage' ? '%' : platformCurrency}
                </Text>
              </View>
            </View>
            {errors.value ? (
              <View style={[styles.errorBox, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="warning" size={11} color="#DC2626" />
                <Text style={styles.errorTextE}>{errors.value}</Text>
              </View>
            ) : null}
          </View>

          {/* === DATES === */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldEyebrow, { color: colors.accent }]}>{t('organizer.discountForm.step04')}</Text>
            <Text style={[styles.fieldTitle, { color: colors.text }]}>{t('organizer.discountForm.datesStepTitle')}</Text>
            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <DateTimePickerField
                  label={t('organizer.discountForm.startLabel')}
                  value={validFrom}
                  onChange={(date) => {
                    setValidFrom(date);
                    setErrors(prev => ({ ...prev, valid_from: '' }));
                  }}
                  placeholder={t('organizer.discountForm.startPlaceholder')}
                  error={errors.valid_from}
                />
              </View>
              <View style={{ flex: 1 }}>
                <DateTimePickerField
                  label={t('organizer.discountForm.endLabel')}
                  value={validUntil}
                  onChange={(date) => {
                    setValidUntil(date);
                    setErrors(prev => ({ ...prev, valid_until: '' }));
                  }}
                  minimumDate={validFrom}
                  placeholder={t('organizer.discountForm.endPlaceholder')}
                  error={errors.valid_until}
                />
              </View>
            </View>
          </View>

          {/* === MAX USES === */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldEyebrow, { color: colors.accent }]}>{t('organizer.discountForm.step05')}</Text>
            <Text style={[styles.fieldTitle, { color: colors.text }]}>{t('organizer.discountForm.maxUsesStepTitle')}</Text>
            <View style={styles.valueInputRow}>
              <TextInput
                style={[
                  styles.inputE,
                  { backgroundColor: colors.card, borderColor: errors.max_uses ? '#FECACA' : hairline, color: colors.text, flex: 1 },
                ]}
                value={maxUses}
                onChangeText={(t) => {
                  setMaxUses(t);
                  setErrors(prev => ({ ...prev, max_uses: '' }));
                }}
                placeholder="100"
                placeholderTextColor={colors.gray400}
                keyboardType="numeric"
              />
              <View style={[styles.valueSuffix, { backgroundColor: colors.gray100 }]}>
                <Text style={[styles.valueSuffixText, { color: colors.gray700 }]}>{t('organizer.discountForm.usesSuffix')}</Text>
              </View>
            </View>
            {errors.max_uses ? (
              <View style={[styles.errorBox, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="warning" size={11} color="#DC2626" />
                <Text style={styles.errorTextE}>{errors.max_uses}</Text>
              </View>
            ) : null}
          </View>

          {/* === TICKET TYPES === */}
          {ticketTypes.length > 0 && (
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldEyebrow, { color: colors.accent }]}>{t('organizer.discountForm.step06')}</Text>
              <Text style={[styles.fieldTitle, { color: colors.text }]}>{t('organizer.discountForm.ticketsStepTitle')}</Text>
              <Text style={[styles.fieldHintE, { color: colors.gray500 }]}>
                {t('organizer.discountForm.ticketsStepHint')}
              </Text>
              <View style={styles.ticketTypesList}>
                {ticketTypes.map((tt) => {
                  const selected = selectedTicketTypes.includes(Number(tt.id));
                  return (
                    <TouchableOpacity
                      key={tt.id}
                      style={[
                        styles.ticketTypeChipE,
                        {
                          backgroundColor: colors.card,
                          borderColor: selected ? colors.primary : hairline,
                        },
                      ]}
                      onPress={() => toggleTicketType(Number(tt.id))}
                      activeOpacity={0.85}
                    >
                      <View
                        style={[
                          styles.ticketTypeCheckbox,
                          {
                            backgroundColor: selected ? colors.primary : 'transparent',
                            borderColor: selected ? colors.primary : colors.gray300,
                          },
                        ]}
                      >
                        {selected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.ticketTypeNameE, { color: colors.text }]} numberOfLines={1}>
                          {tt.name}
                        </Text>
                        <Text style={[styles.ticketTypePriceE, { color: colors.gray500 }]}>
                          {tt.price.toLocaleString()} {platformCurrency}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* === SUBMIT === */}
          <TouchableOpacity
            style={[styles.submitPill, loading && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <View style={{ flex: 1 }}>
                  <Text style={styles.submitEyebrow}>{isEditing ? t('organizer.discountForm.submitEyebrowEdit') : t('organizer.discountForm.submitEyebrowCreate')}</Text>
                  <Text style={styles.submitLabel}>
                    {isEditing ? t('organizer.discountForm.submitEdit') : t('organizer.discountForm.submitCreate')}
                  </Text>
                </View>
                <View style={styles.submitArrow}>
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                </View>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </EditorialCanvas>
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
  headerEyebrow: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.white,
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
    ...centeredContent(FORM_MAX),
  },
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.gray600,
    marginBottom: Spacing.sm,
  },
  fieldHint: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    lineHeight: 16,
    color: Colors.gray400,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    fontSize: FontSizes.base,
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
    fontSize: 16,
  },
  generateButton: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: BorderRadius.xl,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xs,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    lineHeight: 16,
    color: Colors.error,
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
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
  },
  toggleOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    letterSpacing: -0.1,
    color: Colors.gray600,
  },
  toggleTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  ticketTypesList: {
    gap: Spacing.sm,
  },
  ticketTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
  },
  ticketTypeChipActive: {
    backgroundColor: '#F3E8FF',
    borderColor: Colors.primaryLight,
  },
  ticketTypeText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    letterSpacing: -0.1,
    color: Colors.gray600,
  },
  ticketTypeTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
  },
  submitContainer: {
    marginTop: Spacing.md,
  },

  // === EDITORIAL STYLES ===
  headerE: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRowE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconDiscE: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrowE: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitleE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 28,
    letterSpacing: -1.1,
    lineHeight: 32,
  },
  fieldEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fieldTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 20,
    letterSpacing: -0.6,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  fieldHintE: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -8,
    marginBottom: Spacing.sm,
  },
  inputE: {
    height: 50,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
  },
  codeInputE: {
    flex: 1,
    height: 56,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    letterSpacing: 3,
  },
  generateBtn: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 6,
  },
  errorTextE: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: '#DC2626',
    letterSpacing: -0.1,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'flex-start',
    gap: 6,
  },
  typeBigSign: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 36,
    letterSpacing: -1.5,
    lineHeight: 38,
  },
  typeLabel: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
    letterSpacing: -0.3,
    marginTop: 4,
  },
  typeSub: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  typeCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueSuffix: {
    height: 50,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueSuffixText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 1,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  ticketTypeChipE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  ticketTypeCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketTypeNameE: {
    fontFamily: FontFamily.displayBold,
    fontSize: 13,
    letterSpacing: -0.3,
    lineHeight: 16,
  },
  ticketTypePriceE: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  submitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    minHeight: 56,
    marginTop: Spacing.lg,
  },
  submitEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  submitLabel: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  submitArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginLeft: Spacing.sm,
  },
});
