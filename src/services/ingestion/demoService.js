import * as repository from '../storage/repository.js';
import { mockEmpresas } from '../../data/mockEmpresas.js';
import { mockPlanContable } from '../../data/mockPlanContable.js';
import { mockPlantillas } from '../../data/mockPlantillas.js';
import { buildTemplateBankSeed } from '../../data/mockPlantillasReglas.js';
import { categoriaDePlantilla } from '../../data/mockCategoriasPlantilla.js';
import { buildIngestionSeed } from '../../data/mockIngestionSeed.js';
import { mockTiposCambio } from '../../data/mockTiposCambio.js';
import { buildAuditEvent } from '../../domain/ingestion/audit.js';

export function ensureSeeded(repo, clock = () => new Date().toISOString(), { seedIngestion = true } = {}) {
  const meta = repo.getGlobal('meta');
  if (meta && meta.schemaVersion === 1) {
    // Si global:templates existe pero no tiene el formato nuevo (sin versions), se vuelve a sembrar solo el banco
    const existingTemplates = repo.getGlobal('templates');
    const hasVersions = Array.isArray(existingTemplates) && existingTemplates.length > 0 && Array.isArray(existingTemplates[0].versions);
    if (!hasVersions) {
      repo.setGlobal('templates', buildTemplateBankSeed(mockPlantillas, clock));
    }
    if (!repo.getGlobal('fxRates')) {
      repo.setGlobal('fxRates', mockTiposCambio);
    }
    const existingEntries = repo.getCollection('01', 'journalEntries');
    if (!existingEntries && seedIngestion) {
      const seed = buildIngestionSeed(clock);
      repo.appendOnly('01', 'rawPayloads', seed.rawPayloads);
      repo.setCollection('01', 'documents', seed.documents);
      repo.setCollection('01', 'journalEntries', seed.journalEntries);
      repo.setCollection('01', 'dedupIndex', seed.dedupIndex);
      repo.appendOnly('01', 'auditLog', seed.auditEvents);
    }
    return;
  }

  const seededAt = clock();
  
  // Seed empresas
  repo.setGlobal('empresas', mockEmpresas);
  
  // Seed chartOfAccounts for each company
  mockEmpresas.forEach(emp => {
    repo.setCollection(emp.id, 'chartOfAccounts', mockPlanContable);
  });
  
  // Seed templates global con versiones y reglas
  repo.setGlobal('templates', buildTemplateBankSeed(mockPlantillas, clock));
  
  // Seed demoSettings
  repo.setGlobal('demoSettings', {
    fxServiceDown: false,
    latencyMs: 150,
    perItemLatencyMs: 40
  });

  // Seed fxRates
  repo.setGlobal('fxRates', mockTiposCambio);
  
  // Seed ingestion data for demo company '01'
  if (seedIngestion) {
    const seed = buildIngestionSeed(clock);
    repo.appendOnly('01', 'rawPayloads', seed.rawPayloads);
    repo.setCollection('01', 'documents', seed.documents);
    repo.setCollection('01', 'journalEntries', seed.journalEntries);
    repo.setCollection('01', 'dedupIndex', seed.dedupIndex);
    repo.appendOnly('01', 'auditLog', seed.auditEvents);
  }

  // Seed meta
  repo.setGlobal('meta', {
    schemaVersion: 1,
    seededAt
  });
}

export function resetDemoData(ctx, clock = () => new Date().toISOString()) {
  repository.clearNamespace({ keepSession: true });
  ensureSeeded(repository, clock);
  
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
    perItemLatencyMs: 40
  };
  settings.fxServiceDown = !!down;
  repository.setGlobal('demoSettings', settings);
  return { ok: true, data: settings };
}


