import { describe, it, expect } from 'vitest';
import { accountsUsed, validateAccounts } from '../templateAccounts.js';
import { buildAccountIndex } from '../../ingestion/accounts.js';

describe('Template Accounts Validation (T034, R-23)', () => {
  const version = {
    defaults: {
      baseAccount: '6011101',
      taxAccount: '4011101',
      counterpartAccount: '4212101'
    },
    documentRules: [
      {
        ruleId: 'DR-1',
        then: { taxAccount: '4011102' }
      }
    ],
    lineRules: [
      {
        ruleId: 'LR-1',
        then: { baseAccount: '6311101' }
      },
      {
        ruleId: 'LR-2',
        then: {
          split: [
            { account: '6591101', basisPoints: 5000 },
            { account: '6011101', basisPoints: 5000 } // repetida con defaults
          ]
        }
      }
    ]
  };

  it('accountsUsed gathers all unique account codes used across defaults, rules and splits', () => {
    const codes = accountsUsed(version);
    expect(codes).toEqual(
      expect.arrayContaining(['6011101', '4011101', '4212101', '4011102', '6311101', '6591101'])
    );
    expect(codes).toHaveLength(6);
  });

  it('validateAccounts detects NOT_FOUND and NOT_POSTABLE', () => {
    const rawCatalog = [
      { codigo: '6011101', esCuentaU: true },
      { codigo: '4011101', esCuentaU: true },
      { codigo: '4212101', esCuentaU: false }, // NOT_POSTABLE
      { codigo: '4011102', esCuentaU: true },
      { codigo: '6311101', esCuentaU: true }
      // 6591101 falta -> NOT_FOUND
    ];
    const index = buildAccountIndex(rawCatalog);

    const errors = validateAccounts(version, index);
    expect(errors).toHaveLength(2);
    expect(errors).toContainEqual({ accountCode: '4212101', problem: 'NOT_POSTABLE' });
    expect(errors).toContainEqual({ accountCode: '6591101', problem: 'NOT_FOUND' });
  });

  it('returns empty array when all accounts exist and are postable', () => {
    const rawCatalog = [
      { codigo: '6011101', esCuentaU: true },
      { codigo: '4011101', esCuentaU: true },
      { codigo: '4212101', esCuentaU: true },
      { codigo: '4011102', esCuentaU: true },
      { codigo: '6311101', esCuentaU: true },
      { codigo: '6591101', esCuentaU: true }
    ];
    const index = buildAccountIndex(rawCatalog);
    const errors = validateAccounts(version, index);
    expect(errors).toHaveLength(0);
  });
});
