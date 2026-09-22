export function validateCanonical(doc) {
  if (!/^\d{11}$/.test(doc.issuer.ruc)) {
    const err = new Error('RUC del emisor inválido');
    err.code = 'VALIDATION_FAILED';
    throw err;
  }
  if (!/^\d{11}$/.test(doc.receiver.ruc)) {
    const err = new Error('RUC del receptor inválido');
    err.code = 'VALIDATION_FAILED';
    throw err;
  }
  if (doc.currency !== 'PEN' && doc.currency !== 'USD') {
    const err = new Error(`Moneda no soportada: ${doc.currency}`);
    err.code = 'VALIDATION_FAILED';
    throw err;
  }
  if (doc.totals.totalAmount <= 0) {
    const err = new Error('Total inválido');
    err.code = 'VALIDATION_FAILED';
    throw err;
  }
  if (doc.issuer.ruc === doc.receiver.ruc) {
    const err = new Error('Emisor y receptor no pueden ser la misma empresa');
    err.code = 'VALIDATION_FAILED';
    throw err;
  }
}

