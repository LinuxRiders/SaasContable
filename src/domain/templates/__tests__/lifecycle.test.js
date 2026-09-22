import { describe, it, expect } from 'vitest';
import { 
  createTemplate, 
  saveDraft, 
  canActivate, 
  activate, 
  deleteDraft,
  editTemplate,
  retireTemplate 
} from '../lifecycle.js';

describe('Template Lifecycle (T102, R-22, data-model §4.1-§4.2, CA-19, CA-21, CA-22)', () => {
  const clock = () => '2026-09-22T10:00:00.000Z';
  const actor = 'admin_pedro';

  const validDefaults = {
    baseAccount: '6011101',
    taxAccount: '4011101',
    counterpartAccount: '4212101',
    appliesIgv: true,
    requiresCostCenter: false,
    defaultCostCenter: null
  };

  const validHeader = {
    templateId: 'PL-TEST-01',
    code: 'COMPRA_TEST',
    name: 'Plantilla de prueba',
    operationType: 'COMPRA',
    defaults: validDefaults
  };

  const mockPcge = {
    '6011101': { code: '6011101', codigo: '6011101', descripcion: 'MERCADERIAS', isPostable: true, esCuentaU: true },
    '4011101': { code: '4011101', codigo: '4011101', descripcion: 'IGV', isPostable: true, esCuentaU: true },
    '4212101': { code: '4212101', codigo: '4212101', descripcion: 'FACTURAS POR PAGAR', isPostable: true, esCuentaU: true }
  };

  it('createTemplate genera una Template con DRAFT v1 sin reglas ni casos', () => {
    const tpl = createTemplate(validHeader, actor, clock);

    expect(tpl.templateId).toBe('PL-TEST-01');
    expect(tpl.code).toBe('COMPRA_TEST');
    expect(tpl.name).toBe('Plantilla de prueba');
    expect(tpl.operationType).toBe('COMPRA');
    expect(tpl.createdBy).toBe(actor);
    expect(tpl.createdAt).toBe(clock());
    expect(tpl.retiredAt).toBeNull();
    expect(tpl.versions).toHaveLength(1);

    const v1 = tpl.versions[0];
    expect(v1.version).toBe(1);
    expect(v1.status).toBe('DRAFT');
    expect(v1.basedOnVersion).toBeNull();
    expect(v1.defaults).toEqual(validDefaults);
    expect(v1.documentRules).toEqual([]);
    expect(v1.lineRules).toEqual([]);
    expect(v1.testCases).toEqual([]);
    expect(v1.lastTestRun).toBeNull();
    expect(v1.createdBy).toBe(actor);
    expect(v1.createdAt).toBe(clock());
    expect(v1.updatedAt).toBe(clock());
    expect(v1.usageCount).toBe(0);
  });

  it('createTemplate rechaza encabezado inválido con TEMPLATE_INVALID', () => {
    expect(() => createTemplate({ ...validHeader, code: '' }, actor, clock)).toThrow();
    try {
      createTemplate({ ...validHeader, code: '' }, actor, clock);
    } catch (err) {
      expect(err.code).toBe('TEMPLATE_INVALID');
      expect(err.details).toBeDefined();
    }
  });

  it('saveDraft solo permite modificar versiones en DRAFT y actualiza updatedAt', () => {
    const tpl = createTemplate(validHeader, actor, clock);
    const laterClock = () => '2026-09-22T11:00:00.000Z';

    const draftUpdate = {
      name: 'Nuevo nombre borrador',
      defaults: { ...validDefaults, requiresCostCenter: true },
      documentRules: [],
      lineRules: [],
      testCases: []
    };

    const updatedTpl = saveDraft(tpl, 1, draftUpdate, actor, laterClock);
    const v1 = updatedTpl.versions[0];

    expect(v1.defaults.requiresCostCenter).toBe(true);
    expect(v1.updatedAt).toBe('2026-09-22T11:00:00.000Z');
    expect(v1.lastTestRun).toBeNull();

    // Intentar modificar una versión ACTIVE lanza TEMPLATE_NOT_EDITABLE
    v1.status = 'ACTIVE';
    expect(() => saveDraft(updatedTpl, 1, draftUpdate, actor, laterClock)).toThrow();
    try {
      saveDraft(updatedTpl, 1, draftUpdate, actor, laterClock);
    } catch (err) {
      expect(err.code).toBe('TEMPLATE_NOT_EDITABLE');
    }
  });

  it('canActivate exige lastTestRun posterior a updatedAt, allPassed, sin reglas sin cubrir, al menos un caso y cuentas válidas en PCGE', () => {
    const tpl = createTemplate(validHeader, actor, clock);
    const v1 = tpl.versions[0];

    // 1. Sin casos de prueba y sin lastTestRun
    const res1 = canActivate(v1, mockPcge);
    expect(res1.ok).toBe(false);
    expect(res1.missing).toContain('NO_TEST_CASES');
    expect(res1.missing).toContain('NO_TEST_RUN');

    // 2. Con caso de prueba pero sin test run
    v1.testCases = [
      {
        caseId: 'TC-1',
        name: 'Caso 1',
        document: {
          currency: 'PEN',
          totalCents: 11800,
          taxableBaseCents: 10000,
          igvCents: 1800,
          lines: [{ amountCents: 10000 }]
        },
        expectedLines: [
          { side: 'D', accountCode: '6011101', functionalAmountCents: 10000 },
          { side: 'D', accountCode: '4011101', functionalAmountCents: 1800 },
          { side: 'H', accountCode: '4212101', functionalAmountCents: 11800 }
        ]
      }
    ];

    const res2 = canActivate(v1, mockPcge);
    expect(res2.ok).toBe(false);
    expect(res2.missing).toContain('NO_TEST_RUN');

    // 3. Con test run desactualizado (anterior a updatedAt)
    v1.updatedAt = '2026-09-22T12:00:00.000Z';
    v1.lastTestRun = {
      at: '2026-09-22T11:00:00.000Z',
      allPassed: true,
      uncoveredRuleIds: [],
      results: [{ caseId: 'TC-1', passed: true, balanced: true, accountErrors: [] }]
    };
    const res3 = canActivate(v1, mockPcge);
    expect(res3.ok).toBe(false);
    expect(res3.missing).toContain('OUTDATED_TEST_RUN');

    // 4. Con test run posterior pero con fallos o reglas sin cubrir
    v1.lastTestRun = {
      at: '2026-09-22T13:00:00.000Z',
      allPassed: false,
      uncoveredRuleIds: ['RULE-1'],
      results: [{ caseId: 'TC-1', passed: false, balanced: true, accountErrors: [] }]
    };
    const res4 = canActivate(v1, mockPcge);
    expect(res4.ok).toBe(false);
    expect(res4.missing).toContain('TESTS_FAILED');
    expect(res4.missing).toContain('UNCOVERED_RULES');

    // 5. Con cuentas que no existen en el PCGE
    v1.lastTestRun = {
      at: '2026-09-22T13:00:00.000Z',
      allPassed: true,
      uncoveredRuleIds: [],
      results: [{ caseId: 'TC-1', passed: true, balanced: true, accountErrors: [] }]
    };
    const res5 = canActivate(v1, { ...mockPcge, '6011101': undefined });
    expect(res5.ok).toBe(false);
    expect(res5.missing).toContain('ACCOUNT_ERRORS');

    // 6. Todo correcto -> ok: true
    const res6 = canActivate(v1, mockPcge);
    expect(res6.ok).toBe(true);
    expect(res6.missing).toEqual([]);
  });

  it('activate pasa DRAFT a ACTIVE y la ACTIVE anterior a RETIRED (máximo una ACTIVE)', () => {
    const tpl = createTemplate(validHeader, actor, clock);
    const v1 = tpl.versions[0];
    v1.status = 'ACTIVE';
    v1.activatedAt = clock();
    v1.activatedBy = actor;

    // Agregar v2 como DRAFT
    const v2 = {
      version: 2,
      status: 'DRAFT',
      basedOnVersion: 1,
      defaults: validDefaults,
      documentRules: [],
      lineRules: [],
      testCases: [{ caseId: 'TC-1', expectedLines: [{ side: 'D', accountCode: '6011101', functionalAmountCents: 100 }] }],
      lastTestRun: {
        at: '2026-09-22T12:00:00.000Z',
        allPassed: true,
        uncoveredRuleIds: [],
        results: [{ caseId: 'TC-1', passed: true, balanced: true, accountErrors: [] }]
      },
      createdBy: actor,
      createdAt: clock(),
      updatedAt: '2026-09-22T11:00:00.000Z',
      usageCount: 0
    };
    tpl.versions.push(v2);

    const activateClock = () => '2026-09-22T14:00:00.000Z';
    const result = activate(tpl, 2, actor, activateClock, mockPcge);

    expect(result.template.versions[0].status).toBe('RETIRED');
    expect(result.template.versions[1].status).toBe('ACTIVE');
    expect(result.template.versions[1].activatedAt).toBe('2026-09-22T14:00:00.000Z');
    expect(result.template.versions[1].activatedBy).toBe(actor);

    // Contar activas
    const activeVersions = result.template.versions.filter(v => v.status === 'ACTIVE');
    expect(activeVersions).toHaveLength(1);
  });

  it('deleteDraft elimina solo versiones DRAFT y borra la plantilla si es la única versión', () => {
    const tpl = createTemplate(validHeader, actor, clock);
    
    // Intentar borrar versión ACTIVE lanza error
    tpl.versions[0].status = 'ACTIVE';
    expect(() => deleteDraft(tpl, 1)).toThrow();

    // Regresar a DRAFT y borrar única versión -> plantilla se elimina (retorna null o deleted: true)
    tpl.versions[0].status = 'DRAFT';
    const res = deleteDraft(tpl, 1);
    expect(res.deleted).toBe(true);
    expect(res.template).toBeNull();

    // Con múltiples versiones, solo elimina la versión draft indicada
    const tpl2 = createTemplate(validHeader, actor, clock);
    tpl2.versions[0].status = 'ACTIVE';
    tpl2.versions.push({
      version: 2,
      status: 'DRAFT',
      defaults: validDefaults,
      documentRules: [],
      lineRules: [],
      testCases: []
    });

    const res2 = deleteDraft(tpl2, 2);
    expect(res2.deleted).toBe(false);
    expect(res2.template.versions).toHaveLength(1);
    expect(res2.template.versions[0].version).toBe(1);
  });

  it('editTemplate sobre una ACTIVE crea DRAFT v(max+1) con basedOnVersion, y si ya hay DRAFT lo devuelve', () => {
    const tpl = createTemplate(validHeader, actor, clock);
    tpl.versions[0].status = 'ACTIVE';

    // 1. Crear nuevo borrador
    const res1 = editTemplate(tpl, actor, clock);
    expect(res1.created).toBe(true);
    expect(res1.version.version).toBe(2);
    expect(res1.version.status).toBe('DRAFT');
    expect(res1.version.basedOnVersion).toBe(1);
    expect(tpl.versions).toHaveLength(2);

    // 2. Si ya existe un DRAFT, devuelve el existente
    const res2 = editTemplate(tpl, actor, clock);
    expect(res2.created).toBe(false);
    expect(res2.version.version).toBe(2);
    expect(tpl.versions).toHaveLength(2);
  });

  it('retireTemplate marca la versión ACTIVE como RETIRED y fija retiredAt', () => {
    const tpl = createTemplate(validHeader, actor, clock);
    tpl.versions[0].status = 'ACTIVE';

    const retireClock = () => '2026-09-22T16:00:00.000Z';
    retireTemplate(tpl, retireClock);

    expect(tpl.retiredAt).toBe('2026-09-22T16:00:00.000Z');
    expect(tpl.versions[0].status).toBe('RETIRED');
  });

  it('al activar una versión nueva genera diffFromPrevious con las diferencias respecto a la anterior', () => {
    const tpl = createTemplate(validHeader, actor, clock);
    tpl.versions[0].status = 'ACTIVE';

    const { version: v2 } = editTemplate(tpl, actor, clock);
    v2.defaults.baseAccount = '6591101'; // cambio
    v2.testCases = [{ caseId: 'TC-1', expectedLines: [{ side: 'D', accountCode: '6591101', functionalAmountCents: 100 }] }];
    v2.lastTestRun = {
      at: '2026-09-22T17:00:00.000Z',
      allPassed: true,
      uncoveredRuleIds: [],
      results: [{ caseId: 'TC-1', passed: true, balanced: true, accountErrors: [] }]
    };

    const activateClock = () => '2026-09-22T18:00:00.000Z';
    const pcgeWith659 = {
      ...mockPcge,
      '6591101': { code: '6591101', isPostable: true }
    };

    const activated = activate(tpl, 2, actor, activateClock, pcgeWith659);
    expect(activated.version.status).toBe('ACTIVE');
    expect(activated.version.diffFromPrevious).toBeDefined();
    expect(activated.version.diffFromPrevious.length).toBeGreaterThan(0);
    expect(activated.version.diffFromPrevious.some(d => d.includes('baseAccount') || d.includes('Cuenta base'))).toBe(true);
  });
});

