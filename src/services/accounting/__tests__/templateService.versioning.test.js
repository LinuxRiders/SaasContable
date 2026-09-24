import { describe, it, expect, beforeEach } from 'vitest';
import * as memoryRepo from '../../storage/repository.js';
import { memoryStorage } from '../../storage/memoryStorage.js';
import { ensureSeeded } from '../../ingestion/demoService.js';
import { seedAccountingConfig } from '../seedAccounting.js';
import {
  createTemplate,
  saveTemplateDraft,
  createTemplateVersion,
  getTemplateDiff,
  retireTemplate,
  markTemplateUsedForDemo,
  activateTemplate,
  runTemplateTests
} from '../templateService.js';

describe('templateService versioning & lifecycle (RD-10, T096)', () => {
  beforeEach(() => {
    memoryRepo.init(memoryStorage());
    ensureSeeded(memoryRepo);
    memoryRepo.setGlobal('demoSettings', { latencyMs: 0, failRate: 0, demoMode: true });
    seedAccountingConfig(memoryRepo);
  });

  const admin01 = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };
  const maker01 = { tenantId: '01', userId: 'contador_maria', role: 'MAKER' };

  it('createTemplateVersion crea v2 DRAFT y saveTemplateDraft calcula diffFromPrevious', async () => {
    // 1. Crear plantilla TENANT v1
    const createRes = await createTemplate(admin01, {
      definition: {
        code: 'T_CUSTOM_PURCHASE',
        name: 'Compra personalizada',
        documentTypeCode: 'INVOICE',
        perspective: 'RECEIVED',
        operationTypeCode: 'MERCHANDISE_PURCHASE',
        priority: 0,
        legalBookCode: 'PE.PURCHASES_REGISTER',
        glosa: { const: 'Compra v1' },
        lines: [
          { id: 'l1', side: 'DEBIT', accountRef: { kind: 'ROLE', roleCode: 'PURCHASES_MERCHANDISE' }, amount: { field: 'totals.netMinor' } },
          { id: 'l2', side: 'CREDIT', accountRef: { kind: 'ROLE', roleCode: 'SUPPLIERS_PAYABLE' }, amount: { field: 'totals.totalMinor' } }
        ]
      }
    }, memoryRepo);

    expect(createRes.ok).toBe(true);
    const tmplId = createRes.data.id;

    // 2. Crear versión 2
    const v2Res = await createTemplateVersion(admin01, {
      templateId: tmplId,
      fromVersion: 1
    }, memoryRepo);

    expect(v2Res.ok).toBe(true);
    expect(v2Res.data.versions).toHaveLength(2);
    expect(v2Res.data.versions[1].version).toBe(2);
    expect(v2Res.data.versions[1].status).toBe('DRAFT');

    // 3. Modificar versión 2 con saveTemplateDraft
    const draftRes = await saveTemplateDraft(admin01, {
      templateId: tmplId,
      version: 2,
      definition: {
        priority: 10,
        glosa: { const: 'Compra v2 mejorada' },
        lines: [
          { id: 'l1', side: 'DEBIT', accountRef: { kind: 'ROLE', roleCode: 'PURCHASES_MERCHANDISE' }, amount: { field: 'totals.netMinor' } },
          { id: 'l2', side: 'CREDIT', accountRef: { kind: 'ROLE', roleCode: 'SUPPLIERS_PAYABLE' }, amount: { field: 'totals.totalMinor' } },
          { id: 'l3', side: 'CREDIT', accountRef: { kind: 'ROLE', roleCode: 'VAT_CREDIT' }, amount: { field: 'totals.taxMinor' } }
        ]
      }
    }, memoryRepo);

    expect(draftRes.ok).toBe(true);
    const savedV2 = draftRes.data.versions.find(v => v.version === 2);
    expect(savedV2.diffFromPrevious).toBeDefined();
    expect(savedV2.diffFromPrevious.some(d => d.includes('Prioridad: 0 → 10'))).toBe(true);
    expect(savedV2.diffFromPrevious.some(d => d.includes("Línea 'l3' agregada"))).toBe(true);

    // 4. getTemplateDiff
    const diffRes = await getTemplateDiff(admin01, {
      templateId: tmplId,
      fromVersion: 1,
      toVersion: 2
    }, memoryRepo);

    expect(diffRes.ok).toBe(true);
    expect(diffRes.data.length).toBeGreaterThan(0);
  });

  it('retireTemplate marca la plantilla como retirada e inactiva sus activaciones vigentes', async () => {
    // 1. Crear plantilla TENANT
    const createRes = await createTemplate(admin01, {
      definition: {
        code: 'T_TO_RETIRE',
        name: 'Plantilla para retirar',
        documentTypeCode: 'INVOICE',
        perspective: 'RECEIVED',
        priority: 50,
        legalBookCode: 'PE.PURCHASES_REGISTER',
        lines: [
          { id: 'l1', side: 'DEBIT', accountRef: { kind: 'ROLE', roleCode: 'PURCHASES_MERCHANDISE' }, amount: { field: 'totals.netMinor' } },
          { id: 'l2', side: 'CREDIT', accountRef: { kind: 'ROLE', roleCode: 'SUPPLIERS_PAYABLE' }, amount: { field: 'totals.totalMinor' } }
        ],
        testCases: [
          {
            id: 'tc1',
            name: 'Caso 1',
            input: {
              documentTypeCode: 'INVOICE',
              perspective: 'RECEIVED',
              operationTypeCode: 'MERCHANDISE_PURCHASE',
              totals: { netMinor: 1000, totalMinor: 1000 }
            },
            mappingSource: 'TENANT',
            expectedLines: [
              { side: 'DEBIT', accountCode: '6011101', functionalAmountMinor: 1000 },
              { side: 'CREDIT', accountCode: '4212101', functionalAmountMinor: 1000 }
            ]
          }
        ]
      }
    }, memoryRepo);

    expect(createRes.ok).toBe(true);
    const tmplId = createRes.data.id;

    // 2. Probar y activar
    const testRunRes = await runTemplateTests(admin01, { templateId: tmplId, version: 1 }, memoryRepo);
    expect(testRunRes.ok).toBe(true);
    const actRes = await activateTemplate(admin01, { templateId: tmplId, version: 1 }, memoryRepo);
    expect(actRes.ok).toBe(true);

    // Verificar activación previa activa
    let activations = memoryRepo.getCollection('01', 'templateActivations') || [];
    expect(activations.some(a => a.templateId === tmplId && a.status === 'ACTIVE')).toBe(true);

    // 3. Retirar plantilla
    const retireRes = await retireTemplate(admin01, { templateId: tmplId }, memoryRepo);
    expect(retireRes.ok).toBe(true);
    expect(retireRes.data.retiredAt).toBeDefined();

    // Verificar que activación pasó a INACTIVE
    activations = memoryRepo.getCollection('01', 'templateActivations') || [];
    const act = activations.find(a => a.templateId === tmplId);
    expect(act.status).toBe('INACTIVE');
    expect(act.deactivatedAt).toBeDefined();

    // 4. Intento de crear versión sobre plantilla retirada falla
    const nextVerRes = await createTemplateVersion(admin01, { templateId: tmplId, fromVersion: 1 }, memoryRepo);
    expect(nextVerRes.ok).toBe(false);
    expect(nextVerRes.error.code).toBe('NOT_EDITABLE');
  });

  it('markTemplateUsedForDemo incrementa uso y bloquea edición de la versión con NOT_EDITABLE (RD-10)', async () => {
    // 1. Crear plantilla TENANT
    const createRes = await createTemplate(admin01, {
      definition: {
        code: 'T_IMMUTABLE_DEMO',
        name: 'Demostración de inmutabilidad',
        documentTypeCode: 'INVOICE',
        perspective: 'RECEIVED',
        operationTypeCode: 'MERCHANDISE_PURCHASE',
        lines: [
          { id: 'l1', side: 'DEBIT', accountRef: { kind: 'ROLE', roleCode: 'PURCHASES_MERCHANDISE' }, amount: { field: 'totals.netMinor' } },
          { id: 'l2', side: 'CREDIT', accountRef: { kind: 'ROLE', roleCode: 'SUPPLIERS_PAYABLE' }, amount: { field: 'totals.totalMinor' } }
        ]
      }
    }, memoryRepo);

    const tmplId = createRes.data.id;

    // 2. Marcar como usada para demo
    const markRes = await markTemplateUsedForDemo(admin01, {
      templateId: tmplId,
      version: 1
    }, memoryRepo);

    expect(markRes.ok).toBe(true);
    expect(markRes.data.tenantUsage).toBe(1);
    expect(markRes.data.totalUsage).toBe(1);

    // 3. Intento de guardar borrador sobre versión con uso falla con NOT_EDITABLE (RD-10)
    const saveRes = await saveTemplateDraft(admin01, {
      templateId: tmplId,
      version: 1,
      definition: { priority: 99 }
    }, memoryRepo);

    expect(saveRes.ok).toBe(false);
    expect(saveRes.error.code).toBe('NOT_EDITABLE');

    // 4. En demoMode = false se rechaza markTemplateUsedForDemo con FORBIDDEN
    memoryRepo.setGlobal('demoSettings', { latencyMs: 0, failRate: 0, demoMode: false });
    const markFail = await markTemplateUsedForDemo(admin01, { templateId: tmplId, version: 1 }, memoryRepo);
    expect(markFail.ok).toBe(false);
    expect(markFail.error.code).toBe('FORBIDDEN');
  });
});
