import * as repository from './repository.js';

export function loadEmpresas() {
  return repository.getGlobal('empresas');
}

export function saveEmpresas(empresas) {
  repository.setGlobal('empresas', empresas);
}

export function loadChartOfAccounts(empresaId) {
  return repository.getCollection(empresaId, 'chartOfAccounts');
}

export function saveChartOfAccounts(empresaId, cuentas) {
  repository.setCollection(empresaId, 'chartOfAccounts', cuentas);
}

export function loadSession() {
  return repository.getGlobal('session');
}

export function saveSession(session) {
  repository.setGlobal('session', session);
}

export function clearSession() {
  // We can just set it to null or remove the item directly from the repository, 
  // but there's no removeGlobal. We'll set it to null.
  // Wait, setting to null makes it string "null" or null? JSON.stringify(null) -> "null".
  // Then JSON.parse("null") -> null. So this works.
  repository.setGlobal('session', null);
}

