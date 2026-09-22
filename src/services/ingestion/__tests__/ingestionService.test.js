import { describe, it, expect, beforeEach } from 'vitest';
import { createIngestionService } from '../ingestionService.js';
import { createStagingService } from '../stagingService.js';
import { memoryStorage } from '../../storage/memoryStorage.js';
import * as repository from '../../storage/repository.js';
import { ensureSeeded, setFxServiceDown } from '../demoService.js';
import { mockComprobantesDemo } from '../../../data/mockComprobantesDemo.js';

describe('Ingestion Service Integration (T053, contracts/services.md)', () => {
  let memStorage;
  let service;

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

  beforeEach(() => {
    memStorage = memoryStorage();
    repository.init(memStorage);
    ensureSeeded(repository, undefined, { seedIngestion: false });
    service = createIngestionService(repository);
  });

  it('listTemplates returns only company-activated templates and creates initial activations lazily', async () => {
    const res = await service.listTemplates(makerCtx);
    expect(res.ok).toBe(true);
    expect(res.data.companyHasActivations).toBe(true);
    expect(res.data.templates.map(t => t.templateId)).toEqual(
      expect.arrayContaining(['PL-01', 'PL-02', 'PL-03', 'PL-06', 'PL-07'])
    );

    // Empresa sin activaciones
    const emptyEmpresaCtx = { ...makerCtx, tenantId: '02' };
    const empresas = repository.getGlobal('empresas');
    const emp2 = empresas.find(e => e.id === '02');
    if (emp2) emp2.plantillasActivasIds = [];
    repository.setGlobal('empresas', empresas);

    const res2 = await service.listTemplates(emptyEmpresaCtx);
    expect(res2.ok).toBe(true);
    expect(res2.data.companyHasActivations).toBe(false);
    expect(res2.data.templates).toHaveLength(0);
  });

  it('rejects batch larger than 50 with BATCH_TOO_LARGE without writing anything', async () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      fileName: `doc_${i}.json`,
      content: '{}'
    }));

    const res = await service.ingestBatch(makerCtx, { templateId: 'PL-01', items });
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('BATCH_TOO_LARGE');

    const rawPayloads = repository.getCollection('01', 'rawPayloads');
    expect(rawPayloads).toBeNull();
  });

  it('rejects empty batch or missing template with VALIDATION_ERROR', async () => {
    const res1 = await service.ingestBatch(makerCtx, { templateId: '', items: [{ fileName: 'a.json', content: '{}' }] });
    expect(res1.ok).toBe(false);
    expect(res1.error.code).toBe('VALIDATION_ERROR');

    const res2 = await service.ingestBatch(makerCtx, { templateId: 'PL-01', items: [] });
    expect(res2.ok).toBe(false);
    expect(res2.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects inactive template with TEMPLATE_NOT_ACTIVE', async () => {
    const sample = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-01-COMPRA-VALIDA');
    // PL-04 es de VENTA y empresa 01 solo tiene compras activas si no activó ventas, o si usamos una inexistente
    const res = await service.ingestBatch(makerCtx, {
      templateId: 'PL-INEXISTENTE',
      items: [{ fileName: sample.fileName, content: sample.content }]
    });
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('TEMPLATE_NOT_ACTIVE');
  });

  it('rejects role other than MAKER with FORBIDDEN and ACTION_DENIED audit event', async () => {
    const sample = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-01-COMPRA-VALIDA');
    const res = await service.ingestBatch(checkerCtx, {
      templateId: 'PL-01',
      items: [{ fileName: sample.fileName, content: sample.content }]
    });

    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('FORBIDDEN');

    const audit = repository.getCollection('01', 'auditLog');
    expect(audit.some(e => e.action === 'ACTION_DENIED')).toBe(true);
  });

  it('rejects when activePeriod is CERRADO with PERIOD_READ_ONLY', async () => {
    // Cerrar el periodo activo en la empresa
    const empresas = repository.getGlobal('empresas');
    const emp = empresas.find(e => e.id === '01');
    const per = emp.periodos.find(p => p.ejercicio === '2026' && p.mes === 9);
    per.estado = 'CERRADO';
    repository.setGlobal('empresas', empresas);

    const sample = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-01-COMPRA-VALIDA');
    const res = await service.ingestBatch(makerCtx, {
      templateId: 'PL-01',
      items: [{ fileName: sample.fileName, content: sample.content }]
    });

    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('PERIOD_READ_ONLY');
  });

  it('processes demo samples: valid ends in PENDING_APPROVAL with balanced lines, and usageCount increments (CF-03, CF-04)', async () => {
    const sample = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-01-COMPRA-VALIDA');
    const res = await service.ingestBatch(makerCtx, {
      templateId: 'PL-01',
      items: [{ fileName: sample.fileName, content: sample.content }]
    });

    expect(res.ok).toBe(true);
    expect(res.data.summary.acceptedCount).toBe(1);
    expect(res.data.summary.pendingApprovalCount).toBe(1);

    const entries = repository.getCollection('01', 'journalEntries');
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.state).toBe('PENDING_APPROVAL');

    // CF-03: Todo asiento en PENDING_APPROVAL cuadra
    let d = 0;
    let h = 0;
    entry.lines.forEach(l => {
      if (l.side === 'D') d += l.functionalAmountCents;
      if (l.side === 'H') h += l.functionalAmountCents;
    });
    expect(d).toBe(h);

    // usageCount sube
    const bank = repository.getGlobal('templates');
    const pl01 = bank.find(t => t.templateId === 'PL-01');
    expect(pl01.versions[0].usageCount).toBe(1);
  });

  it('handles queryIntakeResults, getBatch, listBatches and getRawPayload', async () => {
    const sample = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-01-COMPRA-VALIDA');
    const batchRes = await service.ingestBatch(makerCtx, {
      templateId: 'PL-01',
      items: [{ fileName: sample.fileName, content: sample.content }]
    });

    const batchId = batchRes.data.id;
    const getB = await service.getBatch(makerCtx, { batchId });
    expect(getB.ok).toBe(true);
    expect(getB.data.id).toBe(batchId);

    const listB = await service.listBatches(makerCtx);
    expect(listB.ok).toBe(true);
    expect(listB.data.length).toBeGreaterThanOrEqual(1);

    const intake = await service.queryIntakeResults(makerCtx, { outcome: 'ACCEPTED' });
    expect(intake.ok).toBe(true);
    expect(intake.data.total).toBe(1);

    const rawId = intake.data.items[0].rawPayloadId;
    const raw = await service.getRawPayload(makerCtx, { rawPayloadId: rawId });
    expect(raw.ok).toBe(true);
    expect(raw.data.content).toBe(sample.content);

    // id de otra empresa -> NOT_FOUND
    const otherCtx = { ...makerCtx, tenantId: '02' };
    const notFound = await service.getRawPayload(otherCtx, { rawPayloadId: rawId });
    expect(notFound.ok).toBe(false);
    expect(notFound.error.code).toBe('NOT_FOUND');
  });

  it('5 loads of same invoice results in 1 entry and 4 duplicates (CF-02)', async () => {
    const sample = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-01-COMPRA-VALIDA');
    
    // Carga 1
    const res1 = await service.ingestBatch(makerCtx, {
      templateId: 'PL-01',
      items: [{ fileName: 'compra_1.json', content: sample.content }]
    });
    expect(res1.ok).toBe(true);
    expect(res1.data.summary.acceptedCount).toBe(1);
    expect(res1.data.summary.duplicateCount).toBe(0);

    // Cargas 2 a 5
    for (let i = 2; i <= 5; i++) {
      const resDup = await service.ingestBatch(makerCtx, {
        templateId: 'PL-01',
        items: [{ fileName: `compra_${i}.json`, content: sample.content }]
      });
      expect(resDup.ok).toBe(true);
      expect(resDup.data.summary.acceptedCount).toBe(0);
      expect(resDup.data.summary.duplicateCount).toBe(1);
      expect(resDup.data.items[0].outcome).toBe('DUPLICATE');
    }

    // Comprobar colecciones
    const entries = repository.getCollection('01', 'journalEntries');
    expect(entries).toHaveLength(1);

    const docs = repository.getCollection('01', 'documents');
    expect(docs).toHaveLength(1);
    const origDocId = docs[0].id;

    const rawPayloads = repository.getCollection('01', 'rawPayloads');
    expect(rawPayloads).toHaveLength(5);
    const duplicates = rawPayloads.filter(p => p.outcome === 'DUPLICATE');
    expect(duplicates).toHaveLength(4);
    duplicates.forEach(d => {
      expect(d.duplicateOfDocumentId).toBe(origDocId);
    });

    const dedupIndex = repository.getCollection('01', 'dedupIndex');
    expect(Object.keys(dedupIndex).length).toBe(1);
    expect(Object.values(dedupIndex)[0]).toBe(origDocId);

    const audit = repository.getCollection('01', 'auditLog');
    const dupEvents = audit.filter(e => e.action === 'DUPLICATE_DETECTED');
    expect(dupEvents).toHaveLength(4);
  });

  it('detects duplicate with diff and filters in queryIntakeResults', async () => {
    const sample = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-01-COMPRA-VALIDA');
    await service.ingestBatch(makerCtx, {
      templateId: 'PL-01',
      items: [{ fileName: 'compra_orig.json', content: sample.content }]
    });

    // Parse sample and change total
    const parsed = JSON.parse(sample.content);
    parsed.totales.total = '250.00';
    parsed.totales.baseGravada = '211.86';
    parsed.totales.igv = '38.14';
    const modifiedContent = JSON.stringify(parsed);

    const resDiff = await service.ingestBatch(makerCtx, {
      templateId: 'PL-01',
      items: [{ fileName: 'compra_diff.json', content: modifiedContent }]
    });

    expect(resDiff.ok).toBe(true);
    expect(resDiff.data.summary.duplicateCount).toBe(1);
    expect(resDiff.data.items[0].outcome).toBe('DUPLICATE_WITH_DIFF');
    expect(resDiff.data.items[0].outcomeReason).toMatch(/Total.*difiere del original/);

    // Filtrar por DUPLICATE_WITH_DIFF
    const intakeDiff = await service.queryIntakeResults(makerCtx, { outcome: 'DUPLICATE_WITH_DIFF' });
    expect(intakeDiff.ok).toBe(true);
    expect(intakeDiff.data.total).toBe(1);

    // Filtrar por DUPLICATES (ambos)
    const intakeAllDups = await service.queryIntakeResults(makerCtx, { outcome: 'DUPLICATES' });
    expect(intakeAllDups.ok).toBe(true);
    expect(intakeAllDups.data.total).toBe(1);
  });

  describe('USD and Exchange Rate Integration (T087, RF-07, R-02, R-12)', () => {
    it('ingests USD document with exact rate when service is up (R-12.1)', async () => {
      const sampleUSD = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-12-COMPRA-USD-PLAN3');
      const res = await service.ingestBatch(makerCtx, {
        templateId: 'PL-07',
        items: [{ fileName: sampleUSD.fileName, content: sampleUSD.content }]
      });

      expect(res.ok).toBe(true);
      expect(res.data.summary.acceptedCount).toBe(1);
      expect(res.data.summary.pendingApprovalCount).toBe(1);

      const entries = repository.getCollection('01', 'journalEntries');
      const entry = entries[0];
      expect(entry.currency).toBe('USD');
      expect(entry.state).toBe('PENDING_APPROVAL');
      expect(entry.fx).toEqual({
        rateMilli: 3750,
        rateDate: '2026-09-15',
        provisional: false
      });
      expect(entry.provisionalFxRate).toBe(false);

      // Total en PEN = convert(100000, 3750) = 375000
      const counterpart = entry.lines.find(l => l.role === 'COUNTERPART');
      expect(counterpart.functionalAmountCents).toBe(375000);
      expect(counterpart.originalAmountCents).toBe(100000);
    });

    it('setFxServiceDown changes result to previous rate and provisional (plan §3)', async () => {
      setFxServiceDown(makerCtx, { down: true });

      const sampleUSD = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-12-COMPRA-USD-PLAN3');
      const res = await service.ingestBatch(makerCtx, {
        templateId: 'PL-07',
        items: [{ fileName: sampleUSD.fileName, content: sampleUSD.content }]
      });

      expect(res.ok).toBe(true);
      const entries = repository.getCollection('01', 'journalEntries');
      const entry = entries[0];

      expect(entry.currency).toBe('USD');
      expect(entry.fx).toEqual({
        rateMilli: 3751,
        rateDate: '2026-09-14',
        provisional: true
      });
      expect(entry.provisionalFxRate).toBe(true);

      // Verificación exacta de plan §3
      const baseLine = entry.lines.find(l => l.role === 'BASE');
      const taxLine = entry.lines.find(l => l.role === 'TAX');
      const counterpartLine = entry.lines.find(l => l.role === 'COUNTERPART');

      expect(baseLine.functionalAmountCents).toBe(317882);
      expect(baseLine.originalAmountCents).toBe(84746);
      expect(taxLine.functionalAmountCents).toBe(57218);
      expect(taxLine.originalAmountCents).toBe(15254);
      expect(counterpartLine.functionalAmountCents).toBe(375100);
      expect(counterpartLine.originalAmountCents).toBe(100000);
    });

    it('ingests USD document with date before first rate into staging with NO_FX_RATE', async () => {
      // Abrir periodo 2026-05 en la empresa para aislar NO_FX_RATE
      const empresas = repository.getGlobal('empresas');
      const emp = empresas.find(e => e.id === '01');
      if (!emp.periodos.some(p => p.mes === 5)) {
        emp.periodos.push({ ejercicio: '2026', mes: 5, nombrePeriodo: 'MAYO_2026', estado: 'ABIERTO' });
        repository.setGlobal('empresas', empresas);
      }

      const sampleNoFx = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-13-COMPRA-USD-SIN-TASA');
      const res = await service.ingestBatch(makerCtx, {
        templateId: 'PL-07',
        items: [{ fileName: sampleNoFx.fileName, content: sampleNoFx.content }]
      });

      expect(res.ok).toBe(true);
      expect(res.data.summary.stagedCount).toBe(1);

      const entries = repository.getCollection('01', 'journalEntries');
      const entry = entries[0];
      expect(entry.state).toBe('PENDING_INPUT');
      expect(entry.pendingReasons).toEqual(['NO_FX_RATE']);
      expect(entry.lines).toHaveLength(0);
    });

    it('revalidateEntries advances entry with NO_FX_RATE when rate becomes available', async () => {
      // Abrir periodo 2026-05 en la empresa
      const empresas = repository.getGlobal('empresas');
      const emp = empresas.find(e => e.id === '01');
      if (!emp.periodos.some(p => p.mes === 5)) {
        emp.periodos.push({ ejercicio: '2026', mes: 5, nombrePeriodo: 'MAYO_2026', estado: 'ABIERTO' });
        repository.setGlobal('empresas', empresas);
      }

      const sampleNoFx = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-13-COMPRA-USD-SIN-TASA');
      await service.ingestBatch(makerCtx, {
        templateId: 'PL-07',
        items: [{ fileName: sampleNoFx.fileName, content: sampleNoFx.content }]
      });

      const stagingService = createStagingService(repository);
      const queryBefore = await stagingService.queryStaging(makerCtx);
      expect(queryBefore.data.total).toBe(1);
      const stagedEntry = queryBefore.data.items[0];
      expect(stagedEntry.pendingReasons).toContain('NO_FX_RATE');

      // Ahora sembrar tasa para esa fecha en fxRates
      const fxRates = repository.getGlobal('fxRates') || [];
      fxRates.push({ date: '2026-05-15', rateMilli: 3720 });
      repository.setGlobal('fxRates', fxRates);

      // Revalidar
      const revalRes = await stagingService.revalidateEntries(makerCtx, {
        items: [{ id: stagedEntry.id, expectedVersion: stagedEntry.entityVersion }]
      });

      expect(revalRes.ok).toBe(true);
      expect(revalRes.data.results[0].status).toBe('ADVANCED');
      expect(revalRes.data.results[0].entryState).toBe('PENDING_APPROVAL');

      const queryAfter = await stagingService.queryStaging(makerCtx);
      expect(queryAfter.data.total).toBe(0);
    });

    it('T123 / RNF-02: procesa un lote de 20 comprobantes en menos de 5000 ms con latencia por defecto', async () => {
      const sample = mockComprobantesDemo.find(s => s.sampleId === 'SAMPLE-01-COMPRA-VALIDA');
      const items = Array.from({ length: 20 }, (_, i) => ({
        fileName: `factura_${i + 1}.json`,
        content: sample.content
      }));

      const start = Date.now();
      const res = await service.ingestBatch(makerCtx, {
        templateId: 'PL-01',
        items
      });
      const duration = Date.now() - start;

      expect(res.ok).toBe(true);
      expect(res.data.summary.totalReceived).toBe(20);
      expect(duration).toBeLessThan(5000);
    });
  });
});
