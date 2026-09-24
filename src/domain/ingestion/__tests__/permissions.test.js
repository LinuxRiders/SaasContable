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
    it('allows MAKER to ingest, update staging, and revalidate, but not approve or edit templates', () => {
      expect(can('MAKER', 'INGEST')).toBe(true);
      expect(can('MAKER', 'UPDATE_STAGING')).toBe(true);
      expect(can('MAKER', 'REVALIDATE')).toBe(true);
      expect(can('MAKER', 'CANCEL')).toBe(true);
      expect(can('MAKER', 'VIEW_ACCOUNTING_CONFIG')).toBe(true);
      
      expect(can('MAKER', 'APPROVE')).toBe(false);
      expect(can('MAKER', 'EDIT_TEMPLATES')).toBe(false);
      expect(can('MAKER', 'EDIT_ACCOUNT_MAPPING')).toBe(false);
      expect(can('MAKER', 'VIEW_CONFIG_AUDIT')).toBe(false);
    });

    it('allows CHECKER to query pending approval, approve and reject, but not ingest or edit templates', () => {
      expect(can('CHECKER', 'QUERY_PENDING_APPROVAL')).toBe(true);
      expect(can('CHECKER', 'APPROVE')).toBe(true);
      expect(can('CHECKER', 'REJECT')).toBe(true);
      expect(can('CHECKER', 'VIEW_ACCOUNTING_CONFIG')).toBe(true);

      expect(can('CHECKER', 'INGEST')).toBe(false);
      expect(can('CHECKER', 'EDIT_TEMPLATES')).toBe(false);
      expect(can('CHECKER', 'VIEW_CONFIG_AUDIT')).toBe(false);
    });

    it('allows AUDITOR to view configs, audit and traces, but no writes', () => {
      expect(can('AUDITOR', 'VIEW_ACCOUNTING_CONFIG')).toBe(true);
      expect(can('AUDITOR', 'VIEW_CONFIG_AUDIT')).toBe(true);
      expect(can('AUDITOR', 'QUERY_STAGING')).toBe(true);
      expect(can('AUDITOR', 'VIEW_TRACE')).toBe(true);

      expect(can('AUDITOR', 'INGEST')).toBe(false);
      expect(can('AUDITOR', 'UPDATE_STAGING')).toBe(false);
      expect(can('AUDITOR', 'EDIT_TEMPLATES')).toBe(false);
      expect(can('AUDITOR', 'EDIT_ACCOUNT_MAPPING')).toBe(false);
    });

    it('enforces SoD for ADMIN: manages accounting configuration and templates, but is not Maker nor Checker', () => {
      // Allowed admin operations
      expect(can('ADMIN', 'VIEW_ACCOUNTING_CONFIG')).toBe(true);
      expect(can('ADMIN', 'VIEW_CONFIG_AUDIT')).toBe(true);
      expect(can('ADMIN', 'EDIT_ACCOUNT_MAPPING')).toBe(true);
      expect(can('ADMIN', 'EDIT_CLASSIFICATION_RULES')).toBe(true);
      expect(can('ADMIN', 'EDIT_TEMPLATES')).toBe(true);
      expect(can('ADMIN', 'RUN_TEMPLATE_TESTS')).toBe(true);
      expect(can('ADMIN', 'ACTIVATE_TEMPLATES')).toBe(true);
      expect(can('ADMIN', 'SIMULATE')).toBe(true);

      // Maker & Checker operations revoked from ADMIN (RD-05 Segregation of Duties)
      expect(can('ADMIN', 'INGEST')).toBe(false);
      expect(can('ADMIN', 'UPDATE_STAGING')).toBe(false);
      expect(can('ADMIN', 'REVALIDATE')).toBe(false);
      expect(can('ADMIN', 'CANCEL')).toBe(false);
      expect(can('ADMIN', 'APPROVE')).toBe(false);
      expect(can('ADMIN', 'REJECT')).toBe(false);

      // Removed old model operations
      expect(can('ADMIN', 'LIST_TEMPLATE_BANK')).toBe(false);
      expect(can('ADMIN', 'SET_COMPANY_TEMPLATE_ACTIVATION')).toBe(false);
      // Feature 002: Ingestion pipeline permissions (T003)
      expect(can('ADMIN', 'INGEST_DOCUMENTS')).toBe(false);
      expect(can('ADMIN', 'REGISTER_MANUAL_DOCUMENT')).toBe(false);
      expect(can('ADMIN', 'VIEW_RECEIVED_DOCUMENTS')).toBe(true);
      expect(can('ADMIN', 'SET_DEMO_TOGGLES')).toBe(true);
    });

    it('manages Feature 002 intake permissions correctly across roles', () => {
      // INGEST_DOCUMENTS & REGISTER_MANUAL_DOCUMENT: only MAKER
      expect(can('MAKER', 'INGEST_DOCUMENTS')).toBe(true);
      expect(can('MAKER', 'REGISTER_MANUAL_DOCUMENT')).toBe(true);
      expect(can('CHECKER', 'INGEST_DOCUMENTS')).toBe(false);
      expect(can('CHECKER', 'REGISTER_MANUAL_DOCUMENT')).toBe(false);
      expect(can('AUDITOR', 'INGEST_DOCUMENTS')).toBe(false);
      expect(can('AUDITOR', 'REGISTER_MANUAL_DOCUMENT')).toBe(false);

      // VIEW_RECEIVED_DOCUMENTS: all roles
      expect(can('MAKER', 'VIEW_RECEIVED_DOCUMENTS')).toBe(true);
      expect(can('CHECKER', 'VIEW_RECEIVED_DOCUMENTS')).toBe(true);
      expect(can('AUDITOR', 'VIEW_RECEIVED_DOCUMENTS')).toBe(true);
      expect(can('ADMIN', 'VIEW_RECEIVED_DOCUMENTS')).toBe(true);

      // SET_DEMO_TOGGLES: all except AUDITOR
      expect(can('MAKER', 'SET_DEMO_TOGGLES')).toBe(true);
      expect(can('CHECKER', 'SET_DEMO_TOGGLES')).toBe(true);
      expect(can('ADMIN', 'SET_DEMO_TOGGLES')).toBe(true);
      expect(can('AUDITOR', 'SET_DEMO_TOGGLES')).toBe(false);
    });

    it('denies everything for UNKNOWN', () => {
      expect(can('UNKNOWN', 'INGEST')).toBe(false);
      expect(can('UNKNOWN', 'VIEW_TRACE')).toBe(false);
      expect(can('UNKNOWN', 'VIEW_ACCOUNTING_CONFIG')).toBe(false);
      expect(can('UNKNOWN', 'EDIT_TEMPLATES')).toBe(false);
      expect(can('UNKNOWN', 'EDIT_ACCOUNT_MAPPING')).toBe(false);
    });
  });
});
