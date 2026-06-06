import { describe, it, expect } from 'vitest';
import { buildTreeFromParentId } from '../lib/hierarchy/parent-id';

describe('buildTreeFromParentId', () => {
  it('builds tree with explicit parent_id', () => {
    const rows = [
      { __rowNum__: 1, id: '1', unittitle: 'Root', parent_id: '' },
      { __rowNum__: 2, id: '2', unittitle: 'Child', parent_id: '1' },
      { __rowNum__: 3, id: '3', unittitle: 'Grandchild', parent_id: '2' },
    ];
    const { trees, errors } = buildTreeFromParentId(rows);
    expect(errors).toHaveLength(0);
    expect(trees).toHaveLength(1);
    expect(trees[0].children).toHaveLength(1);
    expect(trees[0].children[0].children).toHaveLength(1);
  });

  it('handles children before parents in adjacency list', () => {
    const rows = [
      { __rowNum__: 2, id: '2', parent_id: '1' },
      { __rowNum__: 1, id: '1', parent_id: '' },
    ];
    const { trees, errors } = buildTreeFromParentId(rows);
    expect(errors).toHaveLength(0);
    expect(trees).toHaveLength(1);
    expect(trees[0].children).toHaveLength(1);
  });

  it('flags orphan parent_id', () => {
    const rows = [
      { __rowNum__: 1, id: '1', parent_id: '999' },
    ];
    const { errors } = buildTreeFromParentId(rows);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Orphan');
  });

  it('handles empty parent_id as root', () => {
    const rows = [
      { __rowNum__: 1, id: '1', parent_id: '' },
      { __rowNum__: 2, id: '2', parent_id: '' },
    ];
    const { trees } = buildTreeFromParentId(rows);
    expect(trees).toHaveLength(2);
  });

  it('flags duplicate IDs', () => {
    const rows = [
      { __rowNum__: 1, id: '1', parent_id: '' },
      { __rowNum__: 2, id: '1', parent_id: '' },
    ];
    const { errors } = buildTreeFromParentId(rows);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Duplicate ID');
  });
});
