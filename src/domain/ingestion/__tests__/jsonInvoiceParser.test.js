import { describe, it, expect } from 'vitest';
import { parseJsonInvoice } from '../parsers/jsonInvoiceParser.js';

describe('JSON Invoice Parser', () => {
  const validJson = {
    tipoDocumento: "01",
    serieNumero: "F001-00000456",
    fechaEmision: "2026-09-15",
    moneda: "USD",
    emisor:   { ruc: "20555555551", razonSocial: "TRANSPORTES ANDINOS DEMO SAC" },
    receptor: { ruc: "20450656934", razonSocial: "PACHATUSANTREK SAC" },
    lineas: [
      { descripcion: "Flete Cusco - Puno", valor: "847.46", tributo: "IGV" }
    ],
    totales: {
      baseGravada: "847.46",
      baseExonerada: "0.00",
      baseInafecta: "0.00",
      igv: "152.54",
      total: "1000.00"
    }
  };

  it('parses the valid example into a CanonicalDocument', () => {
    const rawString = JSON.stringify(validJson);
    const result = parseJsonInvoice(rawString);
    
    expect(result.type).toBe('01');
    expect(result.seriesAndNumber).toBe('F001-00000456');
    expect(result.issueDate).toBe('2026-09-15');
    expect(result.currency).toBe('USD');
    expect(result.issuer.ruc).toBe('20555555551');
    expect(result.receiver.ruc).toBe('20450656934');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].description).toBe('Flete Cusco - Puno');
    expect(result.lines[0].amount).toBe(84746);
    expect(result.lines[0].taxType).toBe('IGV');
    expect(result.totals.taxableAmount).toBe(84746);
    expect(result.totals.taxAmount).toBe(15254);
    expect(result.totals.totalAmount).toBe(100000);
  });

  it('rejects broken JSON', () => {
    expect(() => parseJsonInvoice('{ broken')).toThrow('PARSE_FAILED');
  });

  it('rejects unsupported tipoDocumento', () => {
    const json = { ...validJson, tipoDocumento: '03' };
    expect(() => parseJsonInvoice(JSON.stringify(json))).toThrow('Tipo de documento no soportado en esta versión');
  });

  it('normalizes serie F1-123 to F001-00000123', () => {
    const json = { ...validJson, serieNumero: 'F1-123' };
    const res = parseJsonInvoice(JSON.stringify(json));
    expect(res.seriesAndNumber).toBe('F001-00000123');
  });

  it('defaults tributo to IGV, and accepts EXO/INA', () => {
    const json = { ...validJson, lineas: [{ valor: "100.00", tributo: "EXO" }, { valor: "10.00" }] };
    const res = parseJsonInvoice(JSON.stringify(json));
    expect(res.lines[0].taxType).toBe('EXO');
    expect(res.lines[1].taxType).toBe('IGV'); // default
  });

  it('rejects missing mandatory fields', () => {
    const withoutIssuer = { ...validJson };
    delete withoutIssuer.emisor;
    expect(() => parseJsonInvoice(JSON.stringify(withoutIssuer))).toThrow('PARSE_FAILED');
  });

  it('rejects invalid amounts with 3 decimals', () => {
    const invalidAmount = { ...validJson, totales: { ...validJson.totales, total: "100.001" } };
    expect(() => parseJsonInvoice(JSON.stringify(invalidAmount))).toThrow('Monto inválido en totales.total');
  });
});

