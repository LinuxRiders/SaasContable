export function classifyOperation(doc, companyRuc) {
  if (doc.receiver.ruc === companyRuc) {
    return 'COMPRA';
  } else if (doc.issuer.ruc === companyRuc) {
    return 'VENTA';
  } else {
    const err = new Error('REJECTED_NOT_TENANT: El comprobante no pertenece a la empresa');
    err.code = 'REJECTED_NOT_TENANT';
    throw err;
  }
}

