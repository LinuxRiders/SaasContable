import { getPackByCode } from '../../data/jurisdictions/index.js';
import { preloadMapping } from '../../domain/accounting/accountMapping.js';
import { mockMapasConfig } from '../../data/mockMapasCuentas.js';
import { runTests } from '../../domain/accounting/testRunner.js';
import { contentForHash } from '../../domain/accounting/templateLifecycle.js';
import { mockReglasClasificacion } from '../../data/mockReglasClasificacion.js';

/**
 * Genera un hash determinista rápido para inicialización síncrona.
 * @param {string} str
 * @returns {string}
 */
function fastHash(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

/**
 * Siembra de la configuración contable y plantillas por empresa.
 * Se completa progresivamente en US2 (mapas de cuentas), US4 (plantillas) y US5 (clasificación).
 * Conforme a contracts/services.md y research R-13.
 *
 * @param {Object} repo - Repositorio de almacenamiento
 * @param {{ clock?: () => string, idGenerator?: () => string }} [options]
 */
export function seedAccountingConfig(repo, { clock = () => new Date().toISOString(), idGenerator = () => crypto.randomUUID() } = {}) {
  const empresas = repo.getGlobal('empresas') || [];

  for (const empresa of empresas) {
    if (!empresa.jurisdictionCode) continue;
    const pack = getPackByCode(empresa.jurisdictionCode);
    if (!pack) continue;

    const chart = repo.getCollection(empresa.id, 'chartOfAccounts') || [];
    const cfg = mockMapasConfig[empresa.id] || { explicitMappings: [], excludedRoles: [] };

    // 1. Precargar sugerencias con los mapeos explícitos
    const { entries } = preloadMapping(pack, chart, cfg.explicitMappings || []);

    // 2. Filtrar roles explícitamente excluidos (p. ej. empresa 02)
    const finalEntries = entries.filter(e => !(cfg.excludedRoles || []).includes(e.roleCode));

    const mappingV1 = {
      tenantId: empresa.id,
      version: 1,
      entries: finalEntries,
      updatedAt: clock(),
      updatedBy: 'system',
      changedRoles: []
    };

    repo.setCollection(empresa.id, 'accountMappings', [mappingV1]);

    // 3. Activación y pruebas de plantillas (US4 / T068)
    if (empresa.id === '01') {
      const packTestRuns = {};
      const activations = [];

      for (const tpl of (pack.baseTemplates || [])) {
        const testResults = runTests(tpl, {
          pack,
          tenantMapping: mappingV1,
          chart,
          functionalCurrency: pack.defaultFunctionalCurrency || 'PEN'
        });

        const canonicalStr = contentForHash(tpl);
        const hash = fastHash(canonicalStr);
        const tplId = tpl.id || tpl.code;
        const versionNum = tpl.version || 1;

        packTestRuns[`${tplId}@${versionNum}`] = {
          at: clock(),
          tenantId: empresa.id,
          contentHash: hash,
          results: testResults.results
        };

        activations.push({
          templateId: tplId,
          version: versionNum,
          status: 'ACTIVE',
          activatedBy: 'system',
          activatedAt: clock(),
          deactivatedAt: null,
          testRunAt: clock()
        });
      }

      repo.setCollection(empresa.id, 'packTestRuns', packTestRuns);
      repo.setCollection(empresa.id, 'templateActivations', activations);
      repo.setCollection(empresa.id, 'classificationRules', mockReglasClasificacion);
    } else {
      // En empresa 02 no activar ninguna ni sembrar reglas
      repo.setCollection(empresa.id, 'packTestRuns', {});
      repo.setCollection(empresa.id, 'templateActivations', []);
      repo.setCollection(empresa.id, 'classificationRules', []);
    }
  }
}

