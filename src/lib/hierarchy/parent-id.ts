/** parent-id.ts — Hierarchy construction from explicit parent_id column.
 *
 * exports:
 *   buildTreeFromParentId(rows): { trees, errors }
 *     Two-pass algorithm: (1) index all rows by ID, (2) resolve parent refs.
 *     Rows with no parent_id become roots. Orphans are flagged.
 *
 * used_by: ui/step-map.ts → hierarchy parser dispatch
 * rules:   Two-pass required because children may appear before parents.
 * agent:   deepseek-v4-flash | 2026-06-07 | Implemented adjacency-list two-pass algorithm
 */

import type { EADNode, ParsedRow } from '../../types';

export interface ParentIdResult {
  trees: EADNode[];
  errors: { rowIndex: number; message: string }[];
}

export function buildTreeFromParentId(rows: ParsedRow[]): ParentIdResult {
  const errors: ParentIdResult['errors'] = [];
  const nodeMap = new Map<string, EADNode>();

  // Pass 1: create all nodes
  for (const row of rows) {
    const id = String(row.id ?? '');
    const index = (row.__rowNum__ as number) ?? 0;

    const node: EADNode = {
      id,
      originalRowIndex: index,
      level: String(row.level ?? ''),
      metadata: { ...row },
      children: [],
    };

    // Handle duplicate IDs
    if (nodeMap.has(id)) {
      errors.push({
        rowIndex: index,
        message: `Duplicate ID "${id}" — second occurrence treated as separate root`,
      });
    }

    nodeMap.set(id, node);
  }

  // Pass 2: resolve parent references
  const roots: EADNode[] = [];

  for (const row of rows) {
    const id = String(row.id ?? '');
    const node = nodeMap.get(id)!;
    const parentId = row.parent_id;

    if (parentId === undefined || parentId === null || parentId === '') {
      roots.push(node);
    } else {
      const parentIdStr = String(parentId);
      const parent = nodeMap.get(parentIdStr);
      if (parent) {
        parent.children.push(node);
      } else {
        errors.push({
          rowIndex: node.originalRowIndex,
          message: `Orphan: parent ID "${parentIdStr}" not found`,
        });
        roots.push(node);
      }
    }
  }

  return { trees: roots, errors };
}
