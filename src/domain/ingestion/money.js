export function parseDecimalToCents(amountStr) {
  if (!amountStr || typeof amountStr !== 'string') {
    throw new Error('Invalid amount string');
  }
  
  if (!/^\d+(\.\d{1,2})?$/.test(amountStr)) {
    throw new Error('Amount must be a number with up to 2 decimal places');
  }

  const [intPart, decPart = '00'] = amountStr.split('.');
  const paddedDec = decPart.padEnd(2, '0');
  
  return parseInt(intPart + paddedDec, 10);
}

export function roundHalfUpDiv(numerator, denominator) {
  const val = numerator / denominator;
  return Math.sign(val) * Math.round(Math.abs(val));
}

export function withinTolerance(a, b, tolerance = 1) {
  return Math.abs(a - b) <= tolerance;
}

export function sumCents(centsArray) {
  return centsArray.reduce((acc, val) => acc + val, 0);
}

export function formatMoney(cents, currency) {
  const amount = (cents / 100).toFixed(2);
  // Add commas
  const parts = amount.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatted = parts.join('.');

  if (currency === 'PEN') {
    return `S/ ${formatted}`;
  } else if (currency === 'USD') {
    return `$ ${formatted}`;
  }
  return `${currency} ${formatted}`;
}

export function formatPEN(cents) {
  return formatMoney(cents, 'PEN');
}
