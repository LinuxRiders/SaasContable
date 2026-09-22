import { describe, it, expect } from 'vitest';
import {
  initialActivations,
  offeredTemplates,
  resolveActiveVersion,
  assertTemplateOffered
} from '../templates.js';

describe('Template Activations and Offered Logic (T049, R-11, data-model §4.5)', () => {
  const bank = [
    {
      templateId: 'PL-01',
      retiredAt: null,
      versions: [{ version: 1, status: 'ACTIVE' }]
    },
    {
      templateId: 'PL-02',
      retiredAt: null,
      versions: [{ version: 1, status: 'ACTIVE' }]
    },
    {
      templateId: 'PL-03',
      retiredAt: null,
      versions: [{ version: 1, status: 'ACTIVE' }]
    },
    {
      templateId: 'PL-04',
      retiredAt: null,
      versions: [{ version: 1, status: 'ACTIVE' }]
    },
    {
      templateId: 'PL-05',
      retiredAt: null,
      versions: [{ version: 1, status: 'ACTIVE' }]
    },
    {
      templateId: 'PL-06',
      retiredAt: null,
      versions: [{ version: 1, status: 'ACTIVE' }]
    },
    {
      templateId: 'PL-07',
      retiredAt: null,
      versions: [{ version: 1, status: 'ACTIVE' }]
    },
    {
      templateId: 'PL-RETIRED',
      retiredAt: '2026-09-01T00:00:00Z',
      versions: [{ version: 1, status: 'RETIRED' }]
    },
    {
      templateId: 'PL-NO-ACTIVE-VER',
      retiredAt: null,
      versions: [{ version: 1, status: 'DRAFT' }]
    }
  ];

  it('initialActivations creates activations from plantillasActivasIds with lazy migration', () => {
    const empresa = {
      plantillasActivasIds: ['TPL-COMPRA-01', 'TPL-SERV-01']
    };
    const acts = initialActivations(empresa);
    // TPL-COMPRA-01 -> PL-01
    // TPL-SERV-01 -> PL-02, PL-03, PL-06, PL-07
    const activeIds = acts.filter(a => a.active).map(a => a.templateId);
    expect(activeIds).toEqual(expect.arrayContaining(['PL-01', 'PL-02', 'PL-03', 'PL-06', 'PL-07']));
    expect(activeIds).not.toContain('PL-04');
  });

  it('initialActivations returns empty when plantillasActivasIds is empty', () => {
    const empresa = { plantillasActivasIds: [] };
    const acts = initialActivations(empresa);
    expect(acts).toHaveLength(0);
  });

  it('offeredTemplates returns only active templates with ACTIVE version and not retired', () => {
    const activations = [
      { templateId: 'PL-01', active: true },
      { templateId: 'PL-02', active: false }, // inactive for company
      { templateId: 'PL-RETIRED', active: true }, // retired globally
      { templateId: 'PL-NO-ACTIVE-VER', active: true } // no active version
    ];

    const offered = offeredTemplates(bank, activations);
    expect(offered.map(t => t.templateId)).toEqual(['PL-01']);
  });

  it('resolveActiveVersion finds the ACTIVE version of a template', () => {
    const tpl = bank.find(t => t.templateId === 'PL-01');
    const ver = resolveActiveVersion(tpl);
    expect(ver.version).toBe(1);
    expect(ver.status).toBe('ACTIVE');

    const draftOnly = bank.find(t => t.templateId === 'PL-NO-ACTIVE-VER');
    expect(resolveActiveVersion(draftOnly)).toBeNull();
  });

  it('assertTemplateOffered throws TEMPLATE_NOT_ACTIVE if template is not offered', () => {
    const activations = [{ templateId: 'PL-01', active: true }];

    expect(() => assertTemplateOffered('PL-01', bank, activations)).not.toThrow();

    expect(() => assertTemplateOffered('PL-02', bank, activations)).toThrowError(/TEMPLATE_NOT_ACTIVE/);
    expect(() => assertTemplateOffered('PL-RETIRED', bank, activations)).toThrowError(/TEMPLATE_NOT_ACTIVE/);
  });
});
