import { describe, it, expect } from 'vitest';
import { assertTransition } from '../stateMachine.js';

describe('State Machine', () => {
  it('allows DRAFT -> PENDING_INPUT', () => {
    expect(() => assertTransition('DRAFT', 'PENDING_INPUT')).not.toThrow();
  });

  it('allows DRAFT -> PENDING_APPROVAL', () => {
    expect(() => assertTransition('DRAFT', 'PENDING_APPROVAL')).not.toThrow();
  });

  it('allows PENDING_INPUT -> DRAFT', () => {
    expect(() => assertTransition('PENDING_INPUT', 'DRAFT')).not.toThrow();
  });

  it('allows PENDING_INPUT -> CANCELLED', () => {
    expect(() => assertTransition('PENDING_INPUT', 'CANCELLED')).not.toThrow();
  });

  it('rejects CANCELLED -> * with INVALID_TRANSITION', () => {
    expect(() => assertTransition('CANCELLED', 'DRAFT')).toThrowError(/INVALID_TRANSITION/);
    expect(() => assertTransition('CANCELLED', 'PENDING_INPUT')).toThrowError(/INVALID_TRANSITION/);
  });

  it('rejects PENDING_APPROVAL -> CANCELLED with INVALID_TRANSITION', () => {
    expect(() => assertTransition('PENDING_APPROVAL', 'CANCELLED')).toThrowError(/INVALID_TRANSITION/);
  });

  it('rejects undefined transitions', () => {
    expect(() => assertTransition('DRAFT', 'CANCELLED')).toThrowError(/INVALID_TRANSITION/);
  });
});

