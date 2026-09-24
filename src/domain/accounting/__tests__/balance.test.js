import { describe, it, expect } from 'vitest';
import { checkBalance } from '../balance.js';

describe('balance: checkBalance (RD-03)', () => {
  it('identifica un conjunto de líneas perfectamente cuadrado', () => {
    const lines = [
      { side: 'DEBIT', functionalAmountMinor: 10000 },
      { side: 'DEBIT', functionalAmountMinor: 1800 },
      { side: 'CREDIT', functionalAmountMinor: 11800 }
    ];

    const result = checkBalance(lines);
    expect(result.ok).toBe(true);
    expect(result.debitMinor).toBe(11800);
    expect(result.creditMinor).toBe(11800);
    expect(result.differenceMinor).toBe(0);
  });

  it('detecta un asiento descuadrado', () => {
    const lines = [
      { side: 'DEBIT', functionalAmountMinor: 10000 },
      { side: 'CREDIT', functionalAmountMinor: 9500 }
    ];

    const result = checkBalance(lines);
    expect(result.ok).toBe(false);
    expect(result.debitMinor).toBe(10000);
    expect(result.creditMinor).toBe(9500);
    expect(result.differenceMinor).toBe(500);
  });

  it('falla ante un conjunto de líneas vacío o nulo', () => {
    expect(checkBalance([]).ok).toBe(false);
    expect(checkBalance([]).debitMinor).toBe(0);
    expect(checkBalance([]).creditMinor).toBe(0);

    expect(checkBalance(null).ok).toBe(false);
    expect(checkBalance(undefined).ok).toBe(false);
  });

  it('falla si débitos y créditos son cero', () => {
    const lines = [
      { side: 'DEBIT', functionalAmountMinor: 0 },
      { side: 'CREDIT', functionalAmountMinor: 0 }
    ];
    const result = checkBalance(lines);
    expect(result.ok).toBe(false);
  });

  it('funciona también si las líneas usan amountMinor en vez de functionalAmountMinor', () => {
    const lines = [
      { side: 'DEBIT', amountMinor: 500 },
      { side: 'CREDIT', amountMinor: 500 }
    ];
    const result = checkBalance(lines);
    expect(result.ok).toBe(true);
    expect(result.debitMinor).toBe(500);
    expect(result.creditMinor).toBe(500);
  });
});

