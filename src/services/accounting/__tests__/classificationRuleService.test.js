import { describe, it, expect, beforeEach } from 'vitest';
import * as memoryRepo from '../../storage/repository.js';
import { memoryStorage } from '../../storage/memoryStorage.js';
import { ensureSeeded } from '../../ingestion/demoService.js';
import { seedAccountingConfig } from '../seedAccounting.js';
import {
  listClassificationRules,
  saveClassificationRule,
  setClassificationRuleStatus,
  testClassification
} from '../classificationRuleService.js';
import { SAMPLE_DOCUMENTS } from '../../../data/jurisdictions/index.js';

describe('classificationRuleService (US5, contracts/services.md §3)', () => {
  beforeEach(() => {
    memoryRepo.init(memoryStorage());
    ensureSeeded(memoryRepo);
    memoryRepo.setGlobal('demoSettings', { latencyMs: 0, failRate: 0, demoMode: true });
    seedAccountingConfig(memoryRepo);
  });

  const admin01 = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };
  const auditor01 = { tenantId: '01', userId: 'auditora_ana', role: 'AUDITOR' };

  it('guardar una regla válida genera versión nueva y registra evento de auditoría', async () => {
    const listRes = await listClassificationRules(admin01, {}, memoryRepo);
    expect(listRes.ok).toBe(true);
    const firstRule = listRes.data[0];

    const updatedRule = {
      ...firstRule,
      priority: 35
    };

    const saveRes = await saveClassificationRule(admin01, { rule: updatedRule }, memoryRepo);
    expect(saveRes.ok).toBe(true);
    expect(saveRes.data.version).toBe(firstRule.version + 1);
    expect(saveRes.data.priority).toBe(35);

    // Verificar auditoría
    const auditLogs = memoryRepo.getCollection('01', 'auditLog') || [];
    const auditEvt = auditLogs.find(a => a.action === 'CLASSIFICATION_RULE_SAVED' && a.entityId === firstRule.id);
    expect(auditEvt).toBeDefined();
    expect(auditEvt.detail.version).toBe(firstRule.version + 1);
  });

  it('condición inválida devuelve EXPRESSION_INVALID con lista de errores', async () => {
    const invalidRule = {
      name: 'Regla con función inexistente',
      scope: 'DOCUMENT',
      priority: 10,
      status: 'ACTIVE',
      operationTypeCode: 'MERCHANDISE_PURCHASE',
      condition: {
        fn: 'nonExistentFunction',
        args: ['algo']
      }
    };

    const res = await saveClassificationRule(admin01, { rule: invalidRule }, memoryRepo);
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('EXPRESSION_INVALID');
    expect(res.error.details.errors).toBeDefined();
    expect(res.error.details.errors.length).toBeGreaterThan(0);
  });

  it('activar la regla PROPOSED hace que testClassification de la factura de cómputo cambie a FIXED_ASSET_ACQUISITION', async () => {
    const computerDoc = SAMPLE_DOCUMENTS.find(s => s.id === 'PE-12-UNCLASSIFIED-COMPUTER-EQUIPMENT')?.document;
    expect(computerDoc).toBeDefined();

    // 1. Con la regla cr-08 en PROPOSED, no se puede clasificar
    const resInitial = await testClassification(admin01, { document: computerDoc }, memoryRepo);
    expect(resInitial.ok).toBe(true);
    expect(resInitial.data.ok).toBe(false);
    expect(resInitial.data.pending?.[0]?.reasonCode).toBe('CLASSIFICATION_REQUIRED');

    // 2. Activar la regla cr-08
    const statusRes = await setClassificationRuleStatus(admin01, { ruleId: 'cr-08', status: 'ACTIVE' }, memoryRepo);
    expect(statusRes.ok).toBe(true);
    expect(statusRes.data.status).toBe('ACTIVE');

    // 3. Volver a probar: ahora se clasifica como FIXED_ASSET_ACQUISITION
    const resAfter = await testClassification(admin01, { document: computerDoc }, memoryRepo);
    expect(resAfter.ok).toBe(true);
    expect(resAfter.data.ok).toBe(true);
    expect(resAfter.data.operationTypeCode).toBe('FIXED_ASSET_ACQUISITION');
    expect(resAfter.data.decidedBy).toBe('RULE:cr-08');
  });

  it('AUDITOR recibe FORBIDDEN al intentar guardar o cambiar estado de regla', async () => {
    const resSave = await saveClassificationRule(auditor01, {
      rule: {
        name: 'Regla no autorizada',
        scope: 'DOCUMENT',
        priority: 10,
        status: 'ACTIVE',
        operationTypeCode: 'MERCHANDISE_PURCHASE',
        condition: { const: true }
      }
    }, memoryRepo);

    expect(resSave.ok).toBe(false);
    expect(resSave.error.code).toBe('FORBIDDEN');

    const resStatus = await setClassificationRuleStatus(auditor01, { ruleId: 'cr-01', status: 'RETIRED' }, memoryRepo);
    expect(resStatus.ok).toBe(false);
    expect(resStatus.error.code).toBe('FORBIDDEN');
  });
});

