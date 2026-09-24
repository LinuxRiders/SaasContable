/**
 * Detección pura de formato de comprobantes (XML, JSON, CSV, PDF, IMAGE, UNKNOWN).
 * Conforme a contracts/domain-api.md §2 y research R-02.
 * Prioridad: firma de bytes > MIME > extensión > contenido de texto.
 */

/**
 * @param {Object} params
 * @param {string} [params.mimeType]
 * @param {string} [params.fileName]
 * @param {Uint8Array|number[]|Buffer} [params.headBytes]
 * @param {string} [params.text]
 * @returns {'XML'|'JSON'|'CSV'|'PDF'|'IMAGE'|'UNKNOWN'}
 */
export function detectFormat({ mimeType = '', fileName = '', headBytes = null, text = '' } = {}) {
  // 1. Firma de bytes (Magic numbers) - máxima prioridad
  if (headBytes && headBytes.length >= 3) {
    const b = headBytes;

    // PDF: %PDF (0x25, 0x50, 0x44, 0x46)
    if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) {
      return 'PDF';
    }

    // JPEG: 0xFF, 0xD8, 0xFF
    if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) {
      return 'IMAGE';
    }

    // PNG: 0x89, 0x50, 0x4E, 0x47
    if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) {
      return 'IMAGE';
    }
  }

  const cleanMime = (mimeType || '').trim().toLowerCase();
  const cleanFileName = (fileName || '').trim().toLowerCase();

  // 2. Tipo MIME explícito
  if (cleanMime === 'application/pdf') return 'PDF';
  if (cleanMime.startsWith('image/')) return 'IMAGE';
  if (cleanMime === 'application/xml' || cleanMime === 'text/xml') return 'XML';
  if (cleanMime === 'application/json') return 'JSON';
  if (cleanMime === 'text/csv') return 'CSV';

  // 3. Extensión de archivo
  if (cleanFileName.endsWith('.pdf')) return 'PDF';
  if (cleanFileName.endsWith('.xml')) return 'XML';
  if (cleanFileName.endsWith('.json')) return 'JSON';
  if (cleanFileName.endsWith('.csv')) return 'CSV';
  if (/\.(jpe?g|png|webp|gif|bmp)$/.test(cleanFileName)) return 'IMAGE';

  // 4. Inspección de contenido de texto
  if (text && typeof text === 'string') {
    const trimmed = text.trim();
    if (trimmed.startsWith('<')) {
      return 'XML';
    }
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'JSON';
    }
    if (cleanFileName.endsWith('.csv') || cleanMime.includes('csv') || (trimmed.includes(',') && trimmed.includes('\n'))) {
      return 'CSV';
    }
  }

  return 'UNKNOWN';
}
