/** cycle-detect.ts — Iterative DFS cycle detection for EADNode trees.
 *
 * exports:
 *   detectCycles(roots): string[]
 *     Iterative DFS with path tracking. Catches circular parent-child refs.
 *
 * used_by: hierarchy parsers → validator pipeline
 * rules:   Must use iterative traversal to prevent stack overflow on deep trees.
 *          Returns array of error messages (empty = no cycles).
 * agent:   deepseek-v4-flash | 2026-06-07 | Implemented iterative DFS cycle detection
 */

import type { EADNode } from '../../types';

export function detectCycles(roots: EADNode[]): string[] {
  const errors: string[] = [];
  const visited = new Set<EADNode>();

  const stack: { node: EADNode; path: Set<EADNode> }[] = roots.map((n) => ({
    node: n,
    path: new Set([n]),
  }));

  while (stack.length > 0) {
    const { node, path } = stack.pop()!;

    if (visited.has(node)) continue;
    visited.add(node);

    for (const child of node.children) {
      if (path.has(child)) {
        errors.push(
          `Circular reference at row ${child.originalRowIndex} (ID: "${child.id}")`,
        );
      } else {
        const childPath = new Set(path);
        childPath.add(child);
        stack.push({ node: child, path: childPath });
      }
    }
  }

  return errors;
}
