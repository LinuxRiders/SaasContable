import { describe, it, expect } from 'vitest';
import { pePack, getPackByCode } from '../index.js';
import { getTaxRate } from '../../../domain/accounting/catalog.js';
import { validateExpression } from '../../../domain/accounting/expressions/validate.js';
import { validateTemplateVersion } from '../../../domain/accounting/templateValidation.js';

describe('pePack jurisdiction', () => {
  it('loads pePack via getPackByCode', () => {
    const pack = getPackByCode('PE');
    expect(pack).not.toBeNull();
    expect(pack.code).toBe('PE');
    expect(pack.defaultFunctionalCurrency).toBe('PEN');

    expect(getPackByCode('UNKNOWN')).toBeNull();
    expect(getPackByCode(null)).toBeNull();
  });

  it('contains exactly 16 unique document types with valid perspectives and operations', () => {
    expect(pePack.documentTypes.length).toBe(16);

    const codes = pePack.documentTypes.map(d => d.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(16);

    const allowedPerspectivesSet = new Set(['RECEIVED', 'ISSUED', 'INTERNAL']);
    const allOpCodes = new Set(pePack.operationTypes.map(op => op.code));

    for (const dt of pePack.documentTypes) {
      // Perspectives must be a subset of allowed perspectives
      for (const p of dt.allowedPerspectives) {
        expect(allowedPerspectivesSet.has(p)).toBe(true);
      }

      // Check operationTypesByPerspective
      if (dt.operationTypesByPerspective) {
        for (const [persp, opList] of Object.entries(dt.operationTypesByPerspective)) {
          expect(allowedPerspectivesSet.has(persp)).toBe(true);
          for (const opCode of opList) {
            expect(allOpCodes.has(opCode), `Op code ${opCode} in docType ${dt.code} must exist in peOperationTypes`).toBe(true);
          }
        }
      }

      // Coherence rules must be valid expressions evaluating to BOOL
      for (const rule of dt.coherenceRules) {
        const valRes = validateExpression(rule.check, {
          expectedType: 'BOOL',
          documentType: dt,
          lineContext: false
        });
        expect(valRes.ok, `Coherence rule ${rule.id} in ${dt.code} failed validation: ${JSON.stringify(valRes.errors)}`).toBe(true);
      }
    }
  });

  it('ensures every account role referenced by a tax exists in accountRoles', () => {
    const allRoleCodes = new Set(pePack.accountRoles.map(r => r.code));

    for (const tax of pePack.taxes) {
      if (tax.recoverableAccountRole) {
        expect(allRoleCodes.has(tax.recoverableAccountRole), `Recoverable role ${tax.recoverableAccountRole} in tax ${tax.code} must exist`).toBe(true);
      }
      if (tax.payableAccountRole) {
        expect(allRoleCodes.has(tax.payableAccountRole), `Payable role ${tax.payableAccountRole} in tax ${tax.code} must exist`).toBe(true);
      }
    }
  });

  it('ensures each base template in pePack passes validateTemplateVersion without errors', () => {
    expect(pePack.baseTemplates.length).toBe(3);

    for (const tpl of pePack.baseTemplates) {
      const res = validateTemplateVersion(tpl, { pack: pePack, scope: 'PACK' });
      expect(
        res.ok,
        `Base template ${tpl.code} failed validation: ${JSON.stringify(res.errors)}`
      ).toBe(true);
      expect(res.errors).toHaveLength(0);
    }
  });
});

