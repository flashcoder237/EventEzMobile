/**
 * Tests des helpers extraits de `useExport`.
 *
 * Couvre :
 * - URL building (encoding, params vides filtrés, suffix `export_format`)
 * - Filename sanitization (caractères spéciaux, troncature)
 * - Mapping erreur → message utilisateur (codes HTTP, network, fallback)
 * - Mapping format → ext / MIME / UTI / label (cohérence des 4 maps)
 */

import {
  ExportFormat,
  FORMAT_EXT,
  FORMAT_MIME,
  FORMAT_UTI,
  FORMAT_LABEL,
  buildExportUrl,
  sanitizeFilename,
  mapExportError,
} from '../exportHelpers';

describe('buildExportUrl', () => {
  const BASE = 'https://api.eventez.online/api';

  it('appose `export_format` correctement à un endpoint sans query', () => {
    const url = buildExportUrl(BASE, '/registrations/export/', {}, 'csv');
    expect(url).toBe('https://api.eventez.online/api/registrations/export/?export_format=csv');
  });

  it('utilise `&` si l\'endpoint contient déjà une query string', () => {
    const url = buildExportUrl(BASE, '/audit/logs/export/?user=42', {}, 'pdf');
    expect(url).toBe('https://api.eventez.online/api/audit/logs/export/?user=42&export_format=pdf');
  });

  it('encode les valeurs avec accents et espaces', () => {
    const url = buildExportUrl(BASE, '/events/export/', { search: 'Soirée gala' }, 'excel');
    expect(url).toContain('search=Soir%C3%A9e+gala');
    expect(url).toContain('export_format=excel');
  });

  it('filtre les params undefined / null / vides', () => {
    const url = buildExportUrl(
      BASE,
      '/events/export/',
      { event_id: '', status: undefined as any, type: 'billetterie' },
      'csv',
    );
    expect(url).not.toContain('event_id=');
    expect(url).not.toContain('status=');
    expect(url).toContain('type=billetterie');
    expect(url).toContain('export_format=csv');
  });

  it('strippe le trailing slash du base URL', () => {
    const url = buildExportUrl(`${BASE}/`, '/events/export/', {}, 'csv');
    expect(url).toBe('https://api.eventez.online/api/events/export/?export_format=csv');
  });

  it('préfixe le path avec `/` si absent', () => {
    const url = buildExportUrl(BASE, 'events/export/', {}, 'csv');
    expect(url).toBe('https://api.eventez.online/api/events/export/?export_format=csv');
  });

  it('utilise `export_format` et NON `format` (DRF gotcha)', () => {
    const url = buildExportUrl(BASE, '/x/', {}, 'pdf');
    expect(url).toContain('export_format=pdf');
    expect(url).not.toMatch(/[?&]format=pdf/);
  });

  it('accepte un objet de params null/undefined sans crasher', () => {
    expect(() => buildExportUrl(BASE, '/x/', null as any, 'csv')).not.toThrow();
    expect(() => buildExportUrl(BASE, '/x/', undefined as any, 'csv')).not.toThrow();
  });
});

describe('sanitizeFilename', () => {
  it('remplace les caractères spéciaux par `_`', () => {
    expect(sanitizeFilename('rapport mai 2026.pdf')).toBe('rapport_mai_2026_pdf');
    // 'événement #1' → é/v/é/n/e/m/e/n/t/space/#/1 = 12 chars, accents et symboles → `_`
    expect(sanitizeFilename('événement #1')).toBe('_v_nement__1');
  });

  it('préserve les chiffres, lettres ASCII, `_` et `-`', () => {
    expect(sanitizeFilename('rapport_2026-05')).toBe('rapport_2026-05');
  });

  it('tronque à 60 caractères', () => {
    const long = 'a'.repeat(100);
    expect(sanitizeFilename(long)).toHaveLength(60);
  });

  it('retombe sur "export" si nom vide', () => {
    expect(sanitizeFilename('')).toBe('export');
    expect(sanitizeFilename(undefined as any)).toBe('export');
  });
});

describe('mapExportError', () => {
  it('mappe 401 et "unauthorized" en session expirée', () => {
    expect(mapExportError('Request failed with status 401')).toBe(
      'Session expirée. Reconnectez-vous puis réessayez.',
    );
    expect(mapExportError('Unauthorized access')).toBe(
      'Session expirée. Reconnectez-vous puis réessayez.',
    );
  });

  it('mappe 403 et "forbidden" en droits insuffisants', () => {
    expect(mapExportError('HTTP 403 Forbidden')).toBe(
      'Vous n\'avez pas les droits pour exporter ces données.',
    );
    expect(mapExportError('forbidden by policy')).toBe(
      'Vous n\'avez pas les droits pour exporter ces données.',
    );
  });

  it('mappe 404 en non disponible', () => {
    expect(mapExportError('Got status 404 from server')).toBe(
      'Cette exportation n\'est pas disponible.',
    );
  });

  it('mappe network/timeout en erreur de connexion', () => {
    expect(mapExportError('Network request failed')).toBe(
      'Connexion impossible. Vérifiez votre réseau et réessayez.',
    );
    expect(mapExportError('Request timeout exceeded')).toBe(
      'Connexion impossible. Vérifiez votre réseau et réessayez.',
    );
  });

  it('priorise les codes HTTP sur les mots-clés génériques', () => {
    // Un message contenant à la fois "401" et "network" doit être traité comme 401.
    expect(mapExportError('Network 401 unauthorized')).toBe(
      'Session expirée. Reconnectez-vous puis réessayez.',
    );
  });

  it('renvoie le message brut si pas de match connu', () => {
    expect(mapExportError('Le fichier exporté est vide.')).toBe('Le fichier exporté est vide.');
  });

  it('fournit un message par défaut pour les erreurs vides', () => {
    expect(mapExportError('')).toBe('Erreur lors de l\'export.');
  });
});

describe('FORMAT_* maps', () => {
  const formats: ExportFormat[] = ['csv', 'excel', 'pdf'];

  it('ont toutes une entrée pour chaque format supporté', () => {
    for (const fmt of formats) {
      expect(FORMAT_EXT[fmt]).toBeTruthy();
      expect(FORMAT_MIME[fmt]).toBeTruthy();
      expect(FORMAT_LABEL[fmt]).toBeTruthy();
      expect(FORMAT_UTI[fmt]).toBeTruthy();
    }
  });

  it('FORMAT_EXT démarre par un point', () => {
    for (const fmt of formats) {
      expect(FORMAT_EXT[fmt]).toMatch(/^\./);
    }
  });

  it('FORMAT_MIME contient un `/`', () => {
    for (const fmt of formats) {
      expect(FORMAT_MIME[fmt]).toContain('/');
    }
  });

  it('mappe Excel vers .xlsx (et non .xls)', () => {
    expect(FORMAT_EXT.excel).toBe('.xlsx');
    expect(FORMAT_MIME.excel).toContain('spreadsheetml.sheet');
  });

  it('FORMAT_LABEL est une string courte propre (pas tout en majuscules pour Excel)', () => {
    expect(FORMAT_LABEL.csv).toBe('CSV');
    expect(FORMAT_LABEL.excel).toBe('Excel');
    expect(FORMAT_LABEL.pdf).toBe('PDF');
  });
});
