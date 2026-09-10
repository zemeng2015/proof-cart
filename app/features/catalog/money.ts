export type CurrencyCode = 'USD' | 'CAD' | 'EUR' | 'GBP';
export type Money = Readonly<{amount: string; currencyCode: CurrencyCode}>;
export type MoneyErrorCode = 'invalid_money' | 'unsupported_currency' | 'currency_mismatch' | 'invalid_quantity' | 'amount_overflow';
type Failure = {ok: false; error: MoneyErrorCode};
export type MoneyResult = {ok: true; value: Money} | Failure;
export type MoneyComparison = {ok: true; value: -1 | 0 | 1} | Failure;

function isCurrency(value: unknown): value is CurrencyCode {
  return value === 'USD' || value === 'CAD' || value === 'EUR' || value === 'GBP';
}

export function parseMoney(input: unknown): MoneyResult {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return {ok: false, error: 'invalid_money'};
  // Read data properties only. Accessors are not provider JSON and must not run.
  let fields: PropertyDescriptorMap;
  try {
    fields = Object.getOwnPropertyDescriptors(input);
    if (Reflect.ownKeys(fields).length !== 2) return {ok: false, error: 'invalid_money'};
  } catch {return {ok: false, error: 'invalid_money'};}
  const amount: unknown = fields.amount && 'value' in fields.amount ? fields.amount.value : undefined;
  const currency: unknown = fields.currencyCode && 'value' in fields.currencyCode ? fields.currencyCode.value : undefined;
  if (typeof amount !== 'string' || amount.length > 49 || !/^\d{1,30}(?:\.\d{1,18})?$/.test(amount)) return {ok: false, error: 'invalid_money'};
  if (!isCurrency(currency)) return {ok: false, error: 'unsupported_currency'};
  const dot = amount.indexOf('.');
  const integer = (dot < 0 ? amount : amount.slice(0, dot)).replace(/^0+(?=\d)/, '');
  const fraction = dot < 0 ? '' : amount.slice(dot + 1).replace(/0+$/, '');
  return {ok: true, value: Object.freeze({amount: integer + (fraction ? `.${fraction}` : ''), currencyCode: currency})};
}

function parts(money: Money): {coefficient: bigint; scale: number} {
  const dot = money.amount.indexOf('.');
  return {coefficient: BigInt(money.amount.replace('.', '')), scale: dot < 0 ? 0 : money.amount.length - dot - 1};
}

function fromCoefficient(coefficient: bigint, scale: number, currencyCode: CurrencyCode): MoneyResult {
  const digits = coefficient.toString().padStart(scale + 1, '0');
  const amount = scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
  const result = parseMoney({amount, currencyCode});
  return result.ok ? result : {ok: false, error: 'amount_overflow'};
}

function pair(left: Money, right: Money): {ok: true; left: bigint; right: bigint; scale: number; currencyCode: CurrencyCode} | Failure {
  const a = parseMoney(left);
  if (!a.ok) return a;
  const b = parseMoney(right);
  if (!b.ok) return b;
  if (a.value.currencyCode !== b.value.currencyCode) return {ok: false, error: 'currency_mismatch'};
  const x = parts(a.value);
  const y = parts(b.value);
  const scale = Math.max(x.scale, y.scale);
  return {ok: true, left: x.coefficient * 10n ** BigInt(scale - x.scale), right: y.coefficient * 10n ** BigInt(scale - y.scale), scale, currencyCode: a.value.currencyCode};
}

export function addMoney(left: Money, right: Money): MoneyResult {
  const values = pair(left, right);
  return values.ok ? fromCoefficient(values.left + values.right, values.scale, values.currencyCode) : values;
}

export function compareMoney(left: Money, right: Money): MoneyComparison {
  const values = pair(left, right);
  if (!values.ok) return values;
  return {ok: true, value: values.left < values.right ? -1 : values.left > values.right ? 1 : 0};
}

export function multiplyMoney(money: Money, quantity: number): MoneyResult {
  const parsed = parseMoney(money);
  if (!parsed.ok) return parsed;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return {ok: false, error: 'invalid_quantity'};
  const value = parts(parsed.value);
  return fromCoefficient(value.coefficient * BigInt(quantity), value.scale, parsed.value.currencyCode);
}
