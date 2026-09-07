/**
 * Urgence d'une échéance de vente.
 *
 * L'affichage existant plafonnait au JOUR : à deux heures de la
 * fermeture, il annonçait encore « dans 1 jour », du même gris neutre
 * qu'à trente jours. Un acheteur qui remettait au lendemain trouvait
 * porte close.
 */
import { getDeadlineInfo, shouldHighlightDeadline } from '../saleDeadline';

const NOW = Date.parse('2026-03-10T12:00:00Z');
const inMs = (ms: number) => new Date(NOW + ms).toISOString();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('getDeadlineInfo', () => {
  it('descend en MINUTES dans la dernière heure', () => {
    // Le cas qui faisait rater l'échéance.
    const info = getDeadlineInfo(inMs(90 * MINUTE), NOW)!;
    expect(info.unit).toBe('hours');
    expect(info.value).toBe(1);

    const closer = getDeadlineInfo(inMs(20 * MINUTE), NOW)!;
    expect(closer.unit).toBe('minutes');
    expect(closer.value).toBe(20);
  });

  it('descend en HEURES sous une journée', () => {
    const info = getDeadlineInfo(inMs(5 * HOUR), NOW)!;
    expect(info.unit).toBe('hours');
    expect(info.value).toBe(5);
  });

  it('reste en JOURS au-delà', () => {
    const info = getDeadlineInfo(inMs(3 * DAY), NOW)!;
    expect(info.unit).toBe('days');
    expect(info.value).toBe(3);
  });

  it('gradue l urgence', () => {
    expect(getDeadlineInfo(inMs(30 * DAY), NOW)!.urgency).toBe('none');
    expect(getDeadlineInfo(inMs(3 * DAY), NOW)!.urgency).toBe('soon');
    expect(getDeadlineInfo(inMs(5 * HOUR), NOW)!.urgency).toBe('urgent');
    expect(getDeadlineInfo(inMs(30 * MINUTE), NOW)!.urgency).toBe('last_call');
  });

  it('signale une échéance dépassée', () => {
    const info = getDeadlineInfo(inMs(-HOUR), NOW)!;
    expect(info.urgency).toBe('passed');
    expect(info.remainingMs).toBeLessThan(0);
  });

  it('ne descend jamais à zéro tant qu il reste du temps', () => {
    // Afficher « dans 0 minute » alors que la vente est ouverte serait faux.
    const info = getDeadlineInfo(inMs(30_000), NOW)!;
    expect(info.value).toBeGreaterThanOrEqual(1);
    expect(info.urgency).toBe('last_call');
  });

  it('renvoie null sans échéance ou sur une date illisible', () => {
    expect(getDeadlineInfo(null, NOW)).toBeNull();
    expect(getDeadlineInfo(undefined, NOW)).toBeNull();
    expect(getDeadlineInfo('pas-une-date', NOW)).toBeNull();
  });

  it('accepte un objet Date', () => {
    expect(getDeadlineInfo(new Date(NOW + 6 * HOUR), NOW)!.unit).toBe('hours');
  });
});

describe('shouldHighlightDeadline', () => {
  it('ne met en avant que ce qui approche', () => {
    // Une pastille permanente se banalise et n'est plus vue le jour où
    // elle compte.
    expect(shouldHighlightDeadline(getDeadlineInfo(inMs(30 * DAY), NOW))).toBe(false);
    expect(shouldHighlightDeadline(getDeadlineInfo(inMs(2 * DAY), NOW))).toBe(true);
    expect(shouldHighlightDeadline(getDeadlineInfo(inMs(HOUR), NOW))).toBe(true);
  });

  it('ne met pas en avant une échéance dépassée', () => {
    // Ce cas relève d'un autre traitement : « ventes terminées ».
    expect(shouldHighlightDeadline(getDeadlineInfo(inMs(-HOUR), NOW))).toBe(false);
  });

  it('gère l absence d échéance', () => {
    expect(shouldHighlightDeadline(null)).toBe(false);
  });
});
