import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useAlert } from '../../contexts/AlertContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import ErrorState from '../../components/ui/ErrorState';
import ConvertedPrice from '../../components/common/ConvertedPrice';
import {
  TourTarget,
  useTour,
  getTicketPurchaseTourSteps,
  TICKET_PURCHASE_TOUR_STORAGE_KEY,
  TICKET_PURCHASE_TOUR_DELAY_MS,
} from '../../components/tour';
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
import { getSaleState } from '../../utils/ticketSaleWindow';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TicketPurchaseRouteProp = RouteProp<RootStackParamList, 'TicketPurchase'>;

interface TicketSelection {
  ticketTypeId: string;
  quantity: number;
}

// Auto-prefill custom form fields with user profile data when label/type matches
function autoPrefillFormData(fields: FormField[], user: any): Record<string, any> {
  const prefilled: Record<string, any> = {};

  for (const field of fields) {
    const label = (field.label || '').toLowerCase().trim();
    const type = field.field_type;

    // Email: type-based match (most reliable)
    if (type === 'email' && user.email) {
      prefilled[field.label] = user.email;
      continue;
    }

    // Phone: type-based match (FieldType doesn't have 'phone'/'tel' but ExtendedFieldType might)
    if ((type as string) === 'phone' && user.phone_number) {
      prefilled[field.label] = user.phone_number;
      continue;
    }

    // Text fields: heuristic match by French/English label keywords
    if (type === 'text' || type === 'textarea') {
      // Full name (combined)
      if (/(nom\s+(et\s+)?pr[ée]nom|nom\s+complet|full\s*name)/.test(label) && (user.first_name || user.last_name)) {
        prefilled[field.label] = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      }
      // First name only
      else if (/^(pr[ée]nom|first\s*name|given\s*name)$/.test(label) && user.first_name) {
        prefilled[field.label] = user.first_name;
      }
      // Last name only
      else if (/^(nom(\s+de\s+famille)?|last\s*name|surname|family\s*name)$/.test(label) && user.last_name) {
        prefilled[field.label] = user.last_name;
      }
      // Email by label fallback
      else if (/^(e?[-\s]?mail|courriel|adresse\s+email)$/.test(label) && user.email) {
        prefilled[field.label] = user.email;
      }
      // Phone by label fallback
      else if (/(t[ée]l[ée]phone|portable|mobile|num[ée]ro|phone)/.test(label) && user.phone_number) {
        prefilled[field.label] = user.phone_number;
      }
    }
  }

  return prefilled;
}

export default function TicketPurchaseScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TicketPurchaseRouteProp>();
  const { eventId, ticketTypeId, registrationId, additionalTickets } = route.params;
  const { showAlert, showSuccess, showError, showConfirm } = useAlert();
  const { toastSuccess } = useFeedback();
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Mode achat supplémentaire: acheter des billets en plus (priorité sur edit)
  const isAdditionalMode = !!additionalTickets;
  // Mode d'édition: modifier une inscription existante (sauf si on est en mode "ajout supplémentaire")
  const isEditMode = !!registrationId && !isAdditionalMode;

  const tour = useTour();

  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [selections, setSelections] = useState<Map<string, number>>(new Map());
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [existingRegistration, setExistingRegistration] = useState<any>(null);

  // Horloge de la fenetre de vente. Un Date.now() calcule au render figerait
  // l'etat : un billet qui expire pendant que l'ecran est ouvert resterait
  // selectionnable jusqu'a un re-render fortuit. On reevalue chaque minute
  // (granularite suffisante pour une date de fin de vente).
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Si un billet se ferme pendant que l'ecran est ouvert, on retire sa
  // selection : sinon il resterait compte dans le total et le submit partirait
  // avec un billet que le backend rejette.
  useEffect(() => {
    setSelections((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Map(prev);
      for (const tt of ticketTypes) {
        const id = String(tt.id);
        if (next.has(id) && getSaleState(tt, nowTs) !== 'open') {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [nowTs, ticketTypes]);

  // Purchase tour fires once tickets are loaded — targets the first ticket
  // card and the discount input. Skipped in edit/additional modes where
  // the user already knows the screen.
  useFocusEffect(useCallback(() => {
    if (loading || ticketTypes.length === 0 || isEditMode || isAdditionalMode) return;
    const timer = setTimeout(() => {
      if (tour.isActive) return;
      tour.start(getTicketPurchaseTourSteps(t), { seenKey: TICKET_PURCHASE_TOUR_STORAGE_KEY });
    }, TICKET_PURCHASE_TOUR_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, ticketTypes.length, isEditMode, isAdditionalMode]));

  // Commission config dynamique par pays — la commission backend varie selon la
  // zone (CommissionConfig par country_code), il faut donc fournir le pays de
  // l'événement, pas le default. Sans ça, un event en XOF (Côte d'Ivoire)
  // afficherait la commission XAF par défaut → frais affichés faux. Voir
  // AUDIT_PROFOND §3.4 (useCommissionConfig sans countryCode).
  const eventCountry = event?.location_country_code || event?.location_country;
  // event.currency en deuxieme arg : le backend convertira fixed_fee dans cette
  // devise si la commission du pays event est dans une autre devise (cas du
  // fallback default XAF quand le pays event n'a pas de CommissionConfig
  // dediee). Sans ca, on aurait fixed_fee=100 XAF affiche dans un event EUR.
  const { config: commissionConfig } = useCommissionConfig(
    eventCountry,
    event?.currency,
    event?.organizer?.id,
  );

  // SOURCE UNIQUE DE VERITE pour l'AFFICHAGE des prix : `event.currency`.
  // Currency Strategy "Event mono-devise" : on paie TOUJOURS dans la devise
  // de l'event (= devise du wallet organisateur). Les frais service/fixes
  // sont calcules avec `commissionConfig` (taux + fee du pays event) mais
  // affichés dans la meme devise que l'event pour eviter toute confusion.
  // La conversion vers la devise du payeur se fait via ConvertedPrice
  // (indicative, jamais contractuelle).
  const eventCurrencyCode = (event?.currency || 'XAF').toUpperCase();
  // Label humain : "FCFA" pour XAF/XOF (plus parlant localement),
  // code ISO sinon. Backend renvoie toujours un code ISO.
  const eventCurrencyLabel =
    eventCurrencyCode === 'XAF' || eventCurrencyCode === 'XOF'
      ? 'FCFA'
      : eventCurrencyCode;
  // Discount state
  const [discountCode, setDiscountCode] = useState('');
  const [validatingDiscount, setValidatingDiscount] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  // Direct quantity input modal
  const [qtyModal, setQtyModal] = useState<{ ticketTypeId: string; ticketName: string } | null>(null);
  const [qtyModalValue, setQtyModalValue] = useState('');

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      setLoadFailed(false);
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

      // Set form fields if available + auto-prefill from user profile
      if (eventData.form_fields && eventData.form_fields.length > 0) {
        setFormFields(eventData.form_fields);

        // Auto-prefill ONLY in create mode (not edit) and when user is logged in
        if (!isEditMode && !existingReg && user) {
          const prefilled = autoPrefillFormData(eventData.form_fields, user);
          if (Object.keys(prefilled).length > 0) {
            setFormData(prefilled);
          }
        }
      }

      // Pre-select if ticketTypeId is provided
      if (ticketTypeId && !isEditMode) {
        setSelections(new Map([[ticketTypeId, 1]]));
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement données:', error);
      // Plus de modale bloquante : l'écran affiche désormais son propre état
      // d'erreur avec un bouton Réessayer. Sans garde, l'écran se rendait avec
      // `event` à null — titre vide et AUCUN billet (la section est gatée sur
      // event.event_type), soit une entrée de tunnel d'achat cassée qui faisait
      // passer une panne réseau pour un événement sans billets.
      setLoadFailed(true);
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
        errors[field.label] = t('ticketPurchase.fieldRequired');
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const MAX_TICKETS_PER_TYPE = 10;
  const handleGroupInquiry = () => {
    // Le user veut > 10 billets — on ouvre une conversation avec l'organisateur
    // pour qu'il négocie directement (tarif groupe, billets dédiés, etc.).
    const organizer = event?.organizer;
    if (!organizer || !(organizer as any).id) {
      showAlert(
        t('ticketPurchase.unavailableTitle'),
        t('ticketPurchase.unavailableMessage'),
        undefined,
        'warning',
      );
      return;
    }
    const organizerName = `${organizer.first_name || ''} ${organizer.last_name || ''}`.trim() || organizer.email || t('ticketPurchase.organizerFallback');
    navigation.navigate('Conversation', {
      userId: String((organizer as any).id),
      userName: organizerName,
    });
  };

  const isTicketSaleOpen = (ticketTypeId: string) => {
    const tt = ticketTypes.find((x) => String(x.id) === ticketTypeId);
    return tt ? getSaleState(tt, nowTs) === 'open' : true;
  };

  const updateQuantity = (ticketTypeId: string, delta: number) => {
    // Garde defensive : les boutons +/- sont deja masques hors fenetre de
    // vente, mais la modale de saisie directe peut rester ouverte au moment ou
    // le billet se ferme. On n'autorise alors que la diminution.
    if (delta > 0 && !isTicketSaleOpen(ticketTypeId)) return;
    const current = selections.get(ticketTypeId) || 0;
    const intended = current + delta;
    // Surface a clear message if the user tries to exceed the per-order cap
    if (intended > MAX_TICKETS_PER_TYPE) {
      showAlert(
        t('ticketPurchase.limitReachedTitle'),
        t('ticketPurchase.limitReachedMessage', { max: MAX_TICKETS_PER_TYPE }),
        [
          { text: t('common.ok'), style: 'cancel' },
          { text: t('ticketPurchase.contactOrganizer'), onPress: handleGroupInquiry },
        ],
        'warning',
      );
      return;
    }
    const newQuantity = Math.max(0, Math.min(MAX_TICKETS_PER_TYPE, intended));
    const newSelections = new Map(selections);

    if (newQuantity === 0) {
      newSelections.delete(ticketTypeId);
    } else {
      newSelections.set(ticketTypeId, newQuantity);
    }

    setSelections(newSelections);
  };

  // Direct quantity setter — used by the long-press modal
  const setQuantityDirect = (ticketTypeId: string, raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed < 0) return;
    // Meme garde que updateQuantity : hors fenetre de vente, seule la remise a
    // zero reste permise.
    if (parsed > 0 && !isTicketSaleOpen(ticketTypeId)) return;
    if (parsed > MAX_TICKETS_PER_TYPE) {
      showAlert(
        t('ticketPurchase.limitReachedTitle'),
        t('ticketPurchase.limitReachedMessageShort', { max: MAX_TICKETS_PER_TYPE }),
        undefined,
        'warning',
      );
      return;
    }
    const newSelections = new Map(selections);
    if (parsed === 0) {
      newSelections.delete(ticketTypeId);
    } else {
      newSelections.set(ticketTypeId, parsed);
    }
    setSelections(newSelections);
  };

  const openQtyModal = (ticketTypeId: string, ticketName: string) => {
    setQtyModalValue(String(selections.get(ticketTypeId) || 0));
    setQtyModal({ ticketTypeId, ticketName });
  };

  const confirmQtyModal = () => {
    if (qtyModal) {
      setQuantityDirect(qtyModal.ticketTypeId, qtyModalValue);
    }
    setQtyModal(null);
  };

  // Prix EFFECTIF affiché/facturé : le palier early-bird actif (current_price)
  // s'il existe, sinon le prix de base. DOIT matcher ce que le backend facture
  // (qui verrouille current_price dans unit_price à l'achat).
  const effectivePrice = (tt: TicketType): number =>
    typeof tt.current_price === 'number' ? tt.current_price : tt.price;

  const getSubtotal = () => {
    let total = 0;
    selections.forEach((quantity, ticketTypeId) => {
      const ticketType = ticketTypes.find(t => String(t.id) === String(ticketTypeId));
      if (ticketType) {
        total += effectivePrice(ticketType) * quantity;
      }
    });
    return total;
  };

  // Privilégie le montant exact calculé par le backend (passé via `subtotal` lors
  // de la validation). Fallback sur le calcul client uniquement si le backend
  // n'a pas renvoyé applied_amount (compat avec anciennes versions du serveur).
  const getDiscountAmount = () => {
    if (!appliedDiscount) return 0;
    const serverAmount = (appliedDiscount as any)._serverAppliedAmount;
    if (typeof serverAmount === 'number') return serverAmount;
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
    // Passe eventCurrencyCode pour que `calculateServiceFee` puisse rejeter
    // le `fixed_fee` si commissionConfig.currency != event.currency
    // (sinon mix de devises numerique fausse).
    // Frais fixe PAR BILLET → passer la quantité totale.
    return calculateServiceFee(getTotalPrice(), commissionConfig, eventCurrencyCode, getTotalQuantity());
  };

  const getGrandTotal = () => {
    return getTotalPrice() + getServiceFee();
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError(t('ticketPurchase.discountEnterCode'));
      return;
    }

    setValidatingDiscount(true);
    setDiscountError(null);

    try {
      // Passe le subtotal au backend pour qu'il calcule la remise EXACTE.
      // La même formule sera ré-appliquée à la création de la registration,
      // donc le montant retourné est définitif (plus de "(estimation)").
      const subtotal = getSubtotal();
      const response = await discountsAPI.validateDiscount(
        discountCode.trim(),
        eventId,
        undefined,
        subtotal,
      );
      const data = response.data;

      if (data.valid && data.discount) {
        // Convertir value en number si nécessaire (peut être string depuis l'API)
        const discount: Discount = {
          ...data.discount,
          value: Number(data.discount.value) || 0,
        };
        // Le backend a renvoyé applied_amount → on le stocke pour affichage
        // direct, en remplacement du calcul client.
        if (typeof data.applied_amount === 'number') {
          (discount as any)._serverAppliedAmount = data.applied_amount;
        }
        setAppliedDiscount(discount);
        setDiscountError(null);
        toastSuccess(t('ticketPurchase.discountAppliedToast', { code: discountCode }));
      } else {
        setDiscountError(data.message || t('ticketPurchase.discountInvalid'));
      }
    } catch (error: any) {
      const { message } = getApiErrorMessage(error, t, {
        fallbackKey: 'ticketPurchase.discountInvalidOrExpired',
      });
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
        showError(t('ticketPurchase.registrationClosedTitle'), t('ticketPurchase.registrationClosedMessage'));
        return;
      }
    }

    // Vérifier si l'événement est terminé
    if (event?.end_date) {
      const endDate = new Date(event.end_date);
      if (endDate < new Date()) {
        showError(t('ticketPurchase.eventEndedTitle'), t('ticketPurchase.eventEndedMessage'));
        return;
      }
    }

    // Validate tickets for billetterie
    if (isBilletterie && getTotalQuantity() === 0) {
      showAlert(t('ticketPurchase.warningTitle'), t('ticketPurchase.selectAtLeastOne'), undefined, 'warning');
      return;
    }

    // Validate form fields if present
    if (formFields.length > 0 && !validateForm()) {
      showAlert(t('ticketPurchase.warningTitle'), t('ticketPurchase.fillRequiredFields'), undefined, 'warning');
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
        toastSuccess(t('ticketPurchase.ticketsUpdated'));
      } else if (isAdditionalMode && !existingRegistration) {
        // On est venu en mode "achat supplémentaire" mais aucune inscription
        // active n'a été trouvée -> ne PAS créer silencieusement une nouvelle
        // inscription, sinon on duplique. On stoppe avec un message clair.
        showError(
          t('ticketPurchase.registrationNotFoundTitle'),
          t('ticketPurchase.registrationNotFoundMessage')
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

        toastSuccess(`${response.data.message || t('ticketPurchase.ticketsAddedSuccess')}`);
      } else {
        // Mode création: créer une nouvelle inscription.
        // IMPORTANT : le backend attend l'UUID de l'event (champ UUIDField). Selon
        // l'écran d'origine, `eventId` (route param) peut être le SLUG → 400
        // "Must be a valid UUID". On envoie donc l'id réel de l'event chargé.
        const registrationData: any = {
          event: event?.id || eventId,
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
          attendeeFormScope: event?.attendee_form_scope,
          registrationStatus: 'confirmed',
          approvalStatus: event?.auto_approve_registrations === false ? 'pending' : 'approved',
          eventTitle: event?.title,
          eventImage: (event as any)?.banner_image || (event as any)?.display_image || null,
          eventSlug: event?.slug,
        });
      }
    } catch (error: any) {
      if (__DEV__) console.error('Erreur création inscription:', error);

      // Gérer le cas d'une inscription existante confirmée
      const errorData = error.response?.data;
      if (errorData && errorData.existing_registration) {
        // L'utilisateur a déjà une inscription confirmée
        showConfirm(
          t('ticketPurchase.alreadyRegisteredConfirmTitle'),
          t('ticketPurchase.alreadyRegisteredConfirmMessage'),
          () => {
            // Rediriger vers les détails de l'inscription ou acheter plus de billets
            navigation.navigate('TicketPurchase', {
              eventId,
              additionalTickets: true,
            });
          }
        );
      } else {
        const { message } = getApiErrorMessage(error, t, {
          fallbackKey: 'ticketPurchase.createRegistrationError',
        });
        showError(t('common.error'), message);
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

  // Sans `event`, tout le tunnel d'achat en dessous est inexploitable (titre
  // vide, section billets gatée sur event.event_type donc aucun billet). On
  // rend un état d'erreur avec Réessayer + un retour, plutôt qu'une coquille
  // vide qui ressemble à un événement sans billets.
  // On garde sur `!event` seulement : si un rechargement échoue alors qu'un
  // event est déjà affiché, mieux vaut laisser le tunnel en place que de le
  // remplacer par une erreur plein écran.
  if (!event) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>BUY</WatermarkNumeral>
        <View style={{ flex: 1, zIndex: 1 }}>
          <View style={styles.headerTopRowE}>
            <TouchableOpacity
              style={[styles.iconDiscE, { backgroundColor: colors.gray100 }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              accessibilityLabel={t('ticketPurchase.back')}
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={18} color={colors.gray600} />
            </TouchableOpacity>
          </View>
          <ErrorState
            message={t('ticketPurchase.loadError')}
            onRetry={fetchData}
            showRetry={loadFailed}
          />
        </View>
      </EditorialCanvas>
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
            accessibilityLabel={t('ticketPurchase.back')}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray600} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerEyebrowE, { color: colors.accent }]}>
              {isEditMode ? t('ticketPurchase.headerEyebrowEdit') : isAdditionalMode ? t('ticketPurchase.headerEyebrowAdd') : event?.event_type === 'inscription' ? t('ticketPurchase.headerEyebrowInscription') : t('ticketPurchase.headerEyebrowBilletterie')}
            </Text>
            <Text style={[styles.headerTitleE, { color: colors.text }]}>
              {isEditMode
                ? event?.event_type === 'inscription' ? t('ticketPurchase.headerTitleEditInscription') : t('ticketPurchase.headerTitleEditBilletterie')
                : isAdditionalMode
                  ? event?.event_type === 'inscription' ? t('ticketPurchase.headerTitleAddInscription') : t('ticketPurchase.headerTitleAddBilletterie')
                  : event?.event_type === 'inscription'
                    ? t('ticketPurchase.headerTitleInscription')
                    : t('ticketPurchase.headerTitleBilletterie')}
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
              {(event?.category as any)?.name?.toUpperCase() || t('ticketPurchase.eventFallbackCategory')}
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
                {event?.location_city || t('ticketPurchase.eventOnline')}
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
                <Text style={styles.existingEyebrowE}>{t('ticketPurchase.alreadyRegisteredEyebrow')}</Text>
                <Text style={styles.existingTitleE}>{t('ticketPurchase.alreadyRegisteredTitle')}</Text>
              </View>
            </View>
            <Text style={styles.existingTextE}>
              {existingRegistration.registration_type === 'inscription'
                ? t('ticketPurchase.yourInscriptionIs')
                : t('ticketPurchase.yourReservationIs')}
              <Text style={{ fontFamily: FontFamily.bold }}>
                {existingRegistration.status === 'confirmed' ? t('ticketPurchase.statusConfirmed') :
                 existingRegistration.status === 'pending' ? t('ticketPurchase.statusPendingPayment') :
                 existingRegistration.approval_status === 'pending' ? t('ticketPurchase.statusPendingApproval') :
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
                <Text style={styles.regActionPillTextE}>{t('ticketPurchase.actionView')}</Text>
              </TouchableOpacity>

              {existingRegistration.status === 'pending' ? (
                <TouchableOpacity
                  style={[styles.regActionPillE, { backgroundColor: '#FFFFFF', borderColor: '#FCD34D' }]}
                  onPress={() => navigation.navigate('TicketPurchase', { eventId, registrationId: existingRegistration.id })}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={13} color="#92400E" />
                  <Text style={styles.regActionPillTextE}>{t('ticketPurchase.actionEdit')}</Text>
                </TouchableOpacity>
              ) : existingRegistration.status === 'confirmed' || existingRegistration.status === 'completed' ? (
                <TouchableOpacity
                  style={[styles.regActionPillE, { backgroundColor: '#FFFFFF', borderColor: '#FCD34D' }]}
                  onPress={() => navigation.navigate('TicketPurchase', { eventId, additionalTickets: true })}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={13} color="#92400E" />
                  <Text style={styles.regActionPillTextE}>{t('ticketPurchase.actionAddTickets')}</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.regActionPillE, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                onPress={() => {
                  showConfirm(
                    t('ticketPurchase.cancelTitle'),
                    t('ticketPurchase.cancelConfirm'),
                    async () => {
                      try {
                        await registrationsAPI.cancelRegistration(existingRegistration.id);
                        setExistingRegistration(null);
                        toastSuccess(t('ticketPurchase.cancelSuccess'));
                      } catch (error) {
                        showError(t('common.error'), t('ticketPurchase.cancelError'));
                      }
                    }
                  );
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={13} color="#DC2626" />
                <Text style={[styles.regActionPillTextE, { color: '#DC2626' }]}>{t('ticketPurchase.actionCancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* === TICKET TYPES (boarding-pass style) === */}
        {event?.event_type === 'billetterie' && (
        <View style={styles.ticketsSectionE}>
          <Text style={[styles.sectionEyebrowE, { color: colors.accent }]}>{t('ticketPurchase.ticketsSectionEyebrow')}</Text>
          <Text style={[styles.sectionTitleE, { color: colors.text }]}>{t('ticketPurchase.ticketsSectionTitle')}</Text>
          {ticketTypes.length === 0 ? (
            <View style={[styles.noTicketsE, { backgroundColor: colors.card, borderColor: 'rgba(0,0,0,0.06)' }]}>
              <Ionicons name="ticket-outline" size={36} color={colors.gray300} />
              <Text style={[styles.noTicketsTitleE, { color: colors.text }]}>{t('ticketPurchase.noTicketsTitle')}</Text>
              <Text style={[styles.noTicketsTextE, { color: colors.gray500 }]}>
                {t('ticketPurchase.noTicketsText')}
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
              const hasStock = availableQty > 0 || (ticketType.quantity_total === undefined && ticketType.quantity_sold === undefined);
              // Fenêtre de vente : le backend refuse l'achat hors de [sales_start,
              // sales_end] (registrations/views.py + serializers.py). Sans cette
              // garde l'UI laissait sélectionner puis payer un billet fermé, et
              // l'erreur ne tombait qu'au submit. On aligne le mobile sur le web.
              const saleState = getSaleState(ticketType, nowTs);
              const isAvailable = hasStock && saleState === 'open';
              const isSelected = quantity > 0;
              const effPrice = effectivePrice(ticketType);
              const isFree = effPrice === 0;
              const pricing = ticketType.pricing;
              const hasTier = !!pricing?.tier_label && effPrice < ticketType.price;

              const cardInner = (
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
                          {isFree ? t('ticketPurchase.freeBadge') : t('ticketPurchase.categoryBadge', { num: `0${idx + 1}` })}
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
                        {isFree ? t('ticketPurchase.freeBadge') : `${effPrice.toLocaleString()}`}
                      </Text>
                      {!isFree && (
                        <Text style={[styles.bpCurrency, { color: colors.gray500 }]}>{eventCurrencyLabel}</Text>
                      )}
                      {/* Prix de base barré quand un palier early-bird est actif */}
                      {hasTier && (
                        <Text style={[styles.bpStrikePrice, { color: colors.gray400 }]}>
                          {ticketType.price.toLocaleString()}
                        </Text>
                      )}
                      {availableQty > 0 && ticketType.quantity_total !== undefined && (
                        <>
                          <View style={[styles.bpDot, { backgroundColor: colors.gray300 }]} />
                          <Ionicons name="people-outline" size={11} color={colors.gray500} />
                          <Text style={[styles.bpAvailability, { color: colors.gray500 }]}>
                            {t('ticketPurchase.ticketAvailable', { count: availableQty })}
                          </Text>
                        </>
                      )}
                    </View>
                    {/* Badge d'urgence early-bird : "Early bird · plus que N à ce prix" */}
                    {hasTier && (
                      <View style={[styles.bpTierBadge, { backgroundColor: `${colors.accent}18` }]}>
                        <Ionicons name="flash" size={11} color={colors.accent} />
                        <Text style={[styles.bpTierText, { color: colors.accent }]} numberOfLines={1}>
                          {pricing!.tier_label}
                          {typeof pricing!.remaining_at_price === 'number'
                            ? ` · ${t('ticketPurchase.tierRemaining', { count: pricing!.remaining_at_price })}`
                            : ''}
                        </Text>
                      </View>
                    )}
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
                        <Text style={[styles.bpQtyEyebrow, { color: colors.gray400 }]}>{t('ticketPurchase.ticketQty')}</Text>
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
                            accessibilityLabel={t('ticketPurchase.removeTicketA11y')}
                            accessibilityRole="button"
                          >
                            <Ionicons
                              name="remove"
                              size={16}
                              color={quantity === 0 ? colors.gray400 : Colors.white}
                            />
                          </TouchableOpacity>
                          <Pressable
                            onLongPress={() => openQtyModal(String(ticketType.id), ticketType.name)}
                            delayLongPress={400}
                            accessibilityRole="adjustable"
                            accessibilityLabel={t('ticketPurchase.qtyA11y', { count: quantity })}
                          >
                            <Text style={[styles.bpQtyValue, { color: colors.text }]}>{quantity}</Text>
                          </Pressable>
                          <TouchableOpacity
                            style={[styles.bpQtyBtn, { backgroundColor: colors.primary }]}
                            onPress={() => updateQuantity(String(ticketType.id), 1)}
                            accessibilityLabel={t('ticketPurchase.addTicketA11y')}
                            accessibilityRole="button"
                          >
                            <Ionicons name="add" size={16} color={Colors.white} />
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <View style={[styles.bpSoldOut, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                        <Text style={styles.bpSoldOutText}>
                          {saleState === 'ended'
                            ? t('ticketPurchase.salesEnded')
                            : saleState === 'not_started'
                            ? t('ticketPurchase.salesNotStarted')
                            : t('ticketPurchase.soldOut')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
              // Only the first card carries the TourTarget — pointing at
              // every card would create visual noise during the tour.
              return idx === 0 ? (
                <TourTarget key={ticketType.id} id="ticket-purchase-types">
                  {cardInner}
                </TourTarget>
              ) : cardInner;
            })
          )}
        </View>
        )}

        {/* === DISCOUNT CODE === */}
        {event?.event_type === 'billetterie' && getTotalQuantity() > 0 && (
          <View style={styles.discountSectionE}>
            <Text style={[styles.sectionEyebrowE, { color: colors.accent }]}>{t('ticketPurchase.discountSectionEyebrow')}</Text>
            <Text style={[styles.sectionTitleE, { color: colors.text }]}>{t('ticketPurchase.discountSectionTitle')}</Text>
            {appliedDiscount ? (
              <View style={[styles.appliedDiscountE, { backgroundColor: colors.card, borderColor: '#10B981' }]}>
                <View style={[styles.appliedDiscountIcon, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="pricetag" size={16} color={Colors.white} />
                </View>
                <View style={styles.appliedDiscountText}>
                  <Text style={styles.appliedDiscountEyebrow}>{t('ticketPurchase.discountAppliedEyebrow')}</Text>
                  <Text style={[styles.appliedDiscountCode, { color: colors.text }]}>{appliedDiscount.code}</Text>
                  <Text style={styles.appliedDiscountValue}>
                    {appliedDiscount.discount_type === 'percentage'
                      ? `−${appliedDiscount.value || 0}% · −${getDiscountAmount().toLocaleString()} ${eventCurrencyLabel}`
                      : `−${(appliedDiscount.value || 0).toLocaleString()} ${eventCurrencyLabel}`}
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
              <TourTarget id="ticket-purchase-promo">
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
                  placeholder={t('ticketPurchase.discountPlaceholder')}
                  placeholderTextColor={colors.gray400}
                  accessibilityLabel={t('ticketPurchase.discountFieldA11y')}
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
                  accessibilityLabel={t('ticketPurchase.applyDiscountA11y')}
                  accessibilityRole="button"
                >
                  {validatingDiscount ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.applyDiscountTextE}>{t('ticketPurchase.applyOk')}</Text>
                  )}
                </TouchableOpacity>
              </View>
              </TourTarget>
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
            <Text style={[styles.sectionEyebrowE, { color: colors.accent }]}>{t('ticketPurchase.summaryEyebrow')}</Text>
            <Text style={[styles.sectionTitleE, { color: colors.text }]}>{t('ticketPurchase.summaryTitle')}</Text>
            <View style={[styles.receiptCard, { backgroundColor: colors.card, borderColor: 'rgba(0,0,0,0.06)' }]}>
              {/* Receipt header strip — la vraie ref de commande sera générée par le backend à la finalisation */}
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptHeaderEyebrow}>EVENTEZ · COMMANDE</Text>
                <Text style={styles.receiptHeaderRef}>EN COURS</Text>
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
                      {(effectivePrice(ticketType) * quantity).toLocaleString()} {eventCurrencyLabel}
                    </Text>
                  </View>
                );
              })}

              {appliedDiscount && (
                <>
                  <View style={[styles.receiptDashed, { borderTopColor: 'rgba(0,0,0,0.08)' }]} />
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: colors.gray500 }]}>{t('ticketPurchase.subtotal')}</Text>
                    <Text style={[styles.receiptValue, { color: colors.gray500 }]}>
                      {getSubtotal().toLocaleString()} {eventCurrencyLabel}
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
                      −{getDiscountAmount().toLocaleString()} {eventCurrencyLabel}
                    </Text>
                  </View>
                </>
              )}

              {getTotalPrice() > 0 && (
                <>
                  <View style={[styles.receiptDashed, { borderTopColor: 'rgba(0,0,0,0.08)' }]} />
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: colors.gray500 }]}>{t('ticketPurchase.subtotal')}</Text>
                    <Text style={[styles.receiptValue, { color: colors.gray500 }]}>
                      {getTotalPrice().toLocaleString()} {eventCurrencyLabel}
                    </Text>
                  </View>
                  {getServiceFee() > 0 && (
                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: colors.gray500 }]} numberOfLines={1}>
                        {t('ticketPurchase.serviceFees', { label: getServiceFeeLabel(commissionConfig, eventCurrencyCode) })}
                      </Text>
                      <Text style={[styles.receiptValue, { color: colors.gray500 }]}>
                        {getServiceFee().toLocaleString()} {eventCurrencyLabel}
                      </Text>
                    </View>
                  )}
                </>
              )}

              <View style={[styles.receiptDashedThick, { borderTopColor: 'rgba(0,0,0,0.18)' }]} />

              <View style={styles.receiptTotalRow} accessibilityRole="text" accessibilityLabel={`Total: ${getGrandTotal().toLocaleString()} ${eventCurrencyLabel}`}>
                <Text style={[styles.receiptTotalLabel, { color: colors.text }]}>{t('ticketPurchase.totalToPay')}</Text>
                <View style={styles.receiptTotalValueRow}>
                  <Text style={[styles.receiptTotalValue, { color: colors.text }]}>
                    {getGrandTotal().toLocaleString()}
                  </Text>
                  <Text style={[styles.receiptTotalCurrency, { color: colors.gray500 }]}>
                    {eventCurrencyLabel}
                  </Text>
                </View>
              </View>
              {/* Conversion indicative du total — coherence avec EventDetails,
                  TicketsTab et PaymentScreen qui affichent tous ConvertedPrice. */}
              <View style={{ alignSelf: 'flex-end', marginTop: 4 }}>
                <ConvertedPrice amount={getGrandTotal()} eventCurrency={eventCurrencyCode} />
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
        <View style={styles.bottomBarInner}>
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
                  {eventCurrencyLabel}
                </Text>
              </View>
              {/* Conversion indicative sous le total sticky — pas afficher si
                  meme devise (ConvertedPrice retourne null automatiquement). */}
              <ConvertedPrice
                amount={getGrandTotal()}
                eventCurrency={eventCurrencyCode}
                style={{ fontSize: 10, marginTop: 2 }}
              />
            </>
          ) : (
            <>
              <Text style={[styles.bottomTotalEyebrow, { color: colors.gray500 }]}>{t('ticketPurchase.bottomInscription')}</Text>
              <Text style={[styles.bottomTotalValue, { color: colors.text }]}>
                {event?.is_free || !event?.base_price ? t('common.free') : `${(event?.base_price || 0).toLocaleString()} ${eventCurrencyLabel}`}
              </Text>
              {!event?.is_free && !!event?.base_price && (
                <ConvertedPrice
                  amount={event.base_price}
                  eventCurrency={eventCurrencyCode}
                  style={{ fontSize: 10, marginTop: 2 }}
                />
              )}
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
          accessibilityLabel={t('ticketPurchase.ctaContinueA11y')}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.bottomCtaText}>
            {submitting
              ? t('ticketPurchase.ctaProcessing')
              : isEditMode
              ? t('ticketPurchase.ctaUpdate')
              : isAdditionalMode
              ? t('ticketPurchase.ctaAddTickets')
              : event?.event_type === 'inscription'
              ? t('ticketPurchase.ctaRegister')
              : t('ticketPurchase.ctaContinue')}
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

      {/* === DIRECT QUANTITY MODAL (triggered by long-press on the qty number) === */}
      <Modal
        visible={!!qtyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setQtyModal(null)}
      >
        <Pressable style={styles.qtyModalBackdrop} onPress={() => setQtyModal(null)}>
          <Pressable
            style={[styles.qtyModalCard, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.qtyModalEyebrow, { color: colors.accent }]}>{t('ticketPurchase.qtyModalEyebrow')}</Text>
            <Text style={[styles.qtyModalTitle, { color: colors.text }]} numberOfLines={2}>
              {qtyModal?.ticketName}
            </Text>
            <TextInput
              style={[
                styles.qtyModalInput,
                { borderColor: colors.gray200, color: colors.text, backgroundColor: colors.gray50 },
              ]}
              value={qtyModalValue}
              onChangeText={(t) => setQtyModalValue(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              autoFocus
              maxLength={2}
              accessibilityLabel={t('ticketPurchase.qtyModalInputA11y')}
            />
            <Text style={[styles.qtyModalHint, { color: colors.gray500 }]}>
              {t('ticketPurchase.qtyModalHint', { max: MAX_TICKETS_PER_TYPE })}
            </Text>
            <View style={styles.qtyModalActions}>
              <TouchableOpacity
                style={[styles.qtyModalBtn, { backgroundColor: colors.gray100 }]}
                onPress={() => setQtyModal(null)}
                activeOpacity={0.85}
              >
                <Text style={[styles.qtyModalBtnText, { color: colors.gray700 }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.qtyModalBtn, { backgroundColor: colors.primary }]}
                onPress={confirmQtyModal}
                activeOpacity={0.85}
              >
                <Text style={[styles.qtyModalBtnText, { color: '#fff' }]}>OK</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    ...centeredContent(CARD_MAX),
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
  bpStrikePrice: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    textDecorationLine: 'line-through',
    marginLeft: 2,
  },
  bpTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
  },
  bpTierText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.3,
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
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    ...centeredContent(CARD_MAX),
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
  // Direct quantity modal (long-press)
  qtyModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  qtyModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
  },
  qtyModalEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  qtyModalTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18,
    letterSpacing: -0.4,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  qtyModalInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 28,
    fontFamily: FontFamily.displayExtraBold,
    textAlign: 'center',
    letterSpacing: -1,
  },
  qtyModalHint: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
  qtyModalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  qtyModalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyModalBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
