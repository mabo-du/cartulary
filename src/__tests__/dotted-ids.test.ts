import { describe, it, expect } from 'vitest';
import { buildTreeFromDottedIDs } from '../lib/hierarchy/dotted-ids';

describe('buildTreeFromDottedIDs', () => {
  it('builds tree from dotted IDs in any order', () => {
    const rows = [
      { __rowNum__: 1, id: '1', unittitle: 'Root' },
      { __rowNum__: 3, id: '1.1.1', unittitle: 'Grandchild' },
      { __rowNum__: 2, id: '1.1', unittitle: 'Child' },
    ];
    const { trees, errors } = buildTreeFromDottedIDs(rows);
    expect(errors).toHaveLength(0);
    expect(trees).toHaveLength(1);
    expect(trees[0].children).toHaveLength(1);
    expect(trees[0].children[0].children).toHaveLength(1);
  });

  it('flags orphan dotted IDs', () => {
    const rows = [
      { __rowNum__: 1, id: '1.1', unittitle: 'Orphan' },
    ];
    const { trees, errors } = buildTreeFromDottedIDs(rows);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Orphan');
    expect(trees).toHaveLength(1); // orphan becomes root
  });

  it('handles single root', () => {
    const rows = [
      { __rowNum__: 1, id: '1', unittitle: 'Root' },
    ];
    const { trees } = buildTreeFromDottedIDs(rows);
    expect(trees).toHaveLength(1);
    expect(trees[0].id).toBe('1');
  });

  it('returns empty tree for empty input', () => {
    const { trees } = buildTreeFromDottedIDs([]);
    expect(trees).toHaveLength(0);
  });
});
