import { describe, it, expect, beforeEach } from 'vitest';
import * as repository from '../../storage/repository.js';
import { memoryStorage } from '../../storage/memoryStorage.js';
import { ensureSeeded } from '../../ingestion/demoService.js';
import { getAccountMapping, saveAccountMapping, listMappingVersions } from '../accountMappingService.js';
import { saveClassificationRule, setClassificationRuleStatus } from '../classificationRuleService.js';
import {
  createTemplate,
  duplicateTemplate,
  saveTemplateDraft,
  runTemplateTests,
  activateTemplate,
  deactivateTemplate,
  createTemplateVersion,
  retireTemplate
} from '../templateService.js';
import { listConfigAudit } from '../catalogService.js';

describe('accounting audit & permissions (US8)', () => {
  const adminCtx = { tenantId: '01', userId: 'admin_pedro', role: 'ADMIN' };
  const auditorCtx = { tenantId: '01', userId: 'auditora_ana', role: 'AUDITOR' };

  beforeEach(() => {
    repository.init(memoryStorage());
    repository.setGlobal('demoSettings', { latencyMs: 0, failRate: 0, demoMode: true });
    ensureSeeded(repository);
  });

  const REQUIRED_AUDIT_FIELDS = [
    'id', 'at', 'tenantId', 'traceId', 'userId', 'role', 'action', 'entityType', 'entityId', 'detail'
  ];

  function verifyAuditEvent(event, expectedAction) {
    expect(event).toBeDefined();
    for (const field of REQUIRED_AUDIT_FIELDS) {
      expect(event[field], `Audit event missing ${field}`).toBeDefined();
    }
    expect(event.tenantId).toBe('01');
    expect(event.action).toBe(expectedAction);
    expect(event.traceId.length).toBeGreaterThan(0);
  }

  function getAuditLogs(tenantId = '01') {
    return repository.getCollection(tenantId, 'auditLog') || [];
  }

  describe('Write operations by ADMIN record proper audit events', () => {
    it('records ACCOUNT_MAPPING_SAVED on saveAccountMapping', async () => {
      const logsBefore = getAuditLogs('01').length;
      const current = await getAccountMapping(adminCtx, repository);
      const res = await saveAccountMapping(adminCtx, {
        expectedVersion: current.data.version,
        entries: current.data.entries
      }, repository);

      expect(res.ok).toBe(true);
      const logsAfter = getAuditLogs('01');
      expect(logsAfter.length).toBe(logsBefore + 1);
      const last = logsAfter[logsAfter.length - 1];
      verifyAuditEvent(last, 'ACCOUNT_MAPPING_SAVED');
      expect(last.userId).toBe('admin_pedro');
      expect(last.role).toBe('ADMIN');
      expect(last.entityType).toBe('AccountMapping');
    });

    it('records CLASSIFICATION_RULE_SAVED and CLASSIFICATION_RULE_STATUS_CHANGED', async () => {
      const logsBefore = getAuditLogs('01').length;

      // 1. Create/save rule
      const ruleRes = await saveClassificationRule(adminCtx, {
        rule: {
          documentTypeCode: 'INVOICE',
          perspective: 'RECEIVED',
          priority: 50,
          condition: { const: true },
          operationTypeCode: 'MERCHANDISE_PURCHASE',
          description: 'Regla de prueba audit'
        }
      }, repository);

      expect(ruleRes.ok).toBe(true);
      let logs = getAuditLogs('01');
      expect(logs.length).toBe(logsBefore + 1);
      verifyAuditEvent(logs[logs.length - 1], 'CLASSIFICATION_RULE_SAVED');

      // 2. Change status
      const statusRes = await setClassificationRuleStatus(adminCtx, {
        ruleId: ruleRes.data.id,
        status: 'ACTIVE'
      }, repository);

      expect(statusRes.ok).toBe(true);
      logs = getAuditLogs('01');
      expect(logs.length).toBe(logsBefore + 2);
      verifyAuditEvent(logs[logs.length - 1], 'CLASSIFICATION_RULE_STATUS_CHANGED');
    });

    it('records TEMPLATE lifecycle audit events', async () => {
      let logsBefore = getAuditLogs('01').length;

      // 1. Create template
      const definition = {
        code: 'AUDIT_TPL_01',
        name: 'Template Audit Test',
        documentTypeCode: 'INVOICE',
        perspective: 'RECEIVED',
        operationTypeCode: 'MERCHANDISE_PURCHASE',
        legalBookCode: 'PE.PURCHASES_REGISTER',
        lines: [
          {
            id: 'l1',
            side: 'DEBIT',
            accountRef: { kind: 'ROLE', roleCode: 'PURCHASES_MERCHANDISE' },
            amount: { field: 'totals.netMinor' }
          },
          {
            id: 'l2',
            side: 'CREDIT',
            accountRef: { kind: 'ROLE', roleCode: 'SUPPLIERS_PAYABLE' },
            amount: { field: 'totals.totalMinor' },
            balancingLine: true
          }
        ],
        testCases: []
      };

      const createRes = await createTemplate(adminCtx, { definition }, repository);

      expect(createRes.ok).toBe(true);
      let logs = getAuditLogs('01');
      expect(logs.length).toBe(logsBefore + 1);
      verifyAuditEvent(logs[logs.length - 1], 'TEMPLATE_CREATED');

      const templateId = createRes.data.id;

      // 2. Duplicate template
      const dupRes = await duplicateTemplate(adminCtx, {
        templateId,
        newName: 'Template Duplicated Test'
      }, repository);
      expect(dupRes.ok).toBe(true);
      logs = getAuditLogs('01');
      expect(logs.length).toBe(logsBefore + 2);
      verifyAuditEvent(logs[logs.length - 1], 'TEMPLATE_DUPLICATED');

      // 3. Save draft
      const draftRes = await saveTemplateDraft(adminCtx, {
        templateId,
        version: 1,
        definition: { name: 'Updated Template Name' }
      }, repository);
      expect(draftRes.ok).toBe(true);
      logs = getAuditLogs('01');
      expect(logs.length).toBe(logsBefore + 3);
      verifyAuditEvent(logs[logs.length - 1], 'TEMPLATE_DRAFT_SAVED');

      // 4. Create version
      const verRes = await createTemplateVersion(adminCtx, {
        templateId,
        fromVersion: 1
      }, repository);
      expect(verRes.ok).toBe(true);
      logs = getAuditLogs('01');
      expect(logs.length).toBe(logsBefore + 4);
      verifyAuditEvent(logs[logs.length - 1], 'TEMPLATE_VERSION_CREATED');

      // 5. Retire template
      const retRes = await retireTemplate(adminCtx, {
        templateId
      }, repository);
      expect(retRes.ok).toBe(true);
      logs = getAuditLogs('01');
      expect(logs.length).toBe(logsBefore + 5);
      verifyAuditEvent(logs[logs.length - 1], 'TEMPLATE_RETIRED');
    });
  });

  describe('Write operations by AUDITOR are rejected with FORBIDDEN and ACTION_DENIED', () => {
    it('rejects saveAccountMapping and records ACTION_DENIED', async () => {
      const logsBefore = getAuditLogs('01').length;

      const res = await saveAccountMapping(auditorCtx, {
        expectedVersion: 1,
        entries: []
      }, repository);

      expect(res.ok).toBe(false);
      expect(res.error.code).toBe('FORBIDDEN');

      const logs = getAuditLogs('01');
      expect(logs.length).toBe(logsBefore + 1);
      const denied = logs[logs.length - 1];
      expect(denied.action).toBe('ACTION_DENIED');
      expect(denied.role).toBe('AUDITOR');
      expect(denied.userId).toBe('auditora_ana');
      expect(denied.entityId).toBe('EDIT_ACCOUNT_MAPPING');
    });

    it('rejects saveClassificationRule and records ACTION_DENIED', async () => {
      const logsBefore = getAuditLogs('01').length;

      const res = await saveClassificationRule(auditorCtx, {
        rule: {
          documentTypeCode: 'INVOICE',
          perspective: 'RECEIVED',
          priority: 50,
          condition: { field: 'document.series', operator: 'STARTS_WITH', value: 'F' },
          operationTypeCode: 'MERCHANDISE_PURCHASE'
        }
      }, repository);

      expect(res.ok).toBe(false);
      expect(res.error.code).toBe('FORBIDDEN');

      const logs = getAuditLogs('01');
      expect(logs.length).toBe(logsBefore + 1);
      expect(logs[logs.length - 1].action).toBe('ACTION_DENIED');
      expect(logs[logs.length - 1].entityId).toBe('EDIT_CLASSIFICATION_RULES');
    });

    it('rejects template write operations and records ACTION_DENIED', async () => {
      // Try createTemplate
      const res = await createTemplate(auditorCtx, {
        definition: {}
      }, repository);

      expect(res.ok).toBe(false);
      expect(res.error.code).toBe('FORBIDDEN');

      const logs = getAuditLogs('01');
      const denied = logs[logs.length - 1];
      expect(denied.action).toBe('ACTION_DENIED');
      expect(denied.role).toBe('AUDITOR');
      expect(denied.entityId).toBe('EDIT_TEMPLATES');
    });
  });

  describe('AUDITOR read operations', () => {
    it('allows AUDITOR to read listMappingVersions', async () => {
      const res = await listMappingVersions(auditorCtx, repository);
      expect(res.ok).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
    });

    it('allows AUDITOR to listConfigAudit with filtering by actionPrefix, from and to', async () => {
      // First generate some config audit entries as admin
      const current = await getAccountMapping(adminCtx, repository);
      await saveAccountMapping(adminCtx, {
        expectedVersion: current.data.version,
        entries: current.data.entries
      }, repository);

      // Now query as auditor
      const auditRes = await listConfigAudit(auditorCtx, {}, repository);
      expect(auditRes.ok).toBe(true);
      expect(auditRes.data.length).toBeGreaterThan(0);

      // Filter by actionPrefix
      const mappingOnly = await listConfigAudit(auditorCtx, { actionPrefix: 'ACCOUNT_' }, repository);
      expect(mappingOnly.ok).toBe(true);
      expect(mappingOnly.data.every(e => e.action.startsWith('ACCOUNT_'))).toBe(true);

      // Filter by date range
      const today = new Date().toISOString().slice(0, 10);
      const todayLogs = await listConfigAudit(auditorCtx, { from: today, to: today }, repository);
      expect(todayLogs.ok).toBe(true);
      expect(todayLogs.data.length).toBeGreaterThan(0);

      // Future filter should be empty
      const futureLogs = await listConfigAudit(auditorCtx, { from: '2099-01-01' }, repository);
      expect(futureLogs.ok).toBe(true);
      expect(futureLogs.data.length).toBe(0);
    });
  });
});
