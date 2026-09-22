/**
 * @fileoverview Registro de parsers (Strategy) para comprobantes electrónicos
 */

import { parseJsonInvoice } from './jsonInvoiceParser.js';
import { parseUblInvoice } from './ublInvoiceParser.js';

const parsers = new Map();

// Registrar parsers por defecto
parsers.set('json', parseJsonInvoice);
parsers.set('xml', parseUblInvoice);

/**
 * Permite registrar nuevos parsers
 * @param {string} format
 * @param {Function} parserFn
 */
export function registerParser(format, parserFn) {
  parsers.set(format.toLowerCase(), parserFn);
}

/**
 * Detecta el formato según el nombre de archivo y el contenido
 * @param {string} fileName
 * @param {string} [content]
 * @returns {"xml"|"json"|"unknown"}
 */
export function detectFormat(fileName = '', content = '') {
  const lowerName = fileName.toLowerCase();
  const trimmed = content.trim();

  if (lowerName.endsWith('.xml') || trimmed.startsWith('<')) {
    return 'xml';
  }
  if (lowerName.endsWith('.json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json';
  }

  return 'unknown';
}

/**
 * Parsea el contenido según el parser detectado
 * @param {string} content
 * @param {string} fileName
 * @returns {import('../types.js').CanonicalDocument}
 */
export function parseInvoice(content, fileName) {
  const format = detectFormat(fileName, content);
  const parser = parsers.get(format);

  if (!parser) {
    const err = new Error('Formato no soportado');
    err.code = 'PARSE_FAILED';
    err.details = 'formato no soportado';
    throw err;
  }

  return parser(content);
}
