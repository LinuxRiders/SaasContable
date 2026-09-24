/**
 * Configuraciones específicas para la siembra de mapas de cuentas por empresa.
 * Conforme a specs/001-motor-plantillas-contables/data-model.md §9.
 */

export const mockMapasConfig = {
  '01': {
    explicitMappings: [
      { roleCode: 'FIXED_ASSET_IT_EQUIPMENT', qualifier: null, accountCode: '3351101' },
      { roleCode: 'BANK_ACCOUNT', qualifier: 'BCP-MN', accountCode: '104101' },
      { roleCode: 'BANK_ACCOUNT', qualifier: 'IBK-MN', accountCode: '104102' }
    ],
    excludedRoles: []
  },
  '02': {
    explicitMappings: [
      { roleCode: 'BANK_ACCOUNT', qualifier: 'BCP-MN', accountCode: '104101' },
      { roleCode: 'BANK_ACCOUNT', qualifier: 'IBK-MN', accountCode: '104102' }
    ],
    excludedRoles: [
      'FIXED_ASSET_IT_EQUIPMENT',
      'PROFESSIONAL_FEES_PAYABLE'
    ]
  }
};

