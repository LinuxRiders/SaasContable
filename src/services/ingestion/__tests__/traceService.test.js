import { describe, it, expect, beforeEach } from 'vitest';
import { memoryStorage } from '../../storage/memoryStorage.js';
import * as repository from '../../storage/repository.js';
import { ensureSeeded } from '../demoService.js';
import { createIngestionService } from '../ingestionService.js';
import { createStagingService } from '../stagingService.js';
import { createTraceService } from '../traceService.js';

describe('TraceService - getTraceability (T095)', () => {
  let memStorage;
  let repo;
  let ingestionService;
  let stagingService;
  let traceService;

  const ctxMaker = {
    tenantId: '01',
    userId: 'contador_maria',
    role: 'MAKER',
    activePeriod: { ejercicio: '2026', nombrePeriodo: 'SETIEMBRE_2026' }
  };

  const ctxAuditor = {
    tenantId: '01',
    userId: 'auditora_ana',
    role: 'AUDITOR',
    activePeriod: { ejercicio: '2026', nombrePeriodo: 'SETIEMBRE_2026' }
  };

  const ctxChecker = {
    tenantId: '01',
    userId: 'revisor_luis',
    role: 'CHECKER',
    activePeriod: { ejercicio: '2026', nombrePeriodo: 'SETIEMBRE_2026' }
  };

  const sampleJsonDoc = (num = '00000100') => JSON.stringify({
    tipoDocumento: '01',
    serieNumero: `F001-${num}`,
    fechaEmision: '2026-09-15',
    moneda: 'PEN',
    emisor: { ruc: '20555555551', razonSocial: 'TRANSPORTES ANDINOS DEMO SAC' },
    receptor: { ruc: '20450656934', razonSocial: 'PACHATUSANTREK SAC' },
    lineas: [
      { descripcion: 'Servicio de flete y transporte', valor: '100.00', tributo: 'IGV' }
    ],
    totales: {
      baseGravada: '100.00',
      baseExonerada: '0.00',
      baseInafecta: '0.00',
      igv: '18.00',
      total: '118.00'
    }
  });

  beforeEach(() => {
    memStorage = memoryStorage();
    repository.init(memStorage);
    ensureSeeded(repository, () => '2026-09-22T00:00:00Z', { seedIngestion: false });

    ingestionService = createIngestionService(repository);
    stagingService = createStagingService(repository);
    traceService = createTraceService(repository);
  });

  it('devuelve evidencia, documento, asiento con appliedRules, plantilla con su versión y eventos en orden cronológico', async () => {
    // 1. Ingest batch with PL-07
    const ingestRes = await ingestionService.ingestBatch(ctxMaker, {
      templateId: 'PL-07',
      items: [{ fileName: 'f001-100.json', content: sampleJsonDoc('00000100') }]
    });
    expect(ingestRes.ok).toBe(true);

    const batch = ingestRes.data;
    const item = batch.items[0];
    expect(item.outcome).toBe('ACCEPTED');

    // Query staging or intake to get the traceId
    const intakeRes = await ingestionService.queryIntakeResults(ctxAuditor, {});
    expect(intakeRes.ok).toBe(true);
    const traceId = intakeRes.data.items[0].traceId;
    expect(traceId).toBeTruthy();

    // 2. Auditor queries traceability
    const traceRes = await traceService.getTraceability(ctxAuditor, { traceId });
    expect(traceRes.ok).toBe(true);

    const { rawPayload, document, entry, template, events } = traceRes.data;

    // Check rawPayload
    expect(rawPayload).toBeDefined();
    expect(rawPayload.fileName).toBe('f001-100.json');
    expect(rawPayload.traceId).toBe(traceId);

    // Check document
    expect(document).toBeDefined();
    expect(document.seriesAndNumber).toBe('F001-00000100');

    // Check entry and appliedRules
    expect(entry).toBeDefined();
    expect(entry.appliedRules).toBeDefined();
    expect(entry.appliedRules).toContain('R-FLETE');

    // Check template and version
    expect(template).toBeDefined();
    expect(template.version).toBe(1);
    expect(template.templateId).toBe('PL-07');
    expect(template.code).toBe('COMPRA_SERVICIOS_REGLAS');

    // Check events
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    // Events must be in ascending order
    for (let i = 1; i < events.length; i++) {
      const prevTime = new Date(events[i - 1].at).getTime();
      const currTime = new Date(events[i].at).getTime();
      expect(currTime).toBeGreaterThanOrEqual(prevTime);
    }
    // Check session userId in manual events
    const makerEvents = events.filter(e => e.userId === ctxMaker.userId);
    expect(makerEvents.length).toBeGreaterThan(0);
  });

  it('incluye STAGING_UPDATED y TEMPLATE_VERSION_CHANGED tras actualización y recálculo en bandeja', async () => {
    // Ingest a document requiring cost center (e.g. without CC with PL-06)
    const ingestRes = await ingestionService.ingestBatch(ctxMaker, {
      templateId: 'PL-06',
      items: [{ fileName: 'f001-101.json', content: sampleJsonDoc('00000101') }]
    });
    expect(ingestRes.ok).toBe(true);

    const traceId = ingestRes.data.items[0].traceId;

    const stagingRes = await stagingService.queryStaging(ctxMaker, {});
    const entry = stagingRes.data.items.find(e => e.traceId === traceId);
    expect(entry).toBeDefined();
    expect(entry.pendingReasons.length).toBeGreaterThan(0);

    // 1. Simular cambio de versión en el banco y recálculo (TEMPLATE_VERSION_CHANGED)
    const bank = repository.getGlobal('templates') || [];
    const pl6 = bank.find(t => t.templateId === 'PL-06');
    const v1 = pl6.versions[0];
    const v2 = { ...v1, version: 2, status: 'ACTIVE' };
    pl6.versions = [{ ...v1, status: 'RETIRED' }, v2];
    repository.setGlobal('templates', bank);

    // Revalidar asiento en bandeja para que tome la versión 2
    const revalRes = await stagingService.revalidateEntries(ctxMaker, {
      items: [{ id: entry.id, expectedVersion: entry.entityVersion }]
    });
    expect(revalRes.ok).toBe(true);
    expect(revalRes.data.results[0].status).toBe('STILL_PENDING');

    const traceRes1 = await traceService.getTraceability(ctxAuditor, { traceId });
    expect(traceRes1.ok).toBe(true);
    const actions1 = traceRes1.data.events.map(e => e.action);
    expect(actions1).toContain('TEMPLATE_VERSION_CHANGED');

    // 2. Ahora asignar centro de costo (acción permitida para MISSING_COST_CENTER)
    const updatedStaging = await stagingService.queryStaging(ctxMaker, {});
    const entryV2 = updatedStaging.data.items.find(e => e.traceId === traceId);

    const updateRes = await stagingService.updateStagingEntries(ctxMaker, {
      updates: [{ id: entryV2.id, expectedVersion: entryV2.entityVersion, costCenter: 'CC-ADMIN' }]
    });
    expect(updateRes.ok).toBe(true);
    expect(updateRes.data.results[0].status).toBe('ADVANCED');

    const traceRes2 = await traceService.getTraceability(ctxAuditor, { traceId });
    expect(traceRes2.ok).toBe(true);
    const actions2 = traceRes2.data.events.map(e => e.action);
    expect(actions2).toContain('STAGING_UPDATED');
    expect(actions2).toContain('MOVED_TO_PENDING_APPROVAL');
  });

  it('permite a CHECKER acceder solo si el asiento está en PENDING_APPROVAL', async () => {
    // 1. Create entry directly in PENDING_APPROVAL with PL-01
    const ingestRes = await ingestionService.ingestBatch(ctxMaker, {
      templateId: 'PL-01',
      items: [{ fileName: 'f001-102.json', content: sampleJsonDoc('00000102') }]
    });
    expect(ingestRes.ok).toBe(true);

    const traceId = ingestRes.data.items[0].traceId;

    // CHECKER can access PENDING_APPROVAL entry
    const traceRes = await traceService.getTraceability(ctxChecker, { traceId });
    expect(traceRes.ok).toBe(true);
    expect(traceRes.data.entry.state).toBe('PENDING_APPROVAL');
  });

  it('deniega a CHECKER con FORBIDDEN si el asiento no está en PENDING_APPROVAL (ej. PENDING_INPUT)', async () => {
    // 1. Create entry in PENDING_INPUT (PL-06 requires CC)
    const ingestRes = await ingestionService.ingestBatch(ctxMaker, {
      templateId: 'PL-06',
      items: [{ fileName: 'f001-103.json', content: sampleJsonDoc('00000103') }]
    });
    expect(ingestRes.ok).toBe(true);

    const traceId = ingestRes.data.items[0].traceId;

    // CHECKER attempts to access PENDING_INPUT entry -> FORBIDDEN
    const traceRes = await traceService.getTraceability(ctxChecker, { traceId });
    expect(traceRes.ok).toBe(false);
    expect(traceRes.error.code).toBe('FORBIDDEN');

    // Auditor inspects events and verifies ACTION_DENIED was logged
    const auditRes = await traceService.getTraceability(ctxAuditor, { traceId });
    expect(auditRes.ok).toBe(true);
    const actions = auditRes.data.events.map(e => e.action);
    expect(actions).toContain('ACTION_DENIED');
  });

  it('responde NOT_FOUND cuando se consulta un traceId de otra empresa', async () => {
    // Ingest into tenant 01
    const ingestRes = await ingestionService.ingestBatch(ctxMaker, {
      templateId: 'PL-01',
      items: [{ fileName: 'f001-104.json', content: sampleJsonDoc('00000104') }]
    });
    expect(ingestRes.ok).toBe(true);

    const traceId = ingestRes.data.items[0].traceId;

    // Query from tenant 02
    const ctxTenant2 = { ...ctxAuditor, tenantId: '02' };
    const traceRes = await traceService.getTraceability(ctxTenant2, { traceId });
    expect(traceRes.ok).toBe(false);
    expect(traceRes.error.code).toBe('NOT_FOUND');
  });

  it('responde NOT_FOUND si el traceId no existe', async () => {
    const traceRes = await traceService.getTraceability(ctxAuditor, { traceId: 'no-existe-uuid' });
    expect(traceRes.ok).toBe(false);
    expect(traceRes.error.code).toBe('NOT_FOUND');
  });

  it('registra ACTION_DENIED para roles no autorizados (ej. UNKNOWN)', async () => {
    const ctxUnknown = { tenantId: '01', userId: 'hacker', role: 'UNKNOWN' };
    const traceRes = await traceService.getTraceability(ctxUnknown, { traceId: 'some-id' });
    expect(traceRes.ok).toBe(false);
    expect(traceRes.error.code).toBe('FORBIDDEN');
  });
});
