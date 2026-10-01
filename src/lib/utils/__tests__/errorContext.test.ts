/**
 * getApiErrorMessage + `context` : messages humains en trois temps
 * (ce qui s'est passé · ce qui est sauf · que faire) sous errors.{context}.{kind}.
 */
import fr from '../../../i18n/locales/fr.json';
import en from '../../../i18n/locales/en.json';
import { getApiErrorMessage, type ErrorContext } from '../errorHandling';

function makeT(dict: any) {
  return (key: string) => {
    const v = key.split('.').reduce((o: any, k) => (o == null ? o : o[k]), dict);
    return typeof v === 'string' ? v : key;
  };
}
const t = makeT(fr);

const http = (status: number, data: any = {}) => ({ response: { status, data } });

describe('getApiErrorMessage — context', () => {
  it('réseau coupé → errors.{context}.offline', () => {
    const err = { message: 'Network Error', code: 'ERR_NETWORK' };
    expect(getApiErrorMessage(err, t, { fallbackKey: 'errors.generic', context: 'tickets' }).message)
      .toBe(fr.errors.tickets.offline);
  });

  it('timeout → errors.{context}.timeout', () => {
    const err = { code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' };
    expect(getApiErrorMessage(err, t, { fallbackKey: 'errors.generic', context: 'upload' }).message)
      .toBe(fr.errors.upload.timeout);
  });

  it.each([
    [404, 'notFound'],
    [403, 'forbidden'],
    [500, 'server'],
    [503, 'server'],
  ] as const)('HTTP %s → %s', (status, kind) => {
    expect(getApiErrorMessage(http(status), t, { fallbackKey: 'errors.generic', context: 'event' }).message)
      .toBe((fr.errors.event as Record<string, string>)[kind]);
  });

  it('413 en upload → tooLarge', () => {
    expect(getApiErrorMessage(http(413), t, { fallbackKey: 'errors.generic', context: 'upload' }).message)
      .toBe(fr.errors.upload.tooLarge);
  });

  it('un code métier mappé garde la priorité sur le contexte', () => {
    const err = http(403, { code: 'plan_limit_reached' });
    expect(getApiErrorMessage(err, t, { fallbackKey: 'errors.generic', context: 'event' }).message)
      .toBe(fr.errors.codes.planLimitReached);
  });

  it('sans contexte, comportement historique inchangé', () => {
    expect(getApiErrorMessage(http(404), t, { fallbackKey: 'errors.generic' }).message).toBe(fr.errors.generic);
    expect(getApiErrorMessage({ message: 'Network Error' }, t, { fallbackKey: 'errors.generic' }).message)
      .toBe(fr.errors.network);
  });

  it('un kind absent du contexte retombe sur le chemin standard (400 → validation)', () => {
    const err = http(400, { title: ['Requis'] });
    expect(getApiErrorMessage(err, t, { fallbackKey: 'errors.generic', context: 'tickets' }).message)
      .toBe(fr.errors.validation);
  });

  // Le vouvoiement de ces messages est couvert par i18n/__tests__/vouvoiement.test.ts.
  it('FR/EN : mêmes contextes et mêmes kinds', () => {
    const contexts: ErrorContext[] = ['tickets', 'messages', 'event', 'upload'];
    contexts.forEach((c) => {
      expect(Object.keys((en.errors as any)[c]).sort()).toEqual(Object.keys((fr.errors as any)[c]).sort());
    });
  });
});
