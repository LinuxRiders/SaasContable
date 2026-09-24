import { describe, it, expect } from 'vitest';
import { classify, applyClassification } from '../classification.js';

describe('classification: domain logic (R-08, SDD §20.4, RD-16)', () => {
  const dummyPack = {
    mixedOperationTypes: {
      RECEIVED: 'PURCHASE_MIXED',
      ISSUED: 'SALE_MIXED'
    },
    operationTypes: [
      { code: 'OP_A', allowedPerspectives: ['RECEIVED'] },
      { code: 'OP_B', allowedPerspectives: ['RECEIVED'] },
      { code: 'OP_C', allowedPerspectives: ['RECEIVED'] },
      { code: 'PAYROLL', allowedPerspectives: ['INTERNAL'] },
      { code: 'PURCHASE_MIXED', allowedPerspectives: ['RECEIVED'] }
    ]
  };

  const dummyDocTypeInvoice = {
    code: 'INVOICE',
    allowedPerspectives: ['RECEIVED', 'ISSUED'],
    operationTypesByPerspective: {
      RECEIVED: ['OP_A', 'OP_B', 'OP_C', 'PURCHASE_MIXED']
    }
  };

  const dummyDocTypePayroll = {
    code: 'PAYROLL_SUMMARY',
    allowedPerspectives: ['INTERNAL'],
    operationTypesByPerspective: {
      INTERNAL: ['PAYROLL']
    }
  };

  it('valor explícito del origen prevalece en el documento (decidedBy: SOURCE)', () => {
    const doc = {
      documentTypeCode: 'INVOICE',
      perspective: 'RECEIVED',
      operationTypeCode: 'OP_A',
      lines: [
        { lineNo: 1, description: 'Item 1' },
        { lineNo: 2, description: 'Item 2' }
      ]
    };

    const rules = [
      {
        id: 'r1',
        status: 'ACTIVE',
        scope: 'DOCUMENT',
        priority: 100,
        condition: { const: true },
        operationTypeCode: 'OP_B'
      }
    ];

    const res = classify(doc, { pack: dummyPack, documentType: dummyDocTypeInvoice, rules });
    expect(res.ok).toBe(true);
    expect(res.operationTypeCode).toBe('OP_A');
    expect(res.decidedBy).toBe('SOURCE');
    expect(res.lineOperationTypes[1]).toBe('OP_A');
    expect(res.lineOperationTypes[2]).toBe('OP_A');
  });

  it('prioridad mayor gana entre reglas activas', () => {
    const doc = {
      documentTypeCode: 'INVOICE',
      perspective: 'RECEIVED',
      lines: [{ lineNo: 1, description: 'Item 1' }]
    };

    const rules = [
      {
        id: 'r_low',
        status: 'ACTIVE',
        scope: 'DOCUMENT',
        priority: 10,
        condition: { const: true },
        operationTypeCode: 'OP_A'
      },
      {
        id: 'r_high',
        status: 'ACTIVE',
        scope: 'DOCUMENT',
        priority: 20,
        condition: { const: true },
        operationTypeCode: 'OP_B'
      }
    ];

    const res = classify(doc, { pack: dummyPack, documentType: dummyDocTypeInvoice, rules });
    expect(res.ok).toBe(true);
    expect(res.operationTypeCode).toBe('OP_B');
    expect(res.decidedBy).toBe('RULE:r_high');
  });

  it('empate en prioridad se resuelve por id lexicográfico menor', () => {
    const doc = {
      documentTypeCode: 'INVOICE',
      perspective: 'RECEIVED',
      lines: [{ lineNo: 1, description: 'Item 1' }]
    };

    const rules = [
      {
        id: 'r_beta',
        status: 'ACTIVE',
        scope: 'DOCUMENT',
        priority: 20,
        condition: { const: true },
        operationTypeCode: 'OP_B'
      },
      {
        id: 'r_alpha',
        status: 'ACTIVE',
        scope: 'DOCUMENT',
        priority: 20,
        condition: { const: true },
        operationTypeCode: 'OP_A'
      }
    ];

    const res = classify(doc, { pack: dummyPack, documentType: dummyDocTypeInvoice, rules });
    expect(res.ok).toBe(true);
    expect(res.operationTypeCode).toBe('OP_A');
    expect(res.decidedBy).toBe('RULE:r_alpha');
  });

  it('reglas PROPOSED o RETIRED son ignoradas', () => {
    const doc = {
      documentTypeCode: 'INVOICE',
      perspective: 'RECEIVED',
      lines: [{ lineNo: 1, description: 'Item 1' }]
    };

    const rules = [
      {
        id: 'r_proposed',
        status: 'PROPOSED',
        scope: 'DOCUMENT',
        priority: 100,
        condition: { const: true },
        operationTypeCode: 'OP_A'
      },
      {
        id: 'r_retired',
        status: 'RETIRED',
        scope: 'DOCUMENT',
        priority: 90,
        condition: { const: true },
        operationTypeCode: 'OP_A'
      },
      {
        id: 'r_active',
        status: 'ACTIVE',
        scope: 'DOCUMENT',
        priority: 10,
        condition: { const: true },
        operationTypeCode: 'OP_B'
      }
    ];

    const res = classify(doc, { pack: dummyPack, documentType: dummyDocTypeInvoice, rules });
    expect(res.ok).toBe(true);
    expect(res.operationTypeCode).toBe('OP_B');
    expect(res.decidedBy).toBe('RULE:r_active');
  });

  it('opción única por tipo de comprobante y perspectiva (SINGLE_OPTION)', () => {
    const doc = {
      documentTypeCode: 'PAYROLL_SUMMARY',
      perspective: 'INTERNAL',
      lines: [{ lineNo: 1, description: 'Nómina mensual' }]
    };

    // Sin reglas aplicables
    const res = classify(doc, { pack: dummyPack, documentType: dummyDocTypePayroll, rules: [] });
    expect(res.ok).toBe(true);
    expect(res.operationTypeCode).toBe('PAYROLL');
    expect(res.decidedBy).toBe('SINGLE_OPTION');
    expect(res.lineOperationTypes[1]).toBe('PAYROLL');
  });

  it('líneas mixtas: adopta mixedOperationTypes aunque regla DOCUMENT haya propuesto otro tipo', () => {
    const doc = {
      documentTypeCode: 'INVOICE',
      perspective: 'RECEIVED',
      lines: [
        { lineNo: 1, description: 'Item Regular' },
        { lineNo: 2, description: 'Servicio de flete' }
      ]
    };

    const rules = [
      {
        id: 'r_doc',
        status: 'ACTIVE',
        scope: 'DOCUMENT',
        priority: 50,
        condition: { const: true },
        operationTypeCode: 'OP_A'
      },
      {
        id: 'r_line_transport',
        status: 'ACTIVE',
        scope: 'LINE',
        priority: 20,
        condition: {
          fn: 'contains',
          args: [{ fn: 'lower', args: [{ line: 'description' }] }, 'flete']
        },
        operationTypeCode: 'OP_B'
      }
    ];

    const res = classify(doc, { pack: dummyPack, documentType: dummyDocTypeInvoice, rules });
    expect(res.ok).toBe(true);
    // Línea 1 heredó OP_A, Línea 2 obtuvo OP_B de su regla LINE
    expect(res.lineOperationTypes[1]).toBe('OP_A');
    expect(res.lineOperationTypes[2]).toBe('OP_B');
    // Debido a líneas heterogéneas, el documento pasa a ser PURCHASE_MIXED
    expect(res.operationTypeCode).toBe('PURCHASE_MIXED');
    expect(res.decidedBy).toBe('MIXED');
  });

  it('líneas sin regla heredan la operación decidida para el documento', () => {
    const doc = {
      documentTypeCode: 'INVOICE',
      perspective: 'RECEIVED',
      lines: [
        { lineNo: 1, description: 'Línea 1' },
        { lineNo: 2, description: 'Línea 2' }
      ]
    };

    const rules = [
      {
        id: 'r_doc',
        status: 'ACTIVE',
        scope: 'DOCUMENT',
        priority: 10,
        condition: { const: true },
        operationTypeCode: 'OP_C'
      }
    ];

    const res = classify(doc, { pack: dummyPack, documentType: dummyDocTypeInvoice, rules });
    expect(res.ok).toBe(true);
    expect(res.operationTypeCode).toBe('OP_C');
    expect(res.lineOperationTypes[1]).toBe('OP_C');
    expect(res.lineOperationTypes[2]).toBe('OP_C');
  });

  it('regla con tipo no admitido para el comprobante/perspectiva es ignorada', () => {
    const doc = {
      documentTypeCode: 'INVOICE',
      perspective: 'RECEIVED',
      lines: [{ lineNo: 1, description: 'Item' }]
    };

    const rules = [
      {
        id: 'r_invalid_type',
        status: 'ACTIVE',
        scope: 'DOCUMENT',
        priority: 100,
        condition: { const: true },
        operationTypeCode: 'NON_EXISTENT_OP'
      },
      {
        id: 'r_valid',
        status: 'ACTIVE',
        scope: 'DOCUMENT',
        priority: 10,
        condition: { const: true },
        operationTypeCode: 'OP_A'
      }
    ];

    const res = classify(doc, { pack: dummyPack, documentType: dummyDocTypeInvoice, rules });
    expect(res.ok).toBe(true);
    expect(res.operationTypeCode).toBe('OP_A');
    expect(res.decidedBy).toBe('RULE:r_valid');

    // Comprobar que en la traza se anotó la no admisión
    const invalidTrace = res.trace.find(t => t.ruleId === 'r_invalid_type');
    expect(invalidTrace).toBeDefined();
    expect(invalidTrace.skippedReason).toBe('OPERATION_NOT_ALLOWED');
  });

  it('ninguna decisión posible devuelve CLASSIFICATION_REQUIRED', () => {
    const doc = {
      documentTypeCode: 'INVOICE',
      perspective: 'RECEIVED',
      lines: [{ lineNo: 1, description: 'Item misterioso' }]
    };

    // Regla cuya condición da falso
    const rules = [
      {
        id: 'r1',
        status: 'ACTIVE',
        scope: 'DOCUMENT',
        priority: 10,
        condition: { const: false },
        operationTypeCode: 'OP_A'
      }
    ];

    const res = classify(doc, { pack: dummyPack, documentType: dummyDocTypeInvoice, rules });
    expect(res.ok).toBe(false);
    expect(res.pending).toBeDefined();
    expect(res.pending[0].reasonCode).toBe('CLASSIFICATION_REQUIRED');
    expect(res.trace).toBeDefined();
    expect(res.trace.length).toBeGreaterThan(0);
  });

  it('traza registra todas las reglas evaluadas', () => {
    const doc = {
      documentTypeCode: 'INVOICE',
      perspective: 'RECEIVED',
      lines: [{ lineNo: 1, description: 'Item' }]
    };

    const rules = [
      { id: 'r1', status: 'ACTIVE', scope: 'DOCUMENT', priority: 20, condition: { const: false }, operationTypeCode: 'OP_A' },
      { id: 'r2', status: 'ACTIVE', scope: 'DOCUMENT', priority: 10, condition: { const: true }, operationTypeCode: 'OP_B' }
    ];

    const res = classify(doc, { pack: dummyPack, documentType: dummyDocTypeInvoice, rules });
    expect(res.ok).toBe(true);
    expect(res.trace).toHaveLength(2);
    expect(res.trace[0]).toMatchObject({ ruleId: 'r1', matched: false });
    expect(res.trace[1]).toMatchObject({ ruleId: 'r2', matched: true });
  });

  it('applyClassification produce un nuevo documento sin mutar el original', () => {
    const originalDoc = {
      documentTypeCode: 'INVOICE',
      perspective: 'RECEIVED',
      lines: [
        { lineNo: 1, description: 'Item 1', amount: 100 },
        { lineNo: 2, description: 'Item 2', amount: 200 }
      ]
    };

    const snapshot = JSON.stringify(originalDoc);

    const classificationResult = {
      ok: true,
      operationTypeCode: 'OP_A',
      lineOperationTypes: {
        1: 'OP_A',
        2: 'OP_A'
      }
    };

    const classifiedDoc = applyClassification(originalDoc, classificationResult);

    // Original no mutó
    expect(JSON.stringify(originalDoc)).toBe(snapshot);
    expect(originalDoc.operationTypeCode).toBeUndefined();
    expect(originalDoc.lines[0].operationTypeCode).toBeUndefined();

    // Nuevo documento tiene los tipos asignados
    expect(classifiedDoc.operationTypeCode).toBe('OP_A');
    expect(classifiedDoc.lines[0].operationTypeCode).toBe('OP_A');
    expect(classifiedDoc.lines[1].operationTypeCode).toBe('OP_A');
  });
});

