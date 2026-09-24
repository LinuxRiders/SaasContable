import { describe, it, expect } from 'vitest';
import { selectTemplate } from '../templateSelection.js';

describe('templateSelection: selectTemplate (R-09, contracts/domain-api.md §4, T084)', () => {
  const dummyDoc = {
    documentTypeCode: 'INVOICE',
    perspective: 'RECEIVED',
    operationTypeCode: 'MERCHANDISE_PURCHASE',
    totals: { totalMinor: 150000 }
  };

  it('descarta candidatas cuya condición de applicability es falsa', () => {
    const candidates = [
      {
        template: { id: 'tpl-1', scope: 'PACK' },
        version: {
          version: 1,
          priority: 0,
          applicability: {
            fn: 'gt',
            args: [{ field: 'totals.totalMinor' }, 200000] // Requiere > 200000, el doc tiene 150000
          }
        }
      }
    ];

    const res = selectTemplate(dummyDoc, { candidates });
    expect(res.ok).toBe(false);
    expect(res.pending[0].reasonCode).toBe('NO_TEMPLATE');
    expect(res.trace).toHaveLength(1);
    expect(res.trace[0].matched).toBe(false);
  });

  it('TENANT prevalece sobre PACK independientemente de la prioridad', () => {
    const candidates = [
      {
        template: { id: 'tpl-pack', scope: 'PACK' },
        version: { version: 1, priority: 100, applicability: null }
      },
      {
        template: { id: 'tpl-tenant', scope: 'TENANT' },
        version: { version: 1, priority: 10, applicability: null }
      }
    ];

    const res = selectTemplate(dummyDoc, { candidates });
    expect(res.ok).toBe(true);
    expect(res.template.id).toBe('tpl-tenant');
    expect(res.template.scope).toBe('TENANT');
  });

  it('prioridad mayor gana dentro del mismo alcance', () => {
    const candidates = [
      {
        template: { id: 'tpl-low', scope: 'TENANT' },
        version: { version: 1, priority: 10, applicability: null }
      },
      {
        template: { id: 'tpl-high', scope: 'TENANT' },
        version: { version: 1, priority: 50, applicability: null }
      }
    ];

    const res = selectTemplate(dummyDoc, { candidates });
    expect(res.ok).toBe(true);
    expect(res.template.id).toBe('tpl-high');
  });

  it('empate en alcance y prioridad produce AMBIGUOUS_TEMPLATE', () => {
    const candidates = [
      {
        template: { id: 'tpl-a', scope: 'TENANT' },
        version: { version: 1, priority: 20, applicability: null }
      },
      {
        template: { id: 'tpl-b', scope: 'TENANT' },
        version: { version: 1, priority: 20, applicability: null }
      }
    ];

    const res = selectTemplate(dummyDoc, { candidates });
    expect(res.ok).toBe(false);
    expect(res.pending[0].reasonCode).toBe('AMBIGUOUS_TEMPLATE');
    expect(res.trace).toHaveLength(2);
  });

  it('sin candidatas aplicables devuelve NO_TEMPLATE con traza', () => {
    const res = selectTemplate(dummyDoc, { candidates: [] });
    expect(res.ok).toBe(false);
    expect(res.pending[0].reasonCode).toBe('NO_TEMPLATE');
    expect(res.trace).toHaveLength(0);
  });
});

