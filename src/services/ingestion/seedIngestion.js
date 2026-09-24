/**
 * Siembra de colecciones vacías para el subsistema de ingestión, por empresa.
 * Conforme a specs/002-ingestion-pipeline/tasks.md T018.
 */

/**
 * Inicializa las colecciones de ingestión (vacías) para cada empresa y los
 * interruptores de demo del extractor simulado.
 * @param {Object} repo - Repositorio inyectado
 * @param {Array<{ id: string }>} empresas
 */
export function seedIngestionConfig(repo, empresas) {
  for (const empresa of empresas) {
    if (repo.getCollection(empresa.id, 'rawPayloads') === null) {
      repo.setCollection(empresa.id, 'rawPayloads', []);
    }
    if (repo.getCollection(empresa.id, 'intakeRecords') === null) {
      repo.setCollection(empresa.id, 'intakeRecords', []);
    }
    if (repo.getCollection(empresa.id, 'canonicalDocuments') === null) {
      repo.setCollection(empresa.id, 'canonicalDocuments', []);
    }
    if (repo.getCollection(empresa.id, 'dlq') === null) {
      repo.setCollection(empresa.id, 'dlq', []);
    }
    if (repo.getCollection(empresa.id, 'dedupIndex') === null) {
      repo.setCollection(empresa.id, 'dedupIndex', {});
    }
    if (repo.getCollection(empresa.id, 'events') === null) {
      repo.setCollection(empresa.id, 'events', []);
    }
  }

  const demoSettings = repo.getGlobal('demoSettings') || {};
  if (!demoSettings.extraction) {
    demoSettings.extraction = { forceLowConfidence: false, forceUnreadable: false };
    repo.setGlobal('demoSettings', demoSettings);
  }
}
