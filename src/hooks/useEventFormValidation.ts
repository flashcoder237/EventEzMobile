import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { EventFormState, AlertActions, TicketTypeForm, FormFieldForm } from './useEventForm';
import { isExternalVideoUrl } from '../lib/utils/videoUrl';

/** Traducteur scopé au namespace validation (react-i18next). */
type TFunc = (key: string, opts?: Record<string, unknown>) => string;
const NS = 'organizer.eventCreate.validation';
const vk = (t: TFunc, key: string, opts?: Record<string, unknown>) => t(`${NS}.${key}`, opts);

/**
 * Liste des clés de champ que le validateStep peut signaler en erreur.
 * Permet aux components Step* d'appliquer un style "invalide" en lisant
 * `form.stepErrors[fieldKey]` côté EventCreateScreen.
 */
export type StepFieldError =
  | 'title'
  | 'description'
  | 'categoryId'
  | 'coverVideoUrl'
  | 'startDate'
  | 'endDate'
  | 'locationCity'
  | 'onlineUrl'
  | 'ticketTypes'
  | 'formFields';

export interface StepValidationResult {
  valid: boolean;
  errors: Partial<Record<StepFieldError, string>>;
  /** Erreur par INDEX de billet — permet de la rendre sur la bonne carte. */
  ticketErrors: Record<number, string>;
  /** Erreur par INDEX de champ du formulaire personnalisé. */
  fieldErrors: Record<number, string>;
}

export function useEventFormValidation(
  form: EventFormState,
  showError: AlertActions['showError'],
) {
  const { t } = useTranslation();
  const validateStepWithDetails = useCallback((step: number): StepValidationResult => {
    const errors: Partial<Record<StepFieldError, string>> = {};
    let ticketErrors: Record<number, string> = {};
    let fieldErrors: Record<number, string> = {};

    switch (step) {
      case 1:
        if (!form.title.trim()) errors.title = vk(t, 'titleRequired');
        if (!form.description.trim()) errors.description = vk(t, 'descriptionRequired');
        if (!form.categoryId) errors.categoryId = vk(t, 'categoryRequired');
        // Champ optionnel — on ne le bloque que si rempli ET non-reconnu
        // (pas YouTube/Vimeo). Le backend rejette les autres providers, autant
        // bloquer ici pour eviter un aller-retour API qui echoue au step 4.
        if (form.coverVideoUrl && form.coverVideoUrl.trim() && !isExternalVideoUrl(form.coverVideoUrl.trim())) {
          errors.coverVideoUrl = vk(t, 'videoUrlUnsupported');
        }
        break;

      case 2: {
        // Buffer 5 min : tolere une legere latence entre saisie et soumission.
        // Au create uniquement — en edit, l'organisateur peut modifier un event
        // passe (description, etc.).
        if (!form.isEditMode) {
          const minStart = new Date(Date.now() - 5 * 60 * 1000);
          if (form.startDate < minStart) {
            errors.startDate = vk(t, 'startInPast');
          }
        }
        if (form.endDate <= form.startDate) {
          errors.endDate = vk(t, 'endBeforeStart');
        }
        if (form.locationType === 'in_person' || form.locationType === 'hybrid') {
          if (!form.locationCity.trim()) {
            errors.locationCity = vk(t, 'cityRequired');
          }
        }
        if (form.locationType === 'online' || form.locationType === 'hybrid') {
          if (!form.onlineUrl.trim()) {
            errors.onlineUrl = vk(t, 'onlineUrlRequired');
          }
        }
        break;
      }

      case 3:
        if (form.eventType === 'billetterie') {
          // Parité backend : un event billetterie exige TOUJOURS >= 1 type de
          // billet à la publication (même gratuit → billet à prix 0). Sans ça,
          // le mobile disait "valide" puis le submit échouait en 400 silencieux
          // et l'event restait bloqué en draft.
          if (form.ticketTypes.length === 0) {
            errors.ticketTypes = vk(t, 'ticketRequired');
          }
          ticketErrors = validateTicketTypes(form.ticketTypes, t, form.startDate, form.endDate);
          if (Object.keys(ticketErrors).length > 0) {
            errors.ticketTypes = errors.ticketTypes || vk(t, 'ticketCheck');
          }
          if (form.showFormFieldsForBilletterie && form.formFields.length > 0) {
            fieldErrors = validateFormFields(form.formFields, t);
            if (Object.keys(fieldErrors).length > 0) {
              errors.formFields = vk(t, 'formFieldsCheck');
            }
          }
        } else {
          if (form.formFields.length === 0) {
            errors.formFields = vk(t, 'formFieldRequired');
          } else {
            fieldErrors = validateFormFields(form.formFields, t);
            if (Object.keys(fieldErrors).length > 0) {
              errors.formFields = vk(t, 'formFieldsCheck');
            }
          }
        }
        break;
    }

    return { valid: Object.keys(errors).length === 0, errors, ticketErrors, fieldErrors };
  }, [
    form.title, form.description, form.categoryId, form.coverVideoUrl,
    form.startDate, form.endDate,
    form.locationType, form.locationCity, form.onlineUrl, form.onlinePlatform,
    form.eventType, form.isFree, form.ticketTypes, form.formFields,
    form.showFormFieldsForBilletterie, showError, t,
  ]);

  // Backward-compat: validateStep retourne toujours un bool, et déclenche un
  // toast pour la première erreur trouvée. Les components qui ont besoin du
  // détail utilisent validateStepWithDetails directement.
  const validateStep = useCallback((step: number): boolean => {
    const result = validateStepWithDetails(step);
    if (!result.valid) {
      const firstError = Object.values(result.errors)[0];
      if (firstError) showError(vk(t, 'errorTitle'), firstError);
    }
    return result.valid;
  }, [validateStepWithDetails, showError, t]);

  return Object.assign(validateStep, { withDetails: validateStepWithDetails }) as typeof validateStep & {
    withDetails: typeof validateStepWithDetails;
  };
}

/**
 * Valide TOUS les billets et renvoie une erreur PAR INDEX de billet.
 *
 * Avant : la fonction ouvrait elle-même une modale et s'arrêtait au PREMIER
 * problème. L'organisateur corrigeait, resoumettait, découvrait le suivant —
 * une modale par erreur. Et comme une modale ne peut pas désigner la ligne
 * fautive, le message devait embarquer l'identité du billet (« billet n°2 »).
 * Désormais chaque carte de billet porte son propre message.
 */
export function validateTicketTypes(
  tickets: TicketTypeForm[],
  t: TFunc,
  eventStart?: Date,
  eventEnd?: Date,
): Record<number, string> {
  const errors: Record<number, string> = {};
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const label = ticket.name.trim() || `#${i + 1}`;
    if (!ticket.name.trim()) {
      errors[i] = vk(t, 'ticketNameRequired', { n: i + 1 });
      continue;
    }
    // Prix >= 0 (parser tolerant : accepte "10,5" et "10.5", mais pas "abc")
    const price = parseFloat(String(ticket.price).replace(',', '.'));
    if (Number.isNaN(price) || price < 0) {
      errors[i] = vk(t, 'ticketPriceInvalid', { label });
      continue;
    }
    if (parseInt(ticket.quantity_total) <= 0) {
      errors[i] = vk(t, 'ticketQtyInvalid', { label });
      continue;
    }
    // Sales window : start < end
    if (ticket.sales_start && ticket.sales_end && ticket.sales_start >= ticket.sales_end) {
      errors[i] = vk(t, 'ticketDatesInvalid', { label });
      continue;
    }
    // Sales doit finir AVANT (ou au plus tard a) la fin de l'event
    if (eventEnd && ticket.sales_end && ticket.sales_end > eventEnd) {
      errors[i] = vk(t, 'ticketSalesAfterEnd', { label });
      continue;
    }
    // max_per_order >= min_per_order si les deux sont definis
    const minPer = parseInt(ticket.min_per_order);
    const maxPer = parseInt(ticket.max_per_order);
    if (!Number.isNaN(minPer) && !Number.isNaN(maxPer) && maxPer > 0 && maxPer < minPer) {
      errors[i] = vk(t, 'ticketMaxMin', { label });
    }
  }
  return errors;
}

/**
 * Valide TOUS les champs du formulaire personnalisé, une erreur par index.
 * Même raison que `validateTicketTypes` : plus de modale, plus d'arrêt au
 * premier problème.
 */
export function validateFormFields(
  fields: FormFieldForm[],
  t: TFunc,
): Record<number, string> {
  const errors: Record<number, string> = {};
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (!field.label.trim()) {
      errors[i] = vk(t, 'fieldLabelRequired', { n: i + 1 });
      continue;
    }
    if (['select', 'checkbox', 'radio'].includes(field.field_type) && !field.options.trim()) {
      errors[i] = vk(t, 'fieldOptionsRequired', { label: field.label });
    }
  }
  return errors;
}
