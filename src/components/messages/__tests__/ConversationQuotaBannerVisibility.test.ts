/**
 * Règle d'affichage progressif du bandeau de quota.
 *
 * Le bandeau était permanent : jauge à 0 %, compte à rebours de suppression
 * décrémentant chaque jour, bouton « Sauvegarder » — en haut de CHAQUE
 * conversation de groupe, en continu. Plainte récurrente des utilisateurs.
 *
 * Ces tests verrouillent le comportement silencieux par défaut : si quelqu'un
 * réaffiche le bandeau en permanence, ils échouent.
 */
import {
  computeBannerVisibility,
  bannerNeedsAttention,
  QUOTA_VISIBLE_PCT,
  DEADLINE_VISIBLE_DAYS,
} from '../ConversationQuotaBanner';

const base = {
  percentage: 0,
  daysUntilDelete: null as number | null,
  autoDeleteAt: null as string | null,
  maxBytes: 500 * 1024 * 1024,
  isReadOnly: false,
};

describe('cas nominal — le bandeau se tait', () => {
  it('quota bas et pas d’échéance → rien', () => {
    expect(computeBannerVisibility(base).visible).toBe(false);
  });

  it('quota à 0 % avec suppression lointaine → rien', () => {
    // Exactement la capture d'écran qui a motivé le changement :
    // « 0 o / 500.0 Mo » + « Suppression dans 15 jours ».
    const v = computeBannerVisibility({
      ...base,
      percentage: 0,
      daysUntilDelete: 15,
      autoDeleteAt: '2026-10-08T00:00:00Z',
    });
    expect(v.visible).toBe(false);
  });

  it(`juste sous le seuil (${QUOTA_VISIBLE_PCT - 1} %) → rien`, () => {
    expect(
      computeBannerVisibility({ ...base, percentage: QUOTA_VISIBLE_PCT - 1 }).visible,
    ).toBe(false);
  });

  it(`juste au-delà de la fenêtre (${DEADLINE_VISIBLE_DAYS + 1} jours) → rien`, () => {
    expect(
      computeBannerVisibility({
        ...base,
        daysUntilDelete: DEADLINE_VISIBLE_DAYS + 1,
        autoDeleteAt: '2026-10-08T00:00:00Z',
      }).visible,
    ).toBe(false);
  });
});

describe('quota qui se remplit', () => {
  it(`au seuil (${QUOTA_VISIBLE_PCT} %) → jauge visible`, () => {
    const v = computeBannerVisibility({ ...base, percentage: QUOTA_VISIBLE_PCT });
    expect(v.visible).toBe(true);
    expect(v.showBar).toBe(true);
    expect(v.showSaveButton).toBe(true);
  });

  it('quota critique (95 %) → jauge visible', () => {
    const v = computeBannerVisibility({ ...base, percentage: 95 });
    expect(v.showBar).toBe(true);
  });

  it('pas de maxBytes → pas de jauge, même au-delà du seuil', () => {
    const v = computeBannerVisibility({ ...base, percentage: 95, maxBytes: null });
    expect(v.showBar).toBe(false);
  });
});

describe('échéance de suppression proche', () => {
  it(`dans ${DEADLINE_VISIBLE_DAYS} jours → échéance + bouton sauvegarder`, () => {
    const v = computeBannerVisibility({
      ...base,
      daysUntilDelete: DEADLINE_VISIBLE_DAYS,
      autoDeleteAt: '2026-10-08T00:00:00Z',
    });
    expect(v.visible).toBe(true);
    expect(v.showDeadline).toBe(true);
    expect(v.showSaveButton).toBe(true);
    // Quota bas : la jauge reste masquée, seule l'échéance compte.
    expect(v.showBar).toBe(false);
  });

  it('dernier jour (0) → toujours affiché', () => {
    const v = computeBannerVisibility({
      ...base,
      daysUntilDelete: 0,
      autoDeleteAt: '2026-10-08T00:00:00Z',
    });
    expect(v.visible).toBe(true);
    expect(v.showDeadline).toBe(true);
  });

  it('échéance dépassée (jours négatifs) → pas d’échéance affichée', () => {
    const v = computeBannerVisibility({
      ...base,
      daysUntilDelete: -1,
      autoDeleteAt: '2026-10-08T00:00:00Z',
    });
    expect(v.showDeadline).toBe(false);
  });

  it('sans autoDeleteAt → pas d’échéance affichée', () => {
    const v = computeBannerVisibility({ ...base, daysUntilDelete: 2, autoDeleteAt: null });
    expect(v.showDeadline).toBe(false);
  });
});

describe('lecture seule — prioritaire sur tous les seuils', () => {
  it('affiche le bandeau même avec quota bas et sans échéance', () => {
    const v = computeBannerVisibility({ ...base, isReadOnly: true });
    expect(v.visible).toBe(true);
  });

  it('masque la jauge : la conversation est gelée, le quota n’informe plus', () => {
    // « 0 o / 500 Mo » sous un bandeau d'archivage est du bruit pur : plus
    // personne n'écrira dans cette conversation.
    expect(computeBannerVisibility({ ...base, isReadOnly: true }).showBar).toBe(false);
    expect(
      computeBannerVisibility({ ...base, isReadOnly: true, percentage: 95 }).showBar,
    ).toBe(false);
  });

  it('masque le bouton « Sauvegarder » secondaire (l’encart a le sien)', () => {
    const v = computeBannerVisibility({ ...base, isReadOnly: true, percentage: 95 });
    expect(v.showSaveButton).toBe(false);
  });

  it('masque l’échéance (remplacée par le texte de l’encart rouge)', () => {
    const v = computeBannerVisibility({
      ...base,
      isReadOnly: true,
      daysUntilDelete: 2,
      autoDeleteAt: '2026-10-08T00:00:00Z',
    });
    expect(v.showDeadline).toBe(false);
  });
});

describe('bannerNeedsAttention — force l’ouverture de la zone de tête', () => {
  // La zone de tête est REPLIÉE par défaut : dans une messagerie, les messages
  // priment. Mais replier un avertissement reviendrait à le masquer — d'où ce
  // déblocage, qui prime sur la préférence de l'utilisateur.
  const q = {
    percentage: 0,
    daysUntilDelete: null as number | null,
    isReadOnly: false,
    isMuted: false,
  };

  it('cas nominal → pas d’ouverture forcée (reste replié)', () => {
    expect(bannerNeedsAttention(q)).toBe(false);
    expect(bannerNeedsAttention({ ...q, daysUntilDelete: 30 })).toBe(false);
    expect(bannerNeedsAttention({ ...q, percentage: 50 })).toBe(false);
  });

  it('lecture seule → ouverture forcée', () => {
    expect(bannerNeedsAttention({ ...q, isReadOnly: true })).toBe(true);
  });

  it('conversation muette → ouverture forcée', () => {
    expect(bannerNeedsAttention({ ...q, isMuted: true })).toBe(true);
  });

  it('échéance proche → ouverture forcée', () => {
    expect(bannerNeedsAttention({ ...q, daysUntilDelete: DEADLINE_VISIBLE_DAYS })).toBe(true);
    expect(bannerNeedsAttention({ ...q, daysUntilDelete: 0 })).toBe(true);
  });

  it('quota saturé → ouverture forcée', () => {
    expect(bannerNeedsAttention({ ...q, percentage: QUOTA_VISIBLE_PCT })).toBe(true);
  });

  it('aligné sur les seuils de computeBannerVisibility', () => {
    // Les deux règles doivent bouger ensemble : un bandeau visible sans
    // ouverture forcée resterait caché, un bandeau ouvert sans contenu serait
    // vide. Juste sous les seuils, les deux disent « non ».
    const justUnder = { ...q, percentage: QUOTA_VISIBLE_PCT - 1, daysUntilDelete: DEADLINE_VISIBLE_DAYS + 1 };
    expect(bannerNeedsAttention(justUnder)).toBe(false);
    expect(
      computeBannerVisibility({
        percentage: justUnder.percentage,
        daysUntilDelete: justUnder.daysUntilDelete,
        autoDeleteAt: '2026-10-08T00:00:00Z',
        maxBytes: 500,
        isReadOnly: false,
      }).visible,
    ).toBe(false);
  });
});
