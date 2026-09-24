import { describe, it, expect } from 'vitest';
import { detectFormat } from '../formatDetection.js';
import { readFixture } from '../../../../test-utils/fixtures.js';

describe('detectFormat (T011)', () => {
  it('detects PDF by byte signature even if MIME says otherwise', () => {
    const { buffer } = readFixture('11-factura-computo-escaneada.pdf');
    const format = detectFormat({
      mimeType: 'application/octet-stream',
      fileName: 'archivo.bin',
      headBytes: buffer.subarray(0, 8)
    });
    expect(format).toBe('PDF');
  });

  it('detects JPEG by byte signature', () => {
    const { buffer } = readFixture('09-foto-factura-nitida.jpg');
    const format = detectFormat({ headBytes: buffer.subarray(0, 8) });
    expect(format).toBe('IMAGE');
  });

  it('detects PNG by byte signature', () => {
    const { buffer } = readFixture('12-foto-sin-documento.png');
    const format = detectFormat({ headBytes: buffer.subarray(0, 8) });
    expect(format).toBe('IMAGE');
  });

  it('detects XML by content', () => {
    const { text } = readFixture('01-factura-mercaderia.xml');
    const format = detectFormat({ text, fileName: 'unknown' });
    expect(format).toBe('XML');
  });

  it('detects JSON by content', () => {
    const { text } = readFixture('06-recibo-honorarios.json');
    const format = detectFormat({ text, fileName: 'unknown' });
    expect(format).toBe('JSON');
  });

  it('detects CSV by content', () => {
    const { text } = readFixture('08-boletas-venta.csv');
    const format = detectFormat({ text, fileName: 'unknown.csv' });
    expect(format).toBe('CSV');
  });

  it('prioritizes byte signature over MIME type', () => {
    const { buffer } = readFixture('09-foto-factura-nitida.jpg');
    const format = detectFormat({ mimeType: 'application/pdf', headBytes: buffer.subarray(0, 8) });
    expect(format).toBe('IMAGE');
  });

  it('returns UNKNOWN when nothing matches', () => {
    const format = detectFormat({ mimeType: 'application/octet-stream', fileName: 'archivo.bin', text: 'random binary garbage' });
    expect(format).toBe('UNKNOWN');
  });
});
