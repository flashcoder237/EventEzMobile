/**
 * Un incident sur une passerelle de paiement (ou sur « tous les paiements »)
 * doit être annoncé sur les écrans d'achat — et seulement là.
 */
import { shouldShowIncidentForRoute } from '../incidentScope';

const svc = (keys: string[]) => ({ scope: 'service' as const, affected_services: keys });

describe('incidentScope — paiements', () => {
  it.each(['payments.collect', 'payments.cinetpay', 'payments.stripe', 'payments.campay'])(
    '%s est montré sur l’achat et le paiement',
    (key) => {
      expect(shouldShowIncidentForRoute(svc([key]), 'TicketPurchase')).toBe(true);
      expect(shouldShowIncidentForRoute(svc([key]), 'Payment')).toBe(true);
    },
  );

  it('un incident paiement n’apparaît pas dans la messagerie', () => {
    expect(shouldShowIncidentForRoute(svc(['payments.cinetpay']), 'Conversation')).toBe(false);
  });

  it('« tous les paiements » est aussi signalé sur la fiche événement', () => {
    expect(shouldShowIncidentForRoute(svc(['payments.collect']), 'EventDetails')).toBe(true);
  });

  it('un incident global reste visible partout', () => {
    expect(shouldShowIncidentForRoute({ scope: 'global', affected_services: [] }, 'Profile')).toBe(true);
  });
});
