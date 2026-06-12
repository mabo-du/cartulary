/** dotted-ids.ts — Hierarchy construction from dotted component IDs.
 *
 * exports:
 *   buildTreeFromDottedIDs(rows): { trees, errors }
 *     Pre-sorts rows lexicographically so parents precede children.
 *     Parent = ID minus last dot-segment.
 *
 * used_by: ui/step-map.ts → hierarchy parser dispatch
 * rules:   Must sort before building. Orphan rows flagged as errors.
 * agent:   deepseek-v4-flash | 2026-06-07 | Implemented dotted-ID prefix algorithm
 */

import type { EADNode, ParsedRow } from '../../types';

export interface DottedIdResult {
  trees: EADNode[];
  errors: { rowIndex: number; message: string }[];
}

export function buildTreeFromDottedIDs(rows: ParsedRow[]): DottedIdResult {
  const errors: DottedIdResult['errors'] = [];
  const nodeMap = new Map<string, EADNode>();
  const roots: EADNode[] = [];

  // Pre-sort: "1" before "1.1" before "1.1.2"
  const sorted = [...rows].sort((a, b) =>
    String(a.id ?? '').localeCompare(String(b.id ?? '')),
  );

  for (const row of sorted) {
    const id = String(row.id ?? '');
    const index = (row.__rowNum__ as number) ?? 0;

    const node: EADNode = {
      id,
      originalRowIndex: index,
      level: String(row.level ?? ''),
      metadata: { ...row },
      children: [],
    };

    if (!nodeMap.has(id)) {
      nodeMap.set(id, node);
    }

    const lastDot = id.lastIndexOf('.');
    if (lastDot === -1) {
      roots.push(node);
    } else {
      const parentId = id.substring(0, lastDot);
      const parent = nodeMap.get(parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        errors.push({
          rowIndex: index,
          message: `Orphan: parent ID "${parentId}" not found for child "${id}"`,
        });
        roots.push(node);
      }
    }
  }

  return { trees: roots, errors };
}
