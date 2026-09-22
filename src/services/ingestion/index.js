import * as demoService from './demoService.js';
import * as repository from '../storage/repository.js';
import { defaultIngestionService } from './ingestionService.js';
import { defaultStagingService } from './stagingService.js';
import { defaultTraceService } from './traceService.js';
import { defaultApprovalQueryService } from './approvalQueryService.js';
import { defaultTemplateService } from './templateService.js';

// Init repository if not done yet
repository.init();

export const resetDemoData = (ctx) => demoService.resetDemoData(ctx);
export const getDemoSettings = (ctx) => demoService.getDemoSettings(ctx);
export const setFxServiceDown = (ctx, params) => demoService.setFxServiceDown(ctx, params);

export const listTemplates = (ctx) => defaultIngestionService.listTemplates(ctx);
export const listSampleCatalog = (ctx) => defaultIngestionService.listSampleCatalog(ctx);
export const ingestBatch = (ctx, params) => defaultIngestionService.ingestBatch(ctx, params);
export const getBatch = (ctx, params) => defaultIngestionService.getBatch(ctx, params);
export const listBatches = (ctx, params) => defaultIngestionService.listBatches(ctx, params);
export const queryIntakeResults = (ctx, params) => defaultIngestionService.queryIntakeResults(ctx, params);
export const getRawPayload = (ctx, params) => defaultIngestionService.getRawPayload(ctx, params);

export const queryStaging = (ctx, params) => defaultStagingService.queryStaging(ctx, params);
export const getJournalEntry = (ctx, params) => defaultStagingService.getJournalEntry(ctx, params);
export const updateStagingEntries = (ctx, params) => defaultStagingService.updateStagingEntries(ctx, params);
export const revalidateEntries = (ctx, params) => defaultStagingService.revalidateEntries(ctx, params);
export const cancelEntry = (ctx, params) => defaultStagingService.cancelEntry(ctx, params);

export const getTraceability = (ctx, params) => defaultTraceService.getTraceability(ctx, params);

export const queryPendingApproval = (ctx, params) => defaultApprovalQueryService.queryPendingApproval(ctx, params);

export const listTemplateBank = (ctx, params) => defaultTemplateService.listTemplateBank(ctx, params);
export const getTemplate = (ctx, params) => defaultTemplateService.getTemplate(ctx, params);
export const createTemplate = (ctx, params) => defaultTemplateService.createTemplate(ctx, params);
export const saveTemplateDraft = (ctx, params) => defaultTemplateService.saveTemplateDraft(ctx, params);
export const runTemplateTests = (ctx, params) => defaultTemplateService.runTemplateTests(ctx, params);
export const activateTemplateVersion = (ctx, params) => defaultTemplateService.activateTemplateVersion(ctx, params);
export const deleteTemplateDraft = (ctx, params) => defaultTemplateService.deleteTemplateDraft(ctx, params);
export const editTemplate = (ctx, params) => defaultTemplateService.editTemplate(ctx, params);
export const retireTemplate = (ctx, params) => defaultTemplateService.retireTemplate(ctx, params);
export const listCompanyTemplateActivations = (ctx, params) => defaultTemplateService.listCompanyTemplateActivations(ctx, params);
export const setCompanyTemplateActivation = (ctx, params) => defaultTemplateService.setCompanyTemplateActivation(ctx, params);


