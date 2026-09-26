/**
 * Les liens `/dashboard/*` des emails transactionnels doivent ouvrir l'APP.
 *
 * Les motifs étaient ancrés sur la fin de chaîne (`/?$`), donc tout chemin
 * portant un segment — `/dashboard/registrations/{id}`, le lien de l'email de
 * confirmation d'inscription, le plus cliqué du produit — n'était jamais
 * réécrit et ouvrait le navigateur.
 *
 * Deux invariants sont vérifiés ici :
 *  1. chaque lien émis par le backend atteint un chemin mobile ;
 *  2. un chemin réécrit ne fabrique jamais d'URL incohérente (id dupliqué).
 */
import { rewriteDashboardPath } from '../dashboardRewrites';

describe('rewriteDashboardPath — liens email vers routes mobiles', () => {
  describe('chemins à segment (ceux qui ouvraient le navigateur)', () => {
    it("détail d'inscription → RegistrationDetails", () => {
      expect(rewriteDashboardPath('/dashboard/registrations/abc-123')).toBe(
        '/registrations/abc-123',
      );
    });

    it('tolère le slash final', () => {
      expect(rewriteDashboardPath('/dashboard/registrations/abc-123/')).toBe(
        '/registrations/abc-123',
      );
    });

    it("édition d'événement → EventEdit", () => {
      expect(rewriteDashboardPath('/dashboard/events/ev-9/edit')).toBe(
        '/events/ev-9/edit',
      );
    });
  });

  describe('liste des participants (mauvaise destination auparavant)', () => {
    it("`?event=` → EventRegistrations, PAS la liste des billets achetés", () => {
      const result = rewriteDashboardPath('/dashboard/registrations?event=ev-42');
      expect(result).toBe('/event-registrations/ev-42');
      // Régression historique : ce lien organisateur tombait sur `/tickets`.
      expect(result).not.toContain('/tickets');
    });

    it("n'injecte pas l'id deux fois", () => {
      // `/event-registrations/42?event=42` router-ait vers un écran avec un
      // paramètre en double.
      expect(rewriteDashboardPath('/dashboard/registrations?event=42')).toBe(
        '/event-registrations/42',
      );
    });

    it('ignore les autres query params', () => {
      expect(
        rewriteDashboardPath('/dashboard/registrations?status=paid&event=ev-7&page=2'),
      ).toBe('/event-registrations/ev-7');
    });
  });

  describe('index — comportement préservé', () => {
    it.each([
      ['/dashboard/tickets', '/tickets'],
      ['/dashboard/registrations', '/tickets'],
      ['/dashboard/events', '/my-events'],
      ['/dashboard/payments', '/my-payments'],
    ])('%s → %s', (input, expected) => {
      expect(rewriteDashboardPath(input)).toBe(expected);
    });

    it('préserve la query string sur un index', () => {
      expect(rewriteDashboardPath('/dashboard/events?filter=draft')).toBe(
        '/my-events?filter=draft',
      );
    });
  });

  describe('ordre des motifs', () => {
    it("le motif à segment gagne sur l'index", () => {
      // Si `/dashboard/registrations/?$` matchait en premier, on obtiendrait
      // `/tickets` et l'identifiant serait perdu.
      expect(rewriteDashboardPath('/dashboard/registrations/xyz')).toBe(
        '/registrations/xyz',
      );
    });

    it("l'édition gagne sur la liste des événements", () => {
      expect(rewriteDashboardPath('/dashboard/events/ev-1/edit')).not.toBe('/my-events');
    });
  });

  describe('chemins non concernés', () => {
    it.each([
      '/events/ev-1',
      '/organizers/org-2',
      '/dashboard/unknown-section',
      '/dashboard',
    ])('%s reste inchangé', (input) => {
      expect(rewriteDashboardPath(input)).toBe(input);
    });
  });
});
