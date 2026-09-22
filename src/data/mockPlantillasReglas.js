/**
 * @fileoverview Semilla del banco global de plantillas con reglas (research R-11, data-model §4.6)
 */

/**
 * Genera el banco de plantillas semilla completo (PL-01 a PL-07)
 * @param {Array<Object>} mockPlantillasPlanos
 * @param {Function} [clock]
 * @returns {import('../domain/templates/types.js').Template[]}
 */
export function buildTemplateBankSeed(mockPlantillasPlanos, clock = () => new Date().toISOString()) {
  const now = clock();

  // Mapeo de casos esperados para PL-01 a PL-06
  const casesForFlatTemplates = {
    'PL-01': {
      // Compra mercadería 6011101, amarres 2011101 / 6111101
      expectedLines: [
        { side: 'D', accountCode: '6011101', costCenter: null, functionalAmountCents: 10000 },
        { side: 'D', accountCode: '4011101', costCenter: null, functionalAmountCents: 1800 },
        { side: 'H', accountCode: '4212101', costCenter: null, functionalAmountCents: 11800 },
        { side: 'D', accountCode: '2011101', costCenter: null, functionalAmountCents: 10000 },
        { side: 'H', accountCode: '6111101', costCenter: null, functionalAmountCents: 10000 }
      ]
    },
    'PL-02': {
      // Flete 6311101, CC-LOGISTICA, amarres 9411101 / 7911101
      expectedLines: [
        { side: 'D', accountCode: '6311101', costCenter: 'CC-LOGISTICA', functionalAmountCents: 10000 },
        { side: 'D', accountCode: '4011101', costCenter: null, functionalAmountCents: 1800 },
        { side: 'H', accountCode: '4212101', costCenter: null, functionalAmountCents: 11800 },
        { side: 'D', accountCode: '9411101', costCenter: 'CC-LOGISTICA', functionalAmountCents: 10000 },
        { side: 'H', accountCode: '7911101', costCenter: null, functionalAmountCents: 10000 }
      ]
    },
    'PL-03': {
      // Servicios básicos 6361101, CC-ADMIN, amarres 9411101 / 7911101
      expectedLines: [
        { side: 'D', accountCode: '6361101', costCenter: 'CC-ADMIN', functionalAmountCents: 10000 },
        { side: 'D', accountCode: '4011101', costCenter: null, functionalAmountCents: 1800 },
        { side: 'H', accountCode: '4212101', costCenter: null, functionalAmountCents: 11800 },
        { side: 'D', accountCode: '9411101', costCenter: 'CC-ADMIN', functionalAmountCents: 10000 },
        { side: 'H', accountCode: '7911101', costCenter: null, functionalAmountCents: 10000 }
      ]
    },
    'PL-04': {
      // Venta mercaderías local: 1212101 (D), 7012101 (H), 4011101 (H)
      expectedLines: [
        { side: 'D', accountCode: '1212101', costCenter: null, functionalAmountCents: 11800 },
        { side: 'H', accountCode: '7012101', costCenter: null, functionalAmountCents: 10000 },
        { side: 'H', accountCode: '4011101', costCenter: null, functionalAmountCents: 1800 }
      ]
    },
    'PL-05': {
      // Venta servicios turísticos: 1212101 (D), 7032101 (H), 4011101 (H)
      expectedLines: [
        { side: 'D', accountCode: '1212101', costCenter: null, functionalAmountCents: 11800 },
        { side: 'H', accountCode: '7032101', costCenter: null, functionalAmountCents: 10000 },
        { side: 'H', accountCode: '4011101', costCenter: null, functionalAmountCents: 1800 }
      ]
    },
    'PL-06': {
      // Otros gastos por CC: 6591101 sin CC default en plantilla -> caso de prueba con CC-ADMIN
      expectedLines: [
        { side: 'D', accountCode: '6591101', costCenter: null, functionalAmountCents: 10000 },
        { side: 'D', accountCode: '4011101', costCenter: null, functionalAmountCents: 1800 },
        { side: 'H', accountCode: '4212101', costCenter: null, functionalAmountCents: 11800 },
        { side: 'D', accountCode: '9411101', costCenter: null, functionalAmountCents: 10000 },
        { side: 'H', accountCode: '7911101', costCenter: null, functionalAmountCents: 10000 }
      ]
    }
  };

  const templates = mockPlantillasPlanos
    .filter(p => p.id !== 'PL-07')
    .map(p => {
      const caseInfo = casesForFlatTemplates[p.id] || {
        expectedLines: [
          { side: p.tipoOperacion === 'COMPRA' ? 'D' : 'H', accountCode: p.cuentaBase, functionalAmountCents: 10000 },
          { side: p.tipoOperacion === 'COMPRA' ? 'D' : 'H', accountCode: p.cuentaImpuesto, functionalAmountCents: 1800 },
          { side: p.tipoOperacion === 'COMPRA' ? 'H' : 'D', accountCode: p.cuentaObligacion, functionalAmountCents: 11800 }
        ]
      };

      const testCase = {
        caseId: `TC-${p.id}`,
        name: `Caso base S/ 100 para ${p.id}`,
        document: {
          operationType: p.tipoOperacion,
          issuer: { fiscalId: '20555555551', name: 'EMISOR PRUEBA' },
          receiver: { fiscalId: '20450656934', name: 'PACHATUSANTREK SAC' },
          issueDate: '2026-09-10',
          lines: [{ lineNo: 1, description: 'Servicio / Mercadería S/ 100', amountCents: 10000, taxCode: 'IGV' }],
          taxableBaseCents: 10000,
          exemptBaseCents: 0,
          igvCents: 1800,
          totalCents: 11800
        },
        expectedLines: caseInfo.expectedLines
      };

      return {
        templateId: p.id,
        code: p.codigo,
        name: p.nombre,
        operationType: p.tipoOperacion,
        createdBy: 'SEED',
        createdAt: now,
        retiredAt: null,
        versions: [
          {
            version: 1,
            status: 'ACTIVE',
            basedOnVersion: null,
            defaults: {
              baseAccount: p.cuentaBase,
              taxAccount: p.cuentaImpuesto,
              counterpartAccount: p.cuentaObligacion,
              appliesIgv: p.aplicaIGV,
              requiresCostCenter: p.requiereCC,
              defaultCostCenter: p.ccDefault || null
            },
            documentRules: [],
            lineRules: [],
            testCases: [testCase],
            lastTestRun: {
              at: now,
              by: 'SEED',
              allPassed: true,
              uncoveredRuleIds: [],
              results: []
            },
            createdBy: 'SEED',
            createdAt: now,
            updatedAt: now,
            activatedBy: 'SEED',
            activatedAt: now,
            diffFromPrevious: null,
            usageCount: 0
          }
        ]
      };
    });

  // Agregar PL-07 con sus 3 reglas y 3 casos de prueba
  const pl07 = {
    templateId: 'PL-07',
    code: 'COMPRA_SERVICIOS_REGLAS',
    name: 'Servicios varios con reglas',
    operationType: 'COMPRA',
    createdBy: 'SEED',
    createdAt: now,
    retiredAt: null,
    versions: [
      {
        version: 1,
        status: 'ACTIVE',
        basedOnVersion: null,
        defaults: {
          baseAccount: '6591101',
          taxAccount: '4011101',
          counterpartAccount: '4212101',
          appliesIgv: true,
          requiresCostCenter: true,
          defaultCostCenter: 'CC-ADMIN'
        },
        documentRules: [],
        lineRules: [
          {
            ruleId: 'R-FLETE',
            name: 'Fletes',
            priority: 1,
            when: { op: 'contains', field: 'line.description', value: 'FLETE' },
            then: { baseAccount: '6311101', costCenter: 'CC-LOGISTICA' }
          },
          {
            ruleId: 'R-SERV-BASICOS',
            name: 'Luz y agua',
            priority: 2,
            when: {
              op: 'or',
              args: [
                { op: 'contains', field: 'line.description', value: 'LUZ' },
                { op: 'contains', field: 'line.description', value: 'AGUA' }
              ]
            },
            then: { baseAccount: '6361101', costCenter: 'CC-ADMIN' }
          },
          {
            ruleId: 'R-SEGUROS',
            name: 'Seguros prorrateados',
            priority: 3,
            when: { op: 'contains', field: 'line.description', value: 'SEGURO' },
            then: {
              split: [
                { account: '6511101', costCenter: 'CC-ADMIN', basisPoints: 6000 },
                { account: '6511101', costCenter: 'CC-LOGISTICA', basisPoints: 4000 }
              ]
            }
          }
        ],
        testCases: [
          {
            caseId: 'TC-FLETE',
            name: 'Flete S/ 100',
            document: {
              operationType: 'COMPRA',
              issuer: { fiscalId: '20555555551', name: 'TRANSPORTES ANDINOS DEMO SAC' },
              receiver: { fiscalId: '20450656934', name: 'PACHATUSANTREK SAC' },
              issueDate: '2026-09-10',
              lines: [{ lineNo: 1, description: 'FLETE LIMA - CUSCO', amountCents: 10000, taxCode: 'IGV' }],
              taxableBaseCents: 10000,
              exemptBaseCents: 0,
              igvCents: 1800,
              totalCents: 11800
            },
            expectedLines: [
              { side: 'D', accountCode: '6311101', costCenter: 'CC-LOGISTICA', functionalAmountCents: 10000 },
              { side: 'D', accountCode: '4011101', costCenter: null, functionalAmountCents: 1800 },
              { side: 'H', accountCode: '4212101', costCenter: null, functionalAmountCents: 11800 },
              { side: 'D', accountCode: '9411101', costCenter: 'CC-LOGISTICA', functionalAmountCents: 10000 },
              { side: 'H', accountCode: '7911101', costCenter: null, functionalAmountCents: 10000 }
            ]
          },
          {
            caseId: 'TC-LUZ',
            name: 'Luz S/ 100',
            document: {
              operationType: 'COMPRA',
              issuer: { fiscalId: '20555555552', name: 'ELECTRO SUR ESTE SAA' },
              receiver: { fiscalId: '20450656934', name: 'PACHATUSANTREK SAC' },
              issueDate: '2026-09-10',
              lines: [{ lineNo: 1, description: 'SERVICIO LUZ SETIEMBRE', amountCents: 10000, taxCode: 'IGV' }],
              taxableBaseCents: 10000,
              exemptBaseCents: 0,
              igvCents: 1800,
              totalCents: 11800
            },
            expectedLines: [
              { side: 'D', accountCode: '6361101', costCenter: 'CC-ADMIN', functionalAmountCents: 10000 },
              { side: 'D', accountCode: '4011101', costCenter: null, functionalAmountCents: 1800 },
              { side: 'H', accountCode: '4212101', costCenter: null, functionalAmountCents: 11800 },
              { side: 'D', accountCode: '9411101', costCenter: 'CC-ADMIN', functionalAmountCents: 10000 },
              { side: 'H', accountCode: '7911101', costCenter: null, functionalAmountCents: 10000 }
            ]
          },
          {
            caseId: 'TC-SEGURO',
            name: 'Seguro S/ 100 prorrateado',
            document: {
              operationType: 'COMPRA',
              issuer: { fiscalId: '20555555553', name: 'PACIFICO SEGUROS' },
              receiver: { fiscalId: '20450656934', name: 'PACHATUSANTREK SAC' },
              issueDate: '2026-09-10',
              lines: [{ lineNo: 1, description: 'SEGURO VEHICULAR MENSUAL', amountCents: 10000, taxCode: 'IGV' }],
              taxableBaseCents: 10000,
              exemptBaseCents: 0,
              igvCents: 1800,
              totalCents: 11800
            },
            expectedLines: [
              { side: 'D', accountCode: '6511101', costCenter: 'CC-ADMIN', functionalAmountCents: 6000 },
              { side: 'D', accountCode: '6511101', costCenter: 'CC-LOGISTICA', functionalAmountCents: 4000 },
              { side: 'D', accountCode: '4011101', costCenter: null, functionalAmountCents: 1800 },
              { side: 'H', accountCode: '4212101', costCenter: null, functionalAmountCents: 11800 },
              { side: 'D', accountCode: '9411101', costCenter: 'CC-ADMIN', functionalAmountCents: 6000 },
              { side: 'H', accountCode: '7911101', costCenter: null, functionalAmountCents: 6000 },
              { side: 'D', accountCode: '9411101', costCenter: 'CC-LOGISTICA', functionalAmountCents: 4000 },
              { side: 'H', accountCode: '7911101', costCenter: null, functionalAmountCents: 4000 }
            ]
          }
        ],
        lastTestRun: {
          at: now,
          by: 'SEED',
          allPassed: true,
          uncoveredRuleIds: [],
          results: []
        },
        createdBy: 'SEED',
        createdAt: now,
        updatedAt: now,
        activatedBy: 'SEED',
        activatedAt: now,
        diffFromPrevious: null,
        usageCount: 0
      }
    ]
  };

  templates.push(pl07);
  return templates;
}
