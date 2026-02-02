import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { eventsAPI, ticketTypesAPI, registrationsAPI, discountsAPI } from '../../api/client';
import { Event, TicketType, RootStackParamList, FormField, Discount } from '../../types';
import GradientButton from '../../components/ui/GradientButton';
import DynamicFormFields from '../../components/forms/DynamicFormFields';
import {
  Colors,
  FontSizes,
  FontFamily,
  TextStyles,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TicketPurchaseRouteProp = RouteProp<RootStackParamList, 'TicketPurchase'>;

interface TicketSelection {
  ticketTypeId: string;
  quantity: number;
}

export default function TicketPurchaseScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TicketPurchaseRouteProp>();
  const { eventId, ticketTypeId } = route.params;

  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [selections, setSelections] = useState<Map<string, number>>(new Map());
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  // Discount state
  const [discountCode, setDiscountCode] = useState('');
  const [validatingDiscount, setValidatingDiscount] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const [eventRes, ticketsRes] = await Promise.all([
        eventsAPI.getEvent(eventId),
        ticketTypesAPI.getTicketTypes({ event: eventId }),
      ]);

      const eventData = eventRes.data;
      setEvent(eventData);
      setTicketTypes(ticketsRes.data.results || ticketsRes.data || []);

      // Set form fields if available
      if (eventData.form_fields && eventData.form_fields.length > 0) {
        setFormFields(eventData.form_fields);
      }

      // Pre-select if ticketTypeId is provided
      if (ticketTypeId) {
        setSelections(new Map([[ticketTypeId, 1]]));
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations');
    } finally {
      setLoading(false);
    }
  };

  const handleFormFieldChange = (fieldLabel: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldLabel]: value }));
    // Clear error when field is changed
    if (formErrors[fieldLabel]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldLabel];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    formFields.forEach(field => {
      if (field.required && !formData[field.label]) {
        errors[field.label] = 'Ce champ est requis';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateQuantity = (ticketTypeId: string, delta: number) => {
    const current = selections.get(ticketTypeId) || 0;
    const newQuantity = Math.max(0, Math.min(10, current + delta));
    const newSelections = new Map(selections);

    if (newQuantity === 0) {
      newSelections.delete(ticketTypeId);
    } else {
      newSelections.set(ticketTypeId, newQuantity);
    }

    setSelections(newSelections);
  };

  const getSubtotal = () => {
    let total = 0;
    selections.forEach((quantity, ticketTypeId) => {
      const ticketType = ticketTypes.find(t => t.id === ticketTypeId);
      if (ticketType) {
        total += ticketType.price * quantity;
      }
    });
    return total;
  };

  const getDiscountAmount = () => {
    if (!appliedDiscount) return 0;
    const subtotal = getSubtotal();
    if (appliedDiscount.discount_type === 'percentage') {
      return Math.round((subtotal * appliedDiscount.value) / 100);
    }
    return Math.min(appliedDiscount.value, subtotal);
  };

  const getTotalPrice = () => {
    return Math.max(0, getSubtotal() - getDiscountAmount());
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError('Veuillez entrer un code promo');
      return;
    }

    setValidatingDiscount(true);
    setDiscountError(null);

    try {
      const response = await discountsAPI.validateDiscount(discountCode.trim(), eventId);
      const discount = response.data;

      if (discount && discount.is_active !== false) {
        setAppliedDiscount(discount);
        setDiscountError(null);
        Alert.alert('Succès', `Code promo "${discountCode}" appliqué !`);
      } else {
        setDiscountError('Ce code promo n\'est pas valide');
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || error.response?.data?.message || 'Code promo invalide ou expiré';
      setDiscountError(message);
      setAppliedDiscount(null);
    } finally {
      setValidatingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
    setDiscountError(null);
  };

  const getTotalQuantity = () => {
    let total = 0;
    selections.forEach((quantity) => {
      total += quantity;
    });
    return total;
  };

  const handleProceed = async () => {
    const isInscription = event?.event_type === 'inscription';
    const isBilletterie = event?.event_type === 'billetterie';

    // Validate tickets for billetterie
    if (isBilletterie && getTotalQuantity() === 0) {
      Alert.alert('Attention', 'Veuillez sélectionner au moins un billet');
      return;
    }

    // Validate form fields if present
    if (formFields.length > 0 && !validateForm()) {
      Alert.alert('Attention', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      // Build registration data
      const registrationData: any = {
        event: eventId,
        registration_type: event?.event_type || 'billetterie',
      };

      // Add form data if present
      if (formFields.length > 0) {
        registrationData.form_data = formData;
      }

      // Add tickets for billetterie
      if (isBilletterie) {
        const tickets: any[] = [];
        selections.forEach((quantity, ticketTypeId) => {
          tickets.push({
            ticket_type: parseInt(ticketTypeId),
            quantity,
          });
        });
        registrationData.tickets = tickets;

        // Add discount code if applied
        if (appliedDiscount) {
          registrationData.discount_code = appliedDiscount.code;
        }
      }

      const response = await registrationsAPI.createRegistration(registrationData);
      const registrationId = response.data.id;

      // Navigate based on payment requirements
      const totalPrice = isBilletterie ? getTotalPrice() : (event?.base_price || 0);

      if (totalPrice > 0) {
        navigation.navigate('Payment', { registrationId });
      } else {
        // Free event - confirm and go to success
        const registrationData = response.data;
        try {
          await registrationsAPI.patchRegistration(registrationId, { status: 'confirmed' });
        } catch (e) {
          console.log('Could not auto-confirm:', e);
        }
        navigation.navigate('PaymentSuccess', {
          paymentId: registrationId,
          eventType: event?.event_type,
          registrationStatus: registrationData.status,
          approvalStatus: registrationData.approval_status,
          eventTitle: event?.title,
        });
      }
    } catch (error: any) {
      console.error('Erreur création inscription:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || error.response?.data?.message || 'Impossible de créer l\'inscription'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {event?.event_type === 'inscription' ? 'Inscription' : 'Sélectionner les billets'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Summary */}
        <View style={styles.eventSummary}>
          <Text style={styles.eventTitle}>{event?.title}</Text>
          <View style={styles.eventMeta}>
            <View style={styles.eventMetaItem}>
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
              <Text style={styles.eventMetaText}>
                {event?.start_date ? formatDate(event.start_date) : ''}
              </Text>
            </View>
            <View style={styles.eventMetaItem}>
              <Ionicons name="location-outline" size={16} color={Colors.primary} />
              <Text style={styles.eventMetaText}>
                {event?.location_city || 'En ligne'}
              </Text>
            </View>
          </View>
        </View>

        {/* Ticket Types - Only for billetterie */}
        {event?.event_type === 'billetterie' && (
        <View style={styles.ticketsSection}>
          <Text style={styles.sectionTitle}>Types de billets</Text>
          {ticketTypes.length === 0 ? (
            <View style={styles.noTickets}>
              <Text style={styles.noTicketsText}>Aucun billet disponible</Text>
            </View>
          ) : (
            ticketTypes.map((ticketType) => {
              const quantity = selections.get(ticketType.id) || 0;
              // Calculate available quantity - try multiple field names for backend compatibility
              const availableQty = typeof ticketType.quantity_available === 'number'
                ? ticketType.quantity_available
                : typeof (ticketType as any).available_quantity === 'number'
                ? (ticketType as any).available_quantity
                : (ticketType.quantity_total || 0) - (ticketType.quantity_sold || 0);
              const isAvailable = availableQty > 0 || (ticketType.quantity_total === undefined && ticketType.quantity_sold === undefined);

              return (
                <View
                  key={ticketType.id}
                  style={[styles.ticketCard, !isAvailable && styles.ticketCardUnavailable]}
                >
                  <View style={styles.ticketInfo}>
                    <Text style={styles.ticketName}>{ticketType.name}</Text>
                    {ticketType.description && (
                      <Text style={styles.ticketDescription} numberOfLines={2}>
                        {ticketType.description}
                      </Text>
                    )}
                    <View style={styles.ticketMeta}>
                      <Text style={styles.ticketPrice}>
                        {ticketType.price === 0 ? 'Gratuit' : `${ticketType.price.toLocaleString()} FCFA`}
                      </Text>
                      {availableQty > 0 && ticketType.quantity_total !== undefined && (
                        <Text style={styles.ticketAvailability}>
                          {availableQty} disponible{availableQty > 1 ? 's' : ''}
                        </Text>
                      )}
                      {!isAvailable && (
                        <Text style={[styles.ticketAvailability, { color: Colors.error }]}>
                          Épuisé
                        </Text>
                      )}
                    </View>
                  </View>

                  {isAvailable ? (
                    <View style={styles.quantitySelector}>
                      <TouchableOpacity
                        style={[styles.quantityButton, quantity === 0 && styles.quantityButtonDisabled]}
                        onPress={() => updateQuantity(ticketType.id, -1)}
                        disabled={quantity === 0}
                      >
                        <Ionicons
                          name="remove"
                          size={20}
                          color={quantity === 0 ? Colors.gray300 : Colors.primary}
                        />
                      </TouchableOpacity>
                      <Text style={styles.quantityValue}>{quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(ticketType.id, 1)}
                      >
                        <Ionicons name="add" size={20} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.soldOutBadge}>
                      <Text style={styles.soldOutText}>Épuisé</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
        )}

        {/* Discount Code Section */}
        {event?.event_type === 'billetterie' && getTotalQuantity() > 0 && (
          <View style={styles.discountSection}>
            <Text style={styles.sectionTitle}>Code promo</Text>
            {appliedDiscount ? (
              <View style={styles.appliedDiscountCard}>
                <View style={styles.appliedDiscountInfo}>
                  <Ionicons name="pricetag" size={20} color={Colors.success} />
                  <View style={styles.appliedDiscountText}>
                    <Text style={styles.appliedDiscountCode}>{appliedDiscount.code}</Text>
                    <Text style={styles.appliedDiscountValue}>
                      {appliedDiscount.discount_type === 'percentage'
                        ? `-${appliedDiscount.value}%`
                        : `-${appliedDiscount.value.toLocaleString()} FCFA`}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeDiscountButton}
                  onPress={handleRemoveDiscount}
                >
                  <Ionicons name="close-circle" size={24} color={Colors.gray400} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.discountInputRow}>
                <TextInput
                  style={[styles.discountInput, discountError && styles.discountInputError]}
                  placeholder="Entrer le code promo"
                  placeholderTextColor={Colors.gray400}
                  value={discountCode}
                  onChangeText={(text) => {
                    setDiscountCode(text.toUpperCase());
                    setDiscountError(null);
                  }}
                  autoCapitalize="characters"
                  editable={!validatingDiscount}
                />
                <TouchableOpacity
                  style={[styles.applyDiscountButton, validatingDiscount && styles.applyDiscountButtonDisabled]}
                  onPress={handleApplyDiscount}
                  disabled={validatingDiscount}
                >
                  {validatingDiscount ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.applyDiscountText}>Appliquer</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
            {discountError && (
              <Text style={styles.discountErrorText}>{discountError}</Text>
            )}
          </View>
        )}

        {/* Dynamic Form Fields */}
        {formFields.length > 0 && (
          <View style={styles.formSection}>
            <DynamicFormFields
              formFields={formFields}
              formData={formData}
              onFieldChange={handleFormFieldChange}
              errors={formErrors}
            />
          </View>
        )}

        {/* Order Summary */}
        {getTotalQuantity() > 0 && (
          <View style={styles.orderSummary}>
            <Text style={styles.sectionTitle}>Récapitulatif</Text>
            <View style={styles.summaryCard}>
              {Array.from(selections.entries()).map(([ticketTypeId, quantity]) => {
                const ticketType = ticketTypes.find(t => t.id === ticketTypeId);
                if (!ticketType) return null;

                return (
                  <View key={ticketTypeId} style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      {ticketType.name} x {quantity}
                    </Text>
                    <Text style={styles.summaryValue}>
                      {(ticketType.price * quantity).toLocaleString()} FCFA
                    </Text>
                  </View>
                );
              })}
              {appliedDiscount && (
                <>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Sous-total</Text>
                    <Text style={styles.summaryValue}>
                      {getSubtotal().toLocaleString()} FCFA
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <View style={styles.discountLabelRow}>
                      <Ionicons name="pricetag" size={14} color={Colors.success} />
                      <Text style={styles.discountLabel}>
                        Réduction ({appliedDiscount.code})
                      </Text>
                    </View>
                    <Text style={styles.discountValue}>
                      -{getDiscountAmount().toLocaleString()} FCFA
                    </Text>
                  </View>
                </>
              )}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  {getTotalPrice().toLocaleString()} FCFA
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.totalContainer}>
          {event?.event_type === 'billetterie' ? (
            <>
              <Text style={styles.totalLabelBottom}>Total</Text>
              <Text style={styles.totalValueBottom}>
                {getTotalPrice().toLocaleString()} FCFA
              </Text>
              <Text style={styles.totalQuantityBottom}>
                {getTotalQuantity()} billet{getTotalQuantity() > 1 ? 's' : ''}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.totalLabelBottom}>Inscription</Text>
              <Text style={styles.totalValueBottom}>
                {event?.is_free || !event?.base_price ? 'Gratuit' : `${(event?.base_price || 0).toLocaleString()} FCFA`}
              </Text>
            </>
          )}
        </View>
        <GradientButton
          title={submitting ? 'Traitement...' : (event?.event_type === 'inscription' ? "S'inscrire" : 'Continuer')}
          onPress={handleProceed}
          disabled={(event?.event_type === 'billetterie' && getTotalQuantity() === 0) || submitting}
          icon={
            submitting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="arrow-forward" size={20} color={Colors.white} />
            )
          }
          style={styles.ctaButton}
        />
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  // ===== HEADER =====
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 130,
  },
  // ===== EVENT SUMMARY =====
  eventSummary: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  eventTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  eventMetaText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  // ===== TICKETS SECTION =====
  ticketsSection: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  noTickets: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  noTicketsText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  // ===== TICKET CARD =====
  ticketCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  ticketCardUnavailable: {
    opacity: 0.5,
  },
  ticketInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  ticketName: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  ticketDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 4,
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  ticketPrice: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.displayBold,
    color: Colors.primary,
  },
  ticketAvailability: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  // ===== QUANTITY SELECTOR =====
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  quantityButtonDisabled: {
    borderColor: Colors.gray100,
  },
  quantityValue: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    minWidth: 30,
    textAlign: 'center',
  },
  soldOutBadge: {
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  soldOutText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.error,
  },
  // ===== DISCOUNT SECTION =====
  discountSection: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  discountInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  discountInput: {
    flex: 1,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.medium,
    color: Colors.gray900,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  discountInputError: {
    borderColor: Colors.error,
  },
  applyDiscountButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  applyDiscountButtonDisabled: {
    opacity: 0.7,
  },
  applyDiscountText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  discountErrorText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    marginTop: Spacing.sm,
  },
  appliedDiscountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  appliedDiscountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  appliedDiscountText: {
    marginLeft: Spacing.xs,
  },
  appliedDiscountCode: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  appliedDiscountValue: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.success,
  },
  removeDiscountButton: {
    padding: Spacing.xs,
  },
  discountLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  discountLabel: {
    fontSize: FontSizes.sm,
    color: Colors.success,
    fontFamily: FontFamily.medium,
  },
  discountValue: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.success,
  },
  // ===== FORM SECTION =====
  formSection: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  // ===== ORDER SUMMARY =====
  orderSummary: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  summaryCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  summaryLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  summaryValue: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray900,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginVertical: Spacing.sm,
  },
  totalLabel: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  totalValue: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.primary,
  },
  // ===== BOTTOM BAR =====
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  totalContainer: {},
  totalLabelBottom: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  totalValueBottom: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
  },
  totalQuantityBottom: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  ctaButton: {
    minWidth: 150,
  },
});
