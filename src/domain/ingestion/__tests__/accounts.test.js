import { describe, it, expect } from 'vitest';
import { normalizeAccount } from '../accounts.js';

describe('Account Normalization', () => {
  it('normalizes requiresCostCenter', () => {
    expect(normalizeAccount({ codigo: '1', requiereCC: true }).requiresCostCenter).toBe(true);
    expect(normalizeAccount({ codigo: '2', requiereCentroCostos: true }).requiresCostCenter).toBe(true);
    expect(normalizeAccount({ codigo: '3', requiereCC: false, requiereCentroCostos: false }).requiresCostCenter).toBe(false);
    expect(normalizeAccount({ codigo: '4' }).requiresCostCenter).toBe(false);
  });

  it('normalizes defaultCostCenter from amarre3', () => {
    expect(normalizeAccount({ codigo: '1', amarre3: 'CC01' }).defaultCostCenter).toBe('CC01');
    expect(normalizeAccount({ codigo: '2', amarre3: '' }).defaultCostCenter).toBe(null);
    expect(normalizeAccount({ codigo: '3' }).defaultCostCenter).toBe(null);
  });

  it('normalizes destDebit and destCredit only if both exist', () => {
    expect(normalizeAccount({ codigo: '1', amarre1: '94', amarre2: '79' }).destDebit).toBe('94');
    expect(normalizeAccount({ codigo: '1', amarre1: '94', amarre2: '79' }).destCredit).toBe('79');

    expect(normalizeAccount({ codigo: '2', amarre1: '94' }).destDebit).toBeUndefined();
    expect(normalizeAccount({ codigo: '2', amarre1: '94' }).destCredit).toBeUndefined();

    expect(normalizeAccount({ codigo: '3', amarre2: '79' }).destDebit).toBeUndefined();
  });

  it('normalizes isPostable', () => {
    expect(normalizeAccount({ codigo: '1', esCuentaU: true }).isPostable).toBe(true);
    expect(normalizeAccount({ codigo: '2', esCuentaU: false }).isPostable).toBe(false);
    expect(normalizeAccount({ codigo: '3' }).isPostable).toBe(false);
  });
});

