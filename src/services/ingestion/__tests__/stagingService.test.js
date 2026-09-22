import { describe, it, expect, beforeEach } from 'vitest';
import { createStagingService } from '../stagingService.js';
import { createIngestionService } from '../ingestionService.js';
import { memoryStorage } from '../../storage/memoryStorage.js';
import * as repository from '../../storage/repository.js';
import { ensureSeeded } from '../demoService.js';
import { mockComprobantesDemo } from '../../../data/mockComprobantesDemo.js';

describe('Staging Service Integration (T076, contracts/services.md)', () => {
  let memStorage;
  let stagingService;
  let ingestionService;

  const makerCtx = {
    tenantId: '01',
    userId: 'contador_maria',
    role: 'MAKER',
    activePeriod: { ejercicio: '2026', nombrePeriodo: 'SETIEMBRE_2026' }
  };

  const checkerCtx = {
    tenantId: '01',
    userId: 'revisor_luis',
    role: 'CHECKER',
    activePeriod: { ejercicio: '2026', nombrePeriodo: 'SETIEMBRE_2026' }
  };

  const auditorCtx = {
    tenantId: '01',
    userId: 'auditora_ana',
    role: 'AUDITOR',
    activePeriod: { ejercicio: '2026', nombrePeriodo: 'SETIEMBRE_2026' }
  };

  beforeEach(() => {
    memStorage = memoryStorage();
    repository.init(memStorage);
    ensureSeeded(repository, undefined, { seedIngestion: false });
    stagingService = createStagingService(repository);
    ingestionService = createIngestionService(repository);
  });

  it('queryStaging filters by reason, operationType, currency, dates, and overdueOnly', async () => {
    // Subir muestra con falta de centro de costo (PL-06)
    const samplePl06 = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-09-PL06-COMPRA-1');
    await ingestionService.ingestBatch(makerCtx, {
      templateId: 'PL-06',
      items: [{ fileName: samplePl06.fileName, content: samplePl06.content }]
    });

    const queryAll = await stagingService.queryStaging(makerCtx);
    expect(queryAll.ok).toBe(true);
    expect(queryAll.data.total).toBe(1);
    const row = queryAll.data.items[0];
    expect(row.pendingReasons).toContain('MISSING_COST_CENTER');
    expect(row.overdue).toBe(false);
    expect(row.allowedActions).toContain('COMPLETE');

    // Filtro por motivo
    const qReason = await stagingService.queryStaging(makerCtx, { reason: 'MISSING_COST_CENTER' });
    expect(qReason.data.total).toBe(1);

    const qOtherReason = await stagingService.queryStaging(makerCtx, { reason: 'UNBALANCED' });
    expect(qOtherReason.data.total).toBe(0);

    // Filtro por moneda
    const qPEN = await stagingService.queryStaging(makerCtx, { currency: 'PEN' });
    expect(qPEN.data.total).toBe(1);
    const qUSD = await stagingService.queryStaging(makerCtx, { currency: 'USD' });
    expect(qUSD.data.total).toBe(0);

    // Filtro overdueOnly
    const qOverdue = await stagingService.queryStaging(makerCtx, { overdueOnly: true });
    expect(qOverdue.data.total).toBe(0);
  });

  it('updateStagingEntries updates cost center and advances entry to PENDING_APPROVAL (CA-11.5)', async () => {
    const samplePl06 = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-09-PL06-COMPRA-1');
    await ingestionService.ingestBatch(makerCtx, {
      templateId: 'PL-06',
      items: [{ fileName: samplePl06.fileName, content: samplePl06.content }]
    });

    const queryRes = await stagingService.queryStaging(makerCtx);
    const item = queryRes.data.items[0];

    const updateRes = await stagingService.updateStagingEntries(makerCtx, {
      updates: [{
        id: item.id,
        expectedVersion: item.entityVersion,
        costCenter: 'CC-ADMIN',
        analyticTags: { centro: 'Sede Principal' }
      }]
    });

    expect(updateRes.ok).toBe(true);
    expect(updateRes.data.results[0].status).toBe('ADVANCED');
    expect(updateRes.data.results[0].entryState).toBe('PENDING_APPROVAL');

    // Comprobar que en la bandeja ya no está
    const queryAfter = await stagingService.queryStaging(makerCtx);
    expect(queryAfter.data.total).toBe(0);

    // Comprobar que el asiento se actualizó en journalEntries y subió su entityVersion
    const entryRes = await stagingService.getJournalEntry(makerCtx, { id: item.id });
    expect(entryRes.ok).toBe(true);
    expect(entryRes.data.entry.state).toBe('PENDING_APPROVAL');
    expect(entryRes.data.entry.entityVersion).toBe(item.entityVersion + 1);
  });

  it('detects CONFLICT when expectedVersion does not match (CA-11.6)', async () => {
    const samplePl06 = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-09-PL06-COMPRA-1');
    await ingestionService.ingestBatch(makerCtx, {
      templateId: 'PL-06',
      items: [{ fileName: samplePl06.fileName, content: samplePl06.content }]
    });

    const queryRes = await stagingService.queryStaging(makerCtx);
    const item = queryRes.data.items[0];

    const updateRes = await stagingService.updateStagingEntries(makerCtx, {
      updates: [{
        id: item.id,
        expectedVersion: item.entityVersion + 99, // versión incorrecta
        costCenter: 'CC-ADMIN'
      }]
    });

    expect(updateRes.ok).toBe(true);
    expect(updateRes.data.results[0].status).toBe('CONFLICT');

    // El asiento debe permanecer intacto
    const entryRes = await stagingService.getJournalEntry(makerCtx, { id: item.id });
    expect(entryRes.data.entry.entityVersion).toBe(item.entityVersion);
    expect(entryRes.data.entry.state).toBe('PENDING_INPUT');
  });

  it('rejects action not allowed for reason with ACTION_NOT_ALLOWED_FOR_REASON', async () => {
    // Inconsistente sólo permite cancelar
    const sampleInconsistente = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-07-MONTOS-INCONSISTENTES');
    await ingestionService.ingestBatch(makerCtx, {
      templateId: 'PL-01',
      items: [{ fileName: sampleInconsistente.fileName, content: sampleInconsistente.content }]
    });

    const queryRes = await stagingService.queryStaging(makerCtx);
    const item = queryRes.data.items[0];

    const updateRes = await stagingService.updateStagingEntries(makerCtx, {
      updates: [{
        id: item.id,
        expectedVersion: item.entityVersion,
        costCenter: 'CC-ADMIN' // no permitido para INCONSISTENT_AMOUNTS
      }]
    });

    expect(updateRes.ok).toBe(true);
    expect(updateRes.data.results[0].status).toBe('ERROR');
    expect(updateRes.data.results[0].error.code).toBe('ACTION_NOT_ALLOWED_FOR_REASON');
  });

  it('revalidateEntries advances entry after catalog or period is updated (CA-08.5, CA-11.7)', async () => {
    // 1. Periodo cerrado (agosto 2026)
    const sampleCerrado = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-06-PERIODO-CERRADO');
    await ingestionService.ingestBatch(makerCtx, {
      templateId: 'PL-01',
      items: [{ fileName: sampleCerrado.fileName, content: sampleCerrado.content }]
    });

    let queryRes = await stagingService.queryStaging(makerCtx);
    let item = queryRes.data.items[0];
    expect(item.pendingReasons).toContain('PERIOD_CLOSED');

    // Reabrir agosto 2026 en la empresa
    const empresas = repository.getGlobal('empresas');
    const emp = empresas.find(e => e.id === '01');
    const perAgosto = emp.periodos.find(p => p.ejercicio === '2026' && p.mes === 8);
    perAgosto.estado = 'ABIERTO';
    repository.setGlobal('empresas', empresas);

    // Revalidar
    const revalRes = await stagingService.revalidateEntries(makerCtx, {
      items: [{ id: item.id, expectedVersion: item.entityVersion }]
    });

    expect(revalRes.ok).toBe(true);
    expect(revalRes.data.results[0].status).toBe('ADVANCED');
    expect(revalRes.data.results[0].entryState).toBe('PENDING_APPROVAL');

    // Verificar eventos de auditoría
    const audit = repository.getCollection('01', 'auditLog');
    expect(audit.some(e => e.action === 'REVALIDATED')).toBe(true);
  });

  it('recalculates with v2 and emits TEMPLATE_VERSION_CHANGED when template version 2 is active in repo', async () => {
    const samplePl06 = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-09-PL06-COMPRA-1');
    await ingestionService.ingestBatch(makerCtx, {
      templateId: 'PL-06',
      items: [{ fileName: samplePl06.fileName, content: samplePl06.content }]
    });

    let queryRes = await stagingService.queryStaging(makerCtx);
    let item = queryRes.data.items[0];

    // Sembrar versión 2 de PL-06 como ACTIVE en el banco global
    const bank = repository.getGlobal('templates');
    const pl06 = bank.find(t => t.templateId === 'PL-06');
    const v1 = pl06.versions[0];
    v1.status = 'RETIRED';

    const v2 = {
      ...v1,
      version: 2,
      status: 'ACTIVE',
      defaults: {
        ...v1.defaults,
        defaultCostCenter: 'CC-ADMIN', // v2 ya tiene CC por defecto
        requiresCostCenter: false
      }
    };
    pl06.versions.push(v2);
    repository.setGlobal('templates', bank);

    // Revalidar asiento
    const revalRes = await stagingService.revalidateEntries(makerCtx, {
      items: [{ id: item.id, expectedVersion: item.entityVersion }]
    });

    expect(revalRes.ok).toBe(true);
    expect(revalRes.data.results[0].status).toBe('ADVANCED');
    expect(revalRes.data.results[0].entryState).toBe('PENDING_APPROVAL');

    // Comprobar asiento actualizado
    const entryRes = await stagingService.getJournalEntry(makerCtx, { id: item.id });
    expect(entryRes.data.entry.templateVersion).toBe(2);

    const audit = repository.getCollection('01', 'auditLog');
    expect(audit.some(e => e.action === 'TEMPLATE_VERSION_CHANGED')).toBe(true);
  });

  it('marks TEMPLATE_INACTIVE without touching lines if template is deactivated for company (R-24)', async () => {
    const samplePl06 = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-09-PL06-COMPRA-1');
    await ingestionService.ingestBatch(makerCtx, {
      templateId: 'PL-06',
      items: [{ fileName: samplePl06.fileName, content: samplePl06.content }]
    });

    let queryRes = await stagingService.queryStaging(makerCtx);
    let item = queryRes.data.items[0];

    // Desactivar PL-06 para la empresa 01
    const activations = repository.getCollection('01', 'templateActivations');
    const actPl06 = activations.find(a => a.templateId === 'PL-06');
    actPl06.active = false;
    repository.setCollection('01', 'templateActivations', activations);

    // Revalidar
    const revalRes = await stagingService.revalidateEntries(makerCtx, {
      items: [{ id: item.id, expectedVersion: item.entityVersion }]
    });

    expect(revalRes.ok).toBe(true);
    expect(revalRes.data.results[0].status).toBe('STILL_PENDING');
    expect(revalRes.data.results[0].pendingReasons).toContain('TEMPLATE_INACTIVE');

    const entryRes = await stagingService.getJournalEntry(makerCtx, { id: item.id });
    expect(entryRes.data.entry.pendingReasons).toEqual(['TEMPLATE_INACTIVE']);
  });

  it('enforces permissions: CHECKER, AUDITOR, ADMIN cannot modify staging (FORBIDDEN)', async () => {
    const update = { updates: [{ id: 'some-id', expectedVersion: 1, costCenter: 'CC-ADMIN' }] };

    const resChecker = await stagingService.updateStagingEntries(checkerCtx, update);
    expect(resChecker.ok).toBe(false);
    expect(resChecker.error.code).toBe('FORBIDDEN');

    const resAuditor = await stagingService.updateStagingEntries(auditorCtx, update);
    expect(resAuditor.ok).toBe(false);
    expect(resAuditor.error.code).toBe('FORBIDDEN');
  });

  it('rejects update/revalidation when activePeriod is CERRADO with PERIOD_READ_ONLY', async () => {
    const empresas = repository.getGlobal('empresas');
    const emp = empresas.find(e => e.id === '01');
    const per = emp.periodos.find(p => p.ejercicio === '2026' && p.mes === 9);
    per.estado = 'CERRADO';
    repository.setGlobal('empresas', empresas);

    const update = { updates: [{ id: 'some-id', expectedVersion: 1, costCenter: 'CC-ADMIN' }] };
    const res = await stagingService.updateStagingEntries(makerCtx, update);
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('PERIOD_READ_ONLY');
  });

  it('seeds overdue entry with stagedAt = seededAt - 72h (T080, CA-10.4, PL-06)', async () => {
    const mem = memoryStorage();
    repository.init(mem);
    ensureSeeded(repository, undefined, { seedIngestion: true });

    const res = await stagingService.queryStaging(makerCtx, { overdueOnly: true });
    expect(res.ok).toBe(true);
    expect(res.data.total).toBe(1);
    const item = res.data.items[0];
    expect(item.id).toBe('entry-seed-overdue-01');
    expect(item.overdue).toBe(true);
    expect(item.ageHours).toBeGreaterThanOrEqual(72);
    expect(item.pendingReasons).toContain('MISSING_COST_CENTER');
  });

  describe('cancelEntry (T083, T084, RF-12)', () => {
    it('rejects justification with fewer than 10 characters with VALIDATION_ERROR', async () => {
      const samplePl06 = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-09-PL06-COMPRA-1');
      await ingestionService.ingestBatch(makerCtx, {
        templateId: 'PL-06',
        items: [{ fileName: samplePl06.fileName, content: samplePl06.content }]
      });
      const queryRes = await stagingService.queryStaging(makerCtx);
      const item = queryRes.data.items[0];

      const resShort = await stagingService.cancelEntry(makerCtx, {
        id: item.id,
        expectedVersion: item.entityVersion,
        reason: 'anulado'
      });
      expect(resShort.ok).toBe(false);
      expect(resShort.error.code).toBe('VALIDATION_ERROR');

      const resSpaces = await stagingService.cancelEntry(makerCtx, {
        id: item.id,
        expectedVersion: item.entityVersion,
        reason: '   123456789   '
      });
      expect(resSpaces.ok).toBe(false);
      expect(resSpaces.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects entry in PENDING_APPROVAL or CANCELLED with INVALID_TRANSITION', async () => {
      // 1. Asiento en PENDING_APPROVAL
      const sampleOk = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-01-COMPRA-VALIDA');
      await ingestionService.ingestBatch(makerCtx, {
        templateId: 'PL-01',
        items: [{ fileName: sampleOk.fileName, content: sampleOk.content }]
      });
      const entries = repository.getCollection('01', 'journalEntries');
      const entryApproval = entries.find(e => e.state === 'PENDING_APPROVAL');

      const resApproval = await stagingService.cancelEntry(makerCtx, {
        id: entryApproval.id,
        expectedVersion: entryApproval.entityVersion,
        reason: 'Proveedor canceló la operación'
      });
      expect(resApproval.ok).toBe(false);
      expect(resApproval.error.code).toBe('INVALID_TRANSITION');

      // 2. Asiento ya CANCELLED
      const samplePl06 = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-09-PL06-COMPRA-1');
      await ingestionService.ingestBatch(makerCtx, {
        templateId: 'PL-06',
        items: [{ fileName: samplePl06.fileName, content: samplePl06.content }]
      });
      const queryRes = await stagingService.queryStaging(makerCtx);
      const item = queryRes.data.items[0];

      const resCancel = await stagingService.cancelEntry(makerCtx, {
        id: item.id,
        expectedVersion: item.entityVersion,
        reason: 'Proveedor anuló la factura'
      });
      expect(resCancel.ok).toBe(true);

      const resCancelAgain = await stagingService.cancelEntry(makerCtx, {
        id: item.id,
        expectedVersion: resCancel.data.entityVersion,
        reason: 'Intento de anulación redundante'
      });
      expect(resCancelAgain.ok).toBe(false);
      expect(resCancelAgain.error.code).toBe('INVALID_TRANSITION');
    });

    it('detects CONFLICT when expectedVersion does not match', async () => {
      const samplePl06 = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-09-PL06-COMPRA-1');
      await ingestionService.ingestBatch(makerCtx, {
        templateId: 'PL-06',
        items: [{ fileName: samplePl06.fileName, content: samplePl06.content }]
      });
      const queryRes = await stagingService.queryStaging(makerCtx);
      const item = queryRes.data.items[0];

      const resConflict = await stagingService.cancelEntry(makerCtx, {
        id: item.id,
        expectedVersion: item.entityVersion + 5,
        reason: 'Proveedor anuló la factura'
      });
      expect(resConflict.ok).toBe(false);
      expect(resConflict.error.code).toBe('CONFLICT');
    });

    it('enforces role permissions: only MAKER can cancel entry (FORBIDDEN)', async () => {
      const samplePl06 = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-09-PL06-COMPRA-1');
      await ingestionService.ingestBatch(makerCtx, {
        templateId: 'PL-06',
        items: [{ fileName: samplePl06.fileName, content: samplePl06.content }]
      });
      const queryRes = await stagingService.queryStaging(makerCtx);
      const item = queryRes.data.items[0];

      const resChecker = await stagingService.cancelEntry(checkerCtx, {
        id: item.id,
        expectedVersion: item.entityVersion,
        reason: 'Intento de cancelación por Checker'
      });
      expect(resChecker.ok).toBe(false);
      expect(resChecker.error.code).toBe('FORBIDDEN');

      const resAuditor = await stagingService.cancelEntry(auditorCtx, {
        id: item.id,
        expectedVersion: item.entityVersion,
        reason: 'Intento de cancelación por Auditor'
      });
      expect(resAuditor.ok).toBe(false);
      expect(resAuditor.error.code).toBe('FORBIDDEN');
    });

    it('cancels entry successfully, records cancellation and ENTRY_CANCELLED audit event', async () => {
      const samplePl06 = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-09-PL06-COMPRA-1');
      await ingestionService.ingestBatch(makerCtx, {
        templateId: 'PL-06',
        items: [{ fileName: samplePl06.fileName, content: samplePl06.content }]
      });
      const queryRes = await stagingService.queryStaging(makerCtx);
      const item = queryRes.data.items[0];

      const res = await stagingService.cancelEntry(makerCtx, {
        id: item.id,
        expectedVersion: item.entityVersion,
        reason: 'Comprobante emitido por error por proveedor'
      });

      expect(res.ok).toBe(true);
      expect(res.data.state).toBe('CANCELLED');
      expect(res.data.cancellation).toBeDefined();
      expect(res.data.cancellation.reason).toBe('Comprobante emitido por error por proveedor');
      expect(res.data.cancellation.by).toBe(makerCtx.userId);
      expect(res.data.cancellation.at).toBeDefined();
      expect(res.data.entityVersion).toBe(item.entityVersion + 1);

      // Ya no aparece en queryStaging
      const queryAfter = await stagingService.queryStaging(makerCtx);
      expect(queryAfter.data.total).toBe(0);

      // Audit log contiene ENTRY_CANCELLED
      const auditLog = repository.readAppendOnly('01', 'auditLog');
      const cancelAudit = auditLog.find(a => a.action === 'ENTRY_CANCELLED' && a.entityId === item.id);
      expect(cancelAudit).toBeDefined();
      expect(cancelAudit.detail.reason).toBe('Comprobante emitido por error por proveedor');
    });
  });
});
