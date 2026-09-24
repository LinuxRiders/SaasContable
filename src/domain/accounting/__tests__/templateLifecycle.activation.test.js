import { describe, it, expect } from 'vitest';
import { contentForHash, checkActivation } from '../templateLifecycle.js';

describe('templateLifecycle: activation & hash (RD-10)', () => {
  describe('contentForHash', () => {
    it('es determinista y estable ante distinto orden de claves a cualquier nivel', () => {
      const v1 = {
        documentTypeCode: 'INVOICE',
        perspective: 'RECEIVED',
        operationTypeCode: 'MERCHANDISE_PURCHASE',
        priority: 0,
        applicability: null,
        legalBookCode: 'BOOK1',
        glosa: 'Glosa 1',
        requiredInputs: ['fields.costCenter'],
        lines: [
          { id: 'l1', side: 'DEBIT', amount: 100, accountRef: { roleCode: 'EXPENSE', kind: 'ROLE' } }
        ],
        testCases: [
          { id: 'tc1', name: 'Caso 1', mappingSource: 'TENANT' }
        ]
      };

      // Misma definición pero con las propiedades en orden inverso o desordenado
      const v2 = {
        testCases: [
          { mappingSource: 'TENANT', name: 'Caso 1', id: 'tc1' }
        ],
        lines: [
          { amount: 100, accountRef: { kind: 'ROLE', roleCode: 'EXPENSE' }, side: 'DEBIT', id: 'l1' }
        ],
        requiredInputs: ['fields.costCenter'],
        glosa: 'Glosa 1',
        legalBookCode: 'BOOK1',
        applicability: null,
        priority: 0,
        operationTypeCode: 'MERCHANDISE_PURCHASE',
        perspective: 'RECEIVED',
        documentTypeCode: 'INVOICE'
      };

      const hash1 = contentForHash(v1);
      const hash2 = contentForHash(v2);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBeGreaterThan(0);
    });
  });

  describe('checkActivation', () => {
    const validTemplate = {
      id: 'tmpl-1',
      code: 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE',
      scope: 'TENANT',
      retiredAt: null
    };

    const validVersion = {
      version: 1,
      documentTypeCode: 'INVOICE',
      perspective: 'RECEIVED',
      operationTypeCode: 'MERCHANDISE_PURCHASE',
      priority: 0,
      testCases: [{ id: 'tc1', name: 'Caso 1' }]
    };

    const dummyHash = 'hash-abc-123';

    const validLastTestRun = {
      contentHash: dummyHash,
      results: [{ testCaseId: 'tc1', status: 'PASS', differences: [] }]
    };

    const validAccountCheck = {
      ok: true,
      unresolved: []
    };

    it('caso feliz: todo válido devuelve ok: true', () => {
      const res = checkActivation({
        template: validTemplate,
        version: validVersion,
        lastTestRun: validLastTestRun,
        currentHash: dummyHash,
        accountCheck: validAccountCheck,
        activeInTenant: []
      });

      expect(res.ok).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('bloquea activación si la plantilla no tiene casos de prueba', () => {
      const res = checkActivation({
        template: validTemplate,
        version: { ...validVersion, testCases: [] },
        lastTestRun: validLastTestRun,
        currentHash: dummyHash,
        accountCheck: validAccountCheck,
        activeInTenant: []
      });

      expect(res.ok).toBe(false);
      expect(res.errors.some(e => e.code === 'NO_TEST_CASES')).toBe(true);
    });

    it('bloquea activación si al menos un caso de prueba está en FAIL', () => {
      const failedTestRun = {
        contentHash: dummyHash,
        results: [{ testCaseId: 'tc1', status: 'FAIL', differences: ['Diferencia en cuenta'] }]
      };

      const res = checkActivation({
        template: validTemplate,
        version: validVersion,
        lastTestRun: failedTestRun,
        currentHash: dummyHash,
        accountCheck: validAccountCheck,
        activeInTenant: []
      });

      expect(res.ok).toBe(false);
      expect(res.errors.some(e => e.code === 'TESTS_FAILED')).toBe(true);
    });

    it('bloquea activación si el hash actual no coincide con el del último test run', () => {
      const res = checkActivation({
        template: validTemplate,
        version: validVersion,
        lastTestRun: validLastTestRun,
        currentHash: 'hash-modificado-456',
        accountCheck: validAccountCheck,
        activeInTenant: []
      });

      expect(res.ok).toBe(false);
      expect(res.errors.some(e => e.code === 'HASH_MISMATCH')).toBe(true);
    });

    it('bloquea activación si hay cuentas sin resolver', () => {
      const unresolvedAccountCheck = {
        ok: false,
        unresolved: [{ roleCode: 'EXPENSE', qualifier: null }]
      };

      const res = checkActivation({
        template: validTemplate,
        version: validVersion,
        lastTestRun: validLastTestRun,
        currentHash: dummyHash,
        accountCheck: unresolvedAccountCheck,
        activeInTenant: []
      });

      expect(res.ok).toBe(false);
      expect(res.errors.some(e => e.code === 'ACCOUNTS_UNRESOLVED')).toBe(true);
    });

    it('bloquea activación si hay otra plantilla activa con la misma terna, alcance y prioridad', () => {
      const conflictingActive = [
        {
          templateId: 'tmpl-other',
          documentTypeCode: 'INVOICE',
          perspective: 'RECEIVED',
          operationTypeCode: 'MERCHANDISE_PURCHASE',
          scope: 'TENANT',
          priority: 0
        }
      ];

      const res = checkActivation({
        template: validTemplate,
        version: validVersion,
        lastTestRun: validLastTestRun,
        currentHash: dummyHash,
        accountCheck: validAccountCheck,
        activeInTenant: conflictingActive
      });

      expect(res.ok).toBe(false);
      expect(res.errors.some(e => e.code === 'AMBIGUOUS_CONFLICT')).toBe(true);
    });

    it('permite activación si la otra activa es una versión anterior de la misma plantilla', () => {
      const priorVersionOfSame = [
        {
          templateId: 'tmpl-1', // mismo templateId
          documentTypeCode: 'INVOICE',
          perspective: 'RECEIVED',
          operationTypeCode: 'MERCHANDISE_PURCHASE',
          scope: 'TENANT',
          priority: 0
        }
      ];

      const res = checkActivation({
        template: validTemplate,
        version: validVersion,
        lastTestRun: validLastTestRun,
        currentHash: dummyHash,
        accountCheck: validAccountCheck,
        activeInTenant: priorVersionOfSame
      });

      expect(res.ok).toBe(true);
    });

    it('bloquea activación si la plantilla ha sido retirada', () => {
      const res = checkActivation({
        template: { ...validTemplate, retiredAt: '2026-09-20T10:00:00Z' },
        version: validVersion,
        lastTestRun: validLastTestRun,
        currentHash: dummyHash,
        accountCheck: validAccountCheck,
        activeInTenant: []
      });

      expect(res.ok).toBe(false);
      expect(res.errors.some(e => e.code === 'TEMPLATE_RETIRED')).toBe(true);
    });
  });
});

