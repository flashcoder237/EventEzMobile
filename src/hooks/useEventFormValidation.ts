import { useCallback } from 'react';
import type { EventFormState, AlertActions, TicketTypeForm, FormFieldForm } from './useEventForm';
import { isExternalVideoUrl } from '../lib/utils/videoUrl';

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
  const validateStepWithDetails = useCallback((step: number): StepValidationResult => {
    const errors: Partial<Record<StepFieldError, string>> = {};

    switch (step) {
      case 1:
        if (!form.title.trim()) errors.title = 'Le titre est requis';
        if (!form.description.trim()) errors.description = 'La description est requise';
        if (!form.categoryId) errors.categoryId = 'Sélectionne une catégorie';
        // Champ optionnel — on ne le bloque que si rempli ET non-reconnu
        // (pas YouTube/Vimeo). Le backend rejette les autres providers, autant
        // bloquer ici pour eviter un aller-retour API qui echoue au step 4.
        if (form.coverVideoUrl && form.coverVideoUrl.trim() && !isExternalVideoUrl(form.coverVideoUrl.trim())) {
          errors.coverVideoUrl = 'Seules les URLs YouTube et Vimeo sont supportees';
        }
        break;

      case 2: {
        // Buffer 5 min : tolere une legere latence entre saisie et soumission.
        // Au create uniquement — en edit, l'organisateur peut modifier un event
        // passe (description, etc.).
        if (!form.isEditMode) {
          const minStart = new Date(Date.now() - 5 * 60 * 1000);
          if (form.startDate < minStart) {
            errors.startDate = 'La date de debut ne peut pas etre dans le passe';
          }
        }
        if (form.endDate <= form.startDate) {
          errors.endDate = 'La date de fin doit être après la date de début';
        }
        if (form.locationType === 'in_person' || form.locationType === 'hybrid') {
          if (!form.locationCity.trim()) {
            errors.locationCity = 'La ville est requise pour un événement présentiel';
          }
        }
        if (form.locationType === 'online' || form.locationType === 'hybrid') {
          if (!form.onlineUrl.trim()) {
            errors.onlineUrl = 'Le lien de connexion est requis pour un événement en ligne';
          }
        }
        break;
      }

      case 3:
        if (form.eventType === 'billetterie') {
          if (!form.isFree && form.ticketTypes.length === 0) {
            errors.ticketTypes = 'Ajoute au moins un type de billet';
          }
          if (!validateTicketTypes(form.ticketTypes, showError, form.startDate, form.endDate)) {
            errors.ticketTypes = errors.ticketTypes || 'Vérifie les noms, prix et dates de vente';
          }
          if (form.showFormFieldsForBilletterie && form.formFields.length > 0) {
            if (!validateFormFields(form.formFields, showError)) {
              errors.formFields = 'Vérifie les champs du formulaire';
            }
          }
        } else {
          if (form.formFields.length === 0) {
            errors.formFields = 'Ajoute au moins un champ de formulaire';
          } else if (!validateFormFields(form.formFields, showError)) {
            errors.formFields = 'Vérifie les champs du formulaire';
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
    form.showFormFieldsForBilletterie, showError,
  ]);

  // Backward-compat: validateStep retourne toujours un bool, et déclenche un
  // toast pour la première erreur trouvée. Les components qui ont besoin du
  // détail utilisent validateStepWithDetails directement.
  const validateStep = useCallback((step: number): boolean => {
    const result = validateStepWithDetails(step);
    if (!result.valid) {
      const firstError = Object.values(result.errors)[0];
      if (firstError) showError('Erreur', firstError);
    }
    return result.valid;
  }, [validateStepWithDetails, showError]);

  return Object.assign(validateStep, { withDetails: validateStepWithDetails }) as typeof validateStep & {
    withDetails: typeof validateStepWithDetails;
  };
}

function validateTicketTypes(
  tickets: TicketTypeForm[],
  showError: AlertActions['showError'],
  eventStart?: Date,
  eventEnd?: Date,
): boolean {
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const ticketLabel = ticket.name.trim() || `#${i + 1}`;
    if (!ticket.name.trim()) {
      showError('Erreur', `Le nom du billet #${i + 1} est requis`);
      return false;
    }
    // Prix >= 0 (parser tolerant : accepte "10,5" et "10.5", mais pas "abc")
    const price = parseFloat(String(ticket.price).replace(',', '.'));
    if (Number.isNaN(price) || price < 0) {
      showError('Erreur', `Le prix du billet "${ticketLabel}" doit etre positif ou nul`);
      return false;
    }
    if (parseInt(ticket.quantity_total) <= 0) {
      showError('Erreur', `La quantité du billet "${ticketLabel}" doit être supérieure à 0`);
      return false;
    }
    // Sales window : start < end
    if (ticket.sales_start && ticket.sales_end && ticket.sales_start >= ticket.sales_end) {
      showError('Erreur', `Les dates de vente du billet "${ticketLabel}" sont incoherentes (fin avant debut)`);
      return false;
    }
    // Sales doit finir AVANT (ou au plus tard a) la fin de l'event
    if (eventEnd && ticket.sales_end && ticket.sales_end > eventEnd) {
      showError('Erreur', `La vente du billet "${ticketLabel}" ne peut pas se terminer apres la fin de l'event`);
      return false;
    }
    // max_per_order >= min_per_order si les deux sont definis
    const minPer = parseInt(ticket.min_per_order);
    const maxPer = parseInt(ticket.max_per_order);
    if (!Number.isNaN(minPer) && !Number.isNaN(maxPer) && maxPer > 0 && maxPer < minPer) {
      showError('Erreur', `Le max par commande du billet "${ticketLabel}" doit etre >= au min`);
      return false;
    }
  }
  return true;
}

function validateFormFields(fields: FormFieldForm[], showError: AlertActions['showError']): boolean {
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (!field.label.trim()) {
      showError('Erreur', `L'intitulé du champ #${i + 1} est requis`);
      return false;
    }
    if (['select', 'checkbox', 'radio'].includes(field.field_type) && !field.options.trim()) {
      showError('Erreur', `Les options sont requises pour le champ "${field.label}"`);
      return false;
    }
  }
  return true;
}
