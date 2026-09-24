import { describe, it, expect, beforeEach } from 'vitest';
import * as memoryRepo from '../../storage/repository.js';
import { memoryStorage } from '../../storage/memoryStorage.js';
import { ensureSeeded } from '../../ingestion/demoService.js';
import { runTemplateTests, activateTemplate, deactivateTemplate, listTemplates } from '../templateService.js';
import { seedAccountingConfig } from '../seedAccounting.js';

describe('templateService: testing & activation (RD-10, RD-17)', () => {
  beforeEach(() => {
    memoryRepo.init(memoryStorage());
    ensureSeeded(memoryRepo);
    memoryRepo.setGlobal('demoSettings', { latencyMs: 0, failRate: 0, demoMode: true });

    // Sembrar mapas de cuentas con seedAccountingConfig
    seedAccountingConfig(memoryRepo);
  });

  const admin01 = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };
  const admin02 = { tenantId: '02', userId: 'admin_pedro', role: 'ADMIN' };

  it('runTemplateTests persiste TestRun con contentHash en la versión (TENANT) y en packTestRuns (PACK), y audita', async () => {
    // 1. Probar plantilla PACK
    const packTmplId = 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE';
    const resPack = await runTemplateTests(admin01, { templateId: packTmplId, version: 1 }, memoryRepo);

    expect(resPack.ok).toBe(true);
    expect(resPack.data.contentHash).toBeDefined();
    expect(resPack.data.results).toHaveLength(1);
    expect(resPack.data.results[0].status).toBe('PASS');

    // Verificar persistencia en packTestRuns
    const packTestRuns = memoryRepo.getCollection('01', 'packTestRuns') || {};
    expect(packTestRuns[`${packTmplId}@1`]).toBeDefined();
    expect(packTestRuns[`${packTmplId}@1`].contentHash).toBe(resPack.data.contentHash);

    // 2. Verificar auditoría
    const auditLogs = memoryRepo.getCollection('01', 'auditLog') || [];
    expect(auditLogs.some(a => a.action === 'TEMPLATE_TESTS_RUN' && a.entityId === packTmplId)).toBe(true);
  });

  it('activateTemplate feliz: genera TemplateActivation ACTIVE y la versión pasa a PUBLISHED', async () => {
    const packTmplId = 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE';

    // Primero ejecutamos pruebas
    await runTemplateTests(admin01, { templateId: packTmplId, version: 1 }, memoryRepo);

    // Ahora activamos
    const resAct = await activateTemplate(admin01, { templateId: packTmplId, version: 1 }, memoryRepo);
    expect(resAct.ok).toBe(true);
    expect(resAct.data.status).toBe('ACTIVE');
    expect(resAct.data.templateId).toBe(packTmplId);

    // Verificar en lista de activaciones
    const activations = memoryRepo.getCollection('01', 'templateActivations') || [];
    const found = activations.find(a => a.templateId === packTmplId && a.version === 1);
    expect(found).toBeDefined();
    expect(found.status).toBe('ACTIVE');

    // Verificar auditoría
    const auditLogs = memoryRepo.getCollection('01', 'auditLog') || [];
    expect(auditLogs.some(a => a.action === 'TEMPLATE_ACTIVATED' && a.entityId === packTmplId)).toBe(true);
  });

  it('activar una plantilla en la empresa 02 con un rol sin mapear devuelve ACTIVATION_BLOCKED', async () => {
    const packTmplId = 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE';

    // Quitar SUPPLIERS_PAYABLE del mapa de la empresa 02 para forzar un rol sin resolver
    const versions02 = memoryRepo.getCollection('02', 'accountMappings') || [];
    const current02 = versions02[versions02.length - 1];
    current02.entries = current02.entries.filter(e => e.roleCode !== 'SUPPLIERS_PAYABLE');
    memoryRepo.setCollection('02', 'accountMappings', versions02);

    const res = await activateTemplate(admin02, { templateId: packTmplId, version: 1 }, memoryRepo);

    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('ACTIVATION_BLOCKED');
    expect(res.error.details.errors.some(e => e.code === 'ACCOUNTS_UNRESOLVED')).toBe(true);
  });

  it('aislamiento: la activación de la empresa 01 es invisible en la empresa 02', async () => {
    const packTmplId = 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE';
    await runTemplateTests(admin01, { templateId: packTmplId, version: 1 }, memoryRepo);
    await activateTemplate(admin01, { templateId: packTmplId, version: 1 }, memoryRepo);

    // Comprobar que en empresa 02 la plantilla sigue INACTIVE
    const list02 = await listTemplates(admin02, {}, memoryRepo);
    expect(list02.ok).toBe(true);
    const tmpl02 = list02.data.find(t => t.id === packTmplId);
    expect(tmpl02.activationStatus).toBe('INACTIVE');
  });

  it('deactivateTemplate pasa la activación a INACTIVE y audita', async () => {
    const packTmplId = 'PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE';
    await runTemplateTests(admin01, { templateId: packTmplId, version: 1 }, memoryRepo);
    await activateTemplate(admin01, { templateId: packTmplId, version: 1 }, memoryRepo);

    const deactRes = await deactivateTemplate(admin01, { templateId: packTmplId }, memoryRepo);
    expect(deactRes.ok).toBe(true);
    expect(deactRes.data.status).toBe('INACTIVE');

    const activations = memoryRepo.getCollection('01', 'templateActivations') || [];
    const current = activations.find(a => a.templateId === packTmplId && a.version === 1);
    expect(current.status).toBe('INACTIVE');
    expect(current.deactivatedAt).toBeDefined();

    const auditLogs = memoryRepo.getCollection('01', 'auditLog') || [];
    expect(auditLogs.some(a => a.action === 'TEMPLATE_DEACTIVATED' && a.entityId === packTmplId)).toBe(true);
  });
});
