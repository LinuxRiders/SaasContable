import * as repository from '../storage/repository.js';
import { mockEmpresas } from '../../data/mockEmpresas.js';
import { mockPlanContable } from '../../data/mockPlanContable.js';
import { mockTiposCambio } from '../../data/mockTiposCambio.js';
import { buildAuditEvent } from '../../domain/ingestion/audit.js';
import { seedAccountingConfig } from '../accounting/seedAccounting.js';
import { seedIngestionConfig } from './seedIngestion.js';

export function ensureSeeded(repo, clock = () => new Date().toISOString()) {
  const meta = repo.getGlobal('meta');
  if (meta && meta.schemaVersion === 2) {
    if (!repo.getGlobal('fxRates')) {
      repo.setGlobal('fxRates', mockTiposCambio);
    }
    return;
  }

  // Si el esquema no es 2, limpiar espacio de nombres conservando la sesión (research R-13)
  if (meta && meta.schemaVersion !== 2) {
    repo.clearNamespace({ keepSession: true });
  }

  const seededAt = clock();

  // Seed empresas
  repo.setGlobal('empresas', mockEmpresas);

  // Seed chartOfAccounts for each company
  mockEmpresas.forEach(emp => {
    repo.setCollection(emp.id, 'chartOfAccounts', mockPlanContable);
  });

  // Seed accounting config (mapas, reglas, plantillas)
  seedAccountingConfig(repo, { clock, idGenerator: () => crypto.randomUUID() });

  // Seed demoSettings con demoMode: true
  repo.setGlobal('demoSettings', {
    fxServiceDown: false,
    latencyMs: 150,
    perItemLatencyMs: 40,
    demoMode: true,
    extraction: { forceLowConfidence: false, forceUnreadable: false }
  });

  // Seed colecciones de ingestión (vacías) por empresa
  seedIngestionConfig(repo, mockEmpresas);

  // Seed fxRates
  repo.setGlobal('fxRates', mockTiposCambio);

  // Seed meta
  repo.setGlobal('meta', {
    schemaVersion: 2,
    seededAt
  });
}

export function resetDemoData(ctx, clock = () => new Date().toISOString()) {
  repository.clearNamespace({ keepSession: true });
  ensureSeeded(repository, clock);
  
  // Guard: si no hay contexto (usuario no logueado), no registrar evento
  if (!ctx || !ctx.tenantId) return;

  const event = buildAuditEvent({
    id: crypto.randomUUID(),
    at: clock(),
    tenantId: ctx.tenantId,
    traceId: crypto.randomUUID(),
    userId: ctx.userId,
    role: ctx.role,
    action: 'DEMO_RESET',
    entityType: 'System',
    entityId: 'global',
    detail: { message: 'Reset to demo data' }
  });
  
  repository.appendOnly(ctx.tenantId, 'auditLog', [event]);
}

export function getDemoSettings(ctx) {
  const settings = repository.getGlobal('demoSettings') || {};
  const usageBytes = repository.usageBytes();
  return { ...settings, storageUsageBytes: usageBytes };
}

export function setFxServiceDown(ctx, { down } = {}) {
  const settings = repository.getGlobal('demoSettings') || {
    fxServiceDown: false,
    latencyMs: 150,
    perItemLatencyMs: 40,
    demoMode: true
  };
  settings.fxServiceDown = !!down;
  repository.setGlobal('demoSettings', settings);
  return { ok: true, data: settings };
}
