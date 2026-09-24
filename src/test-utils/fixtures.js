import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DOCUMENT_FIXTURES } from '../data/fixtures/documentFixtures.js';

const FIXTURES_DIR = path.resolve(process.cwd(), 'public/fixtures/documents');

/**
 * Lee un archivo fixture desde public/fixtures/documents/.
 * @param {string} fileName - Nombre del archivo (ej. '01-factura-mercaderia.xml')
 * @returns {{ buffer: Buffer, text: string, sha256: string }}
 */
export function readFixture(fileName) {
  const filePath = path.join(FIXTURES_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fixture file not found: ${filePath}`);
  }
  const buffer = fs.readFileSync(filePath);
  const text = buffer.toString('utf8');
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  return { buffer, text, sha256 };
}

/**
 * Encuentra la definición de un documento de prueba por su ID (ej. 'DOC-01').
 * @param {string} id - Identificador del fixture
 * @returns {Object|undefined}
 */
export function fixtureById(id) {
  return DOCUMENT_FIXTURES.find(f => f.id === id);
}
