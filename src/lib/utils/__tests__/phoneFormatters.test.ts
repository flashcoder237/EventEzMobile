import {
  cleanPhoneNumber,
  stripCountryPrefix,
  formatPhoneForDisplay,
  formatPhoneInput,
  preparePhoneForInput,
} from '../phoneFormatters';

describe('cleanPhoneNumber', () => {
  it('removes spaces, dashes, parens, plus', () => {
    expect(cleanPhoneNumber('+237 (670) 12-34-56')).toBe('237670123456');
  });

  it('returns empty for all-non-digit', () => {
    expect(cleanPhoneNumber('abc-xyz')).toBe('');
  });

  it('passes through pure digits', () => {
    expect(cleanPhoneNumber('670123456')).toBe('670123456');
  });
});

describe('stripCountryPrefix', () => {
  it('removes default 237 prefix', () => {
    expect(stripCountryPrefix('237670123456')).toBe('670123456');
  });

  it('handles +237 with formatting', () => {
    expect(stripCountryPrefix('+237 670 123 456')).toBe('670123456');
  });

  it('does not strip when prefix does not match', () => {
    expect(stripCountryPrefix('670123456')).toBe('670123456');
  });

  it('accepts custom prefix', () => {
    expect(stripCountryPrefix('+254712345678', '254')).toBe('712345678');
  });
});

describe('formatPhoneForDisplay', () => {
  it('formats 9-digit number in groups of 3', () => {
    expect(formatPhoneForDisplay('670123456')).toBe('670 123 456');
  });

  it('handles partial digits', () => {
    expect(formatPhoneForDisplay('670')).toBe('670');
    expect(formatPhoneForDisplay('670123')).toBe('670 123');
  });

  it('returns raw input for >9 digits (no match)', () => {
    expect(formatPhoneForDisplay('6701234567890')).toBe('6701234567890');
  });

  it('cleans non-digits before formatting', () => {
    expect(formatPhoneForDisplay('670-123-456')).toBe('670 123 456');
  });
});

describe('formatPhoneInput', () => {
  it('formats real-time user input', () => {
    expect(formatPhoneInput('6')).toBe('6');
    expect(formatPhoneInput('670')).toBe('670');
    expect(formatPhoneInput('670123')).toBe('670 123');
    expect(formatPhoneInput('670123456')).toBe('670 123 456');
  });

  it('strips invalid characters on input', () => {
    expect(formatPhoneInput('670abc123')).toBe('670 123');
  });
});

describe('preparePhoneForInput', () => {
  it('strips country prefix and formats', () => {
    expect(preparePhoneForInput('+237670123456')).toBe('670 123 456');
  });

  it('leaves number without prefix intact', () => {
    expect(preparePhoneForInput('670123456')).toBe('670 123 456');
  });

  it('handles Kenyan prefix', () => {
    expect(preparePhoneForInput('+254712345678', '254')).toBe('712 345 678');
  });
});
