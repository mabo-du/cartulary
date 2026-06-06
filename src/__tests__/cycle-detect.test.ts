import { describe, it, expect } from 'vitest';
import { detectCycles } from '../lib/hierarchy/cycle-detect';
import type { EADNode } from '../types';

describe('detectCycles', () => {
  it('returns no errors for acyclic tree', () => {
    const tree: EADNode[] = [{
      id: '1', originalRowIndex: 1, level: 'collection', metadata: {},
      children: [{
        id: '1.1', originalRowIndex: 2, level: 'series', metadata: {},
        children: [],
      }],
    }];
    expect(detectCycles(tree)).toHaveLength(0);
  });

  it('detects direct self-loop', () => {
    const node: EADNode = {
      id: '1', originalRowIndex: 1, level: 'collection', metadata: {},
      children: [],
    };
    node.children.push(node); // self-loop
    const errors = detectCycles([node]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Circular');
  });

  it('detects deeper cycle', () => {
    const a: EADNode = { id: 'a', originalRowIndex: 1, level: 'series', metadata: {}, children: [] };
    const b: EADNode = { id: 'b', originalRowIndex: 2, level: 'file', metadata: {}, children: [] };
    a.children.push(b);
    b.children.push(a); // a → b → a cycle
    const errors = detectCycles([a]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Circular');
  });

  it('handles multiple roots without cycles', () => {
    const trees: EADNode[] = [
      { id: '1', originalRowIndex: 1, level: 'collection', metadata: {}, children: [] },
      { id: '2', originalRowIndex: 2, level: 'collection', metadata: {}, children: [] },
    ];
    expect(detectCycles(trees)).toHaveLength(0);
  });

  it('handles empty tree', () => {
    expect(detectCycles([])).toHaveLength(0);
  });
});
