import { describe, it, expect, beforeEach } from 'vitest';
import { memoryStorage } from '../../storage/memoryStorage.js';
import * as repository from '../../storage/repository.js';
import { ensureSeeded } from '../demoService.js';
import { createTemplateService } from '../templateService.js';
import { createIngestionService } from '../ingestionService.js';

describe('TemplateService - Banco de Plantillas (T103, HU-08, RF-19, RF-21, CF-10)', () => {
  let memStorage;
  let templateService;

  const clock = () => '2026-09-22T12:00:00.000Z';

  const ctxAdmin = {
    tenantId: '01',
    userId: 'admin_pedro',
    role: 'ADMIN',
    activePeriod: { ejercicio: '2026', nombrePeriodo: 'SETIEMBRE_2026' }
  };

  const ctxAuditor = {
    tenantId: '01',
    userId: 'auditora_ana',
    role: 'AUDITOR',
    activePeriod: { ejercicio: '2026', nombrePeriodo: 'SETIEMBRE_2026' }
  };

  const ctxMaker = {
    tenantId: '01',
    userId: 'contador_maria',
    role: 'MAKER',
    activePeriod: { ejercicio: '2026', nombrePeriodo: 'SETIEMBRE_2026' }
  };

  const validDefaults = {
    baseAccount: '6011101',
    taxAccount: '4011101',
    counterpartAccount: '4212101',
    appliesIgv: true,
    requiresCostCenter: false,
    defaultCostCenter: null
  };

  beforeEach(() => {
    memStorage = memoryStorage();
    repository.init(memStorage);
    ensureSeeded(repository, clock, { seedIngestion: false });
    templateService = createTemplateService({ repo: repository, clock });
  });

  it('listTemplateBank y getTemplate permiten consultar el banco a ADMIN y AUDITOR', async () => {
    const resList = await templateService.listTemplateBank(ctxAdmin);
    expect(resList.ok).toBe(true);
    expect(resList.data.length).toBeGreaterThanOrEqual(7); // Semillas PL-01 a PL-07

    const pl01 = resList.data.find(t => t.templateId === 'PL-01');
    expect(pl01).toBeDefined();
    expect(pl01.code).toBe('COMPRA_MERCADERIA');
    expect(pl01.activeVersion).toBe(1);
    expect(pl01.retired).toBe(false);

    const resAuditor = await templateService.listTemplateBank(ctxAuditor);
    expect(resAuditor.ok).toBe(true);

    const resGet = await templateService.getTemplate(ctxAuditor, { templateId: 'PL-01' });
    expect(resGet.ok).toBe(true);
    expect(resGet.data.templateId).toBe('PL-01');
    expect(resGet.data.versions).toHaveLength(1);
  });

  it('createTemplate rechaza código repetido con TEMPLATE_INVALID y crea DRAFT v1 con éxito', async () => {
    // 1. Código repetido
    const resDup = await templateService.createTemplate(ctxAdmin, {
      code: 'COMPRA_MERCADERIA', // Ya existe en PL-01
      name: 'Nueva compra',
      operationType: 'COMPRA',
      defaults: validDefaults
    });
    expect(resDup.ok).toBe(false);
    expect(resDup.error.code).toBe('TEMPLATE_INVALID');

    // 2. Creación exitosa
    const resOk = await templateService.createTemplate(ctxAdmin, {
      code: 'COMPRA_ALQUILERES',
      name: 'Alquileres de Oficinas',
      operationType: 'COMPRA',
      defaults: {
        ...validDefaults,
        baseAccount: '6591101'
      }
    });
    expect(resOk.ok).toBe(true);
    expect(resOk.data.code).toBe('COMPRA_ALQUILERES');
    expect(resOk.data.versions[0].status).toBe('DRAFT');

    // Evento de auditoría en global:auditLog
    const auditEvents = repository.readAppendOnly('global', 'auditLog');
    const createdEvent = auditEvents.find(e => e.action === 'TEMPLATE_CREATED' && e.entityId === resOk.data.templateId);
    expect(createdEvent).toBeDefined();
    expect(createdEvent.userId).toBe('admin_pedro');
  });

  it('saveTemplateDraft valida estructura y devuelve accountErrors si hay cuentas inexistentes sin bloquear guardado', async () => {
    const createRes = await templateService.createTemplate(ctxAdmin, {
      code: 'COMPRA_LOGISTICA',
      name: 'Logística',
      operationType: 'COMPRA',
      defaults: validDefaults
    });
    const templateId = createRes.data.templateId;

    // 1. Estructura inválida (condición con campo inválido)
    const resInvalid = await templateService.saveTemplateDraft(ctxAdmin, {
      templateId,
      version: 1,
      draft: {
        defaults: validDefaults,
        lineRules: [
          {
            ruleId: 'R-1',
            name: 'Regla 1',
            priority: 1,
            when: { op: 'equals', field: 'campo.inexistente', value: 'X' },
            then: { baseAccount: '6011101' }
          }
        ]
      }
    });
    expect(resInvalid.ok).toBe(false);
    expect(resInvalid.error.code).toBe('TEMPLATE_INVALID');
    expect(resInvalid.error.details.length).toBeGreaterThan(0);

    // 2. Con cuenta que no existe en el PCGE semilla -> guarda y devuelve data.accountErrors
    const resWithAccountErrors = await templateService.saveTemplateDraft(ctxAdmin, {
      templateId,
      version: 1,
      draft: {
        defaults: {
          ...validDefaults,
          baseAccount: '9999999' // No existe en PCGE
        },
        documentRules: [],
        lineRules: [],
        testCases: []
      }
    });
    expect(resWithAccountErrors.ok).toBe(true);
    expect(resWithAccountErrors.data.accountErrors).toBeDefined();
    expect(resWithAccountErrors.data.accountErrors.some(e => e.accountCode === '9999999')).toBe(true);

    const auditEvents = repository.readAppendOnly('global', 'auditLog');
    const updateEvent = auditEvents.find(e => e.action === 'TEMPLATE_DRAFT_UPDATED' && e.entityId === templateId);
    expect(updateEvent).toBeDefined();
  });

  it('runTemplateTests ejecuta pruebas y guarda lastTestRun en la plantilla', async () => {
    const createRes = await templateService.createTemplate(ctxAdmin, {
      code: 'COMPRA_PRUEBAS',
      name: 'Pruebas',
      operationType: 'COMPRA',
      defaults: validDefaults
    });
    const templateId = createRes.data.templateId;

    // Agregar un caso de prueba válido
    await templateService.saveTemplateDraft(ctxAdmin, {
      templateId,
      version: 1,
      draft: {
        defaults: validDefaults,
        documentRules: [],
        lineRules: [],
        testCases: [
          {
            caseId: 'TC-01',
            name: 'Compra estándar 100 PEN',
            document: {
              currency: 'PEN',
              totalCents: 11800,
              taxableBaseCents: 10000,
              igvCents: 1800,
              lines: [{ description: 'Item 1', amountCents: 10000, taxCode: 'IGV' }]
            },
            expectedLines: [
              { side: 'D', accountCode: '6011101', functionalAmountCents: 10000 },
              { side: 'D', accountCode: '4011101', functionalAmountCents: 1800 },
              { side: 'H', accountCode: '4212101', functionalAmountCents: 11800 },
              { side: 'D', accountCode: '2011101', functionalAmountCents: 10000 },
              { side: 'H', accountCode: '6111101', functionalAmountCents: 10000 }
            ]
          }
        ]
      }
    });

    const runRes = await templateService.runTemplateTests(ctxAdmin, { templateId, version: 1 });
    expect(runRes.ok).toBe(true);
    expect(runRes.data.allPassed).toBe(true);
    expect(runRes.data.results[0].passed).toBe(true);

    // Verificar que se guardó lastTestRun en el repositorio
    const getRes = await templateService.getTemplate(ctxAdmin, { templateId });
    expect(getRes.data.versions[0].lastTestRun).toBeDefined();
    expect(getRes.data.versions[0].lastTestRun.allPassed).toBe(true);
  });

  it('activateTemplateVersion valida condiciones y activa la versión (CF-10)', async () => {
    const createRes = await templateService.createTemplate(ctxAdmin, {
      code: 'COMPRA_ACTIVATE_TEST',
      name: 'Activar',
      operationType: 'COMPRA',
      defaults: validDefaults
    });
    const templateId = createRes.data.templateId;

    // Intentar activar sin pruebas vigentes -> TEMPLATE_NOT_READY
    const resNotReady = await templateService.activateTemplateVersion(ctxAdmin, { templateId, version: 1 });
    expect(resNotReady.ok).toBe(false);
    expect(resNotReady.error.code).toBe('TEMPLATE_NOT_READY');

    // Agregar caso de prueba y ejecutar pruebas
    await templateService.saveTemplateDraft(ctxAdmin, {
      templateId,
      version: 1,
      draft: {
        defaults: validDefaults,
        documentRules: [],
        lineRules: [],
        testCases: [
          {
            caseId: 'TC-01',
            name: 'Compra 100',
            document: {
              currency: 'PEN',
              totalCents: 11800,
              taxableBaseCents: 10000,
              igvCents: 1800,
              lines: [{ description: 'Item 1', amountCents: 10000, taxCode: 'IGV' }]
            },
            expectedLines: [
              { side: 'D', accountCode: '6011101', functionalAmountCents: 10000 },
              { side: 'D', accountCode: '4011101', functionalAmountCents: 1800 },
              { side: 'H', accountCode: '4212101', functionalAmountCents: 11800 },
              { side: 'D', accountCode: '2011101', functionalAmountCents: 10000 },
              { side: 'H', accountCode: '6111101', functionalAmountCents: 10000 }
            ]
          }
        ]
      }
    });

    const laterClock = () => '2026-09-22T13:00:00.000Z';
    const testRunnerService = createTemplateService({ repo: repository, clock: laterClock });
    await testRunnerService.runTemplateTests(ctxAdmin, { templateId, version: 1 });

    // Activar con pruebas vigentes
    const resActivate = await testRunnerService.activateTemplateVersion(ctxAdmin, { templateId, version: 1 });
    expect(resActivate.ok).toBe(true);
    expect(resActivate.data.version.status).toBe('ACTIVE');

    const auditEvents = repository.readAppendOnly('global', 'auditLog');
    const actEvent = auditEvents.find(e => e.action === 'TEMPLATE_VERSION_ACTIVATED' && e.entityId === templateId);
    expect(actEvent).toBeDefined();
  });

  it('deleteTemplateDraft elimina borrador y rechaza roles no autorizados con FORBIDDEN', async () => {
    const createRes = await templateService.createTemplate(ctxAdmin, {
      code: 'BORRADOR_BORRAR',
      name: 'Borrar',
      operationType: 'COMPRA',
      defaults: validDefaults
    });
    const templateId = createRes.data.templateId;

    // Rol no ADMIN intenta eliminar
    const resMaker = await templateService.deleteTemplateDraft(ctxMaker, { templateId, version: 1 });
    expect(resMaker.ok).toBe(false);
    expect(resMaker.error.code).toBe('FORBIDDEN');

    const resAuditor = await templateService.deleteTemplateDraft(ctxAuditor, { templateId, version: 1 });
    expect(resAuditor.ok).toBe(false);
    expect(resAuditor.error.code).toBe('FORBIDDEN');

    // Admin elimina
    const resDel = await templateService.deleteTemplateDraft(ctxAdmin, { templateId, version: 1 });
    expect(resDel.ok).toBe(true);
    expect(resDel.data.deleted).toBe(true);

    const getRes = await templateService.getTemplate(ctxAdmin, { templateId });
    expect(getRes.ok).toBe(false);
    expect(getRes.error.code).toBe('NOT_FOUND');
  });

  it('editTemplate crea DRAFT v(max+1) y al activar v2 guarda diffFromPrevious (T113, CF-11)', async () => {
    // 1. Crear y activar PL-01 ya viene activa en v1 de las semillas
    const resEdit = await templateService.editTemplate(ctxAdmin, { templateId: 'PL-01' });
    expect(resEdit.ok).toBe(true);
    expect(resEdit.data.created).toBe(true);
    expect(resEdit.data.version.version).toBe(2);
    expect(resEdit.data.version.status).toBe('DRAFT');
    expect(resEdit.data.version.basedOnVersion).toBe(1);

    // Evento TEMPLATE_DRAFT_CREATED
    const auditEvents = repository.readAppendOnly('global', 'auditLog');
    const draftEvent = auditEvents.find(e => e.action === 'TEMPLATE_DRAFT_CREATED' && e.entityId === 'PL-01');
    expect(draftEvent).toBeDefined();

    // 2. Modificar la v2 (cambiar defaults) y correr pruebas
    await templateService.saveTemplateDraft(ctxAdmin, {
      templateId: 'PL-01',
      version: 2,
      draft: {
        defaults: {
          ...validDefaults,
          baseAccount: '6591101'
        },
        documentRules: [],
        lineRules: [],
        testCases: [
          {
            caseId: 'TC-01',
            name: 'Compra mercadería',
            document: {
              currency: 'PEN',
              totalCents: 11800,
              taxableBaseCents: 10000,
              igvCents: 1800,
              lines: [{ description: 'Item 1', amountCents: 10000, taxCode: 'IGV' }]
            },
            expectedLines: [
              { side: 'D', accountCode: '6591101', functionalAmountCents: 10000 },
              { side: 'D', accountCode: '4011101', functionalAmountCents: 1800 },
              { side: 'H', accountCode: '4212101', functionalAmountCents: 11800 },
              { side: 'D', accountCode: '9411101', functionalAmountCents: 10000 },
              { side: 'H', accountCode: '7911101', functionalAmountCents: 10000 }
            ]
          }
        ]
      }
    });

    const testTime = () => '2026-09-22T15:00:00.000Z';
    const srv = createTemplateService({ repo: repository, clock: testTime });
    await srv.runTemplateTests(ctxAdmin, { templateId: 'PL-01', version: 2 });

    // Activar v2
    const resAct = await srv.activateTemplateVersion(ctxAdmin, { templateId: 'PL-01', version: 2 });
    expect(resAct.ok).toBe(true);
    expect(resAct.data.version.status).toBe('ACTIVE');
    expect(resAct.data.version.diffFromPrevious).toBeDefined();
    expect(resAct.data.version.diffFromPrevious.length).toBeGreaterThan(0);

    // Verificar que v1 pasó a RETIRED
    const getRes = await srv.getTemplate(ctxAdmin, { templateId: 'PL-01' });
    const v1 = getRes.data.versions.find(v => v.version === 1);
    expect(v1.status).toBe('RETIRED');
  });

  it('retireTemplate retira plantilla sin reemplazo y la excluye de listTemplateBank', async () => {
    const resRetire = await templateService.retireTemplate(ctxAdmin, { templateId: 'PL-02' });
    expect(resRetire.ok).toBe(true);

    const auditEvents = repository.readAppendOnly('global', 'auditLog');
    const retEvent = auditEvents.find(e => e.action === 'TEMPLATE_RETIRED' && e.entityId === 'PL-02');
    expect(retEvent).toBeDefined();

    // Sin includeRetired, no debe aparecer en listTemplateBank
    const listNormal = await templateService.listTemplateBank(ctxAdmin, { includeRetired: false });
    expect(listNormal.data.some(t => t.templateId === 'PL-02')).toBe(false);

    // Con includeRetired: true, sí aparece
    const listAll = await templateService.listTemplateBank(ctxAdmin, { includeRetired: true });
    const pl02 = listAll.data.find(t => t.templateId === 'PL-02');
    expect(pl02).toBeDefined();
    expect(pl02.retired).toBe(true);
  });

  describe('Activaciones por empresa (T117, US10, RF-16, RF-23, CA-23.1..4)', () => {
    it('listCompanyTemplateActivations crea las activaciones iniciales si no existen y recalcula advertencias contra catálogo vigente', async () => {
      // Inicialmente no existen activaciones en almacenamiento para tenant 01
      expect(repository.getCollection('01', 'templateActivations')).toBeNull();

      const res = await templateService.listCompanyTemplateActivations(ctxAdmin);
      expect(res.ok).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThanOrEqual(7);

      // Ahora deben existir en repositorio
      const stored = repository.getCollection('01', 'templateActivations');
      expect(stored).toBeDefined();
      expect(stored.length).toBeGreaterThan(0);

      // Por defecto con mockPlanContable, PL-01 no debe tener advertencias
      const pl01 = res.data.find(t => t.templateId === 'PL-01');
      expect(pl01).toBeDefined();
      expect(pl01.active).toBe(true);
      expect(pl01.accountWarnings).toEqual([]);

      // Si alteramos el catálogo de la empresa '01' quitando la cuenta 6011101
      const currentCatalog = repository.getCollection('01', 'chartOfAccounts');
      const filteredCatalog = currentCatalog.filter(c => c.codigo !== '6011101');
      repository.setCollection('01', 'chartOfAccounts', filteredCatalog);

      // Al volver a listar, recalcula contra el catálogo vigente
      const resUpdated = await templateService.listCompanyTemplateActivations(ctxAdmin);
      const pl01Updated = resUpdated.data.find(t => t.templateId === 'PL-01');
      expect(pl01Updated.accountWarnings.length).toBeGreaterThan(0);
      expect(pl01Updated.accountWarnings.some(w => w.accountCode === '6011101' && w.problem === 'NOT_FOUND')).toBe(true);
    });

    it('setCompanyTemplateActivation activa con advertencias sin bloquear y desactiva', async () => {
      // Quitar 6011101 del catálogo de '01'
      const currentCatalog = repository.getCollection('01', 'chartOfAccounts');
      const filteredCatalog = currentCatalog.filter(c => c.codigo !== '6011101');
      repository.setCollection('01', 'chartOfAccounts', filteredCatalog);

      // Desactivar PL-01
      const resDeact = await templateService.setCompanyTemplateActivation(ctxAdmin, { templateId: 'PL-01', active: false });
      expect(resDeact.ok).toBe(true);
      expect(resDeact.data.active).toBe(false);

      // Verificar evento TEMPLATE_COMPANY_DEACTIVATED en auditLog de la empresa
      const audits = repository.readAppendOnly('01', 'auditLog');
      const deactEvent = audits.find(e => e.action === 'TEMPLATE_COMPANY_DEACTIVATED' && e.entityId === 'PL-01');
      expect(deactEvent).toBeDefined();
      expect(deactEvent.userId).toBe('admin_pedro');

      // Volver a activar PL-01 (con advertencia de cuenta): no debe bloquear
      const resAct = await templateService.setCompanyTemplateActivation(ctxAdmin, { templateId: 'PL-01', active: true });
      expect(resAct.ok).toBe(true);
      expect(resAct.data.active).toBe(true);
      expect(resAct.data.accountWarnings.some(w => w.accountCode === '6011101')).toBe(true);

      // Verificar evento TEMPLATE_COMPANY_ACTIVATED en auditLog de la empresa
      const audits2 = repository.readAppendOnly('01', 'auditLog');
      const actEvent = audits2.find(e => e.action === 'TEMPLATE_COMPANY_ACTIVATED' && e.entityId === 'PL-01');
      expect(actEvent).toBeDefined();
    });

    it('responde TEMPLATE_NOT_ACTIVE si la plantilla no tiene versión activa o está retirada', async () => {
      // Retirar PL-02 globalmente
      await templateService.retireTemplate(ctxAdmin, { templateId: 'PL-02' });

      // Intentar activar en la empresa
      const res = await templateService.setCompanyTemplateActivation(ctxAdmin, { templateId: 'PL-02', active: true });
      expect(res.ok).toBe(false);
      expect(res.error.code).toBe('TEMPLATE_NOT_ACTIVE');
    });

    it('el cambio se refleja en listTemplates de esa empresa y de ninguna otra (RF-16)', async () => {
      const ingestionService = createIngestionService(repository);

      // Desactivar PL-01 en empresa '01'
      const deactRes = await templateService.setCompanyTemplateActivation(ctxAdmin, { templateId: 'PL-01', active: false });
      expect(deactRes.ok).toBe(true);

      // Comprobar en empresa '01'
      const listEmpresa01 = await ingestionService.listTemplates(ctxMaker);
      expect(listEmpresa01.ok).toBe(true);
      expect(listEmpresa01.data.templates.some(t => t.templateId === 'PL-01')).toBe(false);

      // Comprobar en empresa '02': PL-01 sigue activa
      const ctxMaker02 = { ...ctxMaker, tenantId: '02' };
      const listEmpresa02 = await ingestionService.listTemplates(ctxMaker02);
      expect(listEmpresa02.ok).toBe(true);
      expect(listEmpresa02.data.templates.some(t => t.templateId === 'PL-01')).toBe(true);
    });

    it('control de acceso: solo ADMIN puede activar/desactivar; AUDITOR puede listar; MAKER/CHECKER FORBIDDEN', async () => {
      // AUDITOR puede listar
      const resAuditor = await templateService.listCompanyTemplateActivations(ctxAuditor);
      expect(resAuditor.ok).toBe(true);

      // MAKER no puede listar
      const resMakerList = await templateService.listCompanyTemplateActivations(ctxMaker);
      expect(resMakerList.ok).toBe(false);
      expect(resMakerList.error.code).toBe('FORBIDDEN');

      // AUDITOR no puede activar/desactivar
      const resAuditorSet = await templateService.setCompanyTemplateActivation(ctxAuditor, { templateId: 'PL-01', active: false });
      expect(resAuditorSet.ok).toBe(false);
      expect(resAuditorSet.error.code).toBe('FORBIDDEN');

      // MAKER no puede activar/desactivar
      const resMakerSet = await templateService.setCompanyTemplateActivation(ctxMaker, { templateId: 'PL-01', active: false });
      expect(resMakerSet.ok).toBe(false);
      expect(resMakerSet.error.code).toBe('FORBIDDEN');
    });

    it('no exige periodo abierto para listar ni para configurar activaciones', async () => {
      const ctxClosed = {
        ...ctxAdmin,
        activePeriod: { ejercicio: '2026', nombrePeriodo: 'AGOSTO_2026' }
      };

      const resList = await templateService.listCompanyTemplateActivations(ctxClosed);
      expect(resList.ok).toBe(true);

      const resSet = await templateService.setCompanyTemplateActivation(ctxClosed, { templateId: 'PL-01', active: false });
      expect(resSet.ok).toBe(true);
    });
  });
});

