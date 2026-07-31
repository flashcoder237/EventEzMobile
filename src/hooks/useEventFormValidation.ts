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
}

export function useEventFormValidation(
  form: EventFormState,
  showError: AlertActions['showError'],
) {
  const { t } = useTranslation();
  const validateStepWithDetails = useCallback((step: number): StepValidationResult => {
    const errors: Partial<Record<StepFieldError, string>> = {};

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
          if (!validateTicketTypes(form.ticketTypes, showError, t, form.startDate, form.endDate)) {
            errors.ticketTypes = errors.ticketTypes || vk(t, 'ticketCheck');
          }
          if (form.showFormFieldsForBilletterie && form.formFields.length > 0) {
            if (!validateFormFields(form.formFields, showError, t)) {
              errors.formFields = vk(t, 'formFieldsCheck');
            }
          }
        } else {
          if (form.formFields.length === 0) {
            errors.formFields = vk(t, 'formFieldRequired');
          } else if (!validateFormFields(form.formFields, showError, t)) {
            errors.formFields = vk(t, 'formFieldsCheck');
          }
        }
        break;
    }

    return { valid: Object.keys(errors).length === 0, errors };
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

function validateTicketTypes(
  tickets: TicketTypeForm[],
  showError: AlertActions['showError'],
  t: TFunc,
  eventStart?: Date,
  eventEnd?: Date,
): boolean {
  const title = vk(t, 'errorTitle');
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const label = ticket.name.trim() || `#${i + 1}`;
    if (!ticket.name.trim()) {
      showError(title, vk(t, 'ticketNameRequired', { n: i + 1 }));
      return false;
    }
    // Prix >= 0 (parser tolerant : accepte "10,5" et "10.5", mais pas "abc")
    const price = parseFloat(String(ticket.price).replace(',', '.'));
    if (Number.isNaN(price) || price < 0) {
      showError(title, vk(t, 'ticketPriceInvalid', { label }));
      return false;
    }
    if (parseInt(ticket.quantity_total) <= 0) {
      showError(title, vk(t, 'ticketQtyInvalid', { label }));
      return false;
    }
    // Sales window : start < end
    if (ticket.sales_start && ticket.sales_end && ticket.sales_start >= ticket.sales_end) {
      showError(title, vk(t, 'ticketDatesInvalid', { label }));
      return false;
    }
    // Sales doit finir AVANT (ou au plus tard a) la fin de l'event
    if (eventEnd && ticket.sales_end && ticket.sales_end > eventEnd) {
      showError(title, vk(t, 'ticketSalesAfterEnd', { label }));
      return false;
    }
    // max_per_order >= min_per_order si les deux sont definis
    const minPer = parseInt(ticket.min_per_order);
    const maxPer = parseInt(ticket.max_per_order);
    if (!Number.isNaN(minPer) && !Number.isNaN(maxPer) && maxPer > 0 && maxPer < minPer) {
      showError(title, vk(t, 'ticketMaxMin', { label }));
      return false;
    }
  }
  return true;
}

function validateFormFields(
  fields: FormFieldForm[],
  showError: AlertActions['showError'],
  t: TFunc,
): boolean {
  const title = vk(t, 'errorTitle');
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (!field.label.trim()) {
      showError(title, vk(t, 'fieldLabelRequired', { n: i + 1 }));
      return false;
    }
    if (['select', 'checkbox', 'radio'].includes(field.field_type) && !field.options.trim()) {
      showError(title, vk(t, 'fieldOptionsRequired', { label: field.label }));
      return false;
    }
  }
  return true;
}
