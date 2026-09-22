import { describe, it, expect } from 'vitest';
import { translateToJournalEntry } from '../translator.js';
import { buildTemplateBankSeed } from '../../../data/mockPlantillasReglas.js';
import { mockPlantillas } from '../../../data/mockPlantillas.js';
import { mockPlanContable } from '../../../data/mockPlanContable.js';
import { buildAccountIndex } from '../accounts.js';

describe('Translator with Rule Evaluator (T050, RF-08, RF-20, RD-10)', () => {
  const seedTemplates = buildTemplateBankSeed(mockPlantillas);
  const pcgeIndex = buildAccountIndex(mockPlanContable);

  const pcgeWithoutAmarres = buildAccountIndex(
    mockPlanContable.map(acc => ({ ...acc, amarre1: null, amarre2: null, amarre3: null }))
  );

  it('produces expected lines for every testCase of every seed template (PL-01 to PL-07)', () => {
    for (const template of seedTemplates) {
      const version = template.versions[0];
      for (const tc of version.testCases) {
        const entry = translateToJournalEntry(
          tc.document,
          { template, version },
          pcgeIndex,
          { idGenerator: () => 'entry-123' }
        );

        expect(entry.templateId).toBe(template.templateId);
        expect(entry.templateVersion).toBe(version.version);
        expect(entry.lines).toBeDefined();

        // Verificar que coincida con tc.expectedLines
        expect(entry.lines.length).toBe(tc.expectedLines.length);

        for (const exp of tc.expectedLines) {
          const matched = entry.lines.find(
            l =>
              l.side === exp.side &&
              l.accountCode === exp.accountCode &&
              (l.costCenter || null) === (exp.costCenter || null) &&
              l.functionalAmountCents === exp.functionalAmountCents
          );
          expect(
            matched,
            `No se encontró la línea esperada ${JSON.stringify(exp)} en ${template.templateId} - ${tc.caseId}`
          ).toBeDefined();
        }
      }
    }
  });

  it('generates different entries for same document with and without amarres', () => {
    const pl01 = seedTemplates.find(t => t.templateId === 'PL-01');
    const doc = pl01.versions[0].testCases[0].document;

    const entryWith = translateToJournalEntry(doc, { template: pl01, version: pl01.versions[0] }, pcgeIndex);
    const entryWithout = translateToJournalEntry(doc, { template: pl01, version: pl01.versions[0] }, pcgeWithoutAmarres);

    expect(entryWith.lines.length).toBe(5); // base, tax, counterpart, destD, destC
    expect(entryWithout.lines.length).toBe(3); // base, tax, counterpart (sin destinos)
  });

  it('omits IGV line when igv is 0', () => {
    const pl01 = seedTemplates.find(t => t.templateId === 'PL-01');
    const doc = {
      ...pl01.versions[0].testCases[0].document,
      igvCents: 0,
      totalCents: 10000
    };

    const entry = translateToJournalEntry(doc, { template: pl01, version: pl01.versions[0] }, pcgeIndex);
    expect(entry.lines.some(l => l.role === 'TAX')).toBe(false);
  });

  it('translates VENTA correctly (counterpart D, base H, IGV H)', () => {
    const pl04 = seedTemplates.find(t => t.templateId === 'PL-04');
    const doc = pl04.versions[0].testCases[0].document;

    const entry = translateToJournalEntry(doc, { template: pl04, version: pl04.versions[0] }, pcgeIndex);
    const counterpart = entry.lines.find(l => l.role === 'COUNTERPART');
    const base = entry.lines.find(l => l.role === 'BASE');
    const tax = entry.lines.find(l => l.role === 'TAX');

    expect(counterpart.side).toBe('D');
    expect(counterpart.accountCode).toBe('1212101');
    expect(base.side).toBe('H');
    expect(base.accountCode).toBe('7012101');
    expect(tax.side).toBe('H');
    expect(tax.accountCode).toBe('4011101');
  });

  it('sets templateId, templateVersion, appliedRules and ruleId on lines', () => {
    const pl07 = seedTemplates.find(t => t.templateId === 'PL-07');
    const docFlete = pl07.versions[0].testCases.find(c => c.caseId === 'TC-FLETE').document;

    const entry = translateToJournalEntry(docFlete, { template: pl07, version: pl07.versions[0] }, pcgeIndex);
    expect(entry.templateId).toBe('PL-07');
    expect(entry.templateVersion).toBe(1);
    expect(entry.appliedRules).toContain('R-FLETE');

    const baseLine = entry.lines.find(l => l.role === 'BASE');
    expect(baseLine.ruleId).toBe('R-FLETE');
  });

  it('translates USD document with FX rate matching plan §3 exactly (T087, R-02, RF-07)', () => {
    const pl07 = seedTemplates.find(t => t.templateId === 'PL-07');
    const docUSD = {
      operationType: 'COMPRA',
      currency: 'USD',
      issueDate: '2026-09-15',
      issuer: { ruc: '20555555551', name: 'TRANSPORTES ANDINOS DEMO SAC' },
      lines: [
        { lineNo: 1, description: 'Flete Cusco - Puno', amountCents: 84746, taxCode: 'IGV' }
      ],
      totals: {
        totalAmount: 100000,
        taxAmount: 15254,
        taxableAmount: 84746
      }
    };

    const fx = { rateMilli: 3751, rateDate: '2026-09-14', provisional: true };

    const entry = translateToJournalEntry(docUSD, { template: pl07, version: pl07.versions[0], fx }, pcgeIndex);

    expect(entry.currency).toBe('USD');
    expect(entry.fx).toEqual(fx);
    expect(entry.provisionalFxRate).toBe(true);
    expect(entry.pendingReasons).toEqual([]);

    expect(entry.lines).toHaveLength(5);

    // Línea 1: BASE
    const l1 = entry.lines[0];
    expect(l1.role).toBe('BASE');
    expect(l1.accountCode).toBe('6311101');
    expect(l1.costCenter).toBe('CC-LOGISTICA');
    expect(l1.originalAmountCents).toBe(84746);
    expect(l1.functionalAmountCents).toBe(317882);
    expect(l1.ruleId).toBe('R-FLETE');

    // Línea 2: TAX
    const l2 = entry.lines[1];
    expect(l2.role).toBe('TAX');
    expect(l2.accountCode).toBe('4011101');
    expect(l2.originalAmountCents).toBe(15254);
    expect(l2.functionalAmountCents).toBe(57218);

    // Línea 3: COUNTERPART
    const l3 = entry.lines[2];
    expect(l3.role).toBe('COUNTERPART');
    expect(l3.accountCode).toBe('4212101');
    expect(l3.originalAmountCents).toBe(100000);
    expect(l3.functionalAmountCents).toBe(375100);

    // Línea 4: DEST_DEBIT
    const l4 = entry.lines[3];
    expect(l4.role).toBe('DEST_DEBIT');
    expect(l4.accountCode).toBe('9411101');
    expect(l4.costCenter).toBe('CC-LOGISTICA');
    expect(l4.originalAmountCents).toBeNull();
    expect(l4.functionalAmountCents).toBe(317882);

    // Línea 5: DEST_CREDIT
    const l5 = entry.lines[4];
    expect(l5.role).toBe('DEST_CREDIT');
    expect(l5.accountCode).toBe('7911101');
    expect(l5.originalAmountCents).toBeNull();
    expect(l5.functionalAmountCents).toBe(317882);
  });

  it('sets NO_FX_RATE and empty lines when USD document has no FX rate', () => {
    const pl07 = seedTemplates.find(t => t.templateId === 'PL-07');
    const docUSD = {
      operationType: 'COMPRA',
      currency: 'USD',
      issueDate: '2026-05-15',
      lines: [{ lineNo: 1, description: 'Servicio', amountCents: 10000, taxCode: 'IGV' }],
      totals: { totalAmount: 11800, taxAmount: 1800, taxableAmount: 10000 }
    };

    const entry = translateToJournalEntry(docUSD, { template: pl07, version: pl07.versions[0], fx: null }, pcgeIndex);

    expect(entry.currency).toBe('USD');
    expect(entry.pendingReasons).toContain('NO_FX_RATE');
    expect(entry.lines).toHaveLength(0);
  });
});
