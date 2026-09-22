let currentStorage = typeof window !== 'undefined' ? window.localStorage : null;

export function init(storage) {
  currentStorage = storage || (typeof window !== 'undefined' ? window.localStorage : null);
}

function getKey(tenantId, name) {
  return `contableos:v1:${tenantId}:${name}`;
}

function getGlobalKey(name) {
  return `contableos:v1:global:${name}`;
}

function safeSetItem(key, value) {
  try {
    currentStorage.setItem(key, value);
  } catch (error) {
    if (error.name === 'QuotaExceededError' || error.message.includes('QuotaExceededError')) {
      const err = new Error('STORAGE_FULL');
      err.code = 'STORAGE_FULL';
      throw err;
    }
    throw error;
  }
}

export function getCollection(tenantId, name) {
  const data = currentStorage.getItem(getKey(tenantId, name));
  return data ? JSON.parse(data) : null;
}

export function setCollection(tenantId, name, items) {
  safeSetItem(getKey(tenantId, name), JSON.stringify(items));
}

export function appendOnly(tenantId, name, items) {
  const existing = getCollection(tenantId, name) || [];
  const updated = [...existing, ...items];
  safeSetItem(getKey(tenantId, name), JSON.stringify(updated));
}

export function readAppendOnly(tenantId, name) {
  return getCollection(tenantId, name) || [];
}

export function upsertVersioned(tenantId, name, entity, expectedVersion) {
  const collection = getCollection(tenantId, name) || [];
  const index = collection.findIndex(e => e.id === entity.id);
  
  if (index >= 0) {
    const current = collection[index];
    const currentVer = current.entityVersion !== undefined ? current.entityVersion : current.version;
    if (currentVer !== expectedVersion) {
      const err = new Error('CONFLICT');
      err.code = 'CONFLICT';
      throw err;
    }
    collection[index] = entity;
  } else {
    if (expectedVersion !== 0) {
      const err = new Error('CONFLICT');
      err.code = 'CONFLICT';
      throw err;
    }
    collection.push(entity);
  }
  
  safeSetItem(getKey(tenantId, name), JSON.stringify(collection));
}

export function getGlobal(name) {
  const data = currentStorage.getItem(getGlobalKey(name));
  return data ? JSON.parse(data) : null;
}

export function setGlobal(name, value) {
  safeSetItem(getGlobalKey(name), JSON.stringify(value));
}

export function clearNamespace({ keepSession = false } = {}) {
  const prefix = 'contableos:v1:';
  const sessionKey = getGlobalKey('session');
  
  // We need to collect keys first because modifying while iterating can be problematic in some storage implementations
  const keysToRemove = [];
  for (let i = 0; i < currentStorage.length; i++) {
    const key = currentStorage.key(i);
    if (key && key.startsWith(prefix)) {
      if (keepSession && key === sessionKey) {
        continue;
      }
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(k => currentStorage.removeItem(k));
}

export function usageBytes() {
  const prefix = 'contableos:v1:';
  let total = 0;
  for (let i = 0; i < currentStorage.length; i++) {
    const key = currentStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const value = currentStorage.getItem(key) || '';
      total += new Blob([key]).size + new Blob([value]).size;
    }
  }
  return total;
}

