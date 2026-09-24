import {
  pePackHeader,
  peFiscalIdTypes,
  peTaxes,
  peOperationTypes,
  peMixedOperationTypes,
  peAccountRoles,
  peLegalBooks
} from './pe/pack.js';
import { peDocumentTypes } from './pe/documentTypes.js';
import { peBaseTemplates } from './pe/templates.js';
import { peReadingProfiles } from './pe/readingProfiles.js';

export const pePack = {
  ...pePackHeader,
  fiscalIdTypes: peFiscalIdTypes,
  taxes: peTaxes,
  operationTypes: peOperationTypes,
  mixedOperationTypes: peMixedOperationTypes,
  accountRoles: peAccountRoles,
  legalBooks: peLegalBooks,
  documentTypes: peDocumentTypes,
  baseTemplates: peBaseTemplates,
  readingProfiles: peReadingProfiles
};

export const JURISDICTION_PACKS = {
  PE: pePack
};

/**
 * Obtiene el paquete de jurisdicción correspondiente a un código.
 * @param {string} code - Código de la jurisdicción (ej. 'PE')
 * @returns {import('../../domain/accounting/types.js').JurisdictionPack|null}
 */
export function getPackByCode(code) {
  if (!code || typeof code !== 'string') return null;
  return JURISDICTION_PACKS[code.toUpperCase()] || null;
}

export { SAMPLE_DOCUMENTS } from './pe/sampleDocuments.js';

