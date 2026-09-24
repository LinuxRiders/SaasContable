import { describe, it, expect } from 'vitest';
import { createReaderRegistry } from '../readerRegistry.js';

describe('createReaderRegistry (T012)', () => {
  it('selects the first reader that can handle the metadata, in insertion order', () => {
    const readerA = { id: 'A', canHandle: (meta) => meta.sourceFormat === 'XML' };
    const readerB = { id: 'B', canHandle: (meta) => meta.sourceFormat === 'XML' };
    const registry = createReaderRegistry([readerA, readerB]);

    const selected = registry.select({ sourceFormat: 'XML' });
    expect(selected.id).toBe('A');
  });

  it('returns null when no reader can handle the metadata', () => {
    const registry = createReaderRegistry([{ id: 'A', canHandle: () => false }]);
    expect(registry.select({ sourceFormat: 'UNKNOWN' })).toBeNull();
  });

  it('getAll returns a copy of the registered readers', () => {
    const readerA = { id: 'A', canHandle: () => true };
    const registry = createReaderRegistry([readerA]);
    const all = registry.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('A');
  });
});
