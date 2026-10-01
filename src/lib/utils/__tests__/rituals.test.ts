import {
  accountAnniversaryYears,
  countryCode,
  dailyVariant,
  isBirthday,
  isNationalDay,
  isNewYear,
  ritualForToday,
} from '../rituals';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10, 0, 0);

describe('rituals — anniversaire', () => {
  it('reconnaît le jour, ignore le reste', () => {
    expect(isBirthday('1990-06-15', day(2026, 6, 15))).toBe(true);
    expect(isBirthday('1990-06-15', day(2026, 6, 16))).toBe(false);
    expect(isBirthday(null, day(2026, 6, 15))).toBe(false);
    expect(isBirthday('pas une date', day(2026, 6, 15))).toBe(false);
  });

  it('29 février : fêté le 28 février les années non bissextiles', () => {
    expect(isBirthday('2000-02-29', day(2026, 2, 28))).toBe(true);
    expect(isBirthday('2000-02-29', day(2026, 3, 1))).toBe(false);
    expect(isBirthday('2000-02-29', day(2028, 2, 29))).toBe(true);
    expect(isBirthday('2000-02-29', day(2028, 2, 28))).toBe(false);
  });

  it("n'expose jamais l'âge", () => {
    expect(ritualForToday({ date_of_birth: '1990-06-15' }, day(2026, 6, 15))).toEqual({ kind: 'birthday' });
  });
});

describe('rituals — anniversaire de compte', () => {
  it('à partir d’un an, le jour même', () => {
    expect(accountAnniversaryYears('2024-10-01T08:00:00Z', day(2026, 10, 1))).toBe(2);
    expect(accountAnniversaryYears('2026-10-01', day(2026, 10, 1))).toBeNull();
    expect(accountAnniversaryYears('2024-10-02', day(2026, 10, 1))).toBeNull();
  });
});

describe('rituals — fêtes', () => {
  it('fête nationale par code ou nom de pays', () => {
    expect(isNationalDay('Cameroun', day(2026, 5, 20))).toBe('CM');
    expect(isNationalDay('CI', day(2026, 8, 7))).toBe('CI');
    expect(isNationalDay('Sénégal', day(2026, 4, 4))).toBe('SN');
    expect(isNationalDay('france', day(2026, 7, 14))).toBe('FR');
    expect(isNationalDay("Côte d’Ivoire", day(2026, 8, 7))).toBe('CI');
    expect(isNationalDay('Cameroun', day(2026, 5, 21))).toBeNull();
    expect(isNationalDay('Atlantide', day(2026, 5, 20))).toBeNull();
  });

  it('Nouvel An', () => {
    expect(isNewYear(day(2027, 1, 1))).toBe(true);
    expect(isNewYear(day(2027, 1, 2))).toBe(false);
  });

  it('countryCode', () => {
    expect(countryCode('cm')).toBe('CM');
    expect(countryCode('')).toBeNull();
  });
});

describe('rituals — priorité et variante du jour', () => {
  it('le plus personnel d’abord', () => {
    const user = { date_of_birth: '1990-05-20', date_joined: '2024-05-20', country: 'Cameroun' };
    expect(ritualForToday(user, day(2026, 5, 20))).toEqual({ kind: 'birthday' });
    expect(ritualForToday({ ...user, date_of_birth: null }, day(2026, 5, 20))).toEqual({
      kind: 'accountAnniversary',
      years: 2,
    });
    expect(ritualForToday({ country: 'Cameroun' }, day(2026, 5, 20))).toEqual({ kind: 'nationalDay', country: 'CM' });
    expect(ritualForToday(null, day(2027, 1, 1))).toEqual({ kind: 'newYear' });
    expect(ritualForToday({}, day(2026, 6, 3))).toBeNull();
  });

  it('variante stable sur la journée, bornée', () => {
    const a = dailyVariant(4, day(2026, 6, 3));
    expect(dailyVariant(4, new Date(2026, 5, 3, 23, 59))).toBe(a);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(4);
    expect(dailyVariant(1, day(2026, 6, 3))).toBe(0);
  });
});
