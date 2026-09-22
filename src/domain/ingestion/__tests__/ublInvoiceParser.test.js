// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { parseUblInvoice } from '../parsers/ublInvoiceParser.js';

describe('UBL Invoice Parser', () => {
  const validXml = `<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
    <cbc:ID>F001-00000456</cbc:ID>
    <cbc:IssueDate>2026-09-15</cbc:IssueDate>
    <cbc:InvoiceTypeCode listID="0101">01</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode listID="ISO 4217 Alpha">USD</cbc:DocumentCurrencyCode>
    
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="6">20555555551</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>TRANSPORTES ANDINOS DEMO SAC</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>
    
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="6">20450656934</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>PACHATUSANTREK SAC</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>
    
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="USD">152.54</cbc:TaxAmount>
        <!-- IGV -->
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="USD">847.46</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="USD">152.54</cbc:TaxAmount>
            <cac:TaxCategory>
                <cac:TaxScheme>
                    <cbc:ID>1000</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
        <!-- EXO -->
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="USD">50.00</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="USD">0.00</cbc:TaxAmount>
            <cac:TaxCategory>
                <cac:TaxScheme>
                    <cbc:ID>9997</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
        <!-- INA -->
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="USD">20.00</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="USD">0.00</cbc:TaxAmount>
            <cac:TaxCategory>
                <cac:TaxScheme>
                    <cbc:ID>9998</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>
    
    <cac:LegalMonetaryTotal>
        <cbc:PayableAmount currencyID="USD">1070.00</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
    
    <cac:InvoiceLine>
        <cbc:ID>1</cbc:ID>
        <cbc:LineExtensionAmount currencyID="USD">847.46</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Description>Flete Cusco - Puno</cbc:Description>
        </cac:Item>
        <cac:TaxTotal>
            <cac:TaxSubtotal>
                <cac:TaxCategory>
                    <cac:TaxScheme>
                        <cbc:ID>1000</cbc:ID>
                    </cac:TaxScheme>
                </cac:TaxCategory>
            </cac:TaxSubtotal>
        </cac:TaxTotal>
    </cac:InvoiceLine>
</Invoice>`;

  it('parses a valid UBL 2.1 invoice', () => {
    const doc = parseUblInvoice(validXml);
    expect(doc.type).toBe('01');
    expect(doc.seriesAndNumber).toBe('F001-00000456');
    expect(doc.issueDate).toBe('2026-09-15');
    expect(doc.currency).toBe('USD');
    expect(doc.issuer.ruc).toBe('20555555551');
    expect(doc.issuer.name).toBe('TRANSPORTES ANDINOS DEMO SAC');
    expect(doc.receiver.ruc).toBe('20450656934');
    expect(doc.totals.taxableAmount).toBe(84746);
    expect(doc.totals.exemptAmount).toBe(5000);
    expect(doc.totals.unaffectedAmount).toBe(2000);
    expect(doc.totals.taxAmount).toBe(15254);
    expect(doc.totals.totalAmount).toBe(107000);
    
    expect(doc.lines).toHaveLength(1);
    expect(doc.lines[0].description).toBe('Flete Cusco - Puno');
    expect(doc.lines[0].amount).toBe(84746);
    expect(doc.lines[0].taxType).toBe('IGV');
  });

  it('rejects root CreditNote', () => {
    const xml = validXml.replace('<Invoice', '<CreditNote').replace('</Invoice>', '</CreditNote>');
    expect(() => parseUblInvoice(xml)).toThrow('Tipo de documento no soportado');
  });

  it('rejects InvoiceTypeCode 03', () => {
    const xml = validXml.replace('<cbc:InvoiceTypeCode listID="0101">01</cbc:InvoiceTypeCode>', '<cbc:InvoiceTypeCode listID="0101">03</cbc:InvoiceTypeCode>');
    expect(() => parseUblInvoice(xml)).toThrow('Tipo de documento no soportado');
  });

  it('rejects missing RUC emisor', () => {
    const xml = validXml.replace('<cbc:ID schemeID="6">20555555551</cbc:ID>', '');
    expect(() => parseUblInvoice(xml)).toThrow('PARSE_FAILED');
  });

  it('rejects malformed XML', () => {
    expect(() => parseUblInvoice('<Invoice> unclosed')).toThrow('PARSE_FAILED');
  });
});

