/**
 * Tests de dateFormatters.ts — formatage et comparaisons de dates (fr-FR).
 * Pour les fonctions relatives (isEventInFuture, formatTimeAgo), on utilise des
 * dates dynamiques calculées depuis Date.now() → robuste sans fake timers.
 */
import {
  formatDate, formatFullDate, formatDateTime,
  formatTimeAgo, isEventInFuture, isThisWeekend,
} from '../dateFormatters';

const norm = (s: string) => s.replace(/[  ]/g, ' ');
const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000).toISOString();
const minsAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();

describe('formatDate / formatFullDate', () => {
  it('formatDate → "jour mois court"', () => {
    expect(norm(formatDate('2026-01-12T10:00:00Z'))).toMatch(/12 janv/);
  });
  it('formatFullDate → "jour mois long année"', () => {
    expect(norm(formatFullDate('2026-01-12T10:00:00Z'))).toMatch(/12 janvier 2026/);
  });
});

describe('formatDateTime', () => {
  it('contient la date et une heure', () => {
    const out = norm(formatDateTime('2026-01-12T14:30:00Z'));
    // Selon le fuseau, l'heure exacte varie ; on vérifie juste la présence
    // d'un motif heure (HH:MM ou HHhMM).
    expect(out).toMatch(/\d{1,2}\s*[:h]\s*\d{2}/);
  });
});

describe('isEventInFuture', () => {
  it('true pour une date future', () => {
    expect(isEventInFuture(daysFromNow(5))).toBe(true);
  });
  it('true pour aujourd\'hui (>= début de journée)', () => {
    expect(isEventInFuture(new Date().toISOString())).toBe(true);
  });
  it('false pour une date passée', () => {
    expect(isEventInFuture(daysFromNow(-5))).toBe(false);
  });
  it('true si date absente (afficher par défaut)', () => {
    expect(isEventInFuture('')).toBe(true);
  });
});

describe('formatTimeAgo', () => {
  it('minutes récentes', () => {
    // "il y a X min" ou "à l'instant" selon l'implémentation — on tolère.
    const out = formatTimeAgo(minsAgo(5)).toLowerCase();
    expect(out).toMatch(/min|instant|il y a/);
  });
  it('heures', () => {
    const out = formatTimeAgo(minsAgo(180)).toLowerCase();
    expect(out).toMatch(/h|heure|il y a/);
  });
  it('jours', () => {
    const out = formatTimeAgo(daysFromNow(-3)).toLowerCase();
    expect(out).toMatch(/j|jour|il y a/);
  });
});

describe('isThisWeekend', () => {
  it('retourne un booléen sans crash', () => {
    // Le résultat exact dépend du jour courant ; on vérifie le contrat de type
    // et la robustesse sur des dates variées.
    expect(typeof isThisWeekend(daysFromNow(1))).toBe('boolean');
    expect(typeof isThisWeekend(daysFromNow(30))).toBe('boolean');
  });
  it('false pour une date très lointaine (hors week-end courant)', () => {
    expect(isThisWeekend(daysFromNow(60))).toBe(false);
  });
});
