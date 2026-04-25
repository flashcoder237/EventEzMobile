import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { eventsAPI, ticketTypesAPI, registrationsAPI, discountsAPI } from '../../api';
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
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';

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
  const { colors } = useTheme();
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
      if (__DEV__) console.error('Erreur chargement données:', error);
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
  // Si l'organisateur absorbe les frais, pas de frais pour le participant
  const feeBearer = (event as any)?.fee_bearer || 'participant';
  const getServiceFee = () => {
    if (feeBearer === 'organizer') return 0;
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
      if (__DEV__) console.log('[TicketPurchase] Soumission ignorée - déjà en cours');
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
      // Préparer les billets (avec code promo si appliqué)
      const tickets: any[] = [];
      if (isBilletterie) {
        selections.forEach((quantity, ticketTypeId) => {
          tickets.push({
            ticket_type: parseInt(ticketTypeId),
            quantity,
            ...(appliedDiscount ? { discount_code: appliedDiscount.code } : {}),
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
      } else if (isAdditionalMode && !existingRegistration) {
        // On est venu en mode "achat supplémentaire" mais aucune inscription
        // active n'a été trouvée -> ne PAS créer silencieusement une nouvelle
        // inscription, sinon on duplique. On stoppe avec un message clair.
        showError(
          'Inscription introuvable',
          'Impossible d\'ajouter des billets : aucune inscription active n\'a été trouvée pour cet événement.'
        );
        return;
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

        // Add tickets for billetterie. Le discount_code est désormais
        // propagé par billet (cf. construction de `tickets` ci-dessus) — c'est
        // ce que le backend lit. Pas besoin de le dupliquer au niveau racine.
        if (isBilletterie) {
          registrationData.tickets = tickets;
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
            if (__DEV__) console.log('Could not auto-confirm:', e);
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
      if (__DEV__) console.error('Erreur création inscription:', error);

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
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>BUY</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
      {/* === EDITORIAL HEADER (tile) === */}
      <View
        style={[
          styles.headerE,
          {
            backgroundColor: colors.background,
            borderBottomColor: 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <View style={styles.headerTopRowE}>
          <TouchableOpacity
            style={[styles.iconDiscE, { backgroundColor: colors.gray100 }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            accessibilityLabel="Retour"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray600} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerEyebrowE, { color: colors.accent }]}>
              {isEditMode ? 'MODIFIER' : isAdditionalMode ? 'AJOUTER' : event?.event_type === 'inscription' ? 'INSCRIPTION • RSVP' : 'BILLETTERIE • TIX'}
            </Text>
            <Text style={[styles.headerTitleE, { color: colors.text }]}>
              {isEditMode
                ? event?.event_type === 'inscription' ? 'Modifier inscr.' : 'Modifier billets'
                : isAdditionalMode
                  ? event?.event_type === 'inscription' ? 'Inscr. en plus' : 'Billets en plus'
                  : event?.event_type === 'inscription'
                    ? 'S\'inscrire'
                    : 'Choisir tes billets'}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={80}
      >
        {/* === EVENT SUMMARY CARD === */}
        <View style={[styles.eventSummaryE, { backgroundColor: colors.card, borderColor: 'rgba(0,0,0,0.06)' }, Shadows.sm]}>
          {event?.start_date && (() => {
            const d = new Date(event.start_date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase();
            return (
              <View style={[styles.eventDateTile, { backgroundColor: colors.primary }]}>
                <Text style={styles.eventDateDay}>{day}</Text>
                <Text style={styles.eventDateMonth}>{month}</Text>
              </View>
            );
          })()}
          <View style={{ flex: 1 }}>
            <Text style={[styles.eventCategoryEyebrow, { color: colors.accent }]} numberOfLines={1}>
              {(event?.category as any)?.name?.toUpperCase() || 'ÉVÉNEMENT'}
            </Text>
            <Text style={[styles.eventTitleE, { color: colors.text }]} numberOfLines={2}>
              {event?.title}
            </Text>
            <View style={styles.eventMetaRowE}>
              <Ionicons name="calendar-outline" size={11} color={colors.gray500} />
              <Text style={[styles.eventMetaTextE, { color: colors.gray600 }]} numberOfLines={1}>
                {event?.start_date ? formatDate(event.start_date) : ''}
              </Text>
              <View style={[styles.metaDotE, { backgroundColor: colors.gray300 }]} />
              <Ionicons name="location-outline" size={11} color={colors.gray500} />
              <Text style={[styles.eventMetaTextE, { color: colors.gray600 }]} numberOfLines={1}>
                {event?.location_city || 'En ligne'}
              </Text>
            </View>
          </View>
        </View>

        {/* === EXISTING REGISTRATION CALLOUT === */}
        {existingRegistration && !isEditMode && !isAdditionalMode && (
          <View style={[styles.existingRegE, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <View style={[styles.existingRail, { backgroundColor: '#F59E0B' }]} />
            <View style={styles.existingHeaderE}>
              <View style={[styles.existingIconWrap, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="information" size={14} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.existingEyebrowE}>DÉJÀ INSCRIT.E</Text>
                <Text style={styles.existingTitleE}>Tu participes déjà</Text>
              </View>
            </View>
            <Text style={styles.existingTextE}>
              {existingRegistration.registration_type === 'inscription'
                ? 'Votre inscription est '
                : 'Votre réservation est '}
              <Text style={{ fontFamily: FontFamily.bold }}>
                {existingRegistration.status === 'confirmed' ? 'confirmée' :
                 existingRegistration.status === 'pending' ? 'en attente de paiement' :
                 existingRegistration.approval_status === 'pending' ? 'en attente de validation' :
                 existingRegistration.status}
              </Text>
            </Text>
            <View style={styles.existingRegActions}>
              <TouchableOpacity
                style={[styles.regActionPillE, { backgroundColor: '#FFFFFF', borderColor: '#FCD34D' }]}
                onPress={() => {
                  if (existingRegistration.tickets && existingRegistration.tickets.length > 0) {
                    navigation.navigate('QRCode', { ticketId: existingRegistration.tickets[0].id });
                  } else {
                    navigation.navigate('RegistrationDetails', { registrationId: existingRegistration.id });
                  }
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="eye-outline" size={13} color="#92400E" />
                <Text style={styles.regActionPillTextE}>Voir</Text>
              </TouchableOpacity>

              {existingRegistration.status === 'pending' ? (
                <TouchableOpacity
                  style={[styles.regActionPillE, { backgroundColor: '#FFFFFF', borderColor: '#FCD34D' }]}
                  onPress={() => navigation.navigate('TicketPurchase', { eventId, registrationId: existingRegistration.id })}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={13} color="#92400E" />
                  <Text style={styles.regActionPillTextE}>Modifier</Text>
                </TouchableOpacity>
              ) : existingRegistration.status === 'confirmed' || existingRegistration.status === 'completed' ? (
                <TouchableOpacity
                  style={[styles.regActionPillE, { backgroundColor: '#FFFFFF', borderColor: '#FCD34D' }]}
                  onPress={() => navigation.navigate('TicketPurchase', { eventId, additionalTickets: true })}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={13} color="#92400E" />
                  <Text style={styles.regActionPillTextE}>+ Billets</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.regActionPillE, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
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
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={13} color="#DC2626" />
                <Text style={[styles.regActionPillTextE, { color: '#DC2626' }]}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* === TICKET TYPES (boarding-pass style) === */}
        {event?.event_type === 'billetterie' && (
        <View style={styles.ticketsSectionE}>
          <Text style={[styles.sectionEyebrowE, { color: colors.accent }]}>CHOIX • TIX</Text>
          <Text style={[styles.sectionTitleE, { color: colors.text }]}>Types de billets</Text>
          {ticketTypes.length === 0 ? (
            <View style={[styles.noTicketsE, { backgroundColor: colors.card, borderColor: 'rgba(0,0,0,0.06)' }]}>
              <Ionicons name="ticket-outline" size={36} color={colors.gray300} />
              <Text style={[styles.noTicketsTitleE, { color: colors.text }]}>Aucun billet disponible</Text>
              <Text style={[styles.noTicketsTextE, { color: colors.gray500 }]}>
                L'organisateur n'a pas encore créé de types de billets
              </Text>
            </View>
          ) : (
            ticketTypes.map((ticketType, idx) => {
              const quantity = selections.get(String(ticketType.id)) || 0;
              const availableQty = typeof ticketType.quantity_available === 'number'
                ? ticketType.quantity_available
                : typeof (ticketType as any).available_quantity === 'number'
                ? (ticketType as any).available_quantity
                : (ticketType.quantity_total || 0) - (ticketType.quantity_sold || 0);
              const isAvailable = availableQty > 0 || (ticketType.quantity_total === undefined && ticketType.quantity_sold === undefined);
              const isSelected = quantity > 0;
              const isFree = ticketType.price === 0;

              return (
                <View
                  key={ticketType.id}
                  style={[
                    styles.boardingPassCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isSelected ? colors.primary : 'rgba(0,0,0,0.06)',
                    },
                    isSelected ? Shadows.buttonPrimary : Shadows.sm,
                    !isAvailable && { opacity: 0.55 },
                  ]}
                >
                  {/* === LEFT: Ticket info === */}
                  <View style={styles.bpLeft}>
                    <View style={styles.bpTopRow}>
                      <View style={[styles.bpEyebrowPill, { backgroundColor: isFree ? '#10B98115' : `${colors.primary}15` }]}>
                        <View style={[styles.bpEyebrowDot, { backgroundColor: isFree ? '#10B981' : colors.primary }]} />
                        <Text style={[styles.bpEyebrowText, { color: isFree ? '#10B981' : colors.primary }]}>
                          {isFree ? 'GRATUIT' : `BILLET 0${idx + 1}`}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.bpTicketName, { color: colors.text }]} numberOfLines={1}>
                      {ticketType.name}
                    </Text>
                    {ticketType.description && (
                      <Text style={[styles.bpDescription, { color: colors.gray500 }]} numberOfLines={2}>
                        {ticketType.description}
                      </Text>
                    )}
                    <View style={styles.bpMetaRow}>
                      <Text style={[styles.bpPrice, { color: colors.text }]}>
                        {isFree ? 'GRATUIT' : `${ticketType.price.toLocaleString()}`}
                      </Text>
                      {!isFree && (
                        <Text style={[styles.bpCurrency, { color: colors.gray500 }]}>{commissionCurrency}</Text>
                      )}
                      {availableQty > 0 && ticketType.quantity_total !== undefined && (
                        <>
                          <View style={[styles.bpDot, { backgroundColor: colors.gray300 }]} />
                          <Ionicons name="people-outline" size={11} color={colors.gray500} />
                          <Text style={[styles.bpAvailability, { color: colors.gray500 }]}>
                            {availableQty} dispo
                          </Text>
                        </>
                      )}
                    </View>
                  </View>

                  {/* === DASHED PERFORATION === */}
                  <View style={styles.bpPerforation}>
                    <View style={[styles.bpNotchTop, { backgroundColor: colors.background }]} />
                    <View style={[styles.bpDashedLine, { borderColor: 'rgba(0,0,0,0.12)' }]} />
                    <View style={[styles.bpNotchBottom, { backgroundColor: colors.background }]} />
                  </View>

                  {/* === RIGHT: Quantity stub === */}
                  <View style={styles.bpRight}>
                    {isAvailable ? (
                      <>
                        <Text style={[styles.bpQtyEyebrow, { color: colors.gray400 }]}>QUANTITÉ</Text>
                        <View style={styles.bpQtyRow}>
                          <TouchableOpacity
                            style={[
                              styles.bpQtyBtn,
                              {
                                backgroundColor: quantity === 0 ? colors.gray100 : colors.primary,
                              },
                            ]}
                            onPress={() => updateQuantity(String(ticketType.id), -1)}
                            disabled={quantity === 0}
                            accessibilityLabel="Retirer un billet"
                            accessibilityRole="button"
                          >
                            <Ionicons
                              name="remove"
                              size={16}
                              color={quantity === 0 ? colors.gray400 : Colors.white}
                            />
                          </TouchableOpacity>
                          <Text style={[styles.bpQtyValue, { color: colors.text }]}>{quantity}</Text>
                          <TouchableOpacity
                            style={[styles.bpQtyBtn, { backgroundColor: colors.primary }]}
                            onPress={() => updateQuantity(String(ticketType.id), 1)}
                            accessibilityLabel="Ajouter un billet"
                            accessibilityRole="button"
                          >
                            <Ionicons name="add" size={16} color={Colors.white} />
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <View style={[styles.bpSoldOut, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                        <Text style={styles.bpSoldOutText}>ÉPUISÉ</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
        )}

        {/* === DISCOUNT CODE === */}
        {event?.event_type === 'billetterie' && getTotalQuantity() > 0 && (
          <View style={styles.discountSectionE}>
            <Text style={[styles.sectionEyebrowE, { color: colors.accent }]}>RÉDUCTION • DEAL</Text>
            <Text style={[styles.sectionTitleE, { color: colors.text }]}>Code promo</Text>
            {appliedDiscount ? (
              <View style={[styles.appliedDiscountE, { backgroundColor: colors.card, borderColor: '#10B981' }]}>
                <View style={[styles.appliedDiscountIcon, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="pricetag" size={16} color={Colors.white} />
                </View>
                <View style={styles.appliedDiscountText}>
                  <Text style={styles.appliedDiscountEyebrow}>CODE APPLIQUÉ</Text>
                  <Text style={[styles.appliedDiscountCode, { color: colors.text }]}>{appliedDiscount.code}</Text>
                  <Text style={styles.appliedDiscountValue}>
                    {appliedDiscount.discount_type === 'percentage'
                      ? `−${appliedDiscount.value || 0}% (estimation)`
                      : `−${(appliedDiscount.value || 0).toLocaleString()} ${commissionCurrency} (estimation)`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.removeDiscountButtonE, { backgroundColor: colors.gray100 }]}
                  onPress={handleRemoveDiscount}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={14} color={colors.gray600} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.discountInputRowE}>
                <TextInput
                  style={[
                    styles.discountInputE,
                    {
                      backgroundColor: colors.card,
                      borderColor: discountError ? '#FECACA' : 'rgba(0,0,0,0.06)',
                      color: colors.text,
                    },
                  ]}
                  placeholder="EX: WELCOME10"
                  placeholderTextColor={colors.gray400}
                  accessibilityLabel="Code promo"
                  value={discountCode}
                  onChangeText={(text) => {
                    setDiscountCode(text.toUpperCase());
                    setDiscountError(null);
                  }}
                  autoCapitalize="characters"
                  editable={!validatingDiscount}
                />
                <TouchableOpacity
                  style={[styles.applyDiscountButtonE, validatingDiscount && { opacity: 0.5 }, Shadows.buttonPrimary]}
                  onPress={handleApplyDiscount}
                  disabled={validatingDiscount}
                  activeOpacity={0.85}
                  accessibilityLabel="Appliquer le code promo"
                  accessibilityRole="button"
                >
                  {validatingDiscount ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.applyDiscountTextE}>OK</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
            {discountError && (
              <View style={[styles.discountErrorBox, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="warning" size={11} color="#DC2626" />
                <Text style={styles.discountErrorTextE}>{discountError}</Text>
              </View>
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

        {/* === ORDER SUMMARY (receipt style) === */}
        {getTotalQuantity() > 0 && (
          <View style={styles.orderSummaryE}>
            <Text style={[styles.sectionEyebrowE, { color: colors.accent }]}>FACTURE • RECAP</Text>
            <Text style={[styles.sectionTitleE, { color: colors.text }]}>Récapitulatif</Text>
            <View style={[styles.receiptCard, { backgroundColor: colors.card, borderColor: 'rgba(0,0,0,0.06)' }]}>
              {/* Receipt header strip */}
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptHeaderEyebrow}>EVENTEZ · COMMANDE</Text>
                <Text style={styles.receiptHeaderRef}>#{Date.now().toString().slice(-6)}</Text>
              </View>

              <View style={[styles.receiptDashed, { borderTopColor: 'rgba(0,0,0,0.12)' }]} />

              {Array.from(selections.entries()).map(([ticketTypeId, quantity]) => {
                const ticketType = ticketTypes.find(t => String(t.id) === String(ticketTypeId));
                if (!ticketType) return null;
                return (
                  <View key={ticketTypeId} style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: colors.gray700 }]} numberOfLines={1}>
                      {ticketType.name}
                      <Text style={{ color: colors.gray400 }}> × {quantity}</Text>
                    </Text>
                    <Text style={[styles.receiptValue, { color: colors.text }]}>
                      {(ticketType.price * quantity).toLocaleString()} {commissionCurrency}
                    </Text>
                  </View>
                );
              })}

              {appliedDiscount && (
                <>
                  <View style={[styles.receiptDashed, { borderTopColor: 'rgba(0,0,0,0.08)' }]} />
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: colors.gray500 }]}>Sous-total</Text>
                    <Text style={[styles.receiptValue, { color: colors.gray500 }]}>
                      {getSubtotal().toLocaleString()} {commissionCurrency}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <View style={styles.discountLabelRow}>
                      <Ionicons name="pricetag" size={11} color="#10B981" />
                      <Text style={[styles.discountLabel, { color: '#10B981' }]}>
                        {appliedDiscount.code}
                      </Text>
                    </View>
                    <Text style={[styles.discountValue, { color: '#10B981' }]}>
                      −{getDiscountAmount().toLocaleString()} {commissionCurrency}
                    </Text>
                  </View>
                </>
              )}

              {getTotalPrice() > 0 && (
                <>
                  <View style={[styles.receiptDashed, { borderTopColor: 'rgba(0,0,0,0.08)' }]} />
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: colors.gray500 }]}>Sous-total</Text>
                    <Text style={[styles.receiptValue, { color: colors.gray500 }]}>
                      {getTotalPrice().toLocaleString()} {commissionCurrency}
                    </Text>
                  </View>
                  {getServiceFee() > 0 && (
                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: colors.gray500 }]} numberOfLines={1}>
                        Frais service ({getServiceFeeLabel(commissionConfig)})
                      </Text>
                      <Text style={[styles.receiptValue, { color: colors.gray500 }]}>
                        {getServiceFee().toLocaleString()} {commissionCurrency}
                      </Text>
                    </View>
                  )}
                </>
              )}

              <View style={[styles.receiptDashedThick, { borderTopColor: 'rgba(0,0,0,0.18)' }]} />

              <View style={styles.receiptTotalRow} accessibilityRole="text" accessibilityLabel={`Total: ${getGrandTotal().toLocaleString()} ${commissionCurrency}`}>
                <Text style={[styles.receiptTotalLabel, { color: colors.text }]}>TOTAL À PAYER</Text>
                <View style={styles.receiptTotalValueRow}>
                  <Text style={[styles.receiptTotalValue, { color: colors.text }]}>
                    {getGrandTotal().toLocaleString()}
                  </Text>
                  <Text style={[styles.receiptTotalCurrency, { color: colors.gray500 }]}>
                    {commissionCurrency}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* === BOTTOM STICKY CTA === */}
      <View
        style={[
          styles.bottomBarE,
          {
            backgroundColor: colors.card,
            borderTopColor: 'rgba(0,0,0,0.06)',
            paddingBottom: insets.bottom + 10,
          },
          Shadows.dramatic,
        ]}
      >
        <View style={styles.bottomTotalCol}>
          {event?.event_type === 'billetterie' ? (
            <>
              <Text style={[styles.bottomTotalEyebrow, { color: colors.gray500 }]}>
                {getTotalQuantity()} BILLET{getTotalQuantity() > 1 ? 'S' : ''}
                {getServiceFee() > 0 ? ' · FRAIS INCL' : ''}
              </Text>
              <View style={styles.bottomTotalRow}>
                <Text style={[styles.bottomTotalValue, { color: colors.text }]}>
                  {getGrandTotal().toLocaleString()}
                </Text>
                <Text style={[styles.bottomTotalCurrency, { color: colors.gray500 }]}>
                  {commissionCurrency}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.bottomTotalEyebrow, { color: colors.gray500 }]}>INSCRIPTION</Text>
              <Text style={[styles.bottomTotalValue, { color: colors.text }]}>
                {event?.is_free || !event?.base_price ? 'Gratuit' : `${(event?.base_price || 0).toLocaleString()} ${commissionCurrency}`}
              </Text>
            </>
          )}
        </View>
        <TouchableOpacity
          onPress={handleProceed}
          disabled={(event?.event_type === 'billetterie' && getTotalQuantity() === 0) || submitting || (!isEditMode && !isAdditionalMode && !!existingRegistration)}
          style={[
            styles.bottomCtaPill,
            ((event?.event_type === 'billetterie' && getTotalQuantity() === 0) || submitting || (!isEditMode && !isAdditionalMode && !!existingRegistration)) && { opacity: 0.5 },
            Shadows.buttonPrimary,
          ]}
          activeOpacity={0.9}
          accessibilityLabel="Continuer vers le paiement"
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.bottomCtaText}>
            {submitting ? 'Traitement...' : isEditMode ? 'Mettre à jour' : event?.event_type === 'inscription' ? "S'inscrire" : 'Continuer'}
          </Text>
          <View style={styles.bottomCtaArrow}>
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="arrow-forward" size={16} color={Colors.white} />
            )}
          </View>
        </TouchableOpacity>
      </View>
      </View>
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

  // === EDITORIAL HEADER ===
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
    fontSize: 26,
    letterSpacing: -1,
    lineHeight: 30,
  },

  // === EVENT SUMMARY ===
  eventSummaryE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
  },
  eventDateTile: {
    width: 56,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  eventDateDay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    lineHeight: 24,
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },
  eventDateMonth: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  eventCategoryEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  eventTitleE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 17,
    letterSpacing: -0.5,
    lineHeight: 21,
  },
  eventMetaRowE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  eventMetaTextE: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  metaDotE: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 4,
  },

  // === EXISTING REGISTRATION ===
  existingRegE: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    paddingLeft: Spacing.lg + 6,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  existingRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  existingHeaderE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.sm,
  },
  existingIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  existingEyebrowE: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#92400E',
    marginBottom: 1,
  },
  existingTitleE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 16,
    letterSpacing: -0.4,
    color: '#78350F',
  },
  existingTextE: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: '#78350F',
    lineHeight: 17,
    marginBottom: Spacing.md,
  },
  regActionPillE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  regActionPillTextE: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#92400E',
    letterSpacing: 0.2,
  },

  // === SECTION HEADERS ===
  sectionEyebrowE: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitleE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 26,
    marginBottom: Spacing.md,
  },

  // === TICKETS SECTION ===
  ticketsSectionE: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  noTicketsE: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  noTicketsTitleE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 17,
    letterSpacing: -0.4,
  },
  noTicketsTextE: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 240,
  },

  // === BOARDING-PASS TICKET CARD ===
  boardingPassCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
    minHeight: 120,
    overflow: 'hidden',
  },
  bpLeft: {
    flex: 1,
    padding: Spacing.md,
    paddingRight: Spacing.lg,
    justifyContent: 'center',
  },
  bpTopRow: {
    marginBottom: 6,
  },
  bpEyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  bpEyebrowDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  bpEyebrowText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  bpTicketName: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 17,
    letterSpacing: -0.5,
    lineHeight: 21,
  },
  bpDescription: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  bpMetaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  bpPrice: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    letterSpacing: -0.5,
  },
  bpCurrency: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  bpDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    alignSelf: 'center',
    marginHorizontal: 2,
  },
  bpAvailability: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    letterSpacing: -0.1,
  },
  bpPerforation: {
    width: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  bpNotchTop: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: -8,
    marginLeft: -8,
  },
  bpDashedLine: {
    flex: 1,
    width: 0,
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
  },
  bpNotchBottom: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: -8,
    marginLeft: -8,
  },
  bpRight: {
    width: 110,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpQtyEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 8,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  bpQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bpQtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpQtyValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    letterSpacing: -0.5,
    minWidth: 22,
    textAlign: 'center',
  },
  bpSoldOut: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  bpSoldOutText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: '#DC2626',
  },

  // === DISCOUNT SECTION ===
  discountSectionE: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  appliedDiscountE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
  },
  appliedDiscountIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appliedDiscountText: {
    flex: 1,
  },
  appliedDiscountEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#10B981',
    marginBottom: 1,
  },
  appliedDiscountCode: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 17,
    letterSpacing: 1,
  },
  appliedDiscountValue: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
    letterSpacing: -0.1,
  },
  removeDiscountButtonE: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountInputRowE: {
    flexDirection: 'row',
    gap: 8,
  },
  discountInputE: {
    flex: 1,
    height: 50,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    letterSpacing: 1.5,
  },
  applyDiscountButtonE: {
    minWidth: 80,
    height: 50,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
  },
  applyDiscountTextE: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  discountErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 8,
  },
  discountErrorTextE: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: '#DC2626',
    letterSpacing: -0.1,
  },

  // === ORDER SUMMARY (receipt) ===
  orderSummaryE: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  receiptCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  receiptHeaderEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#9CA3AF',
  },
  receiptHeaderRef: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: '#9CA3AF',
  },
  receiptDashed: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  receiptDashedThick: {
    borderTopWidth: 2,
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 8,
  },
  receiptLabel: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  receiptValue: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  receiptTotalLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  receiptTotalValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  receiptTotalValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 26,
    letterSpacing: -1,
    lineHeight: 28,
  },
  receiptTotalCurrency: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 1,
  },

  // === BOTTOM BAR ===
  bottomBarE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bottomTotalCol: {
    flex: 1,
  },
  bottomTotalEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  bottomTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  bottomTotalValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 24,
  },
  bottomTotalCurrency: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 1,
  },
  bottomCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    minHeight: 50,
  },
  bottomCtaText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  bottomCtaArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginLeft: 8,
  },
});
