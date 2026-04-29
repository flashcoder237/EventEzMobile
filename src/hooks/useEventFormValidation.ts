import { useCallback } from 'react';
import type { EventFormState, AlertActions, TicketTypeForm, FormFieldForm } from './useEventForm';

/**
 * Liste des clés de champ que le validateStep peut signaler en erreur.
 * Permet aux components Step* d'appliquer un style "invalide" en lisant
 * `form.stepErrors[fieldKey]` côté EventCreateScreen.
 */
export type StepFieldError =
  | 'title'
  | 'description'
  | 'categoryId'
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
        break;

      case 2:
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

      case 3:
        if (form.eventType === 'billetterie') {
          if (!form.isFree && form.ticketTypes.length === 0) {
            errors.ticketTypes = 'Ajoute au moins un type de billet';
          }
          if (!validateTicketTypes(form.ticketTypes, showError)) {
            errors.ticketTypes = errors.ticketTypes || 'Vérifie les noms et quantités de billets';
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
    form.title, form.description, form.categoryId, form.startDate, form.endDate,
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

function validateTicketTypes(tickets: TicketTypeForm[], showError: AlertActions['showError']): boolean {
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (!ticket.name.trim()) {
      showError('Erreur', `Le nom du billet #${i + 1} est requis`);
      return false;
    }
    if (parseInt(ticket.quantity_total) <= 0) {
      showError('Erreur', `La quantité du billet "${ticket.name}" doit être supérieure à 0`);
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
