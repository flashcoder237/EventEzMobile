import { useCallback } from 'react';
import type { EventFormState, AlertActions, TicketTypeForm, FormFieldForm } from './useEventForm';

export function useEventFormValidation(
  form: EventFormState,
  showError: AlertActions['showError'],
) {
  const validateStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1:
        if (!form.title.trim()) {
          showError('Erreur', 'Le titre est requis');
          return false;
        }
        if (!form.description.trim()) {
          showError('Erreur', 'La description est requise');
          return false;
        }
        if (!form.categoryId) {
          showError('Erreur', 'Veuillez sélectionner une catégorie');
          return false;
        }
        return true;
      case 2:
        if (form.endDate <= form.startDate) {
          showError('Erreur', 'La date de fin doit être après la date de début');
          return false;
        }
        if (form.locationType === 'in_person' || form.locationType === 'hybrid') {
          if (!form.locationCity.trim()) {
            showError('Erreur', 'La ville est requise pour un événement présentiel');
            return false;
          }
        }
        if (form.locationType === 'online' || form.locationType === 'hybrid') {
          if (!form.onlineUrl.trim()) {
            showError('Erreur', 'Le lien de connexion est requis pour un événement en ligne');
            return false;
          }
        }
        return true;
      case 3:
        return validateStep3(form, showError);
      default:
        return true;
    }
  }, [
    form.title, form.description, form.categoryId, form.startDate, form.endDate,
    form.locationType, form.locationCity, form.onlineUrl, form.onlinePlatform,
    form.eventType, form.isFree, form.ticketTypes, form.formFields,
    form.showFormFieldsForBilletterie, showError,
  ]);

  return validateStep;
}

function validateStep3(form: EventFormState, showError: AlertActions['showError']): boolean {
  if (form.eventType === 'billetterie') {
    if (!form.isFree && form.ticketTypes.length === 0) {
      showError('Erreur', 'Veuillez ajouter au moins un type de billet');
      return false;
    }
    if (!validateTicketTypes(form.ticketTypes, showError)) return false;
    if (form.showFormFieldsForBilletterie && form.formFields.length > 0) {
      if (!validateFormFields(form.formFields, showError)) return false;
    }
  } else {
    if (form.formFields.length === 0) {
      showError('Erreur', 'Veuillez ajouter au moins un champ de formulaire');
      return false;
    }
    if (!validateFormFields(form.formFields, showError)) return false;
  }
  return true;
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
