import * as repository from '../storage/repository.js';
import { resolveTenantContext } from './context.js';
import { seedAccountingConfig } from './seedAccounting.js';

import * as catalogService from './catalogService.js';
import * as accountMappingService from './accountMappingService.js';
import * as templateService from './templateService.js';
import * as classificationRuleService from './classificationRuleService.js';
import * as simulationService from './simulationService.js';
import { accountingEngine } from './simulationService.js';

// Init repository if not done yet
repository.init();

export {
  resolveTenantContext,
  seedAccountingConfig,
  catalogService,
  accountMappingService,
  templateService,
  classificationRuleService,
  simulationService,
  accountingEngine
};


