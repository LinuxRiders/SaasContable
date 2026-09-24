import * as demoService from './demoService.js';
import * as repository from '../storage/repository.js';
import * as intakeService from './intakeService.js';

// Init repository if not done yet
repository.init();

export const resetDemoData = (ctx) => demoService.resetDemoData(ctx);
export const getDemoSettings = (ctx) => demoService.getDemoSettings(ctx);
export const setFxServiceDown = (ctx, params) => demoService.setFxServiceDown(ctx, params);

export { intakeService };
