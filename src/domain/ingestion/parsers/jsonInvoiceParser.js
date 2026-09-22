import { parseDecimalToCents } from '../money.js';

function parseAmount(val, fieldName) {
  if (val === undefined || val === null) return 0;
  try {
    return parseDecimalToCents(val);
  } catch (e) {
    const err = new Error(`Monto inválido en ${fieldName}`);
    err.code = 'PARSE_FAILED';
    throw err;
  }
}

export function parseJsonInvoice(rawString) {
  let data;
  try {
    data = JSON.parse(rawString);
  } catch (e) {
    const err = new Error('PARSE_FAILED: Invalid JSON');
    err.code = 'PARSE_FAILED';
    throw err;
  }

  if (data.tipoDocumento !== '01') {
    const err = new Error('Tipo de documento no soportado en esta versión');
    err.code = 'PARSE_FAILED';
    throw err;
  }

  if (!data.serieNumero || !data.fechaEmision || !data.moneda || !data.emisor?.ruc || !data.receptor?.ruc || !data.lineas || data.lineas.length === 0 || !data.totales?.total) {
    const err = new Error('PARSE_FAILED: Missing mandatory fields');
    err.code = 'PARSE_FAILED';
    throw err;
  }

  // Normalize serieNumero: F1-123 -> F001-00000123
  let [serie, num] = data.serieNumero.split('-');
  if (!num) {
    const err = new Error('PARSE_FAILED: Invalid serieNumero format');
    err.code = 'PARSE_FAILED';
    throw err;
  }
  
  if (serie.length !== 4) {
      const match = data.serieNumero.match(/^([A-Z])(\d+)-(\d+)$/);
      if (match) {
          serie = match[1] + match[2].padStart(3, '0');
          num = match[3];
      } else {
          serie = serie.padEnd(4, '0');
      }
  }

  num = num.padStart(8, '0');
  const seriesAndNumber = `${serie}-${num}`;

  const lines = data.lineas.map((l, i) => ({
    description: l.descripcion || 'Item',
    amount: parseAmount(l.valor, `lineas[${i}].valor`),
    taxType: l.tributo === 'EXO' || l.tributo === 'INA' ? l.tributo : 'IGV'
  }));

  const totalAmount = parseAmount(data.totales.total, 'totales.total');
  if (totalAmount <= 0) {
      const err = new Error('Monto inválido en totales.total');
      err.code = 'PARSE_FAILED';
      throw err;
  }

  return {
    type: data.tipoDocumento,
    seriesAndNumber,
    issueDate: data.fechaEmision,
    currency: data.moneda,
    issuer: {
      ruc: data.emisor.ruc,
      name: data.emisor.razonSocial || data.emisor.ruc
    },
    receiver: {
      ruc: data.receptor.ruc,
      name: data.receptor.razonSocial || data.receptor.ruc
    },
    lines,
    totals: {
      taxableAmount: parseAmount(data.totales.baseGravada || '0.00', 'totales.baseGravada'),
      exemptAmount: parseAmount(data.totales.baseExonerada || '0.00', 'totales.baseExonerada'),
      unaffectedAmount: parseAmount(data.totales.baseInafecta || '0.00', 'totales.baseInafecta'),
      taxAmount: parseAmount(data.totales.igv || '0.00', 'totales.igv'),
      totalAmount
    }
  };
}
