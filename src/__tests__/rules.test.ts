import { describe, it, expect } from 'vitest';
import { validateTree } from '../lib/validator/rules';
import { PRESETS } from '../lib/presets/config';
import type { ParsedRow, PresetConfig } from '../types';

const asPreset: PresetConfig = PRESETS.archivesspace;

describe('validateTree', () => {
  it('passes valid rows', () => {
    const rows: ParsedRow[] = [
      { __rowNum__: 1, unitid: 'MC-001', unittitle: 'Collection', level: 'collection' },
    ];
    expect(validateTree(rows, asPreset)).toHaveLength(0);
  });

  it('flags rows missing both unitid and unittitle', () => {
    const rows: ParsedRow[] = [
      { __rowNum__: 1, level: 'collection' },
    ];
    const errors = validateTree(rows, asPreset);
    expect(errors.some((e) => e.field === 'unitid / unittitle')).toBe(true);
  });

  it('flags empty level', () => {
    const rows: ParsedRow[] = [
      { __rowNum__: 1, unitid: '1', unittitle: 'Test', level: '' },
    ];
    const errors = validateTree(rows, asPreset);
    expect(errors.some((e) => e.field === 'level')).toBe(true);
  });

  it('flags non-ISO dates on ArchivesSpace preset', () => {
    const rows: ParsedRow[] = [
      { __rowNum__: 1, unitid: '1', unittitle: 'Test', level: 'collection', unitdate: 'not a date' },
    ];
    const errors = validateTree(rows, asPreset);
    expect(errors.some((e) => e.field === 'unitdate')).toBe(true);
  });

  it('accepts ISO 8601 dates', () => {
    const rows: ParsedRow[] = [
      { __rowNum__: 1, unitid: '1', unittitle: 'Test', level: 'collection', unitdate: '1920/1940' },
    ];
    expect(validateTree(rows, asPreset)).toHaveLength(0);
  });

  it('flags reversed chronological order', () => {
    const rows: ParsedRow[] = [
      { __rowNum__: 1, unitid: '1', unittitle: 'Test', level: 'collection', startDate: '1940', endDate: '1920' },
    ];
    const errors = validateTree(rows, asPreset);
    // startDate/endDate don't match unitdate field, but the chronological check should fire
    const chronoErrors = errors.filter((e) => e.message.includes('reversed'));
    expect(chronoErrors.length).toBeGreaterThan(0);
  });

  it('flags duplicate unitid', () => {
    const rows: ParsedRow[] = [
      { __rowNum__: 1, unitid: 'dup', unittitle: 'A', level: 'collection' },
      { __rowNum__: 2, unitid: 'dup', unittitle: 'B', level: 'series' },
    ];
    const errors = validateTree(rows, asPreset);
    const dupErrors = errors.filter((e) => e.message.includes('Duplicate unitid'));
    expect(dupErrors.length).toBeGreaterThan(0);
  });

  it('flags extent format on ArchivesSpace preset', () => {
    const rows: ParsedRow[] = [
      { __rowNum__: 1, unitid: '1', unittitle: 'Test', level: 'collection', physdesc: 'twelve boxes' },
    ];
    const errors = validateTree(rows, asPreset);
    expect(errors.some((e) => e.field === 'physdesc')).toBe(true);
  });

  it('flags unitid audience internal on ArchivesSpace', () => {
    const rows: ParsedRow[] = [
      { __rowNum__: 1, unitid: '1', unittitle: 'Test', level: 'collection', unitidAudience: 'internal' },
    ];
    const errors = validateTree(rows, asPreset);
    expect(errors.some((e) => e.field === 'unitid @audience')).toBe(true);
  });

  it('shows fewer errors on AtoM preset for same data', () => {
    const rows: ParsedRow[] = [
      { __rowNum__: 1, unitid: '1', unittitle: 'Test', level: 'collection', physdesc: 'twelve boxes' },
    ];
    const atomErrors = validateTree(rows, PRESETS.atom);
    const asErrors = validateTree(rows, PRESETS.archivesspace);
    // AtoM is more permissive than ArchivesSpace
    expect(atomErrors.length).toBeLessThanOrEqual(asErrors.length);
  });
});
