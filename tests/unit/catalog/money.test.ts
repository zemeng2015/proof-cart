import {describe, expect, it} from 'vitest';
import {addMoney, compareMoney, multiplyMoney, parseMoney, type Money} from '../../../app/features/catalog/money';

const usd = (amount: string): Money => ({amount, currencyCode: 'USD'});
const success = (amount: string) => ({ok: true, value: usd(amount)});

describe('exact money boundary', () => {
  it('preserves exact decimal arithmetic without currency-display rounding', () => {
    expect(addMoney(usd('0.1'), usd('0.2'))).toEqual(success('0.3'));
    expect(multiplyMoney(usd('0.1'), 3)).toEqual(success('0.3'));
    expect(multiplyMoney(usd('19.999'), 3)).toEqual(success('59.997'));
    expect(multiplyMoney(usd('0.01'), 10)).toEqual(success('0.1'));
    expect(addMoney(usd('0.000000000000000001'), usd('0.000000000000000009'))).toEqual(success('0.00000000000000001'));
  });

  it('normalizes zeros and keeps known zero distinct from missing data', () => {
    expect(parseMoney(usd('00019.9900'))).toEqual(success('19.99'));
    expect(parseMoney(usd('000.000'))).toEqual(success('0'));
    expect(parseMoney(null)).toEqual({ok: false, error: 'invalid_money'});
    expect(parseMoney({currencyCode: 'USD'})).toEqual({ok: false, error: 'invalid_money'});
  });

  it.each(['', ' 1', '1 ', '-0', '-1', '+1', '1e3', '.1', '1.', 'NaN', 'Infinity', '1\n', '1'.repeat(31), '0.' + '0'.repeat(19)])('rejects invalid decimal %j', amount => {
    expect(parseMoney(usd(amount))).toEqual({ok: false, error: 'invalid_money'});
  });

  it('rejects numbers and unknown fields without executing accessors', () => {
    expect(parseMoney({amount: 0.1, currencyCode: 'USD'})).toEqual({ok: false, error: 'invalid_money'});
    expect(parseMoney({...usd('1'), secret: 'synthetic'})).toEqual({ok: false, error: 'invalid_money'});
    let accessed = false;
    expect(parseMoney({get amount() {accessed = true; return '1';}, currencyCode: 'USD'})).toEqual({ok: false, error: 'invalid_money'});
    expect(accessed).toBe(false);
  });

  it('does not infer, convert, or mix currencies', () => {
    expect(parseMoney({amount: '1', currencyCode: 'JPY'})).toEqual({ok: false, error: 'unsupported_currency'});
    for (const currencyCode of ['CAD', 'EUR', 'GBP'] as const) {
      const other = {amount: '1', currencyCode};
      expect(parseMoney(other)).toEqual({ok: true, value: other});
      expect(addMoney(usd('1'), other)).toEqual({ok: false, error: 'currency_mismatch'});
      expect(compareMoney(usd('1'), other)).toEqual({ok: false, error: 'currency_mismatch'});
    }
  });

  it('compares beyond binary floating point precision', () => {
    expect(compareMoney(usd('9007199254740992'), usd('9007199254740993'))).toEqual({ok: true, value: -1});
    expect(compareMoney(usd('2.000'), usd('2'))).toEqual({ok: true, value: 0});
    expect(compareMoney(usd('0.11'), usd('0.1'))).toEqual({ok: true, value: 1});
  });

  it('rejects overflow rather than silently rounding or growing without bounds', () => {
    const maximum = usd('9'.repeat(30));
    expect(parseMoney(maximum).ok).toBe(true);
    expect(parseMoney(usd('9'.repeat(30) + '.' + '9'.repeat(18))).ok).toBe(true);
    expect(addMoney(maximum, usd('1'))).toEqual({ok: false, error: 'amount_overflow'});
    expect(multiplyMoney(maximum, 2)).toEqual({ok: false, error: 'amount_overflow'});
  });

  it.each([0, -1, 1.5, 11, NaN, Infinity])('rejects quantity %s', quantity => {
    expect(multiplyMoney(usd('1'), quantity)).toEqual({ok: false, error: 'invalid_quantity'});
  });

  it('validates arithmetic operands at runtime', () => {
    const invalid = usd('secret-shaped-invalid-amount');
    expect(addMoney(invalid, usd('1'))).toEqual({ok: false, error: 'invalid_money'});
    expect(compareMoney(usd('1'), invalid)).toEqual({ok: false, error: 'invalid_money'});
    expect(multiplyMoney(invalid, 1)).toEqual({ok: false, error: 'invalid_money'});
  });

  it('returns an immutable defensive value with JSON-safe amounts', () => {
    const input = {amount: '1.000', currencyCode: 'USD'};
    const result = parseMoney(input);
    expect(input.amount).toBe('1.000');
    if (!result.ok) throw new Error('Expected valid fixture');
    input.amount = '9';
    expect(result.value.amount).toBe('1');
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(JSON.stringify(result.value)).toBe('{"amount":"1","currencyCode":"USD"}');
  });
});
