import { describe, it, expect } from 'vitest';
import { buildTreeFromLevels } from '../lib/hierarchy/level-column';

describe('buildTreeFromLevels', () => {
  it('builds a single root node', () => {
    const rows = [
      { __rowNum__: 1, unitid: 'MC-001', level: 'collection', unittitle: 'Collection' },
    ];
    const { trees, warnings } = buildTreeFromLevels(rows);
    expect(trees).toHaveLength(1);
    expect(trees[0].id).toBe('MC-001');
    expect(warnings).toHaveLength(0);
  });

  it('builds parent-child hierarchy from ordered levels', () => {
    const rows = [
      { __rowNum__: 1, unitid: '1', level: 'collection', unittitle: 'Col' },
      { __rowNum__: 2, unitid: '1.1', level: 'series', unittitle: 'Series' },
      { __rowNum__: 3, unitid: '1.1.1', level: 'file', unittitle: 'File' },
    ];
    const { trees } = buildTreeFromLevels(rows);
    expect(trees).toHaveLength(1);
    expect(trees[0].children).toHaveLength(1);
    expect(trees[0].children[0].children).toHaveLength(1);
  });

  it('handles multiple roots', () => {
    const rows = [
      { __rowNum__: 1, unitid: 'A', level: 'collection' },
      { __rowNum__: 2, unitid: 'B', level: 'collection' },
    ];
    const { trees } = buildTreeFromLevels(rows);
    expect(trees).toHaveLength(2);
  });

  it('flags taxonomy gap as warning', () => {
    const rows = [
      { __rowNum__: 1, unitid: '1', level: 'collection' },
      { __rowNum__: 2, unitid: '1.1', level: 'item' },
    ];
    const { trees, warnings } = buildTreeFromLevels(rows);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('Taxonomy gap');
    expect(trees).toHaveLength(1);
    expect(trees[0].children).toHaveLength(1);
  });

  it('returns empty tree for empty input', () => {
    const { trees } = buildTreeFromLevels([]);
    expect(trees).toHaveLength(0);
  });

  it('uses row index when unitid is missing', () => {
    const rows = [
      { __rowNum__: 5, level: 'collection', unittitle: 'Test' },
    ];
    const { trees } = buildTreeFromLevels(rows);
    expect(trees[0].id).toBe('row-5');
  });

  it('treats unknown levels as roots at rank 99', () => {
    const rows = [
      { __rowNum__: 1, unitid: 'A', level: 'custom' },
      { __rowNum__: 2, unitid: 'B', level: 'custom' },
    ];
    const { trees } = buildTreeFromLevels(rows);
    expect(trees).toHaveLength(2);
  });
});
