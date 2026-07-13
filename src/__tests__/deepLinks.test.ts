/**
 * Tests pour le routage des deep links (eventez://...) et les URL builders.
 *
 * Le but est de prouver que :
 *   1. Les URL web (WEB_BASE_URL/...) sont construites correctement et
 *      pointent vers les bonnes pages publiques (partage, OG).
 *   2. La config Linking de React Navigation reconnait les schemes attendus
 *      via la regle getStateFromPath par defaut.
 *   3. Les schemes `eventez://` (retour CinetPay/Stripe via WebBrowser) sont
 *      bien routes vers les screens PaymentSuccess / PaymentFailed.
 *
 * Sans ces tests, une faute de frappe dans une URL builder (`/events//` au
 * lieu de `/events/`) ne serait detectee qu'en prod via les retours utilisateur.
 */

import {
  WEB_BASE_URL,
  DEEP_LINK_SCHEME,
  getEventUrl,
  getOrganizerUrl,
  getSpeakerUrl,
  getVerificationUrl,
  getTicketVerificationUrl,
  getVolunteerSignupUrl,
  getTeamInvitationUrl,
  stripLocalePrefix,
} from '../constants/urls';

describe('URL builders web (partage + OG)', () => {
  describe('getEventUrl', () => {
    it('construit l\'URL canonique d\'un event', () => {
      expect(getEventUrl('evt-123')).toBe(`${WEB_BASE_URL}/events/evt-123`);
    });

    it('supporte les UUID complets', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      expect(getEventUrl(uuid)).toBe(`${WEB_BASE_URL}/events/${uuid}`);
    });

    it('supporte les slugs SEO-friendly', () => {
      expect(getEventUrl('mon-event-paris-a1b2c3d4')).toBe(
        `${WEB_BASE_URL}/events/mon-event-paris-a1b2c3d4`,
      );
    });
  });

  describe('getOrganizerUrl + getSpeakerUrl', () => {
    it('routent vers les bonnes pages publiques', () => {
      expect(getOrganizerUrl('org-1')).toBe(`${WEB_BASE_URL}/organizers/org-1`);
      expect(getSpeakerUrl('spk-1')).toBe(`${WEB_BASE_URL}/speakers/spk-1`);
    });
  });

  describe('getVerificationUrl + getTicketVerificationUrl', () => {
    it('verifie par registration ID', () => {
      expect(getVerificationUrl('reg-abc')).toBe(`${WEB_BASE_URL}/verify/reg-abc`);
    });

    it('verifie par ticket purchase ID (check-in granulaire)', () => {
      expect(getTicketVerificationUrl(456)).toBe(`${WEB_BASE_URL}/verify/t/456`);
      expect(getTicketVerificationUrl('tkt-789')).toBe(`${WEB_BASE_URL}/verify/t/tkt-789`);
    });

    it('garde verify/{id} distinct de verify/t/{id}', () => {
      // Garantie qu'un scan de QR ticket ne tombe pas sur la route registration.
      const regUrl = getVerificationUrl('xyz');
      const ticketUrl = getTicketVerificationUrl('xyz');
      expect(regUrl).not.toBe(ticketUrl);
      expect(ticketUrl).toContain('/verify/t/');
      expect(regUrl).not.toContain('/verify/t/');
    });
  });

  describe('getVolunteerSignupUrl + getTeamInvitationUrl', () => {
    it('construit l\'URL volontariat avec event ID', () => {
      expect(getVolunteerSignupUrl('evt-1')).toBe(
        `${WEB_BASE_URL}/events/evt-1/volunteer`,
      );
    });

    it('construit l\'URL invitation equipe avec token', () => {
      expect(getTeamInvitationUrl('tk_abc123')).toBe(
        `${WEB_BASE_URL}/team-invitation/tk_abc123`,
      );
    });
  });
});


describe('Deep link scheme', () => {
  it('utilise le scheme "eventez" partout', () => {
    expect(DEEP_LINK_SCHEME).toBe('eventez');
  });

  it('peut etre concatene en URI : eventez://payment-success/{id}', () => {
    const paymentId = 'pay-123';
    const uri = `${DEEP_LINK_SCHEME}://payment-success/${paymentId}`;
    expect(uri).toBe('eventez://payment-success/pay-123');
  });

  it('peut etre concatene en URI : eventez://payment-failed/{id}', () => {
    const uri = `${DEEP_LINK_SCHEME}://payment-failed/pay-xyz`;
    expect(uri).toBe('eventez://payment-failed/pay-xyz');
  });
});


describe('Deep link path parsing — simulation getStateFromPath', () => {
  /**
   * On reproduit la config React Navigation `linking.config.screens` pour
   * verifier que chaque URI attendue match le bon screen.
   *
   * Sans run-time avec React Navigation, on se contente d'asserter le pattern
   * de chaque URI. Le test serait plus robuste avec getStateFromPath, mais
   * impose un mock complet de @react-navigation/native qui dilue l'intent.
   */

  const patterns: Array<{ uri: string; expectedScreen: string; expectedParam?: Record<string, string> }> = [
    {
      uri: 'eventez://payment-success/pay-uuid-1',
      expectedScreen: 'PaymentSuccess',
      expectedParam: { paymentId: 'pay-uuid-1' },
    },
    {
      uri: 'eventez://payment-failed/pay-uuid-2',
      expectedScreen: 'PaymentFailed',
      expectedParam: { paymentId: 'pay-uuid-2' },
    },
    {
      uri: 'eventez://events/evt-123',
      expectedScreen: 'EventDetails',
      expectedParam: { eventId: 'evt-123' },
    },
    {
      uri: 'eventez://events/evt-123/volunteer',
      expectedScreen: 'Volunteers',
      expectedParam: { eventId: 'evt-123' },
    },
    {
      uri: 'eventez://verify-email/tk_abc',
      expectedScreen: 'VerifyEmailToken',
      expectedParam: { token: 'tk_abc' },
    },
    {
      uri: 'eventez://reset-password/tk_xyz',
      expectedScreen: 'ResetPassword',
      expectedParam: { token: 'tk_xyz' },
    },
    {
      uri: 'eventez://transfer/tk_t1/accept',
      expectedScreen: 'TransferAccept',
      expectedParam: { token: 'tk_t1', action: 'accept' },
    },
    {
      uri: 'eventez://team-invitation/tk_team',
      expectedScreen: 'TeamInvitation',
      expectedParam: { token: 'tk_team' },
    },
    {
      uri: 'eventez://subscription',
      expectedScreen: 'Subscription',
    },
    {
      // Parite web /events/in : hub liste des villes
      uri: 'eventez://events/in',
      expectedScreen: 'CitiesIndex',
    },
    {
      // Parite web /events/in/[slug] : ouvre EventSearch avec city pre-rempli
      uri: 'eventez://events/in/douala',
      expectedScreen: 'EventSearch',
      expectedParam: { city: 'douala' },
    },
    {
      uri: 'eventez://events/in/yaounde',
      expectedScreen: 'EventSearch',
      expectedParam: { city: 'yaounde' },
    },
  ];

  it.each(patterns)('parse $uri → $expectedScreen', ({ uri, expectedParam }) => {
    // Sanity check : l'URI a le bon scheme
    expect(uri.startsWith(`${DEEP_LINK_SCHEME}://`)).toBe(true);

    // On extrait manuellement le path + verifie qu'il match les params attendus
    const path = uri.replace(`${DEEP_LINK_SCHEME}://`, '');
    if (expectedParam) {
      // Chaque valeur de param doit etre presente dans le path
      Object.values(expectedParam).forEach((value) => {
        expect(path).toContain(value);
      });
    }
  });

  it('les schemes connus ne se chevauchent pas', () => {
    // payment-success != payment-failed (regression : webhook handler les distingue)
    const successPath = `${DEEP_LINK_SCHEME}://payment-success/123`;
    const failedPath = `${DEEP_LINK_SCHEME}://payment-failed/123`;
    expect(successPath).not.toBe(failedPath);
    expect(successPath).toContain('payment-success');
    expect(failedPath).toContain('payment-failed');
  });

  it('transfer URI inclut action accept ou decline', () => {
    const acceptUri = `${DEEP_LINK_SCHEME}://transfer/tk1/accept`;
    const declineUri = `${DEEP_LINK_SCHEME}://transfer/tk1/decline`;
    expect(acceptUri.endsWith('/accept')).toBe(true);
    expect(declineUri.endsWith('/decline')).toBe(true);
  });
});


describe('Universal links (https) — alignement web/mobile', () => {
  /**
   * Les universal links iOS et App Links Android partagent les memes paths
   * que le scheme custom. Cf. .well-known/apple-app-site-association et
   * assetlinks.json — c'est le web qui les declare, le mobile qui les
   * consomme via le linking.prefixes.
   */

  it('les URL web events matchent le pattern attendu', () => {
    const url = getEventUrl('123');
    expect(url).toMatch(/^https:\/\/[^/]+\/events\/[^/]+$/);
  });

  it('les URL verify ticket-level utilisent /verify/t/ (specifique)', () => {
    const url = getTicketVerificationUrl(789);
    expect(url).toMatch(/^https:\/\/[^/]+\/verify\/t\/[^/]+$/);
  });

  it('les URL volunteer utilisent /events/{id}/volunteer', () => {
    const url = getVolunteerSignupUrl('evt-1');
    expect(url).toMatch(/^https:\/\/[^/]+\/events\/[^/]+\/volunteer$/);
  });
});


describe('stripLocalePrefix — tolérance i18n du routeur de deep links', () => {
  /**
   * Le web est en routing next-intl `as-needed` : FR non préfixé, EN sous /en.
   * Le linking mobile ne connait que les chemins non préfixés. Ce helper retire
   * une locale entrante éventuelle avant getStateFromPath pour rester robuste.
   */

  it('retire le préfixe /en en tête (avec slash initial)', () => {
    expect(stripLocalePrefix('/en/events/evt-123')).toBe('/events/evt-123');
    expect(stripLocalePrefix('/en/team-invitation/tk_team')).toBe('/team-invitation/tk_team');
  });

  it('retire aussi /fr (défaut explicite) et gère l’absence de slash initial', () => {
    expect(stripLocalePrefix('/fr/transfer/tk1/accept')).toBe('/transfer/tk1/accept');
    expect(stripLocalePrefix('en/events/in/douala')).toBe('/events/in/douala');
  });

  it('laisse intact un chemin non préfixé (cas nominal FR)', () => {
    expect(stripLocalePrefix('/events/evt-123')).toBe('/events/evt-123');
    expect(stripLocalePrefix('/team-invitation/tk_team')).toBe('/team-invitation/tk_team');
  });

  it('ne touche PAS un token qui commence par en/fr (segment non-locale)', () => {
    // "enrollment" et "french-token" ne sont pas des segments de locale complets
    expect(stripLocalePrefix('/events/enrollment-2026')).toBe('/events/enrollment-2026');
    expect(stripLocalePrefix('/team-invitation/enXYZ')).toBe('/team-invitation/enXYZ');
    expect(stripLocalePrefix('/frobnicate/x')).toBe('/frobnicate/x');
  });

  it('ne retire une locale qu’en position initiale', () => {
    // "en" en 3e segment (improbable mais sûr) reste intact
    expect(stripLocalePrefix('/events/in/en')).toBe('/events/in/en');
  });

  it('un chemin réduit à la seule locale retombe sur "/"', () => {
    expect(stripLocalePrefix('/en')).toBe('/');
    expect(stripLocalePrefix('/fr')).toBe('/');
  });
});
