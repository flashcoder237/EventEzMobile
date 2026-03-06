import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
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
import { calculateServiceFee, getServiceFeeLabel } from '../../constants/payment';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TicketPurchaseRouteProp = RouteProp<RootStackParamList, 'TicketPurchase'>;

interface TicketSelection {
  ticketTypeId: string;
  quantity: number;
}

export default function TicketPurchaseScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TicketPurchaseRouteProp>();
  const { eventId, ticketTypeId, registrationId, additionalTickets } = route.params;
  const { showAlert, showSuccess, showError, showConfirm } = useAlert();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { config: commissionConfig, currency: commissionCurrency } = useCommissionConfig();

  // Mode d'édition: modifier une inscription existante
  const isEditMode = !!registrationId;
  // Mode achat supplémentaire: acheter des billets en plus
  const isAdditionalMode = !!additionalTickets;

  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [selections, setSelections] = useState<Map<string, number>>(new Map());
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [existingRegistration, setExistingRegistration] = useState<any>(null);
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
      const [eventRes, ticketsRes, myRegsRes] = await Promise.all([
        eventsAPI.getEvent(eventId),
        ticketTypesAPI.getTicketTypes({ event: eventId }),
        registrationsAPI.getMyRegistrations(),
      ]);

      const eventData = eventRes.data;
      setEvent(eventData);
      setTicketTypes(ticketsRes.data.results || ticketsRes.data || []);

      // Check for existing active registration
      const myRegistrations = myRegsRes.data?.results || myRegsRes.data || [];
      const existingReg = myRegistrations.find((reg: any) => {
        const regEventId = reg.event_detail?.id || reg.event_id || reg.event;
        const isForThisEvent = regEventId === eventId || String(regEventId) === eventId;
        const isActive = reg.status !== 'cancelled' && reg.status !== 'rejected';
        return isForThisEvent && isActive;
      });

      if (existingReg) {
        setExistingRegistration(existingReg);

        // En mode édition, pré-remplir les sélections avec les billets existants
        if (isEditMode && existingReg.tickets && existingReg.tickets.length > 0) {
          const initialSelections = new Map<string, number>();
          existingReg.tickets.forEach((ticket: any) => {
            const ticketTypeId = typeof ticket.ticket_type === 'object'
              ? ticket.ticket_type.id
              : ticket.ticket_type;
            initialSelections.set(String(ticketTypeId), ticket.quantity || 1);
          });
          setSelections(initialSelections);
        }

        // En mode édition, pré-remplir les données de formulaire
        if (isEditMode && existingReg.form_data) {
          setFormData(existingReg.form_data);
        }
      }

      // Set form fields if available
      if (eventData.form_fields && eventData.form_fields.length > 0) {
        setFormFields(eventData.form_fields);
      }

      // Pre-select if ticketTypeId is provided
      if (ticketTypeId && !isEditMode) {
        setSelections(new Map([[ticketTypeId, 1]]));
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      showError('Erreur', 'Impossible de charger les informations');
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
      const ticketType = ticketTypes.find(t => String(t.id) === String(ticketTypeId));
      if (ticketType) {
        total += ticketType.price * quantity;
      }
    });
    return total;
  };

  // Estimation côté client basée sur la valeur retournée par le backend (appliedDiscount.value).
  // Le montant final exact sera calculé par le backend lors de la création de l'inscription.
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

  // Frais de service via config dynamique du backend
  const getServiceFee = () => {
    return calculateServiceFee(getTotalPrice(), commissionConfig);
  };

  const getGrandTotal = () => {
    return getTotalPrice() + getServiceFee();
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
      const data = response.data;

      if (data.valid && data.discount) {
        // Convertir value en number si nécessaire (peut être string depuis l'API)
        const discount = {
          ...data.discount,
          value: Number(data.discount.value) || 0
        };
        setAppliedDiscount(discount);
        setDiscountError(null);
        showSuccess('Succès', `Code promo "${discountCode}" appliqué !`);
      } else {
        setDiscountError(data.message || 'Ce code promo n\'est pas valide');
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
    // Protection contre double soumission
    if (submitting) {
      console.log('[TicketPurchase] Soumission ignorée - déjà en cours');
      return;
    }

    const isInscription = event?.event_type === 'inscription';
    const isBilletterie = event?.event_type === 'billetterie';

    // Vérifier si la date limite d'inscription est dépassée
    if (event?.registration_deadline) {
      const deadline = new Date(event.registration_deadline);
      if (deadline < new Date()) {
        showError('Inscription fermée', 'La date limite d\'inscription est dépassée');
        return;
      }
    }

    // Vérifier si l'événement est terminé
    if (event?.end_date) {
      const endDate = new Date(event.end_date);
      if (endDate < new Date()) {
        showError('Événement terminé', 'Cet événement est déjà terminé');
        return;
      }
    }

    // Validate tickets for billetterie
    if (isBilletterie && getTotalQuantity() === 0) {
      showAlert('Attention', 'Veuillez sélectionner au moins un billet', undefined, 'warning');
      return;
    }

    // Validate form fields if present
    if (formFields.length > 0 && !validateForm()) {
      showAlert('Attention', 'Veuillez remplir tous les champs obligatoires', undefined, 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // Préparer les billets
      const tickets: any[] = [];
      if (isBilletterie) {
        selections.forEach((quantity, ticketTypeId) => {
          tickets.push({
            ticket_type: parseInt(ticketTypeId),
            quantity,
          });
        });
      }

      let finalRegistrationId: string;
      let paymentRequired = false;

      // Mode édition: mettre à jour les billets existants
      if (isEditMode && registrationId) {
        const response = await registrationsAPI.updateTickets(registrationId, tickets);
        finalRegistrationId = registrationId;
        paymentRequired = response.data.registration?.payment_required || getTotalPrice() > 0;
        showSuccess('Succès', 'Vos billets ont été mis à jour');
      } else if (isAdditionalMode && existingRegistration) {
        // Mode achat supplémentaire: ajouter des billets à une inscription confirmée
        const response = await registrationsAPI.addTickets(existingRegistration.id, tickets);
        finalRegistrationId = existingRegistration.id;
        paymentRequired = response.data.payment_required || false;

        // Stocker les nouveaux billets pour les passer à l'écran de paiement
        const newTicketsData = response.data.new_tickets || [];
        const newTotalPrice = Number(response.data.total_price) || getTotalPrice();

        if (paymentRequired && newTicketsData.length > 0) {
          // Naviguer directement vers le paiement avec les nouveaux billets
          navigation.navigate('Payment', {
            registrationId: finalRegistrationId,
            newTickets: newTicketsData.map((t: any) => ({
              id: t.id,
              ticket_type_name: t.ticket_type_name || t.ticket_type?.name,
              quantity: Number(t.quantity) || 1,
              unit_price: Number(t.unit_price) || 0,
              total_price: Number(t.total_price) || 0,
            })),
            totalAmount: newTotalPrice,
          });
          return;
        }

        showSuccess('Succès', `${response.data.message || 'Billets ajoutés avec succès'}`);
      } else {
        // Mode création: créer une nouvelle inscription
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
          registrationData.tickets = tickets;

          // Add discount code if applied
          if (appliedDiscount) {
            registrationData.discount_code = appliedDiscount.code;
          }
        }

        const response = await registrationsAPI.createRegistration(registrationData);
        finalRegistrationId = response.data.id;
        paymentRequired = response.data.payment_required || getTotalPrice() > 0;
      }

      // Navigate based on payment requirements
      const totalPrice = isBilletterie ? getTotalPrice() : 0;

      if (paymentRequired || totalPrice > 0) {
        navigation.navigate('Payment', { registrationId: finalRegistrationId });
      } else {
        // Free event - confirm only if auto_approve is enabled
        // Confirmer automatiquement SEULEMENT si auto_approve_registrations est true
        // Sinon, laisser en pending_approval pour validation manuelle par l'organisateur
        if (event?.auto_approve_registrations !== false) {
          try {
            await registrationsAPI.patchRegistration(finalRegistrationId, { status: 'confirmed' });
          } catch (e) {
            console.log('Could not auto-confirm:', e);
          }
        }
        // Note: Si auto_approve_registrations=false, le backend a déjà mis status='pending_approval'

        navigation.navigate('PaymentSuccess', {
          paymentId: finalRegistrationId,
          eventType: event?.event_type,
          registrationStatus: 'confirmed',
          approvalStatus: event?.auto_approve_registrations === false ? 'pending' : 'approved',
          eventTitle: event?.title,
        });
      }
    } catch (error: any) {
      console.error('Erreur création inscription:', error);

      // Gérer le cas d'une inscription existante confirmée
      const errorData = error.response?.data;
      if (errorData && errorData.existing_registration) {
        // L'utilisateur a déjà une inscription confirmée
        showConfirm(
          'Déjà inscrit',
          errorData.message || 'Vous êtes déjà inscrit à cet événement.',
          () => {
            // Rediriger vers les détails de l'inscription ou acheter plus de billets
            navigation.navigate('TicketPurchase', {
              eventId,
              additionalTickets: true,
            });
          }
        );
      } else {
        showError(
          'Erreur',
          errorData?.detail || errorData?.message || 'Impossible de créer l\'inscription'
        );
      }
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
      <LoadingSpinner />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray900} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>
          {isEditMode
            ? event?.event_type === 'inscription' ? 'Modifier mon inscription' : 'Modifier mes billets'
            : isAdditionalMode
              ? event?.event_type === 'inscription' ? 'Inscription supplémentaire' : 'Billets supplémentaires'
              : event?.event_type === 'inscription'
                ? 'Inscription'
                : 'Sélectionner les billets'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={80}
      >
        {/* Event Summary */}
        <View style={[styles.eventSummary, { backgroundColor: colors.card }]}>
          <Text style={[styles.eventTitle, { color: colors.gray900 }]}>{event?.title}</Text>
          <View style={styles.eventMeta}>
            <View style={styles.eventMetaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={[styles.eventMetaText, { color: colors.gray600 }]}>
                {event?.start_date ? formatDate(event.start_date) : ''}
              </Text>
            </View>
            <View style={styles.eventMetaItem}>
              <Ionicons name="location-outline" size={16} color={colors.primary} />
              <Text style={[styles.eventMetaText, { color: colors.gray600 }]}>
                {event?.location_city || 'En ligne'}
              </Text>
            </View>
          </View>
        </View>

        {/* Existing Registration Warning - Ne pas afficher en mode édition ou achat supplémentaire */}
        {existingRegistration && !isEditMode && !isAdditionalMode && (
          <View style={[styles.existingRegWarning, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
            <View style={styles.existingRegHeader}>
              <Ionicons name="information-circle" size={24} color={colors.warning} />
              <Text style={[styles.existingRegTitle, { color: colors.gray900 }]}>
                Vous êtes déjà inscrit à cet événement
              </Text>
            </View>
            <Text style={[styles.existingRegText, { color: colors.gray600 }]}>
              {existingRegistration.registration_type === 'inscription'
                ? 'Votre inscription est '
                : 'Votre réservation est '}
              {existingRegistration.status === 'confirmed' ? 'confirmée' :
               existingRegistration.status === 'pending' ? 'en attente de paiement' :
               existingRegistration.approval_status === 'pending' ? 'en attente de validation' :
               existingRegistration.status}
            </Text>
            <View style={styles.existingRegActions}>
              {/* Bouton Voir ma réservation */}
              <TouchableOpacity
                style={[styles.viewRegButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
                onPress={() => {
                  if (existingRegistration.tickets && existingRegistration.tickets.length > 0) {
                    navigation.navigate('QRCode', { ticketId: existingRegistration.tickets[0].id });
                  } else {
                    navigation.navigate('RegistrationDetails', { registrationId: existingRegistration.id });
                  }
                }}
              >
                <Ionicons name="eye-outline" size={18} color={colors.primary} />
                <Text style={[styles.viewRegButtonText, { color: colors.primary }]}>Voir</Text>
              </TouchableOpacity>

              {/* Bouton Modifier (inscription pending) ou Acheter plus (inscription confirmée) */}
              {existingRegistration.status === 'pending' ? (
                <TouchableOpacity
                  style={[styles.viewRegButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
                  onPress={() => navigation.navigate('TicketPurchase', { eventId, registrationId: existingRegistration.id })}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={[styles.viewRegButtonText, { color: colors.primary }]}>Modifier</Text>
                </TouchableOpacity>
              ) : existingRegistration.status === 'confirmed' || existingRegistration.status === 'completed' ? (
                <TouchableOpacity
                  style={[styles.viewRegButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
                  onPress={() => navigation.navigate('TicketPurchase', { eventId, additionalTickets: true })}
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                  <Text style={[styles.viewRegButtonText, { color: colors.primary }]}>+ Billets</Text>
                </TouchableOpacity>
              ) : null}

              {/* Bouton Annuler */}
              <TouchableOpacity
                style={[styles.cancelRegButton, { backgroundColor: colors.card, borderColor: colors.error }]}
                onPress={() => {
                  showConfirm(
                    'Annuler l\'inscription',
                    'Voulez-vous vraiment annuler votre inscription à cet événement ?',
                    async () => {
                      try {
                        await registrationsAPI.cancelRegistration(existingRegistration.id);
                        setExistingRegistration(null);
                        showSuccess('Succès', 'Votre inscription a été annulée');
                      } catch (error) {
                        showError('Erreur', 'Impossible d\'annuler l\'inscription');
                      }
                    }
                  );
                }}
              >
                <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                <Text style={[styles.cancelRegButtonText, { color: colors.error }]}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Ticket Types - Only for billetterie */}
        {event?.event_type === 'billetterie' && (
        <View style={[styles.ticketsSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Types de billets</Text>
          {ticketTypes.length === 0 ? (
            <View style={styles.noTickets}>
              <Text style={[styles.noTicketsText, { color: colors.gray500 }]}>Aucun billet disponible</Text>
            </View>
          ) : (
            ticketTypes.map((ticketType) => {
              const quantity = selections.get(String(ticketType.id)) || 0;
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
                  style={[styles.ticketCard, { backgroundColor: colors.gray50 }, !isAvailable && styles.ticketCardUnavailable]}
                >
                  <View style={styles.ticketInfo}>
                    <Text style={[styles.ticketName, { color: colors.gray900 }]}>{ticketType.name}</Text>
                    {ticketType.description && (
                      <Text style={[styles.ticketDescription, { color: colors.gray500 }]} numberOfLines={2}>
                        {ticketType.description}
                      </Text>
                    )}
                    <View style={styles.ticketMeta}>
                      <Text style={[styles.ticketPrice, { color: colors.primary }]}>
                        {ticketType.price === 0 ? 'Gratuit' : `${ticketType.price.toLocaleString()} ${commissionCurrency}`}
                      </Text>
                      {availableQty > 0 && ticketType.quantity_total !== undefined && (
                        <Text style={[styles.ticketAvailability, { color: colors.gray500 }]}>
                          {availableQty} disponible{availableQty > 1 ? 's' : ''}
                        </Text>
                      )}
                      {!isAvailable && (
                        <Text style={[styles.ticketAvailability, { color: colors.error }]}>
                          Épuisé
                        </Text>
                      )}
                    </View>
                  </View>

                  {isAvailable ? (
                    <View style={styles.quantitySelector}>
                      <TouchableOpacity
                        style={[styles.quantityButton, { backgroundColor: colors.card, borderColor: colors.gray200 }, quantity === 0 && [styles.quantityButtonDisabled, { borderColor: colors.gray100 }]]}
                        onPress={() => updateQuantity(String(ticketType.id), -1)}
                        disabled={quantity === 0}
                      >
                        <Ionicons
                          name="remove"
                          size={20}
                          color={quantity === 0 ? colors.gray300 : colors.primary}
                        />
                      </TouchableOpacity>
                      <Text style={[styles.quantityValue, { color: colors.gray900 }]}>{quantity}</Text>
                      <TouchableOpacity
                        style={[styles.quantityButton, { backgroundColor: colors.card, borderColor: colors.gray200 }]}
                        onPress={() => updateQuantity(String(ticketType.id), 1)}
                      >
                        <Ionicons name="add" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.soldOutBadge, { backgroundColor: colors.errorLight }]}>
                      <Text style={[styles.soldOutText, { color: colors.error }]}>Épuisé</Text>
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
          <View style={[styles.discountSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Code promo</Text>
            {appliedDiscount ? (
              <View style={[styles.appliedDiscountCard, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
                <View style={styles.appliedDiscountInfo}>
                  <Ionicons name="pricetag" size={20} color={colors.success} />
                  <View style={styles.appliedDiscountText}>
                    <Text style={[styles.appliedDiscountCode, { color: colors.gray900 }]}>{appliedDiscount.code}</Text>
                    <Text style={[styles.appliedDiscountValue, { color: colors.success }]}>
                      {appliedDiscount.discount_type === 'percentage'
                        ? `-${appliedDiscount.value || 0}% (estimation)`
                        : `-${(appliedDiscount.value || 0).toLocaleString()} ${commissionCurrency} (estimation)`}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeDiscountButton}
                  onPress={handleRemoveDiscount}
                >
                  <Ionicons name="close-circle" size={24} color={colors.gray400} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.discountInputRow}>
                <TextInput
                  style={[styles.discountInput, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.gray900 }, discountError && [styles.discountInputError, { borderColor: colors.error }]]}
                  placeholder="Entrer le code promo"
                  placeholderTextColor={colors.gray400}
                  value={discountCode}
                  onChangeText={(text) => {
                    setDiscountCode(text.toUpperCase());
                    setDiscountError(null);
                  }}
                  autoCapitalize="characters"
                  editable={!validatingDiscount}
                />
                <TouchableOpacity
                  style={[styles.applyDiscountButton, { backgroundColor: colors.primary }, validatingDiscount && styles.applyDiscountButtonDisabled]}
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
              <Text style={[styles.discountErrorText, { color: colors.error }]}>{discountError}</Text>
            )}
          </View>
        )}

        {/* Dynamic Form Fields */}
        {formFields.length > 0 && (
          <View style={[styles.formSection, { backgroundColor: colors.card }]}>
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
          <View style={[styles.orderSummary, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Récapitulatif</Text>
            <View style={[styles.summaryCard, { backgroundColor: colors.gray50 }]}>
              {Array.from(selections.entries()).map(([ticketTypeId, quantity]) => {
                const ticketType = ticketTypes.find(t => String(t.id) === String(ticketTypeId));
                if (!ticketType) return null;

                return (
                  <View key={ticketTypeId} style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.gray600 }]}>
                      {ticketType.name} x {quantity}
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.gray900 }]}>
                      {(ticketType.price * quantity).toLocaleString()} {commissionCurrency}
                    </Text>
                  </View>
                );
              })}
              {appliedDiscount && (
                <>
                  <View style={[styles.summaryDivider, { backgroundColor: colors.gray200 }]} />
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.gray600 }]}>Sous-total</Text>
                    <Text style={[styles.summaryValue, { color: colors.gray900 }]}>
                      {getSubtotal().toLocaleString()} {commissionCurrency}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <View style={styles.discountLabelRow}>
                      <Ionicons name="pricetag" size={14} color={colors.success} />
                      <Text style={[styles.discountLabel, { color: colors.success }]}>
                        Réduction estimée ({appliedDiscount.code})
                      </Text>
                    </View>
                    <Text style={[styles.discountValue, { color: colors.success }]}>
                      ~-{getDiscountAmount().toLocaleString()} {commissionCurrency}
                    </Text>
                  </View>
                </>
              )}
              <View style={[styles.summaryDivider, { backgroundColor: colors.gray200 }]} />
              {getTotalPrice() > 0 && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.gray600 }]}>Sous-total</Text>
                    <Text style={[styles.summaryValue, { color: colors.gray900 }]}>
                      {getTotalPrice().toLocaleString()} {commissionCurrency}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.gray600 }]}>Frais de service ({getServiceFeeLabel(commissionConfig)})</Text>
                    <Text style={[styles.summaryValue, { color: colors.gray900 }]}>
                      {getServiceFee().toLocaleString()} {commissionCurrency}
                    </Text>
                  </View>
                  <View style={[styles.summaryDivider, { backgroundColor: colors.gray200 }]} />
                </>
              )}
              <View style={styles.summaryRow}>
                <Text style={[styles.totalLabel, { color: colors.gray900 }]}>Total</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>
                  {getGrandTotal().toLocaleString()} {commissionCurrency}
                </Text>
              </View>
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.gray100, paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.totalContainer}>
          {event?.event_type === 'billetterie' ? (
            <>
              <Text style={[styles.totalLabelBottom, { color: colors.gray500 }]}>Total</Text>
              <Text style={[styles.totalValueBottom, { color: colors.gray900 }]}>
                {getGrandTotal().toLocaleString()} {commissionCurrency}
              </Text>
              <Text style={[styles.totalQuantityBottom, { color: colors.gray500 }]}>
                {getTotalQuantity()} billet{getTotalQuantity() > 1 ? 's' : ''}
                {getServiceFee() > 0 ? ` · Frais inclus` : ''}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.totalLabelBottom, { color: colors.gray500 }]}>Inscription</Text>
              <Text style={[styles.totalValueBottom, { color: colors.gray900 }]}>
                {event?.is_free || !event?.base_price ? 'Gratuit' : `${(event?.base_price || 0).toLocaleString()} ${commissionCurrency}`}
              </Text>
            </>
          )}
        </View>
        <GradientButton
          title={
            submitting
              ? 'Traitement...'
              : isEditMode
                ? event?.event_type === 'inscription' ? 'Mettre à jour l\'inscription' : 'Mettre à jour les billets'
                : isAdditionalMode
                  ? event?.event_type === 'inscription' ? 'Ajouter une inscription' : 'Acheter des billets supplémentaires'
                  : event?.event_type === 'inscription'
                    ? "S'inscrire"
                    : 'Continuer'
          }
          onPress={handleProceed}
          disabled={(event?.event_type === 'billetterie' && getTotalQuantity() === 0) || submitting || (!isEditMode && !isAdditionalMode && !!existingRegistration)}
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
  // ===== EXISTING REGISTRATION WARNING =====
  existingRegWarning: {
    backgroundColor: Colors.warningLight,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  existingRegHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  existingRegTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    flex: 1,
  },
  existingRegText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginBottom: Spacing.md,
  },
  existingRegActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  viewRegButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  viewRegButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
  cancelRegButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  cancelRegButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.error,
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
