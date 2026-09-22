import { describe, it, expect } from 'vitest';
import { mapSessionRole, can } from '../permissions.js';

describe('Permissions', () => {
  describe('mapSessionRole', () => {
    it('maps session roles to internal roles', () => {
      expect(mapSessionRole('Maker')).toBe('MAKER');
      expect(mapSessionRole('Checker')).toBe('CHECKER');
      expect(mapSessionRole('Auditor')).toBe('AUDITOR');
      expect(mapSessionRole('Admin')).toBe('ADMIN');
      expect(mapSessionRole('SomethingElse')).toBe('UNKNOWN');
    });
  });

  describe('can', () => {
    it('allows MAKER to ingest, update staging, and revalidate', () => {
      expect(can('MAKER', 'INGEST')).toBe(true);
      expect(can('MAKER', 'UPDATE_STAGING')).toBe(true);
      expect(can('MAKER', 'REVALIDATE')).toBe(true);
      expect(can('MAKER', 'CANCEL')).toBe(true);
      
      expect(can('MAKER', 'APPROVE')).toBe(false); // only Checker/Admin
    });

    it('allows CHECKER to query pending approval', () => {
      expect(can('CHECKER', 'QUERY_PENDING_APPROVAL')).toBe(true);
      expect(can('CHECKER', 'INGEST')).toBe(false);
    });

    it('allows AUDITOR to view traces and queries, but no writes', () => {
      expect(can('AUDITOR', 'QUERY_STAGING')).toBe(true);
      expect(can('AUDITOR', 'VIEW_TRACE')).toBe(true);
      expect(can('AUDITOR', 'INGEST')).toBe(false);
      expect(can('AUDITOR', 'UPDATE_STAGING')).toBe(false);
    });

    it('makes ADMIN equal to AUDITOR plus they can approve', () => {
      expect(can('ADMIN', 'VIEW_TRACE')).toBe(true);
      expect(can('ADMIN', 'APPROVE')).toBe(true);
      expect(can('ADMIN', 'INGEST')).toBe(false);
      expect(can('ADMIN', 'UPDATE_STAGING')).toBe(false);
      expect(can('ADMIN', 'REVALIDATE')).toBe(false);
      expect(can('ADMIN', 'CANCEL')).toBe(false);
    });

    it('manages template bank and activation permissions (T036)', () => {
      // LIST_TEMPLATE_BANK: AUDITOR y ADMIN
      expect(can('AUDITOR', 'LIST_TEMPLATE_BANK')).toBe(true);
      expect(can('ADMIN', 'LIST_TEMPLATE_BANK')).toBe(true);
      expect(can('MAKER', 'LIST_TEMPLATE_BANK')).toBe(false);
      expect(can('CHECKER', 'LIST_TEMPLATE_BANK')).toBe(false);

      // EDIT_TEMPLATES: solo ADMIN
      expect(can('ADMIN', 'EDIT_TEMPLATES')).toBe(true);
      expect(can('AUDITOR', 'EDIT_TEMPLATES')).toBe(false);
      expect(can('MAKER', 'EDIT_TEMPLATES')).toBe(false);
      expect(can('CHECKER', 'EDIT_TEMPLATES')).toBe(false);

      // SET_COMPANY_TEMPLATE_ACTIVATION: solo ADMIN
      expect(can('ADMIN', 'SET_COMPANY_TEMPLATE_ACTIVATION')).toBe(true);
      expect(can('AUDITOR', 'SET_COMPANY_TEMPLATE_ACTIVATION')).toBe(false);
      expect(can('MAKER', 'SET_COMPANY_TEMPLATE_ACTIVATION')).toBe(false);
      expect(can('CHECKER', 'SET_COMPANY_TEMPLATE_ACTIVATION')).toBe(false);
    });

    it('denies everything for UNKNOWN', () => {
      expect(can('UNKNOWN', 'INGEST')).toBe(false);
      expect(can('UNKNOWN', 'VIEW_TRACE')).toBe(false);
      expect(can('UNKNOWN', 'LIST_TEMPLATE_BANK')).toBe(false);
      expect(can('UNKNOWN', 'EDIT_TEMPLATES')).toBe(false);
      expect(can('UNKNOWN', 'SET_COMPANY_TEMPLATE_ACTIVATION')).toBe(false);
    });
  });
});

