import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { xxPack } from '../../../data/jurisdictions/__fixtures__/xxPack.js';
import { interpretDocument } from '../interpretation.js';

describe('Agnosticismo del Motor Contable (RD-14, SC-002, SC-003, T090)', () => {
  it('(a) interpreta un documento de la jurisdicción ficticia XX de punta a punta', () => {
    const tenantFiscalId = 'TENANT_XX_99';
    const chart = [
      { codigo: 'ACC_EXP_01', descripcion: 'Servicios de Terceros', esCuentaU: true, activo: true },
      { codigo: 'ACC_LIAB_01', descripcion: 'Proveedores por Pagar', esCuentaU: true, activo: true }
    ];

    const mapping = {
      entries: [
        { roleCode: 'EXPENSE_SERVICE', accountCode: 'ACC_EXP_01' },
        { roleCode: 'SUPPLIERS_LIABILITY', accountCode: 'ACC_LIAB_01' }
      ]
    };

    const docXX = {
      id: 'doc-xx-01',
      tenantId: 'xx-tenant-01',
      rawPayloadRef: 'raw/xx-01.json',
      revision: 1,
      jurisdictionCode: 'XX',
      documentTypeCode: 'SERVICE_BILL',
      documentTypeVersion: 1,
      series: 'SB01',
      number: '00001234',
      issueDate: '2026-09-15',
      currency: 'XXD',
      parties: [
        { role: 'ISSUER', fiscalId: 'SUPPLIER_XX_01', legalName: 'Proveedor Utopiano XX' },
        { role: 'RECEIVER', fiscalId: tenantFiscalId, legalName: 'Mi Empresa en XX' }
      ],
      lines: [
        {
          lineNo: 1,
          description: 'Consultoría en arquitectura agnóstica',
          amountMinor: 50000
        }
      ],
      taxes: [],
      withholdings: [],
      references: [],
      totals: {
        netMinor: 50000,
        taxMinor: 0,
        withheldMinor: 0,
        totalMinor: 50000,
        payableMinor: 50000
      },
      operationTypeCode: 'SERVICE_EXPENSE'
    };

    const candidatesFor = (terna) => {
      const list = [];
      for (const tpl of xxPack.baseTemplates) {
        if (
          tpl.documentTypeCode === terna.documentTypeCode &&
          tpl.perspective === terna.perspective &&
          tpl.operationTypeCode === terna.operationTypeCode
        ) {
          list.push({
            template: { id: tpl.id, code: tpl.code, scope: 'PACK' },
            version: tpl
          });
        }
      }
      return list;
    };

    const res = interpretDocument(docXX, {
      pack: xxPack,
      tenantFiscalId,
      rules: [],
      candidatesFor,
      mapping,
      chart,
      functionalCurrency: 'XXD'
    });

    expect(res.ok).toBe(true);
    expect(res.entry).toBeDefined();
    expect(res.entry.templateId).toBe('XX.RECEIVED.SERVICE_BILL.SERVICE_EXPENSE');
    expect(res.entry.lines).toHaveLength(2);

    const debitLine = res.entry.lines.find(l => l.side === 'DEBIT');
    const creditLine = res.entry.lines.find(l => l.side === 'CREDIT');

    expect(debitLine.accountCode).toBe('ACC_EXP_01');
    expect(debitLine.functionalAmountMinor).toBe(50000);

    expect(creditLine.accountCode).toBe('ACC_LIAB_01');
    expect(creditLine.functionalAmountMinor).toBe(50000);

    // Traza completa de 5 pasos
    expect(res.trace.steps).toHaveLength(5);
  });

  it('(b) recorre con fs el código de src/domain/accounting/ y verifica ausencia total de términos locales', () => {
    const domainDir = path.resolve(__dirname, '..');

    function scanDir(dir) {
      let files = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (entry.name !== '__tests__' && entry.name !== '__fixtures__') {
            files = files.concat(scanDir(path.join(dir, entry.name)));
          }
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          files.push(path.join(dir, entry.name));
        }
      }
      return files;
    }

    const jsFiles = scanDir(domainDir);
    expect(jsFiles.length).toBeGreaterThan(5);

    const prohibitedTokens = ['RUC', 'IGV', 'PCGE', 'SUNAT', 'COMPRA', 'VENTA'];
    const prohibitedExactPatterns = [
      /'PEN'/,
      /"PEN"/,
      /`PEN`/
    ];
    // Literal numérico de 4 a 7 dígitos entre comillas (posible código de cuenta hardcodeado)
    const accountCodeRegex = /['"`]\d{4,7}['"`]/;

    const violations = [];

    for (const filePath of jsFiles) {
      const relPath = path.relative(domainDir, filePath);
      const content = fs.readFileSync(filePath, 'utf8');

      // 1. Prohibir palabras clave específicas de país
      for (const token of prohibitedTokens) {
        const wordRegex = new RegExp(`\\b${token}\\b`, 'i');
        if (wordRegex.test(content)) {
          violations.push({
            file: relPath,
            rule: `Prohibido término específico de jurisdicción: '${token}'`
          });
        }
      }

      // 2. Prohibir moneda PEN hardcodeada
      for (const pattern of prohibitedExactPatterns) {
        if (pattern.test(content)) {
          violations.push({
            file: relPath,
            rule: `Prohibida moneda 'PEN' hardcodeada como literal`
          });
        }
      }

      // 3. Prohibir cuentas contables hardcodeadas entre comillas
      const matchAccount = content.match(accountCodeRegex);
      if (matchAccount) {
        violations.push({
          file: relPath,
          rule: `Prohibido posible código de cuenta contable hardcodeado: ${matchAccount[0]}`
        });
      }
    }

    if (violations.length > 0) {
      console.error('Violaciones de agnosticismo encontradas:', violations);
    }

    expect(violations).toEqual([]);
  });
});

