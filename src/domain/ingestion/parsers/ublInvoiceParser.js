import { parseDecimalToCents } from '../money.js';

function getTagContent(element, ns, tagName) {
  if (!element) return null;
  const nodes = element.getElementsByTagNameNS(ns, tagName);
  if (nodes.length > 0) {
    return nodes[0].textContent.trim();
  }
  
  // For happy-dom or generic DOM parsers where NS might fail
  const fallback = element.getElementsByTagName(`cbc:${tagName}`);
  if (fallback.length > 0) return fallback[0].textContent.trim();
  
  const fallbackCac = element.getElementsByTagName(`cac:${tagName}`);
  if (fallbackCac.length > 0) return fallbackCac[0].textContent.trim();
  
  const fallbackUnprefixed = element.getElementsByTagName(tagName);
  if (fallbackUnprefixed.length > 0) return fallbackUnprefixed[0].textContent.trim();

  return null;
}

export function parseUblInvoice(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    const err = new Error('PARSE_FAILED: Malformed XML');
    err.code = 'PARSE_FAILED';
    throw err;
  }

  const rootNodeName = xmlDoc.documentElement.localName || xmlDoc.documentElement.nodeName;
  if (rootNodeName !== 'Invoice' && !rootNodeName.endsWith(':Invoice')) {
    const err = new Error('Tipo de documento no soportado en esta versión');
    err.code = 'PARSE_FAILED';
    throw err;
  }

  const cbc = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";
  const cac = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2";

  const typeCode = getTagContent(xmlDoc, cbc, 'InvoiceTypeCode');
  if (typeCode !== '01') {
    const err = new Error('Tipo de documento no soportado en esta versión');
    err.code = 'PARSE_FAILED';
    throw err;
  }

  const seriesAndNumber = getTagContent(xmlDoc, cbc, 'ID');
  const issueDate = getTagContent(xmlDoc, cbc, 'IssueDate');
  const currency = getTagContent(xmlDoc, cbc, 'DocumentCurrencyCode');

  // Supplier
  let issuerRuc = null;
  let issuerName = null;
  const supplierNodes = xmlDoc.getElementsByTagNameNS(cac, 'AccountingSupplierParty');
  const supplierNode = supplierNodes.length > 0 ? supplierNodes[0] : (xmlDoc.getElementsByTagName('cac:AccountingSupplierParty')[0]);
  
  if (supplierNode) {
    issuerRuc = getTagContent(supplierNode, cbc, 'ID'); // we assume schemeID=6 is the only ID or first ID
    issuerName = getTagContent(supplierNode, cbc, 'RegistrationName');
  }

  // Customer
  let receiverRuc = null;
  let receiverName = null;
  const customerNodes = xmlDoc.getElementsByTagNameNS(cac, 'AccountingCustomerParty');
  const customerNode = customerNodes.length > 0 ? customerNodes[0] : (xmlDoc.getElementsByTagName('cac:AccountingCustomerParty')[0]);

  if (customerNode) {
    receiverRuc = getTagContent(customerNode, cbc, 'ID');
    receiverName = getTagContent(customerNode, cbc, 'RegistrationName');
  }

  if (!seriesAndNumber || !issueDate || !currency || !issuerRuc || !receiverRuc) {
    const err = new Error('PARSE_FAILED: Missing mandatory fields');
    err.code = 'PARSE_FAILED';
    throw err;
  }

  // Totals
  let taxAmount = 0;
  let taxableAmount = 0;
  let exemptAmount = 0;
  let unaffectedAmount = 0;

  const taxTotalNodes = xmlDoc.getElementsByTagNameNS(cac, 'TaxTotal');
  const taxTotalNode = taxTotalNodes.length > 0 ? taxTotalNodes[0] : (xmlDoc.getElementsByTagName('cac:TaxTotal')[0]);

  if (taxTotalNode) {
    const globalTax = getTagContent(taxTotalNode, cbc, 'TaxAmount');
    if (globalTax) taxAmount = parseDecimalToCents(globalTax);

    const subtotals = taxTotalNode.getElementsByTagNameNS(cac, 'TaxSubtotal');
    const subtotalsFallback = taxTotalNode.getElementsByTagName('cac:TaxSubtotal');
    const iter = subtotals.length > 0 ? subtotals : subtotalsFallback;
    
    for (let i = 0; i < iter.length; i++) {
        const sub = iter[i];
        const taxId = getTagContent(sub, cbc, 'ID');
        const amt = getTagContent(sub, cbc, 'TaxableAmount');
        if (amt) {
            const cents = parseDecimalToCents(amt);
            if (taxId === '1000') taxableAmount += cents;
            else if (taxId === '9997') exemptAmount += cents;
            else if (taxId === '9998') unaffectedAmount += cents;
        }
    }
  }

  const legalMonetaryTotalNodes = xmlDoc.getElementsByTagNameNS(cac, 'LegalMonetaryTotal');
  const legalMonetaryTotalNode = legalMonetaryTotalNodes.length > 0 ? legalMonetaryTotalNodes[0] : (xmlDoc.getElementsByTagName('cac:LegalMonetaryTotal')[0]);
  let totalAmount = 0;
  if (legalMonetaryTotalNode) {
    const payable = getTagContent(legalMonetaryTotalNode, cbc, 'PayableAmount');
    if (payable) totalAmount = parseDecimalToCents(payable);
  }

  if (totalAmount <= 0) {
    const err = new Error('PARSE_FAILED: Invalid total');
    err.code = 'PARSE_FAILED';
    throw err;
  }

  // Lines
  const lineNodes = xmlDoc.getElementsByTagNameNS(cac, 'InvoiceLine');
  const linesFallback = xmlDoc.getElementsByTagName('cac:InvoiceLine');
  const linesIter = lineNodes.length > 0 ? lineNodes : linesFallback;

  const lines = [];
  for (let i = 0; i < linesIter.length; i++) {
    const line = linesIter[i];
    const desc = getTagContent(line, cbc, 'Description') || 'Item';
    const amountStr = getTagContent(line, cbc, 'LineExtensionAmount');
    const amount = amountStr ? parseDecimalToCents(amountStr) : 0;
    
    let taxType = 'IGV';
    const taxSchemeId = getTagContent(line, cbc, 'ID'); // Not fully accurate for lines, but simplifies it. 
    // In lines, the ID inside cac:TaxScheme is what matters. getTagContent finds the first ID.
    // Actually the first ID in InvoiceLine is the line ID. 
    const taxSchemes = line.getElementsByTagNameNS(cac, 'TaxScheme');
    const tsFallback = line.getElementsByTagName('cac:TaxScheme');
    const tsIter = taxSchemes.length > 0 ? taxSchemes : tsFallback;
    if (tsIter.length > 0) {
        const tid = getTagContent(tsIter[0], cbc, 'ID');
        if (tid === '9997') taxType = 'EXO';
        if (tid === '9998') taxType = 'INA';
    }
    
    lines.push({ description: desc, amount, taxType });
  }

  if (lines.length === 0) {
    const err = new Error('PARSE_FAILED: No lines');
    err.code = 'PARSE_FAILED';
    throw err;
  }

  return {
    type: typeCode,
    seriesAndNumber,
    issueDate,
    currency,
    issuer: { ruc: issuerRuc, name: issuerName || issuerRuc },
    receiver: { ruc: receiverRuc, name: receiverName || receiverRuc },
    lines,
    totals: { taxableAmount, exemptAmount, unaffectedAmount, taxAmount, totalAmount }
  };
}
