/**
 * Plateforme vivante (R2, lot V) — honnêteté des signaux : un champ `null`
 * n'affiche rien, aucune valeur n'est inventée côté client.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import {
  WatchingLine,
  LastSaleLine,
  OnSiteLine,
  ConnectionsGoingLine,
  ReachabilityLine,
  CityPulseLine,
  SessionAttendanceLine,
  formatResponseDuration,
} from '../SocialSignals';
import { saleChipLabel } from '../../../organizer/SaleLiveCard';
import type { EventPulse } from '../../../../lib/realtime/pulse';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: new Proxy({}, { get: () => '#000000' }),
    isDark: false,
  }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: any) => (o ? `${k}:${JSON.stringify(o)}` : k) }),
}));
jest.mock('../../../../utils/feedback', () => ({ feedback: { moment: jest.fn() } }));
jest.mock('../../../ui/motion', () => ({
  useMotionGate: () => ({ canAnimate: false, reduced: true, appActive: true, focused: true }),
}));

const empty: EventPulse = {
  event_id: 'e', state: 'open', is_live: false, watching: null, last_sale: null,
  on_site: null, tickets: [], attendance_remaining: null, generated_at: null,
};

describe('signaux vivants : null = rien', () => {
  it('pouls vide → aucun signal', () => {
    for (const C of [WatchingLine, LastSaleLine, OnSiteLine]) {
      const { toJSON } = render(<C pulse={empty} />);
      expect(toJSON()).toBeNull();
    }
    const { toJSON } = render(<WatchingLine pulse={null} />);
    expect(toJSON()).toBeNull();
  });

  it('affiche le palier renvoyé par le serveur, sans le modifier', () => {
    const { getByText } = render(<WatchingLine pulse={{ ...empty, watching: { count: 5, at_least: true } }} />);
    expect(getByText('liveSignals.watchingAtLeast:{"count":5}')).toBeTruthy();
    const r = render(<LastSaleLine pulse={{ ...empty, last_sale: 'minutes:4' }} />);
    expect(r.getByText('liveSignals.lastSaleMinutes:{"count":4}')).toBeTruthy();
  });

  it('connexions, joignabilité, ville, session : rien sans donnée', () => {
    expect(render(<ConnectionsGoingLine data={null} />).toJSON()).toBeNull();
    expect(render(<ConnectionsGoingLine data={{ count: 0, users: [] }} />).toJSON()).toBeNull();
    expect(render(<ReachabilityLine data={null} />).toJSON()).toBeNull();
    expect(render(<ReachabilityLine data={{ online: false, typical_response_minutes: null }} />).toJSON()).toBeNull();
    expect(render(<CityPulseLine data={{ city: 'Douala', bookings_24h: null, live_events: null }} />).toJSON()).toBeNull();
    expect(render(<SessionAttendanceLine count={null} rate={null} />).toJSON()).toBeNull();
  });

  it('délai de réponse lisible', () => {
    const t = (k: string, o?: any) => `${k}:${o?.count ?? ''}`;
    expect(formatResponseDuration(30, t)).toBe('liveSignals.durMinutes:30');
    expect(formatResponseDuration(120, t)).toBe('liveSignals.durHours:2');
    expect(formatResponseDuration(1440, t)).toBe('liveSignals.durDay:');
  });
});

describe('ventes en direct (organisateur)', () => {
  const t = (k: string, o?: any) => `${k}:${JSON.stringify(o)}`;
  it('une vente → « +1 VIP », une rafale → « +7 en 1 min », rien sinon', () => {
    expect(saleChipLabel({ count: 1, ticket_type: 'VIP' }, t)).toBe('liveSignals.saleOne:{"count":1,"ticket":"VIP"}');
    expect(saleChipLabel({ count: 7 }, t)).toBe('liveSignals.saleWindow:{"count":7}');
    expect(saleChipLabel({ count: 0 }, t)).toBeNull();
    expect(saleChipLabel({}, t)).toBeNull();
  });
});
