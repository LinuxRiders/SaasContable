import { describe, it, expect, beforeEach } from 'vitest';
import { memoryStorage } from '../../storage/memoryStorage.js';
import * as repository from '../../storage/repository.js';
import { ensureSeeded } from '../demoService.js';
import { createIngestionService } from '../ingestionService.js';
import { createApprovalQueryService } from '../approvalQueryService.js';

describe('ApprovalQueryService - queryPendingApproval (T099, RF-13, CA-13.2, CA-13.3)', () => {
  let memStorage;
  let ingestionService;
  let approvalService;

  const ctxMaker = {
    tenantId: '01',
    userId: 'contador_maria',
    role: 'MAKER',
    activePeriod: { ejercicio: '2026', nombrePeriodo: 'SETIEMBRE_2026' }
  };

  const ctxChecker = {
    tenantId: '01',
    userId: 'revisor_luis',
    role: 'CHECKER',
    activePeriod: { ejercicio: '2026', nombrePeriodo: 'SETIEMBRE_2026' }
  };

  const ctxAuditor = {
    tenantId: '01',
    userId: 'auditora_ana',
    role: 'AUDITOR',
    activePeriod: { ejercicio: '2026', nombrePeriodo: 'SETIEMBRE_2026' }
  };

  const ctxAdmin = {
    tenantId: '01',
    userId: 'admin_pedro',
    role: 'ADMIN',
    activePeriod: { ejercicio: '2026', nombrePeriodo: 'SETIEMBRE_2026' }
  };

  const sampleJsonDoc = (num, currency = 'PEN', date = '2026-09-15') => JSON.stringify({
    tipoDocumento: '01',
    serieNumero: `F001-${num}`,
    fechaEmision: date,
    moneda: currency,
    emisor: { ruc: '20555555551', razonSocial: 'TRANSPORTES ANDINOS DEMO SAC' },
    receptor: { ruc: '20450656934', razonSocial: 'PACHATUSANTREK SAC' },
    lineas: [
      { descripcion: 'Servicio flete', valor: '100.00', tributo: 'IGV' }
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
    approvalService = createApprovalQueryService(repository);
  });

  it('devuelve solo asientos PENDING_APPROVAL de la empresa con requiresHumanReview = provisionalFxRate', async () => {
    // 1. Ingest normal PEN document (not provisional)
    const resPen = await ingestionService.ingestBatch(ctxMaker, {
      templateId: 'PL-01',
      items: [{ fileName: 'f001-pen.json', content: sampleJsonDoc('00000001', 'PEN') }]
    });
    expect(resPen.ok).toBe(true);

    // 2. Ingest USD document on weekend (provisional rate)
    // 2026-09-13 is Sunday -> fallback to Friday 2026-09-11 (provisional)
    const resUsd = await ingestionService.ingestBatch(ctxMaker, {
      templateId: 'PL-01',
      items: [{ fileName: 'f001-usd.json', content: sampleJsonDoc('00000002', 'USD', '2026-09-13') }]
    });
    expect(resUsd.ok).toBe(true);

    // 3. Query as Checker
    const queryRes = await approvalService.queryPendingApproval(ctxChecker);
    expect(queryRes.ok).toBe(true);
    expect(queryRes.data.total).toBe(2);

    const penItem = queryRes.data.items.find(i => i.currency === 'PEN');
    expect(penItem).toBeDefined();
    expect(penItem.provisionalFxRate).toBe(false);
    expect(penItem.requiresHumanReview).toBe(false);

    const usdItem = queryRes.data.items.find(i => i.currency === 'USD');
    expect(usdItem).toBeDefined();
    expect(usdItem.provisionalFxRate).toBe(true);
    expect(usdItem.requiresHumanReview).toBe(true);
    expect(usdItem.counterpartyName).toBe('TRANSPORTES ANDINOS DEMO SAC');
    expect(usdItem.documentNumber).toBe('F001-00000002');
  });

  it('filtra correctamente con provisionalOnly: true', async () => {
    await ingestionService.ingestBatch(ctxMaker, {
      templateId: 'PL-01',
      items: [
        { fileName: 'f001-pen.json', content: sampleJsonDoc('00000003', 'PEN') },
        { fileName: 'f001-usd.json', content: sampleJsonDoc('00000004', 'USD', '2026-09-13') }
      ]
    });

    const resAll = await approvalService.queryPendingApproval(ctxChecker, { provisionalOnly: false });
    expect(resAll.data.total).toBe(2);

    const resProv = await approvalService.queryPendingApproval(ctxChecker, { provisionalOnly: true });
    expect(resProv.data.total).toBe(1);
    expect(resProv.data.items[0].currency).toBe('USD');
    expect(resProv.data.items[0].requiresHumanReview).toBe(true);
  });

  it('permite consultar a MAKER, CHECKER, AUDITOR y ADMIN, y rechaza UNKNOWN con FORBIDDEN', async () => {
    const resMaker = await approvalService.queryPendingApproval(ctxMaker);
    expect(resMaker.ok).toBe(true);

    const resChecker = await approvalService.queryPendingApproval(ctxChecker);
    expect(resChecker.ok).toBe(true);

    const resAuditor = await approvalService.queryPendingApproval(ctxAuditor);
    expect(resAuditor.ok).toBe(true);

    const resAdmin = await approvalService.queryPendingApproval(ctxAdmin);
    expect(resAdmin.ok).toBe(true);

    const ctxUnknown = { tenantId: '01', userId: 'anon', role: 'UNKNOWN' };
    const resUnknown = await approvalService.queryPendingApproval(ctxUnknown);
    expect(resUnknown.ok).toBe(false);
    expect(resUnknown.error.code).toBe('FORBIDDEN');
  });

  it('aislamiento por empresa: solo devuelve asientos de la empresa activa', async () => {
    await ingestionService.ingestBatch(ctxMaker, {
      templateId: 'PL-01',
      items: [{ fileName: 'f001-emp1.json', content: sampleJsonDoc('00000005', 'PEN') }]
    });

    const resEmp1 = await approvalService.queryPendingApproval(ctxMaker);
    expect(resEmp1.data.total).toBe(1);

    const ctxEmp2 = { ...ctxMaker, tenantId: '02' };
    const resEmp2 = await approvalService.queryPendingApproval(ctxEmp2);
    expect(resEmp2.data.total).toBe(0);
  });

  it('no expone ni ejecuta ninguna escritura en los vouchers del sistema contable (CA-13.3)', async () => {
    // Ingest into pending approval
    await ingestionService.ingestBatch(ctxMaker, {
      templateId: 'PL-01',
      items: [{ fileName: 'f001-test.json', content: sampleJsonDoc('00000006', 'PEN') }]
    });

    // Query pending
    await approvalService.queryPendingApproval(ctxChecker);

    // Verify vouchers collection in storage is null or unchanged
    const vouchers = repository.getCollection('01', 'vouchers');
    expect(vouchers).toBeNull();
  });
});

