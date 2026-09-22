import { describe, it, expect } from 'vitest';
import { processItem } from '../pipeline.js';
import { buildTemplateBankSeed } from '../../../data/mockPlantillasReglas.js';
import { mockPlantillas } from '../../../data/mockPlantillas.js';
import { mockPlanContable } from '../../../data/mockPlanContable.js';
import { buildAccountIndex } from '../accounts.js';

describe('Ingestion Pipeline (T052, RF-01..RF-09, RF-20)', () => {
  const seedTemplates = buildTemplateBankSeed(mockPlantillas);
  const pcgeIndex = buildAccountIndex(mockPlanContable);

  const empresa = {
    id: '01',
    ruc: '20100047218',
    periodos: [
      { ejercicio: '2026', mes: 9, estado: 'ABIERTO' },
      { ejercicio: '2026', mes: 8, estado: 'CERRADO' }
    ]
  };

  const ctx = {
    tenantId: '01',
    userId: 'contador_maria',
    role: 'MAKER'
  };

  let idCounter = 1;
  const deps = {
    clock: () => '2026-09-15T10:00:00.000Z',
    idGenerator: () => `id-${idCounter++}`,
    sha256: str => `hash-${str.length}`
  };

  const pl01 = seedTemplates.find(t => t.templateId === 'PL-01');
  const pl04 = seedTemplates.find(t => t.templateId === 'PL-04');
  const pl07 = seedTemplates.find(t => t.templateId === 'PL-07');

  const validJsonPayload = JSON.stringify({
    tipoDocumento: '01',
    serieNumero: 'F001-00000123',
    fechaEmision: '2026-09-15',
    moneda: 'PEN',
    emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR SAC' },
    receptor: { ruc: '20100047218', razonSocial: 'PACHATUSANTREK SAC' },
    lineas: [{ descripcion: 'Mercadería A', valor: '100.00', tributo: 'IGV' }],
    totales: { baseGravada: '100.00', igv: '18.00', total: '118.00' }
  });

  it('processes a valid document into PENDING_APPROVAL with full event sequence', async () => {
    idCounter = 1;
    const res = await processItem({
      item: { fileName: 'factura.json', content: validJsonPayload, sizeBytes: validJsonPayload.length },
      ctx,
      empresa,
      catalog: pcgeIndex,
      template: pl01,
      version: pl01.versions[0],
      deps
    });

    expect(res.rawPayload.outcome).toBe('ACCEPTED');
    expect(res.entry.state).toBe('PENDING_APPROVAL');
    expect(res.entry.pendingReasons).toHaveLength(0);
    expect(res.summaryDelta).toEqual({ received: 1, accepted: 1, pendingApproval: 1 });

    const actions = res.events.map(e => e.action);
    expect(actions).toEqual([
      'RAW_RECEIVED',
      'DOCUMENT_CANONICALIZED',
      'DRAFT_CREATED',
      'MOVED_TO_PENDING_APPROVAL'
    ]);
  });

  it('rejects file larger than 1 MB (RAW_RECEIVED, PARSE_FAILED)', async () => {
    const res = await processItem({
      item: { fileName: 'pesado.json', content: '{}', sizeBytes: 1024 * 1024 + 1 },
      ctx,
      empresa,
      catalog: pcgeIndex,
      template: pl01,
      version: pl01.versions[0],
      deps
    });

    expect(res.rawPayload.outcome).toBe('FAILED');
    expect(res.rawPayload.outcomeReason).toBe('archivo excede 1 MB');
    expect(res.rawPayload.content).toBeNull(); // no se guarda contenido
    expect(res.events.map(e => e.action)).toEqual(['RAW_RECEIVED', 'PARSE_FAILED']);
  });

  it('fails on damaged / broken file', async () => {
    const res = await processItem({
      item: { fileName: 'roto.json', content: '{ json roto', sizeBytes: 11 },
      ctx,
      empresa,
      catalog: pcgeIndex,
      template: pl01,
      version: pl01.versions[0],
      deps
    });

    expect(res.rawPayload.outcome).toBe('FAILED');
    expect(res.events.map(e => e.action)).toEqual(['RAW_RECEIVED', 'PARSE_FAILED']);
  });

  it('fails on missing required canonical field', async () => {
    const missingFieldJson = JSON.stringify({
      tipoDocumento: '01',
      // falta serieNumero
      fechaEmision: '2026-09-15',
      moneda: 'PEN',
      emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR SAC' },
      receptor: { ruc: '20100047218', razonSocial: 'PACHATUSANTREK SAC' },
      lineas: [{ descripcion: 'Item', valor: '100.00', tributo: 'IGV' }],
      totales: { baseGravada: '100.00', igv: '18.00', total: '118.00' }
    });

    const res = await processItem({
      item: { fileName: 'incompleto.json', content: missingFieldJson, sizeBytes: missingFieldJson.length },
      ctx,
      empresa,
      catalog: pcgeIndex,
      template: pl01,
      version: pl01.versions[0],
      deps
    });

    expect(res.rawPayload.outcome).toBe('FAILED');
    expect(res.events.map(e => e.action)).toEqual(['RAW_RECEIVED', 'PARSE_FAILED']);
  });

  it('rejects document belonging to another company (REJECTED_NOT_TENANT)', async () => {
    const otherCompanyJson = JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00000123',
      fechaEmision: '2026-09-15',
      moneda: 'PEN',
      emisor: { ruc: '20555555551', razonSocial: 'OTRO PROVEEDOR' },
      receptor: { ruc: '20999999999', razonSocial: 'OTRA EMPRESA' },
      lineas: [{ descripcion: 'Item', valor: '100.00', tributo: 'IGV' }],
      totales: { baseGravada: '100.00', igv: '18.00', total: '118.00' }
    });

    const res = await processItem({
      item: { fileName: 'otra_empresa.json', content: otherCompanyJson, sizeBytes: otherCompanyJson.length },
      ctx,
      empresa,
      catalog: pcgeIndex,
      template: pl01,
      version: pl01.versions[0],
      deps
    });

    expect(res.rawPayload.outcome).toBe('REJECTED');
    expect(res.events.map(e => e.action)).toEqual(['RAW_RECEIVED', 'DOCUMENT_CANONICALIZED', 'REJECTED_NOT_TENANT']);
  });

  it('sends to PENDING_INPUT if accounting period is closed', async () => {
    const closedPeriodJson = JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00000123',
      fechaEmision: '2026-08-15', // Agosto 2026 está CERRADO
      moneda: 'PEN',
      emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR SAC' },
      receptor: { ruc: '20100047218', razonSocial: 'PACHATUSANTREK SAC' },
      lineas: [{ descripcion: 'Item', valor: '100.00', tributo: 'IGV' }],
      totales: { baseGravada: '100.00', igv: '18.00', total: '118.00' }
    });

    const res = await processItem({
      item: { fileName: 'cerrado.json', content: closedPeriodJson, sizeBytes: closedPeriodJson.length },
      ctx,
      empresa,
      catalog: pcgeIndex,
      template: pl01,
      version: pl01.versions[0],
      deps
    });

    expect(res.entry.state).toBe('PENDING_INPUT');
    expect(res.entry.pendingReasons).toContain('PERIOD_CLOSED');
    expect(res.events.map(e => e.action)).toEqual([
      'RAW_RECEIVED',
      'DOCUMENT_CANONICALIZED',
      'DRAFT_CREATED',
      'SENT_TO_STAGING'
    ]);
  });

  it('sends to PENDING_INPUT if amounts are inconsistent', async () => {
    const inconsistentJson = JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00000123',
      fechaEmision: '2026-09-15',
      moneda: 'PEN',
      emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR SAC' },
      receptor: { ruc: '20100047218', razonSocial: 'PACHATUSANTREK SAC' },
      lineas: [{ descripcion: 'Item', valor: '100.00', tributo: 'IGV' }],
      totales: { baseGravada: '100.00', igv: '18.00', total: '150.00' } // total incongruente
    });

    const res = await processItem({
      item: { fileName: 'inconsistente.json', content: inconsistentJson, sizeBytes: inconsistentJson.length },
      ctx,
      empresa,
      catalog: pcgeIndex,
      template: pl01,
      version: pl01.versions[0],
      deps
    });

    expect(res.entry.state).toBe('PENDING_INPUT');
    expect(res.entry.pendingReasons).toContain('INCONSISTENT_AMOUNTS');
  });

  it('sends to PENDING_INPUT if template does not match operation (TEMPLATE_MISMATCH)', async () => {
    // Usar compra con plantilla PL-04 de venta
    const res = await processItem({
      item: { fileName: 'compra_con_venta.json', content: validJsonPayload, sizeBytes: validJsonPayload.length },
      ctx,
      empresa,
      catalog: pcgeIndex,
      template: pl04,
      version: pl04.versions[0],
      deps
    });

    expect(res.entry.state).toBe('PENDING_INPUT');
    expect(res.entry.pendingReasons).toContain('TEMPLATE_MISMATCH');
  });

  it('sends to PENDING_INPUT if cost center is missing', async () => {
    const pl06 = seedTemplates.find(t => t.templateId === 'PL-06');
    // PL-06 exige CC en cuenta 6591101 y no tiene default CC en la plantilla
    const res = await processItem({
      item: { fileName: 'sin_cc.json', content: validJsonPayload, sizeBytes: validJsonPayload.length },
      ctx,
      empresa,
      catalog: pcgeIndex,
      template: pl06,
      version: pl06.versions[0],
      deps
    });

    expect(res.entry.state).toBe('PENDING_INPUT');
    expect(res.entry.pendingReasons).toContain('MISSING_COST_CENTER');
  });

  it('with PL-07, a document with FLETE and SEGURO lines evaluates rules and generates appliedRules', async () => {
    const pl07Payload = JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00000999',
      fechaEmision: '2026-09-15',
      moneda: 'PEN',
      emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR LOGISTICO' },
      receptor: { ruc: '20100047218', razonSocial: 'PACHATUSANTREK SAC' },
      lineas: [
        { descripcion: 'FLETE CUSCO', valor: '60.00', tributo: 'IGV' },
        { descripcion: 'SEGURO CARGA', valor: '40.00', tributo: 'IGV' }
      ],
      totales: { baseGravada: '100.00', igv: '18.00', total: '118.00' }
    });

    const res = await processItem({
      item: { fileName: 'pl07.json', content: pl07Payload, sizeBytes: pl07Payload.length },
      ctx,
      empresa,
      catalog: pcgeIndex,
      template: pl07,
      version: pl07.versions[0],
      deps
    });

    expect(res.entry.state).toBe('PENDING_APPROVAL');
    expect(res.entry.appliedRules).toContain('R-FLETE');
    expect(res.entry.appliedRules).toContain('R-SEGUROS');

    // Comprobar que FLETE fue a 6311101 CC-LOGISTICA y SEGURO se dividió en 6511101 CC-ADMIN / CC-LOGISTICA
    const baseLines = res.entry.lines.filter(l => l.role === 'BASE');
    expect(baseLines.some(l => l.accountCode === '6311101' && l.costCenter === 'CC-LOGISTICA')).toBe(true);
    expect(baseLines.some(l => l.accountCode === '6511101' && l.costCenter === 'CC-ADMIN')).toBe(true);
    expect(baseLines.some(l => l.accountCode === '6511101' && l.costCenter === 'CC-LOGISTICA')).toBe(true);
  });

  it('detects duplicate against dedupIndex and links to original (DUPLICATE, DUPLICATE_DETECTED)', async () => {
    // Clave: 01|20555555551|01|F001-00000123|2026-09-15
    const existingDoc = {
      id: 'doc-original-1',
      seriesAndNumber: 'F001-00000123',
      totals: { totalAmount: 11800 },
      currency: 'PEN'
    };
    // Con deps.sha256 = str => `hash-${str.length}`, la clave tiene longitud 48
    const expectedHash = `hash-${'01|20555555551|01|F001-00000123|2026-09-15'.length}`;
    const dedupIndex = { [expectedHash]: 'doc-original-1' };

    const res = await processItem({
      item: { fileName: 'duplicado.json', content: validJsonPayload, sizeBytes: validJsonPayload.length },
      ctx,
      empresa,
      catalog: pcgeIndex,
      template: pl01,
      version: pl01.versions[0],
      dedupIndex,
      existingDocuments: [existingDoc],
      deps
    });

    expect(res.rawPayload.outcome).toBe('DUPLICATE');
    expect(res.rawPayload.duplicateOfDocumentId).toBe('doc-original-1');
    expect(res.document).toBeUndefined();
    expect(res.entry).toBeUndefined();
    expect(res.summaryDelta).toEqual({ received: 1, duplicates: 1 });
    expect(res.events.map(e => e.action)).toEqual([
      'RAW_RECEIVED',
      'DOCUMENT_CANONICALIZED',
      'DUPLICATE_DETECTED'
    ]);
  });

  it('detects duplicate with diff if total differs (DUPLICATE_WITH_DIFF)', async () => {
    const existingDoc = {
      id: 'doc-original-1',
      seriesAndNumber: 'F001-00000123',
      totals: { totalAmount: 11800 }, // S/ 118.00
      currency: 'PEN'
    };
    const expectedHash = `hash-${'01|20555555551|01|F001-00000123|2026-09-15'.length}`;
    const dedupIndex = { [expectedHash]: 'doc-original-1' };

    const diffJsonPayload = JSON.stringify({
      tipoDocumento: '01',
      serieNumero: 'F001-00000123',
      fechaEmision: '2026-09-15',
      moneda: 'PEN',
      emisor: { ruc: '20555555551', razonSocial: 'PROVEEDOR SAC' },
      receptor: { ruc: '20100047218', razonSocial: 'PACHATUSANTREK SAC' },
      lineas: [{ descripcion: 'Item', valor: '200.00', tributo: 'IGV' }],
      totales: { baseGravada: '200.00', igv: '36.00', total: '236.00' } // total 236.00 != 118.00
    });

    const res = await processItem({
      item: { fileName: 'duplicado_diff.json', content: diffJsonPayload, sizeBytes: diffJsonPayload.length },
      ctx,
      empresa,
      catalog: pcgeIndex,
      template: pl01,
      version: pl01.versions[0],
      dedupIndex,
      existingDocuments: [existingDoc],
      deps
    });

    expect(res.rawPayload.outcome).toBe('DUPLICATE_WITH_DIFF');
    expect(res.rawPayload.duplicateOfDocumentId).toBe('doc-original-1');
    expect(res.rawPayload.outcomeReason).toMatch(/Total.*difiere del original/);
    expect(res.document).toBeUndefined();
    expect(res.entry).toBeUndefined();
    expect(res.events.some(e => e.action === 'DUPLICATE_DETECTED')).toBe(true);
  });

  it('detects duplicate when two identical documents are in the same batch (CA-03.5)', async () => {
    const batchHashes = new Map();
    const existingDocuments = [];

    // Primer comprobante
    const res1 = await processItem({
      item: { fileName: 'factura_1.json', content: validJsonPayload, sizeBytes: validJsonPayload.length },
      ctx,
      empresa,
      catalog: pcgeIndex,
      template: pl01,
      version: pl01.versions[0],
      dedupIndex: {},
      batchHashes,
      existingDocuments,
      deps
    });

    expect(res1.rawPayload.outcome).toBe('ACCEPTED');
    expect(res1.document).toBeDefined();
    // Registramos en batchHashes
    batchHashes.set(res1.document.deduplicationHash, res1.document);

    // Segundo comprobante idéntico en el mismo lote
    const res2 = await processItem({
      item: { fileName: 'factura_2.json', content: validJsonPayload, sizeBytes: validJsonPayload.length },
      ctx,
      empresa,
      catalog: pcgeIndex,
      template: pl01,
      version: pl01.versions[0],
      dedupIndex: {},
      batchHashes,
      existingDocuments,
      deps
    });

    expect(res2.rawPayload.outcome).toBe('DUPLICATE');
    expect(res2.rawPayload.duplicateOfDocumentId).toBe(res1.document.id);
    expect(res2.document).toBeUndefined();
    expect(res2.entry).toBeUndefined();
  });

  it('detects duplicate even if the original was cancelled (CA-03.2)', async () => {
    const existingCancelledDoc = {
      id: 'doc-cancelled-1',
      seriesAndNumber: 'F001-00000123',
      totals: { totalAmount: 11800 },
      currency: 'PEN',
      state: 'CANCELLED'
    };
    const expectedHash = `hash-${'01|20555555551|01|F001-00000123|2026-09-15'.length}`;
    const dedupIndex = { [expectedHash]: 'doc-cancelled-1' };

    const res = await processItem({
      item: { fileName: 'reintento.json', content: validJsonPayload, sizeBytes: validJsonPayload.length },
      ctx,
      empresa,
      catalog: pcgeIndex,
      template: pl01,
      version: pl01.versions[0],
      dedupIndex,
      existingDocuments: [existingCancelledDoc],
      deps
    });

    expect(res.rawPayload.outcome).toBe('DUPLICATE');
    expect(res.rawPayload.duplicateOfDocumentId).toBe('doc-cancelled-1');
  });
});
