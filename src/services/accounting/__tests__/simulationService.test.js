import { describe, it, expect, beforeEach } from 'vitest';
import * as memoryRepo from '../../storage/repository.js';
import { memoryStorage } from '../../storage/memoryStorage.js';
import { ensureSeeded } from '../../ingestion/demoService.js';
import { seedAccountingConfig } from '../seedAccounting.js';
import { listSampleDocuments, simulateDocument, accountingEngine } from '../simulationService.js';
import { SAMPLE_DOCUMENTS } from '../../../data/jurisdictions/index.js';

describe('simulationService & accountingEngine (contracts/services.md §5-§6, T087, T088)', () => {
  beforeEach(() => {
    memoryRepo.init(memoryStorage());
    ensureSeeded(memoryRepo);
    memoryRepo.setGlobal('demoSettings', { latencyMs: 0, failRate: 0, demoMode: true });
    seedAccountingConfig(memoryRepo);
  });

  const admin01 = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };
  const maker01 = { tenantId: '01', userId: 'contador_maria', role: 'MAKER' };
  const checker01 = { tenantId: '01', userId: 'revisor_luis', role: 'CHECKER' };
  const auditor01 = { tenantId: '01', userId: 'auditora_ana', role: 'AUDITOR' };

  it('rechaza simulación para roles sin permiso SIMULATE (MAKER, CHECKER, AUDITOR → FORBIDDEN)', async () => {
    const resMaker = await simulateDocument(maker01, { sampleId: 'PE-01-MERCHANDISE-PURCHASE' }, memoryRepo);
    expect(resMaker.ok).toBe(false);
    expect(resMaker.error.code).toBe('FORBIDDEN');

    const resChecker = await simulateDocument(checker01, { sampleId: 'PE-01-MERCHANDISE-PURCHASE' }, memoryRepo);
    expect(resChecker.ok).toBe(false);
    expect(resChecker.error.code).toBe('FORBIDDEN');

    const resAuditor = await simulateDocument(auditor01, { sampleId: 'PE-01-MERCHANDISE-PURCHASE' }, memoryRepo);
    expect(resAuditor.ok).toBe(false);
    expect(resAuditor.error.code).toBe('FORBIDDEN');

    const resListMaker = await listSampleDocuments(maker01, memoryRepo);
    expect(resListMaker.ok).toBe(false);
    expect(resListMaker.error.code).toBe('FORBIDDEN');
  });

  it('listSampleDocuments lista todos los documentos de ejemplo del paquete normativo', async () => {
    const res = await listSampleDocuments(admin01, memoryRepo);
    expect(res.ok).toBe(true);
    expect(res.data.length).toBe(SAMPLE_DOCUMENTS.length);

    const first = res.data[0];
    expect(first.id).toBeDefined();
    expect(first.title).toBeDefined();
    expect(first.documentTypeCode).toBeDefined();
    expect(first.format).toBeDefined();
  });

  it('simulateDocument simula PE-01 exitosamente y coincide con su expected', async () => {
    const res = await simulateDocument(admin01, { sampleId: 'PE-01-MERCHANDISE-PURCHASE' }, memoryRepo);
    expect(res.ok).toBe(true);

    const sim = res.data;
    expect(sim.ok).toBe(true);
    expect(sim.entry).toBeDefined();
    expect(sim.entry.templateId).toBe('PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE');
    expect(sim.entry.operationTypeCode).toBe('MERCHANDISE_PURCHASE');
    expect(sim.entry.lines).toHaveLength(5);

    // Verificar traza completa de 5 pasos
    expect(sim.trace.steps).toHaveLength(5);
    expect(sim.trace.steps.map(s => s.step)).toEqual([
      'SCHEMA', 'PERSPECTIVE', 'CLASSIFICATION', 'SELECTION', 'EVALUATION'
    ]);
  });

  it('FR-024: la simulación NO persiste ningún dato ni altera templateUsage', async () => {
    const usageBefore = memoryRepo.getCollection('01', 'templateUsage') || {};
    const globalUsageBefore = memoryRepo.getGlobal('templateUsageIndex') || {};

    const res = await simulateDocument(admin01, { sampleId: 'PE-01-MERCHANDISE-PURCHASE' }, memoryRepo);
    expect(res.ok).toBe(true);

    const usageAfter = memoryRepo.getCollection('01', 'templateUsage') || {};
    const globalUsageAfter = memoryRepo.getGlobal('templateUsageIndex') || {};

    expect(usageAfter).toEqual(usageBefore);
    expect(globalUsageAfter).toEqual(globalUsageBefore);
  });

  it('simulateDocument maneja casos negativos: nota de crédito sin referencia falla en SCHEMA', async () => {
    const res = await simulateDocument(admin01, { sampleId: 'PE-14-CREDIT-NOTE-NO-REFERENCE' }, memoryRepo);
    expect(res.ok).toBe(true);

    const sim = res.data;
    expect(sim.ok).toBe(false);
    expect(sim.stoppedAt).toBe('SCHEMA');
    expect(sim.pending.some(p => p.reasonCode === 'SCHEMA_INVALID')).toBe(true);
  });

  it('simulateDocument maneja tipo no contable: guía de remisión falla en SCHEMA con DOCUMENT_TYPE_NOT_ACCOUNTABLE', async () => {
    const res = await simulateDocument(admin01, { sampleId: 'PE-16-DISPATCH-GUIDE' }, memoryRepo);
    expect(res.ok).toBe(true);

    const sim = res.data;
    expect(sim.ok).toBe(false);
    expect(sim.stoppedAt).toBe('SCHEMA');
    expect(sim.pending.some(p => p.reasonCode === 'DOCUMENT_TYPE_NOT_ACCOUNTABLE')).toBe(true);
  });

  it('simulateDocument en USD con tipo de cambio convierte montos a moneda funcional', async () => {
    const res = await simulateDocument(admin01, { sampleId: 'PE-15-INVOICE-USD', fxRateMilli: 3745 }, memoryRepo);
    expect(res.ok).toBe(true);

    const sim = res.data;
    expect(sim.ok).toBe(true);
    expect(sim.entry.lines).toHaveLength(5);

    // Debe mercadería = S/ 3,745.00 (374500 céntimos)
    const linePurchase = sim.entry.lines.find(l => l.accountCode === '6011101');
    expect(linePurchase.functionalAmountMinor).toBe(374500);

    // IGV = S/ 674.10 (67410 céntimos)
    const lineVat = sim.entry.lines.find(l => l.accountCode === '4011101');
    expect(lineVat.functionalAmountMinor).toBe(67410);

    // Total a pagar proveedor = S/ 4,419.10 (441910 céntimos)
    const linePayable = sim.entry.lines.find(l => l.accountCode === '4212101');
    expect(linePayable.functionalAmountMinor).toBe(441910);
  });

  it('accountingEngine: getInterpretationContext, getTemplateVersion y recordTemplateUsage', async () => {
    // 1. getInterpretationContext
    const ctxRes = await accountingEngine.getInterpretationContext(admin01, memoryRepo);
    expect(ctxRes.ok).toBe(true);
    expect(ctxRes.data.pack).toBeDefined();
    expect(ctxRes.data.tenantFiscalId).toBe('20450656934');
    expect(ctxRes.data.functionalCurrency).toBe('PEN');
    expect(typeof ctxRes.data.candidatesFor).toBe('function');

    // 2. getTemplateVersion
    const tmplRes = await accountingEngine.getTemplateVersion(admin01, {
      templateId: 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE',
      version: 1
    }, memoryRepo);
    expect(tmplRes.ok).toBe(true);
    expect(tmplRes.data.lines).toBeDefined();

    // 3. recordTemplateUsage
    const recRes = await accountingEngine.recordTemplateUsage(admin01, {
      templateId: 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE',
      version: 1
    }, memoryRepo);
    expect(recRes.ok).toBe(true);
    expect(recRes.data.tenantUsage).toBe(1);
    expect(recRes.data.totalUsage).toBe(1);

    // Segundo uso
    const recRes2 = await accountingEngine.recordTemplateUsage(admin01, {
      templateId: 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE',
      version: 1
    }, memoryRepo);
    expect(recRes2.data.tenantUsage).toBe(2);
  });
});

